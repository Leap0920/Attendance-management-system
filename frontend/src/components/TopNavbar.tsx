import React, { useState } from 'react';
import { Search, LogOut, ChevronDown, User, Settings, Shield } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import Avatar from './Avatar';

interface TopNavbarProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  actions?: React.ReactNode;
  onProfileClick?: () => void;
}

const TopNavbar: React.FC<TopNavbarProps> = ({ searchQuery, onSearchChange, actions, onProfileClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    navigate('/login');
  };

  return (
    <header className="top-navbar">
      <div className="top-navbar-left">
        {onSearchChange && (
          <div className="top-navbar-search">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search anything..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="search-input"
            />
          </div>
        )}
      </div>

      <div className="top-navbar-right">
        <div className="top-navbar-actions">
          {actions}
        </div>

        <div className="top-navbar-profile" onClick={() => setShowDropdown(!showDropdown)}>
          <div className="profile-info">
            <span className="profile-name">{user?.firstName} {user?.lastName}</span>
            <span className="profile-role">{user?.role}</span>
          </div>
          <div className="profile-avatar-wrapper">
             <Avatar firstName={user?.firstName} lastName={user?.lastName} avatarUrl={user?.avatar} size={40} />
          </div>
          <ChevronDown size={16} className={`dropdown-arrow ${showDropdown ? 'open' : ''}`} />

          {showDropdown && (
            <div className="profile-dropdown animate-scale-in" onClick={(e) => e.stopPropagation()}>
              <div className="dropdown-header">
                <div style={{ fontWeight: 700 }}>{user?.fullName}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.email}</div>
              </div>
              <div className="dropdown-divider" />
              <button className="dropdown-item" onClick={() => { setShowDropdown(false); onProfileClick?.(); }}>
                <User size={16} /> My Profile
              </button>
              <button className="dropdown-item" onClick={() => { 
                setShowDropdown(false); 
                // Navigate to settings based on user role
                if (user?.role === 'teacher') {
                  navigate('/teacher/settings');
                } else if (user?.role === 'student') {
                  navigate('/student/settings');
                } else if (user?.role === 'admin') {
                  navigate('/admin/settings');
                }
              }}>
                <Settings size={16} /> Settings
              </button>
              <div className="dropdown-divider" />
              <button className="dropdown-item logout" onClick={() => {
                setShowDropdown(false);
                setShowLogoutModal(true);
              }}>
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 10000 }}>
          <div className="premium-card modal animate-scale-in" style={{ maxWidth: '400px', padding: '2.5rem', textAlign: 'center' }}>
            <div className="logout-icon-circle" style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              background: 'rgba(239, 68, 68, 0.1)', 
              color: '#ef4444', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 1.5rem' 
            }}>
              <LogOut size={32} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Confirm Sign Out</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              Are you sure you want to log out? Any unsaved changes may be lost.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowLogoutModal(false)} style={{ flex: 1 }}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleLogout} style={{ flex: 1, background: '#ef4444' }}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default TopNavbar;
