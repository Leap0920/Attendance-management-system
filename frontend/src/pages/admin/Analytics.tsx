import React, { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus, Download, Calendar,
  Users, BookOpen, Activity, RefreshCw, ChevronDown
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { adminApi } from '../../api';

const CHART_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#14B8A6'];

const DATE_RANGES = [
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 },
  { label: 'Last Year', days: 365 },
];

interface StatCard {
  label: string;
  value: number;
  trend: number;
  trendDirection: string;
  icon: string;
  color: string;
}

const AdminAnalytics: React.FC = () => {
  const [stats, setStats] = useState<Record<string, StatCard> | null>(null);
  const [userGrowth, setUserGrowth] = useState<any[]>([]);
  const [loginActivity, setLoginActivity] = useState<any[]>([]);
  const [usersByRole, setUsersByRole] = useState<any[]>([]);
  const [coursesByStatus, setCoursesByStatus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState(30);
  const [showRangeDropdown, setShowRangeDropdown] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - selectedRange * 86400000).toISOString();

      const [statsRes, growthRes, loginRes, roleRes, statusRes] = await Promise.all([
        adminApi.getDashboardStats(),
        adminApi.getUserAnalytics(startDate, endDate),
        adminApi.getLoginAnalytics(startDate, endDate),
        adminApi.getUsersByRole(),
        adminApi.getCoursesByStatus(),
      ]);

      if (statsRes.data?.success) setStats(statsRes.data.data);

      if (growthRes.data?.success) {
        setUserGrowth(growthRes.data.data.map((d: any) => ({
          ...d,
          timestamp: d.timestamp ? new Date(d.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
        })));
      }

      if (loginRes.data?.success) {
        setLoginActivity(loginRes.data.data.map((d: any) => ({
          ...d,
          timestamp: d.timestamp ? new Date(d.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
        })));
      }

      if (roleRes.data?.success) {
        setUsersByRole(Object.entries(roleRes.data.data).map(([name, value]) => ({
          name: name.charAt(0) + name.slice(1).toLowerCase(),
          value,
        })));
      }

      if (statusRes.data?.success) {
        setCoursesByStatus(Object.entries(statusRes.data.data).map(([name, value]) => ({
          name: name.charAt(0) + name.slice(1).toLowerCase(),
          value,
        })));
      }

      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [selectedRange]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const exportData = (format: 'csv' | 'json') => {
    const data = {
      userGrowth,
      loginActivity,
      usersByRole,
      coursesByStatus,
      exportedAt: new Date().toISOString(),
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // CSV: flatten user growth data
      const header = 'Date,Metric,Value\n';
      const rows = userGrowth.map(d => `${d.timestamp},User Growth,${d.value}`).join('\n')
        + '\n' + loginActivity.map(d => `${d.timestamp},Login Activity,${d.value}`).join('\n');
      const blob = new Blob([header + rows], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const getTrendIcon = (dir: string) => {
    if (dir === 'UP') return <TrendingUp size={14} />;
    if (dir === 'DOWN') return <TrendingDown size={14} />;
    return <Minus size={14} />;
  };

  const getStatIcon = (icon: string) => {
    const map: Record<string, React.ReactNode> = {
      users: <Users size={20} />,
      book: <BookOpen size={20} />,
      'user-check': <Users size={20} />,
      login: <Activity size={20} />,
      shield: <Activity size={20} />,
      activity: <Activity size={20} />,
    };
    return map[icon] || <Activity size={20} />;
  };

  const getColorMap = (color: string) => {
    const map: Record<string, { bg: string; fg: string }> = {
      blue: { bg: 'rgba(59, 130, 246, 0.1)', fg: '#3b82f6' },
      green: { bg: 'rgba(16, 185, 129, 0.1)', fg: '#10b981' },
      purple: { bg: 'rgba(139, 92, 246, 0.1)', fg: '#8b5cf6' },
      indigo: { bg: 'rgba(99, 102, 241, 0.1)', fg: '#6366f1' },
      red: { bg: 'rgba(239, 68, 68, 0.1)', fg: '#ef4444' },
      yellow: { bg: 'rgba(245, 158, 11, 0.1)', fg: '#f59e0b' },
    };
    return map[color] || map.blue;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="adm-chart-tooltip">
          <p className="adm-chart-tooltip-label">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} style={{ color: p.color, margin: '2px 0' }}>
              {p.name || p.dataKey}: <strong>{p.value?.toLocaleString()}</strong>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardLayout role="admin">
      <div className="page-header animate-fade-in">
        <div>
          <h1 className="page-title gradient-text">System Analytics</h1>
          <p className="page-subtitle">Historical data and growth metrics</p>
        </div>
        <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
          {/* Date Range Selector */}
          <div className="adm-dropdown-wrap">
            <button
              className="adm-dropdown-btn"
              onClick={() => setShowRangeDropdown(!showRangeDropdown)}
            >
              <Calendar size={14} />
              {DATE_RANGES.find(r => r.days === selectedRange)?.label}
              <ChevronDown size={14} />
            </button>
            {showRangeDropdown && (
              <div className="adm-dropdown-menu">
                {DATE_RANGES.map(r => (
                  <button
                    key={r.days}
                    className={`adm-dropdown-item ${selectedRange === r.days ? 'active' : ''}`}
                    onClick={() => { setSelectedRange(r.days); setShowRangeDropdown(false); }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="btn btn-secondary shadow-sm hover:shadow-md transition-all" style={{ width: 'auto', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} onClick={() => exportData('csv')}>
            <Download size={16} />
            Export CSV
          </button>
          
          <button
            className={`adm-icon-btn ${refreshing ? 'spinning' : ''}`}
            onClick={handleRefresh}
            title="Refresh data"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-screen" style={{ minHeight: '60vh' }}><div className="spinner"></div></div>
      ) : (
        <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {/* Stat Cards */}
          {stats && (
            <div className="adm-stats-row">
              {Object.values(stats).map((stat, i) => {
                const colors = getColorMap(stat.color);
                return (
                  <div key={i} className="premium-card adm-stat-card" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="adm-stat-icon" style={{ background: colors.bg, color: colors.fg }}>
                      {getStatIcon(stat.icon)}
                    </div>
                    <div className="adm-stat-info">
                      <span className="adm-stat-label">{stat.label}</span>
                      <span className="adm-stat-value">{stat.value?.toLocaleString()}</span>
                      <span className={`adm-stat-trend ${stat.trendDirection === 'UP' ? 'up' : stat.trendDirection === 'DOWN' ? 'down' : 'stable'}`}>
                        {getTrendIcon(stat.trendDirection)}
                        {Math.abs(stat.trend).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Charts Row 1: User Growth + Login Activity */}
          <div className="adm-charts-row">
            <div className="premium-card" style={{ padding: '1.5rem' }}>
              <h3 className="adm-chart-title">User Growth Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={userGrowth}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-glass)" />
                  <XAxis dataKey="timestamp" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dx={-10} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)', radius: 4 }} />
                  <Area
                    type="monotone" dataKey="value" name="Total Users"
                    stroke="#2563eb" strokeWidth={3}
                    fillOpacity={1} fill="url(#colorUsers)"
                    animationDuration={1200}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="premium-card" style={{ padding: '1.5rem' }}>
              <h3 className="adm-chart-title">Activity Metrics</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={loginActivity}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-glass)" />
                  <XAxis dataKey="timestamp" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dx={-10} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)', radius: 4 }} />
                  <Bar
                    dataKey="value" name="Logins" fill="#10B981"
                    radius={[6, 6, 0, 0]} animationDuration={1200}
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 2: Users by Role + Courses by Status */}
          <div className="adm-charts-row">
            <div className="premium-card" style={{ padding: '1.5rem' }}>
              <h3 className="adm-chart-title">User Segments</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2rem' }}>
                <div style={{ flex: 1, minWidth: '250px' }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={usersByRole}
                        cx="50%" cy="50%"
                        innerRadius={60} outerRadius={100}
                        paddingAngle={8}
                        dataKey="value"
                        animationDuration={1200}
                      >
                        {usersByRole.map((_entry, index) => (
                          <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ flex: 1 }}>
                  {usersByRole.map((entry, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{ background: CHART_COLORS[index % CHART_COLORS.length], width: '12px', height: '12px', borderRadius: '4px' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{entry.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{entry.value} members</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="premium-card" style={{ padding: '1.5rem' }}>
              <h3 className="adm-chart-title">Courses by Status</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={coursesByStatus} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-glass)" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={80} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)', radius: 4 }} />
                  <Bar
                    dataKey="value" name="Courses"
                    radius={[0, 6, 6, 0]} animationDuration={1200}
                    barSize={30}
                  >
                    {coursesByStatus.map((_entry, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminAnalytics;
