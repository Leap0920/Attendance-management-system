import React, { useState, useEffect, useRef, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { studentApi } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { showAlert } from '../../utils/feedback';

const POLL_INTERVAL = 3000;

const StudentMessages: React.FC = () => {
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
  const [dmForm, setDmForm] = useState({ receiverId: '', subject: '', content: '' });

  const chatRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Promise.all([
      studentApi.getCourses(),
      studentApi.getConversations(),
      studentApi.getContacts(),
    ]).then(([coursesRes, convsRes, contactsRes]) => {
      const data = coursesRes.data.data || [];
      const courseList = data.map((d: any) => d.course);
      setCourses(courseList);
      setConversations(convsRes.data.data || []);
      setContacts(contactsRes.data.data || []);
      if (courseList.length > 0) setSelectedCourse(courseList[0].id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const scrollToBottom = () => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  };

  const loadGroupMessages = useCallback((courseId: number) => {
    studentApi.getGroupMessages(courseId).then(res => {
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
    studentApi.getDmMessages(userId).then(res => {
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
    studentApi.getConversations().then(res => {
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
      studentApi.markDmRead(selectedUser).catch(() => {});
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
    await studentApi.sendGroupMessage({ courseId: selectedCourse, content: newMsg });
    setNewMsg('');
    loadGroupMessages(selectedCourse);
  };

  const sendDmMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || !selectedUser) return;
    await studentApi.sendMessage({ receiverId: selectedUser, content: newMsg });
    setNewMsg('');
    loadDmMessages(selectedUser);
    refreshConversations();
  };

  const sendNewDM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmForm.receiverId || !dmForm.content.trim()) return;
    try {
      await studentApi.sendMessage({
        receiverId: Number(dmForm.receiverId),
        subject: dmForm.subject || undefined,
        content: dmForm.content,
      });
      setShowNewDM(false);
      setDmForm({ receiverId: '', subject: '', content: '' });
      refreshConversations();
      const contact = contacts.find(c => c.id === Number(dmForm.receiverId));
      if (contact) {
        selectDmUser(Number(dmForm.receiverId), `${contact.firstName} ${contact.lastName}`);
      }
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || 'Error sending message', 'error');
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

  const currentChatTitle = viewMode === 'group'
    ? courses.find((c: any) => c.id === selectedCourse)?.courseName || 'Select a course'
    : selectedUserName || 'Select a conversation';

  const currentChatSubtitle = viewMode === 'group'
    ? courses.find((c: any) => c.id === selectedCourse)?.courseCode || ''
    : 'Direct Message';

  return (
    <DashboardLayout role="student">
      <div className="page-header">
        <div>
          <h1 className="page-title">Messages</h1>
          <p className="page-subtitle">Course chats and direct messages</p>
        </div>
        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowNewDM(true)}>
          + Message Teacher
        </button>
      </div>

      {loading ? <div className="loading-screen"><div className="spinner"></div></div> : (
        <div className="messages-layout">
          {/* Sidebar */}
          <div className="messages-sidebar">
            {/* Course Groups */}
            <div className="messages-sidebar-section">
              <div className="messages-sidebar-label">Course Groups</div>
              {courses.map((c: any) => (
                <div
                  key={c.id}
                  className={`message-channel ${viewMode === 'group' && selectedCourse === c.id ? 'active' : ''}`}
                  onClick={() => selectCourse(c.id)}
                >
                  <div className="channel-avatar" style={{ background: c.coverColor }}>{c.courseCode?.[0]}</div>
                  <div className="channel-info">
                    <div className="channel-name">{c.courseCode}</div>
                    <div className="channel-meta">{c.courseName}</div>
                  </div>
                </div>
              ))}
              {courses.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.5rem 1rem' }}>No courses enrolled</p>
              )}
            </div>

            {/* Direct Messages */}
            <div className="messages-sidebar-section">
              <div className="messages-sidebar-label">Direct Messages</div>
              {conversations.map((conv: any) => (
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
                    <div className="channel-meta">{conv.role === 'teacher' ? 'Teacher' : 'Student'}</div>
                  </div>
                  {conv.unreadCount > 0 && <span className="channel-badge">{conv.unreadCount}</span>}
                </div>
              ))}
              {conversations.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.5rem 1rem' }}>No conversations yet</p>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="messages-main">
            <div className="chat-header">
              <h3>{currentChatTitle}</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{currentChatSubtitle}</span>
            </div>
            <div className="chat-messages" ref={chatRef}>
              {messages.length > 0 ? messages.map((m: any) => {
                const isMine = m.sender?.id === user?.id;
                return (
                  <div key={m.id} className={`chat-bubble ${isMine ? 'mine' : 'theirs'}`}>
                    <div className="bubble-header">
                      <span className="bubble-sender">
                        {m.sender?.firstName} {m.sender?.lastName}
                        {viewMode === 'group' && m.sender?.role === 'teacher' && (
                          <span style={{ marginLeft: '0.35rem', fontSize: '0.6rem', background: '#eff6ff', color: 'var(--accent-blue)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>Teacher</span>
                        )}
                      </span>
                      <span className="bubble-time">{new Date(m.createdAt).toLocaleString()}</span>
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
                placeholder={viewMode === 'group' ? 'Say something...' : 'Type a message...'}
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
              />
              <button className="btn btn-primary" style={{ width: 'auto' }} type="submit">Send</button>
            </form>
          </div>
        </div>
      )}

      {/* New DM Modal */}
      {showNewDM && (
        <div className="modal-overlay" onClick={() => setShowNewDM(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Message Teacher</h3>
              <button className="modal-close" onClick={() => setShowNewDM(false)}>x</button>
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
                  <option value="">Select teacher...</option>
                  {contacts.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Subject (optional)</label>
                <input
                  className="form-input"
                  value={dmForm.subject}
                  onChange={e => setDmForm({ ...dmForm, subject: e.target.value })}
                  placeholder="Message subject"
                />
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

export default StudentMessages;
