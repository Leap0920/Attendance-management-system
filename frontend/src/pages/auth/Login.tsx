import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import MagicRings from '../../components/MagicRings/MagicRings';
import './Login.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [staticRingsFallback, setStaticRingsFallback] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.mfaRequired) {
        navigate('/mfa');
      } else {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        navigate(`/${user.role || ''}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -9, y: px * 12 });
  };

  const tiltStyle = {
    '--login-tilt-x': `${tilt.x}deg`,
    '--login-tilt-y': `${tilt.y}deg`,
  } as React.CSSProperties;

  return (
    <div
      className={`login-page${staticRingsFallback ? ' login-page--static-rings' : ''}`}
      style={tiltStyle}
      onMouseMove={handlePageMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
    >
      <div className="login-magic-fallback" aria-hidden>
        <div className="login-css-rings" />
      </div>
      <div className="login-magic-rings">
        <MagicRings
          color="#3b82f6"
          colorTwo="#2563eb"
          ringCount={6}
          speed={1}
          attenuation={10}
          lineThickness={2}
          baseRadius={0.35}
          radiusStep={0.1}
          scaleRate={0.1}
          opacity={0.58}
          blur={0}
          noiseAmount={0.08}
          rotation={0}
          ringGap={1.5}
          fadeIn={0.7}
          fadeOut={0.5}
          followMouse={false}
          mouseInfluence={0.2}
          hoverScale={1.2}
          parallax={0.05}
          clickBurst={false}
          onInitError={() => setStaticRingsFallback(true)}
        />
      </div>
      <div className="login-page__scrim" aria-hidden />

      <div className="login-page__inner">
        <header className="login-hero">
          <span className="login-hero__badge">Enterprise attendance</span>
          <h1 className="login-hero__title">
            Welcome back to <span className="login-hero__title-accent">AttendEase</span>
          </h1>
          <p className="login-hero__lead">
            Track sessions, course materials, and messaging in one place — with a dashboard that stays in sync
            across teachers, students, and admins.
          </p>
          <div className="login-hero__chips" aria-hidden>
            <span className="login-hero__chip">Live sessions</span>
            <span className="login-hero__chip">Course stream</span>
            <span className="login-hero__chip">Secure sign-in</span>
          </div>
        </header>

        <div className="login-card-wrap">
          <div className="login-card">
            <h2 className="login-card__title">Sign in</h2>
            <p className="login-card__subtitle">Use your institutional email to continue</p>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="login-email">
                  Email address
                </label>
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  placeholder="you@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="login-password">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <button id="login-submit" type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <p className="login-card__footer">
              Don&apos;t have an account? <Link to="/register">Create one</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
