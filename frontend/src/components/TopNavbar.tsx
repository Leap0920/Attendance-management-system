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

  const handleLogout = async () => {
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
              <button className="dropdown-item logout" onClick={handleLogout}>
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;
