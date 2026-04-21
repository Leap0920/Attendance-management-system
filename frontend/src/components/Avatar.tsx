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
}) => {
  const [imageFailed, setImageFailed] = React.useState(false);
  const resolvedAvatarUrl =
    avatarUrl && avatarUrl.trim()
      ? avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')
        ? avatarUrl
        : `http://${window.location.hostname}:8080${avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`}`
      : '';

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
      <div style={baseStyle}>
        <img
          src={resolvedAvatarUrl}
          alt="avatar"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={() => setImageFailed(true)}
        />
      </div>
    );
  }

  return <div style={baseStyle}>{getInitials(firstName, lastName)}</div>;
};

export default Avatar;
