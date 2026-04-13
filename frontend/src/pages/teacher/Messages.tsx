import React, { useState, useEffect, useRef, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { teacherApi } from '../../api';
import { useAuth } from '../../auth/AuthContext';

const POLL_INTERVAL = 3000;

const TeacherMessages: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<'group' | 'dm'>('group');
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedUserName, setSelectedUserName] = useState('');

  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [showNewDM, setShowNewDM] = useState(false);
  const [dmForm, setDmForm] = useState({ receiverId: '', content: '' });
  const [searchQuery, setSearchQuery] = useState('');

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: any; type: 'dm' | 'group' } | null>(null);

  const chatRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Promise.all([
      teacherApi.getCourses(),
      teacherApi.getConversations(),
      teacherApi.getContacts(),
    ]).then(([coursesRes, convsRes, contactsRes]) => {
      const c = coursesRes.data.data || [];
      setCourses(c);
      setConversations(convsRes.data.data || []);
      setContacts(contactsRes.data.data || []);
      if (c.length > 0) setSelectedCourse(c[0].id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    const handler = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handler);
      return () => document.removeEventListener('click', handler);
    }
  }, [contextMenu]);

  const scrollToBottom = () => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  };

  const loadGroupMessages = useCallback((courseId: number) => {
    teacherApi.getGroupMessages(courseId).then(res => {
      const newMsgs = res.data.data || [];
      setMessages(prev => {
        if (prev.length !== newMsgs.length) {
          setTimeout(() => scrollToBottom(), 50);
        }
        return newMsgs;
      });
    }).catch(() => {});
  }, []);

  const loadDmMessages = useCallback((userId: number) => {
    teacherApi.getDmMessages(userId).then(res => {
      const newMsgs = res.data.data || [];
      setMessages(prev => {
        if (prev.length !== newMsgs.length) {
          setTimeout(() => scrollToBottom(), 50);
        }
        return newMsgs;
      });
    }).catch(() => {});
  }, []);

  const refreshConversations = () => {
    teacherApi.getConversations().then(res => {
      setConversations(res.data.data || []);
    }).catch(() => {});
  };

  // Polling
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (viewMode === 'group' && selectedCourse) {
      loadGroupMessages(selectedCourse);
      pollRef.current = setInterval(() => {
        loadGroupMessages(selectedCourse);
        refreshConversations();
      }, POLL_INTERVAL);
    } else if (viewMode === 'dm' && selectedUser) {
      loadDmMessages(selectedUser);
      teacherApi.markDmRead(selectedUser).catch(() => {});
      pollRef.current = setInterval(() => {
        loadDmMessages(selectedUser);
        refreshConversations();
      }, POLL_INTERVAL);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [viewMode, selectedCourse, selectedUser, loadGroupMessages, loadDmMessages]);

  const sendGroupMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || !selectedCourse) return;
    await teacherApi.sendGroupMessage({ courseId: selectedCourse, content: newMsg });
    setNewMsg('');
    loadGroupMessages(selectedCourse);
  };

  const sendDmMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || !selectedUser) return;
    await teacherApi.sendMessage({ receiverId: selectedUser, content: newMsg });
    setNewMsg('');
    loadDmMessages(selectedUser);
    refreshConversations();
  };

  const sendNewDM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmForm.receiverId || !dmForm.content.trim()) return;
    try {
      await teacherApi.sendMessage({
        receiverId: Number(dmForm.receiverId),
        content: dmForm.content,
      });
      setShowNewDM(false);
      setDmForm({ receiverId: '', content: '' });
      refreshConversations();
      const contact = contacts.find(c => c.id === Number(dmForm.receiverId));
      if (contact) {
        selectDmUser(Number(dmForm.receiverId), `${contact.firstName} ${contact.lastName}`);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error sending message');
    }
  };

  const selectCourse = (courseId: number) => {
    setViewMode('group');
    setSelectedCourse(courseId);
    setSelectedUser(null);
    setMessages([]);
  };

  const selectDmUser = (userId: number, name: string) => {
    setViewMode('dm');
    setSelectedUser(userId);
    setSelectedUserName(name);
    setSelectedCourse(null);
    setMessages([]);
  };

  // Message actions
  const handleDeleteForEveryone = async (msg: any, type: 'dm' | 'group') => {
    if (!confirm('Delete this message for everyone? This cannot be undone.')) return;
    try {
      if (type === 'dm') {
        await teacherApi.deleteMessage(msg.id);
        if (selectedUser) loadDmMessages(selectedUser);
      } else {
        await teacherApi.deleteGroupMessage(msg.id);
        if (selectedCourse) loadGroupMessages(selectedCourse);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error deleting message');
    }
    setContextMenu(null);
  };

  const handleDeleteForMe = async (msg: any, type: 'dm' | 'group') => {
    try {
      if (type === 'dm') {
        await teacherApi.hideMessage(msg.id);
        if (selectedUser) loadDmMessages(selectedUser);
      } else {
        await teacherApi.hideGroupMessage(msg.id);
        if (selectedCourse) loadGroupMessages(selectedCourse);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error hiding message');
    }
    setContextMenu(null);
  };

  const handleContextMenu = (e: React.MouseEvent, msg: any, type: 'dm' | 'group') => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, message: msg, type });
  };

  const currentChatTitle = viewMode === 'group'
    ? courses.find(c => c.id === selectedCourse)?.courseName || 'Select a course'
    : selectedUserName || 'Select a conversation';

  const currentChatSubtitle = viewMode === 'group'
    ? courses.find(c => c.id === selectedCourse)?.courseCode || ''
    : 'Direct Message';

  const currentChatInitials = viewMode === 'group'
    ? (courses.find(c => c.id === selectedCourse)?.courseCode?.[0] || 'C')
    : (selectedUserName.split(' ').map((n: string) => n[0]).join('') || 'U');

  // Filter conversations by search
  const filteredConversations = searchQuery
    ? conversations.filter(c => `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations;

  const filteredCourses = searchQuery
    ? courses.filter(c => c.courseName.toLowerCase().includes(searchQuery.toLowerCase()) || c.courseCode.toLowerCase().includes(searchQuery.toLowerCase()))
    : courses;

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <DashboardLayout role="teacher">
      <div className="page-header">
        <div>
          <h1 className="page-title">Messages</h1>
          <p className="page-subtitle">Course group chats and direct messages</p>
        </div>
        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowNewDM(true)}>
          + New Message
        </button>
      </div>

      {loading ? <div className="loading-screen"><div className="spinner"></div></div> : (
        <div className="messages-layout">
          {/* Sidebar */}
          <div className="messages-sidebar">
            <div className="messages-sidebar-header">
              <h3>Chats</h3>
              <input
                className="messages-search"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Course Groups */}
            <div className="messages-sidebar-section">
              <div className="messages-sidebar-label">Course Groups</div>
              {filteredCourses.map(c => (
                <div
                  key={c.id}
                  className={`message-channel ${viewMode === 'group' && selectedCourse === c.id ? 'active' : ''}`}
                  onClick={() => selectCourse(c.id)}
                >
                  <div className="channel-avatar" style={{ background: c.coverColor || 'var(--accent-blue)', borderRadius: '12px' }}>{c.courseCode?.[0]}</div>
                  <div className="channel-info">
                    <div className="channel-name">{c.courseCode} {c.section ? `- ${c.section}` : ''}</div>
                    <div className="channel-meta">{c.courseName}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Direct Messages */}
            <div className="messages-sidebar-section">
              <div className="messages-sidebar-label">Direct Messages</div>
              {filteredConversations.map((conv: any) => (
                <div
                  key={conv.userId}
                  className={`message-channel ${viewMode === 'dm' && selectedUser === conv.userId ? 'active' : ''}`}
                  onClick={() => selectDmUser(conv.userId, `${conv.firstName} ${conv.lastName}`)}
                >
                  <div className="channel-avatar" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', borderRadius: '50%' }}>
                    {conv.firstName?.[0]}{conv.lastName?.[0]}
                  </div>
                  <div className="channel-info">
                    <div className="channel-name">{conv.firstName} {conv.lastName}</div>
                    <div className="channel-meta">{conv.lastMessage ? conv.lastMessage.substring(0, 35) : 'No messages'}...</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                    {conv.lastMessageTime && <span className="channel-time">{formatTime(conv.lastMessageTime)}</span>}
                    {conv.unreadCount > 0 && <span className="channel-badge">{conv.unreadCount}</span>}
                  </div>
                </div>
              ))}
              {conversations.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.75rem 1.25rem' }}>No conversations yet</p>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="messages-main">
            <div className="chat-header">
              <div className="chat-header-avatar">{currentChatInitials}</div>
              <div>
                <h3>{currentChatTitle}</h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{currentChatSubtitle}</span>
              </div>
            </div>
            <div className="chat-messages" ref={chatRef}>
              {messages.length > 0 ? messages.map((m: any) => {
                const isMine = m.sender?.id === user?.id;
                return (
                  <div
                    key={m.id}
                    className={`chat-bubble ${isMine ? 'mine' : 'theirs'}`}
                    onContextMenu={e => handleContextMenu(e, m, viewMode === 'group' ? 'group' : 'dm')}
                  >
                    <div className="bubble-header">
                      <span className="bubble-sender">
                        {m.sender?.firstName} {m.sender?.lastName}
                        {viewMode === 'group' && m.sender?.role === 'teacher' && (
                          <span style={{ marginLeft: '0.35rem', fontSize: '0.6rem', background: isMine ? 'rgba(255,255,255,0.2)' : '#eff6ff', color: isMine ? 'rgba(255,255,255,0.9)' : 'var(--accent-blue)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>Teacher</span>
                        )}
                      </span>
                      <span className="bubble-time">{formatTime(m.createdAt)}</span>
                    </div>
                    {m.subject && <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.15rem' }}>{m.subject}</div>}
                    <div className="bubble-content">{m.content}</div>
                  </div>
                );
              }) : (
                <div className="empty-state">
                  <p style={{ fontSize: '0.9rem' }}>
                    {viewMode === 'group' ? 'No messages yet. Start the conversation!' : 'No messages in this conversation.'}
                  </p>
                </div>
              )}
            </div>
            <form className="chat-input" onSubmit={viewMode === 'group' ? sendGroupMessage : sendDmMessage}>
              <input
                className="form-input"
                placeholder={viewMode === 'group' ? 'Type a message...' : 'Type a message...'}
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
              />
              <button className="btn btn-primary" type="submit">Send</button>
            </form>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div className="msg-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={e => e.stopPropagation()}>
          <button className="msg-context-item" onClick={() => {
            navigator.clipboard.writeText(contextMenu.message.content);
            setContextMenu(null);
          }}>
            Copy Message
          </button>
          <button className="msg-context-item" onClick={() => handleDeleteForMe(contextMenu.message, contextMenu.type)}>
            Remove for You
          </button>
          {contextMenu.message.sender?.id === user?.id && (
            <button className="msg-context-item danger" onClick={() => handleDeleteForEveryone(contextMenu.message, contextMenu.type)}>
              Remove for Everyone
            </button>
          )}
        </div>
      )}

      {/* New DM Modal */}
      {showNewDM && (
        <div className="modal-overlay" onClick={() => setShowNewDM(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">New Message</h3>
              <button className="modal-close" onClick={() => setShowNewDM(false)}>×</button>
            </div>
            <form onSubmit={sendNewDM}>
              <div className="form-group">
                <label className="form-label">To</label>
                <select
                  className="form-input"
                  value={dmForm.receiverId}
                  onChange={e => setDmForm({ ...dmForm, receiverId: e.target.value })}
                  required
                >
                  <option value="">Select student...</option>
                  {contacts.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.email})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea
                  className="form-input"
                  rows={4}
                  value={dmForm.content}
                  onChange={e => setDmForm({ ...dmForm, content: e.target.value })}
                  placeholder="Type your message..."
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewDM(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>Send</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default TeacherMessages;
