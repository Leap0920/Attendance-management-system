import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { studentApi } from '../../api';

const StudentMessages: React.FC = () => {
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMsg, setNewMsg] = useState('');

    useEffect(() => {
        studentApi.getCourses().then(res => {
            const data = res.data.data || [];
            const courseList = data.map((d: any) => d.course);
            setCourses(courseList);
            if (courseList.length > 0) setSelectedCourse(courseList[0].id);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (selectedCourse) loadMessages();
    }, [selectedCourse]);

    const loadMessages = () => {
        if (selectedCourse) {
            studentApi.getGroupMessages(selectedCourse).then(res => setMessages(res.data.data || [])).catch(() => { });
        }
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMsg.trim() || !selectedCourse) return;
        await studentApi.sendGroupMessage({ courseId: selectedCourse, content: newMsg });
        setNewMsg('');
        loadMessages();
    };

    return (
        <DashboardLayout role="student">
            <div className="page-header">
                <div><h1 className="page-title">Messages</h1><p className="page-subtitle">Course group chat</p></div>
            </div>

            {loading ? <div className="loading-screen"><div className="spinner"></div></div> : (
                <div className="messages-layout">
                    {/* Sidebar */}
                    <div className="messages-sidebar">
                        <div style={{ marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>My Courses</div>
                        {courses.map((c: any) => (
                            <div key={c.id} className={`message-channel ${selectedCourse === c.id ? 'active' : ''}`} onClick={() => setSelectedCourse(c.id)}>
                                <div className="channel-avatar" style={{ background: c.coverColor }}>{c.courseCode?.[0]}</div>
                                <div className="channel-info">
                                    <div className="channel-name">{c.courseName}</div>
                                    <div className="channel-meta">{c.courseCode}</div>
                                </div>
                            </div>
                        ))}
                        {courses.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '1rem' }}>No courses enrolled</p>}
                    </div>

                    {/* Chat Area */}
                    <div className="messages-main">
                        <div className="chat-header">
                            <h3>{courses.find((c: any) => c.id === selectedCourse)?.courseName || 'Select a course'}</h3>
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
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default StudentMessages;
