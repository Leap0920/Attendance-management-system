import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { teacherApi } from '../../api';

const TeacherMessages: React.FC = () => {
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMsg, setNewMsg] = useState('');
    const [view, setView] = useState<'group' | 'broadcast'>('group');
    const [broadcastForm, setBroadcastForm] = useState({ subject: '', content: '' });

    useEffect(() => {
        teacherApi.getCourses().then(res => {
            const c = res.data.data || [];
            setCourses(c);
            if (c.length > 0) setSelectedCourse(c[0].id);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (selectedCourse && view === 'group') {
            loadMessages();
        }
    }, [selectedCourse, view]);

    const loadMessages = () => {
        if (selectedCourse) {
            teacherApi.getGroupMessages(selectedCourse).then(res => setMessages(res.data.data || [])).catch(() => { });
        }
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMsg.trim() || !selectedCourse) return;
        await teacherApi.sendGroupMessage({ courseId: selectedCourse, content: newMsg });
        setNewMsg('');
        loadMessages();
    };

    const sendBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!broadcastForm.content.trim() || !selectedCourse) return;
        try {
            await teacherApi.broadcast({ courseId: selectedCourse, subject: broadcastForm.subject, content: broadcastForm.content });
            setBroadcastForm({ subject: '', content: '' });
            alert('Broadcast sent!');
        } catch (err: any) { alert(err.response?.data?.message || 'Error'); }
    };

    return (
        <DashboardLayout role="teacher">
            <div className="page-header">
                <div><h1 className="page-title">Messages</h1><p className="page-subtitle">Group chat and announcements</p></div>
            </div>

            {loading ? <div className="loading-screen"><div className="spinner"></div></div> : (
                <div className="messages-layout">
                    {/* Sidebar */}
                    <div className="messages-sidebar">
                        <div className="tabs-container" style={{ marginBottom: '1rem' }}>
                            <button className={`tab-btn ${view === 'group' ? 'active' : ''}`} onClick={() => setView('group')}>💬 Group</button>
                            <button className={`tab-btn ${view === 'broadcast' ? 'active' : ''}`} onClick={() => setView('broadcast')}>📣 Broadcast</button>
                        </div>
                        <div style={{ marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Courses</div>
                        {courses.map(c => (
                            <div key={c.id} className={`message-channel ${selectedCourse === c.id ? 'active' : ''}`} onClick={() => setSelectedCourse(c.id)}>
                                <div className="channel-avatar" style={{ background: c.coverColor }}>{c.courseCode?.[0]}</div>
                                <div className="channel-info">
                                    <div className="channel-name">{c.courseName}</div>
                                    <div className="channel-meta">{c.courseCode}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Main Chat */}
                    <div className="messages-main">
                        {view === 'group' ? (
                            <>
                                <div className="chat-header">
                                    <h3>{courses.find(c => c.id === selectedCourse)?.courseName || 'Select a course'}</h3>
                                </div>
                                <div className="chat-messages">
                                    {messages.length > 0 ? messages.map((m: any) => (
                                        <div key={m.id} className="chat-bubble">
                                            <div className="bubble-header">
                                                <span className="bubble-sender">{m.sender?.firstName} {m.sender?.lastName}</span>
                                                <span className="bubble-time">{new Date(m.createdAt).toLocaleString()}</span>
                                            </div>
                                            <div className="bubble-content">{m.content}</div>
                                        </div>
                                    )) : <div className="empty-state"><p>No messages yet. Start the conversation!</p></div>}
                                </div>
                                <form className="chat-input" onSubmit={sendMessage}>
                                    <input className="form-input" placeholder="Type a message..." value={newMsg} onChange={e => setNewMsg(e.target.value)} />
                                    <button className="btn btn-primary" style={{ width: 'auto' }} type="submit">Send</button>
                                </form>
                            </>
                        ) : (
                            <div style={{ padding: '2rem' }}>
                                <h3 style={{ marginBottom: '1rem' }}>📣 Broadcast to {courses.find(c => c.id === selectedCourse)?.courseName}</h3>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>Send a message to all enrolled students via direct message.</p>
                                <form onSubmit={sendBroadcast}>
                                    <div className="form-group"><label className="form-label">Subject (optional)</label><input className="form-input" value={broadcastForm.subject} onChange={e => setBroadcastForm({ ...broadcastForm, subject: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Message</label><textarea className="form-input" rows={5} value={broadcastForm.content} onChange={e => setBroadcastForm({ ...broadcastForm, content: e.target.value })} required /></div>
                                    <button className="btn btn-primary" style={{ width: 'auto' }} type="submit">📣 Send Broadcast</button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default TeacherMessages;
