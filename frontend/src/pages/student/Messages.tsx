import React, { useState, useEffect, useRef, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { studentApi } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { showApiError } from '../../utils/feedback';

const POLL_INTERVAL = 4000;

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

  const isTeacherRole = (role?: string) => (role || '').toLowerCase().includes('teacher');

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (chatRef.current) {
        chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior });
    }
  }, []);

  const initData = useCallback(async () => {
    try {
      const [coursesRes, convsRes, contactsRes] = await Promise.all([
        studentApi.getCourses(),
        studentApi.getConversations(),
        studentApi.getContacts(),
      ]);
      const data = Array.isArray(coursesRes.data?.data) ? coursesRes.data.data : [];
      const courseList = data.map((d: any) => d?.course).filter(Boolean);
      setCourses(courseList);
      setConversations(Array.isArray(convsRes.data?.data) ? convsRes.data.data : []);
      setContacts(Array.isArray(contactsRes.data?.data) ? contactsRes.data.data : []);
      if (courseList.length > 0 && !selectedCourse && !selectedUser) {
          setSelectedCourse(courseList[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedCourse, selectedUser]);

  useEffect(() => {
    initData();
  }, [initData]);

  const loadGroupMessages = useCallback((courseId: number) => {
    studentApi.getGroupMessages(courseId).then(res => {
      const newMsgs = Array.isArray(res.data?.data) ? res.data.data : [];
      setMessages(prev => {
        if (prev.length !== newMsgs.length) {
          setTimeout(() => scrollToBottom(prev.length === 0 ? 'auto' : 'smooth'), 50);
        }
        return newMsgs;
      });
    }).catch(() => {});
  }, [scrollToBottom]);

  const loadDmMessages = useCallback((userId: number) => {
    studentApi.getDmMessages(userId).then(res => {
      const newMsgs = Array.isArray(res.data?.data) ? res.data.data : [];
      setMessages(prev => {
        if (prev.length !== newMsgs.length) {
          setTimeout(() => scrollToBottom(prev.length === 0 ? 'auto' : 'smooth'), 50);
        }
        return newMsgs;
      });
    }).catch(() => {});
  }, [scrollToBottom]);

  const refreshConversations = () => {
    studentApi.getConversations().then(res => {
      setConversations(Array.isArray(res.data?.data) ? res.data.data : []);
    }).catch(() => {});
  };

  // Polling
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    
    const tick = () => {
        if (viewMode === 'group' && selectedCourse) loadGroupMessages(selectedCourse);
        else if (viewMode === 'dm' && selectedUser) loadDmMessages(selectedUser);
        refreshConversations();
    };

    tick();
    pollRef.current = setInterval(tick, POLL_INTERVAL);
    
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [viewMode, selectedCourse, selectedUser, loadGroupMessages, loadDmMessages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newMsg.trim();
    if (!content) return;

    try {
        if (viewMode === 'group' && selectedCourse) {
            await studentApi.sendGroupMessage({ courseId: selectedCourse, content });
            loadGroupMessages(selectedCourse);
        } else if (viewMode === 'dm' && selectedUser) {
            await studentApi.sendMessage({ receiverId: selectedUser, content });
            loadDmMessages(selectedUser);
        }
        setNewMsg('');
        refreshConversations();
    } catch (err) { showApiError(err); }
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
    } catch (err: any) { showApiError(err); }
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
    studentApi.markDmRead(userId).catch(() => {});
  };

  return (
    <DashboardLayout role="student">
      <div className="page-header">
        <div>
          <h1 className="page-title">Messages</h1>
          <p className="page-subtitle">Stay connected with your classmates and teachers</p>
        </div>
        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowNewDM(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          New Message
        </button>
      </div>

      {loading ? <div className="loading-screen"><div className="spinner"></div></div> : (
        <div className="messages-layout" style={{ height: 'calc(100vh - 220px)' }}>
          {/* Sidebar */}
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
                    <div className="channel-name">{c.courseCode}</div>
                    <div className="channel-meta">{c.courseName}</div>
                  </div>
                </div>
              ))}
              {courses.length === 0 && <div style={{ padding: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', border: '1px dashed var(--border-glass)', margin: '0.75rem', borderRadius: '8px' }}>No courses.</div>}
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
              {conversations.length === 0 && <div style={{ padding: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', border: '1px dashed var(--border-glass)', margin: '0.75rem', borderRadius: '8px' }}>No chats yet.</div>}
            </div>
          </div>

          {/* Chat Area */}
          <div className="messages-main">
            {(selectedCourse || selectedUser) ? (
              <>
                <div className="chat-header">
                  <div className="chat-header-avatar">
                      {viewMode === 'group' ? 'G' : selectedUserName?.[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0 }}>{viewMode === 'group' ? courses.find(c => c.id === selectedCourse)?.courseName : selectedUserName}</h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-green)' }}></div>
                        {viewMode === 'group' ? 'Course Community' : 'Active Now'}
                    </div>
                  </div>
                </div>
                
                <div className="chat-messages" ref={chatRef}>
                  {messages.map((m: any, i: number) => {
                    const isMine = m.sender?.id === user?.id;
                    const prevMsg = messages[i-1];
                    const showAvatar = !isMine && (prevMsg?.sender?.id !== m.sender?.id);
                    
                    return (
                      <div key={m.id} style={{ display: 'flex', gap: '8px', marginBottom: '2px', alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                        {!isMine && (
                            <div style={{ width: 32, flexShrink: 0 }}>
                                {showAvatar && (
                                    <div className="sidebar-avatar" style={{ width: 32, height: 32, fontSize: '0.65rem' }}>{m.sender?.firstName?.[0]}</div>
                                )}
                            </div>
                        )}
                        <div className={`chat-bubble ${isMine ? 'mine' : 'theirs'}`} style={{ borderRadius: '18px', borderBottomRightRadius: isMine ? '4px' : '18px', borderBottomLeftRadius: !isMine ? '4px' : '18px' }}>
                          {!isMine && showAvatar && viewMode === 'group' && (
                            <div style={{ fontWeight: 700, fontSize: '0.7rem', color: isTeacherRole(m.sender?.role) ? 'var(--accent-red)' : 'var(--accent-blue)', marginBottom: '2px' }}>
                                {m.sender?.firstName} {m.sender?.lastName} {isTeacherRole(m.sender?.role) && '• Teacher'}
                            </div>
                          )}
                          <div className="bubble-content">{m.content}</div>
                          <div style={{ fontSize: '0.6rem', opacity: 0.6, textAlign: 'right', marginTop: '4px' }}>
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {messages.length === 0 && (
                    <div className="empty-state" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.8 }}>
                      <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>💬</div>
                      <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Start your conversation here.</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Send a message to your classmates or teacher.</p>
                    </div>
                  )}
                </div>

                <form className="chat-input" onSubmit={sendMessage}>
                  <input
                    className="form-input"
                    placeholder="Type a message..."
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                  />
                  <button className="btn btn-primary" type="submit" disabled={!newMsg.trim()} style={{ width: '40px', height: '40px', borderRadius: '50%', padding: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                  </button>
                </form>
              </>
            ) : (
                <div className="empty-state" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: '5rem', opacity: 0.8, marginBottom: '1.5rem' }}>💬</div>
                    <h3 style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Select a chat</h3>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: '280px', margin: '0 auto' }}>Choose a course group or a direct message to start chatting with others.</p>
                </div>
            )}
          </div>
        </div>
      )}

      {/* New DM Modal */}
      {showNewDM && (
        <div className="modal-overlay" onClick={() => setShowNewDM(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">New Message</h3>
              <button className="modal-close" onClick={() => setShowNewDM(false)}>&times;</button>
            </div>
            <form onSubmit={sendNewDM}>
              <div className="form-group">
                <label className="form-label">To Partner</label>
                <select
                  className="form-input"
                  value={dmForm.receiverId}
                  onChange={e => setDmForm({ ...dmForm, receiverId: e.target.value })}
                  required
                >
                  <option value="">Select a teacher...</option>
                  {contacts.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({isTeacherRole(c.role) ? 'teacher' : (c.role || 'user')})</option>
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
                  placeholder="What's on your mind?"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewDM(false)} style={{ width: 'auto', flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto', flex: 1 }}>Send Message</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default StudentMessages;

