import React, { useState, useEffect } from 'react';
import { Monitor, AlertTriangle, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';

interface DesktopOnlyGuardProps {
  children: React.ReactNode;
}

export const DesktopOnlyGuard: React.FC<DesktopOnlyGuardProps> = ({ children }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isMobile) {
    return (
      <div className="mobile-restriction-screen">
        <div className="mobile-restriction-icon-box">
          <Monitor size={48} />
        </div>
        
        <h1 className="mobile-restriction-title">Desktop Access Only</h1>
        <p className="mobile-restriction-text">
          The System Administration panel is optimized for large screens to ensure security and precise management. 
          Please access this dashboard from a desktop computer.
        </p>
        
        <div className="mobile-restriction-warning">
          <AlertTriangle className="text-amber-500" size={20} />
          <p>
            Mobile access is restricted for security reasons and to prevent accidental system configuration changes.
          </p>
        </div>
        
        <div className="flex flex-col gap-3 w-full">
          <button 
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="mobile-restriction-btn"
            style={{ justifyContent: 'center', width: '100%', maxWidth: '360px', margin: '0 auto' }}
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>

        <div className="mobile-restriction-footer">
          AttendEase Security Protocol 4.0
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
