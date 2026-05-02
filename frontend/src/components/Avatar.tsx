import React from 'react';
import { getInitials } from '../utils/initials';

interface AvatarProps {
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  /** Pixel size (width & height). Default 32. */
  size?: number;
  /** 'blue' = gradient blue/indigo (default), 'green' = solid green */
  variant?: 'blue' | 'green';
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Reusable avatar circle with consistent initials.
 *
 * If `avatarUrl` is provided it renders an image; otherwise it
 * shows the user's two-letter initials on a coloured background.
 */
const Avatar: React.FC<AvatarProps> = ({
  firstName,
  lastName,
  avatarUrl,
  size = 32,
  variant = 'blue',
  style,
  className = '',
}) => {
  const [imageFailed, setImageFailed] = React.useState(false);
  const resolvedAvatarUrl = React.useMemo(() => {
    if (!avatarUrl || !avatarUrl.trim()) return '';
    
    // If it's already a full URL, just return it
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      return avatarUrl;
    }
    
    // Build the base URL for the backend
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = '8080'; // Backend port
    
    // Ensure we handle leading slashes correctly
    const path = avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`;
    
    // Check if path already includes /api (if backend serves files under /api)
    // Most Spring Boot setups serve static content outside /api, but let's be safe
    const base = `${protocol}//${hostname}:${port}${path}`;
    
    // Add a cache buster with a shorter key to ensure fresh display after update
    return `${base}${base.includes('?') ? '&' : '?'}v=${Date.now()}`;
  }, [avatarUrl]);

  const bg =
    variant === 'green'
      ? '#10b981'
      : 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)';

  const baseStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    background: bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 700,
    fontSize: size * 0.38,
    flexShrink: 0,
    overflow: 'hidden',
    lineHeight: 1,
    ...style,
  };

  if (resolvedAvatarUrl && !imageFailed) {
    return (
      <div style={baseStyle} className={className}>
        <img
          src={resolvedAvatarUrl}
          alt="avatar"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={() => setImageFailed(true)}
        />
      </div>
    );
  }

  return <div style={baseStyle} className={className}>{getInitials(firstName, lastName)}</div>;
};

export default Avatar;
