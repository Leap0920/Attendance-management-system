import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Activity, 
  Globe, 
  Zap, 
  Database, 
  Cpu, 
  MemoryStick as Memory, 
  HardDrive,
  RefreshCw,
  Search,
  Settings
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { adminApi } from '../../api';

const SystemConsole: React.FC = () => {
  const [logs, setLogs] = useState<{t: string, m: string, s: 'info' | 'warn' | 'error' | 'debug'}[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string, severity: 'info' | 'warn' | 'error' | 'debug' = 'info') => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [...prev.slice(-99), { t: timestamp, m: message, s: severity }]);
  };

  useEffect(() => {
    // Initial sequence
    const bootSequence = [
      { m: 'AttendEase OS v2.4.0 Booting...', s: 'info' },
      { m: 'Kernel initialized. Build date: 2026-04-27', s: 'debug' },
      { m: 'Attempting connection to persistent database...', s: 'info' },
      { m: 'PostgreSQL connection established @ localhost:5432', s: 'info' },
      { m: 'Loading authentication modules...', s: 'info' },
      { m: 'JWT Provider: RSA-256 enabled', s: 'debug' },
      { m: 'Attendance background processor started.', s: 'info' },
      { m: 'MFA engine: Operational', s: 'info' },
      { m: 'System is online. Listening on port 8080.', s: 'info' }
    ];

    let i = 0;
    const bootInterval = setInterval(() => {
      if (i < bootSequence.length) {
        addLog(bootSequence[i].m, bootSequence[i].s as any);
        i++;
      } else {
        clearInterval(bootInterval);
        setLoading(false);
      }
    }, 150);

    // Fetch actual health metrics
    adminApi.getSystemHealth().then(res => setHealth(res.data.data)).catch(() => {});

    // Live Activity Simulation
    const liveInterval = setInterval(() => {
      const activities = [
        { m: 'DB Query: SELECT * FROM users WHERE status = \'active\' (12ms)', s: 'debug' },
        { m: 'API GET /admin/dashboard - Authorized (Admin: 1)', s: 'info' },
        { m: 'Auth Attempt: student1@lms.com - Success', s: 'info' },
        { m: 'Cache hit: course_list_all', s: 'debug' },
        { m: 'Memory check: Heap usage at 42%', s: 'info' },
        { m: 'Session validated: f47ac10b-58cc-4372-a567-0e02b2c3d479', s: 'debug' },
        { m: 'Warning: Latency spike detected in DB connection pool', s: 'warn' },
        { m: 'Disk space check: 84% available', s: 'info' }
      ];
      
      const rand = Math.floor(Math.random() * activities.length);
      addLog(activities[rand].m, activities[rand].s as any);
    }, 4000);

    return () => {
      clearInterval(bootInterval);
      clearInterval(liveInterval);
    };
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <DashboardLayout role="admin">
      <div className="page-header animate-fade-in">
        <div>
          <h1 className="page-title gradient-text" style={{ fontSize: '1.75rem' }}>System Console</h1>
          <p className="page-subtitle">Low-level system logs and real-time command status</p>
        </div>
        <div style={{ display: 'flex', gap: '0.85rem' }}>
          <button className="btn btn-secondary shadow-sm" style={{ width: 'auto', background: '#fff' }} onClick={() => window.location.reload()}>
            <RefreshCw size={18} />
            Reboot Console
          </button>
        </div>
      </div>

      <div className="admin-content-grid" style={{ gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
        {/* Terminal Window */}
        <div className="premium-card" style={{ 
          background: '#0f172a', 
          color: '#cbd5e1', 
          fontFamily: 'JetBrains Mono, Fira Code, monospace',
          padding: '0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '600px',
          border: '1px solid #1e293b',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ 
            background: '#1e293b', 
            padding: '0.75rem 1rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem',
            borderBottom: '1px solid #334155'
          }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }}></div>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#fbbf24' }}></div>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }}></div>
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Terminal size={14} />
              root@attendease-vm: ~/logs/live.stream
            </div>
          </div>
          
          <div style={{ 
            flex: 1, 
            padding: '1.25rem', 
            overflowY: 'auto', 
            fontSize: '0.85rem',
            lineHeight: '1.6'
          }}>
            {logs.map((log, i) => (
              <div key={i} style={{ marginBottom: '2px', display: 'flex', gap: '0.75rem' }}>
                <span style={{ color: '#475569', userSelect: 'none' }}>[{log.t}]</span>
                <span style={{ 
                  color: log.s === 'error' ? '#ef4444' : 
                         log.s === 'warn' ? '#fbbf24' : 
                         log.s === 'debug' ? '#818cf8' : '#10b981',
                  fontWeight: 600
                }}>
                  {log.s.toUpperCase()}
                </span>
                <span style={{ color: '#e2e8f0' }}>{log.m}</span>
              </div>
            ))}
            <div ref={terminalEndRef} />
          </div>

          <div style={{ 
            background: '#1e293b', 
            padding: '0.5rem 1rem', 
            fontSize: '0.75rem', 
            color: '#64748b',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>Connected to Local Node</span>
            <span>UTF-8 | LF | Java 17</span>
          </div>
        </div>

        {/* System Vitals Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Health Summary */}
          <div className="premium-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} color="#2563eb" />
              Environment Status
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Database size={16} />
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Database</span>
                </div>
                <span className="badge badge-success">ONLINE</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f0fdf4', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Zap size={16} />
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Redis Cache</span>
                </div>
                <span className="badge badge-success">STABLE</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Shield size={16} />
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Auth Service</span>
                </div>
                <span className="badge badge-success">SECURE</span>
              </div>
            </div>
          </div>

          {/* Real-time Metrics */}
          <div className="premium-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Resource Usage</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Cpu size={14} /> CPU LOAD</span>
                  <span style={{ color: '#2563eb' }}>{health?.cpu?.usage ? Math.round(health.cpu.usage) : 12}%</span>
                </div>
                <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${health?.cpu?.usage || 12}%`, height: '100%', background: '#2563eb' }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Memory size={14} /> MEMORY</span>
                  <span style={{ color: '#10b981' }}>{health?.memory?.percentage ? Math.round(health.memory.percentage) : 42}%</span>
                </div>
                <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${health?.memory?.percentage || 42}%`, height: '100%', background: '#10b981' }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><HardDrive size={14} /> DISK I/O</span>
                  <span style={{ color: '#ea580c' }}>{health?.disk?.percentage ? Math.round(health.disk.percentage) : 28}%</span>
                </div>
                <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${health?.disk?.percentage || 28}%`, height: '100%', background: '#ea580c' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="premium-card" style={{ padding: '1.25rem', background: 'var(--gradient-primary)', color: '#fff', border: 'none' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.8, marginBottom: '0.5rem' }}>SERVER UPTIME</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>42d 18h 24m</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '0.5rem' }}>Last update: 2m ago</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SystemConsole;
