import React, { useState, useEffect, useRef, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { teacherApi } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { showApiError } from '../../utils/feedback';

const POLL_INTERVAL = 4000;

const TeacherMessages: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [viewMode, setViewMode] = useState<'group' | 'dm'>('group');
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedUserName, setSelectedUserName] = useState('');

  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [showNewDM, setShowNewDM] = useState(false);
  const [dmForm, setDmForm] = useState({ receiverId: '', content: '' });

  const chatRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isTeacherRole = (role?: string) => {
    const raw = (role || '').toLowerCase();
    return raw.includes('teacher') || raw.includes('professor');
  };
  const isOwnMessage = (msg: any) => {
    const senderId = Number(msg?.sender?.id ?? msg?.senderId ?? 0);
    const currentId = Number(user?.id ?? 0);
    return currentId > 0 && senderId === currentId;
  };

  const dedupeById = (arr: any[]) => {
    const seen = new Set<number>();
    return arr.filter((m) => {
      if (!m?.id || seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  };

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (chatRef.current) {
      chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior });
    }
  }, []);

  const initData = useCallback(async () => {
    try {
      const [coursesRes, convsRes, contactsRes] = await Promise.all([
        teacherApi.getCourses(),
        teacherApi.getConversations(),
        teacherApi.getContacts(),
      ]);
      const courseList = Array.isArray(coursesRes.data?.data) ? coursesRes.data.data : [];
      setCourses(courseList);
      setConversations(Array.isArray(convsRes.data?.data) ? convsRes.data.data : []);
      setContacts(Array.isArray(contactsRes.data?.data) ? contactsRes.data.data : []);
      if (courseList.length > 0 && !selectedCourse && !selectedUser) {
        setSelectedCourse(courseList[0].id);
      }
    } catch {
      // ignore here; page still renders fallback UI
    } finally {
      setLoading(false);
    }
  }, [selectedCourse, selectedUser]);

  useEffect(() => {
    initData();
  }, [initData]);

  const loadGroupMessages = useCallback((courseId: number) => {
    teacherApi.getGroupMessages(courseId).then((res) => {
      const newMsgs = dedupeById(Array.isArray(res.data?.data) ? res.data.data : []);
      setMessages((prev) => {
        if (prev.length !== newMsgs.length) setTimeout(() => scrollToBottom(prev.length === 0 ? 'auto' : 'smooth'), 50);
        return newMsgs;
      });
    }).catch(() => {});
  }, [scrollToBottom]);

  const loadDmMessages = useCallback((userId: number) => {
    teacherApi.getDmMessages(userId).then((res) => {
      const newMsgs = dedupeById(Array.isArray(res.data?.data) ? res.data.data : []);
      setMessages((prev) => {
        if (prev.length !== newMsgs.length) setTimeout(() => scrollToBottom(prev.length === 0 ? 'auto' : 'smooth'), 50);
        return newMsgs;
      });
    }).catch(() => {});
  }, [scrollToBottom]);

  const refreshConversations = () => {
    teacherApi.getConversations().then((res) => {
      setConversations(Array.isArray(res.data?.data) ? res.data.data : []);
    }).catch(() => {});
  };

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);

    const tick = () => {
      if (viewMode === 'group' && selectedCourse) loadGroupMessages(selectedCourse);
      else if (viewMode === 'dm' && selectedUser) {
        loadDmMessages(selectedUser);
        teacherApi.markDmRead(selectedUser).catch(() => {});
      }
      refreshConversations();
    };

    tick();
    pollRef.current = setInterval(tick, POLL_INTERVAL);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [viewMode, selectedCourse, selectedUser, loadGroupMessages, loadDmMessages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newMsg.trim();
    if (!content || sending) return;

    setSending(true);
    try {
      if (viewMode === 'group' && selectedCourse) {
        await teacherApi.sendGroupMessage({ courseId: selectedCourse, content });
        loadGroupMessages(selectedCourse);
      } else if (viewMode === 'dm' && selectedUser) {
        await teacherApi.sendMessage({ receiverId: selectedUser, content });
        loadDmMessages(selectedUser);
      }
      setNewMsg('');
      refreshConversations();
    } catch (err) {
      showApiError(err);
    } finally {
      setSending(false);
    }
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

      const contact = contacts.find((c) => c.id === Number(dmForm.receiverId));
      if (contact) {
        selectDmUser(Number(dmForm.receiverId), `${contact.firstName} ${contact.lastName}`);
      }
    } catch (err) {
      showApiError(err);
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

  return (
    <DashboardLayout role="teacher">
      <div className="page-header">
        <div>
          <h1 className="page-title">Messages</h1>
          <p className="page-subtitle">Messenger-style chat for classes and direct messages</p>
        </div>
        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowNewDM(true)}>
          New Message
        </button>
      </div>

      {loading ? <div className="loading-screen"><div className="spinner"></div></div> : (
        <div className="messages-layout" style={{ height: 'calc(100vh - 220px)' }}>
          <div className="messages-sidebar">
            <div className="messages-sidebar-header">
              <h3>Chats</h3>
              <input className="messages-search" placeholder="Search people or groups..." />
            </div>

            <div className="messages-sidebar-section">
              <div className="messages-sidebar-label">Course Groups</div>
              {courses.map((c: any) => (
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

            <div className="messages-sidebar-section">
              <div className="messages-sidebar-label">Direct Messages</div>
              {conversations.map((conv: any) => (
                <div
                  key={conv.userId}
                  className={`message-channel ${viewMode === 'dm' && selectedUser === conv.userId ? 'active' : ''}`}
                  onClick={() => selectDmUser(conv.userId, `${conv.firstName} ${conv.lastName}`)}
                >
                  <div className="sidebar-avatar" style={{ width: 40, height: 40 }}>
                    {conv.firstName?.[0]}{conv.lastName?.[0]}
                  </div>
                  <div className="channel-info">
                    <div className="channel-name">{conv.firstName} {conv.lastName}</div>
                    <div className="channel-meta">{isTeacherRole(conv.role) ? 'Teacher' : 'Student'}</div>
                  </div>
                  {conv.unreadCount > 0 && <span className="channel-badge">{conv.unreadCount}</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="messages-main">
            {(selectedCourse || selectedUser) ? (
              <>
                <div className="chat-header">
                  <div className="chat-header-avatar">
                    {viewMode === 'group' ? 'G' : selectedUserName?.[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0 }}>{viewMode === 'group' ? courses.find(c => c.id === selectedCourse)?.courseName : selectedUserName}</h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {viewMode === 'group' ? 'Course Community' : 'Direct Message'}
                    </div>
                  </div>
                </div>

                <div className="chat-messages" ref={chatRef}>
                  {messages.map((m: any) => {
                    const isMine = isOwnMessage(m);
                    const inGroup = viewMode === 'group';
                    const senderName = isMine
                      ? 'You'
                      : `${m.sender?.firstName || m.firstName || ''} ${m.sender?.lastName || m.lastName || ''}`.trim() || `User ${m.sender?.id || m.senderId || ''}`.trim();
                    const avatarUrl = typeof (m.sender?.avatarUrl || m.avatarUrl) === 'string' ? (m.sender?.avatarUrl || m.avatarUrl) : '';
                    const roleLabel = isTeacherRole(m.sender?.role || m.role) ? 'Teacher' : 'Student';

                    return (
                      <div key={m.id} className={`chat-message-row ${isMine ? 'mine' : 'theirs'}`}>
                        {!isMine && (
                          <div className="sidebar-avatar" style={{ width: 32, height: 32, fontSize: '0.65rem', overflow: 'hidden', marginTop: inGroup ? '2px' : 0 }}>
                            {avatarUrl ? <img src={avatarUrl} alt="avatar" className="avatar-image" /> : <>{(m.sender?.firstName || m.firstName || 'U')?.[0]}{(m.sender?.lastName || m.lastName || '')?.[0]}</>}
                          </div>
                        )}
                        <div className={`chat-bubble ${isMine ? 'mine' : 'theirs'}`} style={{ borderBottomRightRadius: isMine ? '4px' : '18px', borderBottomLeftRadius: !isMine ? '4px' : '18px' }}>
                          {inGroup && (
                            <div style={{ fontWeight: 700, fontSize: '0.7rem', color: isMine ? 'rgba(255,255,255,0.92)' : (isTeacherRole(m.sender?.role) ? 'var(--accent-red)' : 'var(--accent-blue)'), marginBottom: '3px', display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                              {senderName}
                              {!isMine && <span style={{ fontSize: '0.62rem', padding: '1px 6px', borderRadius: 999, background: '#e2e8f0', color: '#334155' }}>{roleLabel}</span>}
                            </div>
                          )}
                          <div className="bubble-content">{m.content}</div>
                          <div style={{ fontSize: '0.62rem', opacity: 0.65, textAlign: 'right', marginTop: '4px' }}>
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        {isMine && inGroup && (
                          <div className="sidebar-avatar" style={{ width: 32, height: 32, fontSize: '0.65rem', overflow: 'hidden', marginTop: '2px' }}>
                            {avatarUrl ? <img src={avatarUrl} alt="avatar" className="avatar-image" /> : <>{user?.firstName?.[0]}{user?.lastName?.[0]}</>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <form className="chat-input" onSubmit={sendMessage}>
                  <input
                    className="form-input"
                    placeholder="Type a message..."
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                  />
                  <button className="btn btn-primary" type="submit" disabled={sending || !newMsg.trim()} style={{ width: 'auto' }}>
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </form>
              </>
            ) : (
              <div className="empty-state"><p>Select a chat to start messaging.</p></div>
            )}
          </div>
        </div>
      )}

      {showNewDM && (
        <div className="modal-overlay" onClick={() => setShowNewDM(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
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
                  <option value="">Select student/teacher...</option>
                  {contacts.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} ({isTeacherRole(c.role) ? 'Teacher' : 'Student'})
                    </option>
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
