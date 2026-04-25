import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Users, 
  MoreHorizontal, 
  Plus, 
  Search,
  ArrowLeft,
  ChevronRight,
  Info,
  Trash2,
  Calendar,
  Clock,
  User
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import Avatar from '../../components/Avatar';
import { teacherApi } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { showApiError, showAlert } from '../../utils/feedback';

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
  
  // Mobile state: toggle between chat list and chat view
  const [showChatList, setShowChatList] = useState(true);

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
      // ignore
    } finally {
      setLoading(false);
    }
  }, [selectedCourse, selectedUser]);

  useEffect(() => {
    initData();
  }, [initData]);

  const loadGroupMessages = useCallback((courseId: number) => {
    teacherApi.getGroupMessages(courseId).then((res) => {
      const newMsgs = Array.isArray(res.data?.data) ? res.data.data : [];
      setMessages((prev) => {
        if (prev.length !== newMsgs.length) setTimeout(() => scrollToBottom(prev.length === 0 ? 'auto' : 'smooth'), 50);
        return newMsgs;
      });
    }).catch(() => {});
  }, [scrollToBottom]);

  const loadDmMessages = useCallback((userId: number) => {
    teacherApi.getDmMessages(userId).then((res) => {
      const newMsgs = Array.isArray(res.data?.data) ? res.data.data : [];
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
      } else if (viewMode === 'dm' && selectedUser) {
        await teacherApi.sendMessage({ receiverId: selectedUser, content });
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
    setShowChatList(false);
  };

  const selectDmUser = (userId: number, name: string) => {
    setViewMode('dm');
    setSelectedUser(userId);
    setSelectedUserName(name);
    setSelectedCourse(null);
    setMessages([]);
    setShowChatList(false);
    teacherApi.markDmRead(userId).catch(() => {});
  };

  const getAvatarUrl = (avatar?: unknown) => {
    if (typeof avatar !== 'string') return undefined;
    const value = avatar.trim();
    if (!value) return undefined;
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    return `http://${window.location.hostname}:8080${value.startsWith('/') ? value : `/${value}`}`;
  };

  return (
    <DashboardLayout role="teacher">
      <div className="page-header">
        <div>
          <h1 className="page-title">Messages</h1>
          <p className="page-subtitle">Collaborate with your classes and colleagues</p>
        </div>
        <button className="btn btn-primary shadow-sm hover:shadow-md transition-all active:scale-95" style={{ width: 'auto' }} onClick={() => setShowNewDM(true)}>
          <Plus size={18} className="mr-1" /> New Message
        </button>
      </div>

      {loading ? <div className="loading-screen"><div className="spinner"></div></div> : (
        <div className="messages-container shadow-sm border border-gray-100" style={{ height: 'calc(100vh - 220px)' }}>
          {/* Sidebar */}
          <div className={`messages-sidebar ${!showChatList ? 'hidden-mobile' : ''}`}>
            <div className="messages-sidebar-header">
              <h3 className="m-0">Chats</h3>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <input className="messages-search pl-10 focus:ring-2 focus:ring-blue-100 transition-all" placeholder="Search..." />
              </div>
            </div>

            <div className="messages-list">
              <div className="messages-sidebar-label">Course Groups</div>
              {courses.map((c: any) => (
                <div
                  key={c.id}
                  className={`message-item group ${viewMode === 'group' && selectedCourse === c.id ? 'active' : ''} hover:bg-gray-50 transition-colors cursor-pointer`}
                  onClick={() => selectCourse(c.id)}
                >
                  <div className="message-item-icon" style={{ background: c.coverColor || 'var(--accent-blue)', color: '#fff' }}>
                    <Users size={20} />
                  </div>
                  <div className="message-item-info">
                    <div className="message-item-name">{c.courseCode} {c.section ? `- ${c.section}` : ''}</div>
                    <div className="message-item-preview">{c.courseName}</div>
                  </div>
                </div>
              ))}

              <div className="messages-sidebar-label mt-4">Direct Messages</div>
              {conversations.map((conv: any) => (
                <div
                  key={conv.userId}
                  className={`message-item group ${viewMode === 'dm' && selectedUser === conv.userId ? 'active' : ''} hover:bg-gray-50 transition-colors cursor-pointer`}
                  onClick={() => selectDmUser(conv.userId, `${conv.firstName} ${conv.lastName}`)}
                >
                  <Avatar firstName={conv.firstName} lastName={conv.lastName} avatarUrl={getAvatarUrl(conv.avatar)} size={40} />
                  <div className="message-item-info">
                    <div className="message-item-top">
                        <span className="message-item-name">{conv.firstName} {conv.lastName}</span>
                        {conv.unreadCount > 0 && <span className="unread-dot pulse" />}
                    </div>
                    <div className="message-item-preview">{isTeacherRole(conv.role) ? 'Teacher' : 'Student'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`messages-chat ${showChatList ? 'hidden-mobile' : ''}`}>
            {(selectedCourse || selectedUser) ? (
              <>
                <div className="messages-chat-header shadow-sm">
                  <div className="flex items-center gap-3">
                    <button className="mobile-only hover:bg-gray-100 p-1 rounded transition-colors" onClick={() => setShowChatList(true)}>
                      <ArrowLeft size={18} />
                    </button>
                    {viewMode === 'group' ? (
                      <div className="message-item-icon" style={{ background: courses.find(c => c.id === selectedCourse)?.coverColor || 'var(--accent-blue)', color: '#fff', width: 32, height: 32 }}>
                        <Users size={18} />
                      </div>
                    ) : (
                      <Avatar 
                        firstName={selectedUserName?.split(' ')[0]} 
                        lastName={selectedUserName?.split(' ').slice(1).join(' ')} 
                        size={32} 
                      />
                    )}
                    <div>
                      <h4 className="m-0">{viewMode === 'group' ? courses.find(c => c.id === selectedCourse)?.courseName : selectedUserName}</h4>
                      <span className="text-xs text-muted">{viewMode === 'group' ? 'Course Community' : 'Direct Message'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                      <button className="icon-btn hover:bg-gray-100 transition-colors"><Info size={18} /></button>
                      <button className="icon-btn hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                  </div>
                </div>

                <div className="messages-view scroll-smooth" ref={chatRef}>
                  {messages.map((m: any, i: number) => {
                    const isMine = isOwnMessage(m);
                    const showAvatar = !isMine && (i === 0 || messages[i-1].senderId !== m.senderId);
                    
                    return (
                      <div key={m.id} className={`message-row ${isMine ? 'me' : 'them'} animate-in fade-in slide-in-from-bottom-1 duration-300`}>
                        {!isMine && (
                          <div className="message-avatar-container" style={{ width: 32 }}>
                            {showAvatar && <Avatar firstName={m.sender?.firstName || m.firstName} lastName={m.sender?.lastName || m.lastName} avatarUrl={getAvatarUrl(m.sender?.avatar || m.avatar)} size={28} />}
                          </div>
                        )}
                        <div className="message-bubble-group">
                          {!isMine && viewMode === 'group' && showAvatar && (
                            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', marginLeft: '0.5rem', marginBottom: '0.2rem' }}>
                                {m.sender?.firstName} {m.sender?.lastName}
                            </div>
                          )}
                          <div className={`message-bubble shadow-sm ${isMine ? 'bg-blue-600 text-white' : 'bg-white border border-gray-100'}`}>
                            {m.content}
                          </div>
                          <span className="message-time">
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <form className="messages-input-area border-t border-gray-100" onSubmit={sendMessage}>
                  <input 
                      className="message-input focus:ring-2 focus:ring-blue-100 transition-all" 
                      placeholder="Type a message..." 
                      value={newMsg} 
                      onChange={e => setNewMsg(e.target.value)}
                  />
                  <button type="submit" className="message-send-btn shadow-sm hover:shadow-md transition-all active:scale-95" disabled={!newMsg.trim() || sending}>
                    <Send size={18} className={sending ? 'animate-pulse' : ''} />
                  </button>
                </form>
              </>
            ) : (
              <div className="messages-empty">
                  <div className="mb-6 text-blue-100">
                      <MessageSquare size={64} />
                  </div>
                  <h3>Select a conversation</h3>
                  <p className="text-muted">Choose a course group or a direct message to start chatting</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Message Modal */}
      {showNewDM && (
        <div className="modal-overlay" onClick={() => setShowNewDM(false)}>
          <div className="modal shadow-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title">New Message</h3>
              <button className="modal-close hover:rotate-90 transition-transform" onClick={() => setShowNewDM(false)}><X size={20} /></button>
            </div>
            <form onSubmit={sendNewDM}>
              <div className="form-group">
                <label className="form-label">To</label>
                <select
                  className="form-input focus:ring-2 focus:ring-blue-100 transition-all"
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
                  className="form-input focus:ring-2 focus:ring-blue-100 transition-all"
                  rows={4}
                  value={dmForm.content}
                  onChange={e => setDmForm({ ...dmForm, content: e.target.value })}
                  placeholder="Type your message..."
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary transition-colors" onClick={() => setShowNewDM(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary shadow-sm hover:shadow-md transition-all active:scale-95" style={{ width: 'auto' }}>
                  <Send size={16} className="mr-2" /> Send Message
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default TeacherMessages;
