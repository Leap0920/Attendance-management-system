import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ShieldCheck, ArrowRight, RefreshCw, AlertCircle, KeyRound, Lock, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../../api';
import MagicRings from '../../components/MagicRings/MagicRings';
import './Login.css';

const ForgotPassword: React.FC = () => {
    const [step, setStep] = useState<1 | 2>(1);
    const [email, setEmail] = useState('');
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const [staticRingsFallback, setStaticRingsFallback] = useState(false);

    const navigate = useNavigate();

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await authApi.forgotPassword(email);
            setStep(2);
            setMessage('Verification code sent to your email.');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to send reset code. Please check your email.');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) value = value.slice(-1);
        if (!/^\d*$/.test(value)) return;

        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);

        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handleResetSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        const otpCode = code.join('');
        if (otpCode.length !== 6) {
            setError('Please enter the full 6-digit code');
            return;
        }

        setError('');
        setLoading(true);
        try {
            await authApi.resetPassword({ email, code: otpCode, newPassword });
            setMessage('Password reset successful! Redirecting to login...');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to reset password. Please check the code.');
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
                    ringCount={4}
                    speed={0.8}
                    opacity={0.4}
                    onInitError={() => setStaticRingsFallback(true)}
                />
            </div>
            <div className="login-page__scrim" aria-hidden />

            <div className="login-page__inner" style={{ maxWidth: '500px', display: 'block' }}>
                <header className="login-hero animate-slide-up stagger-1" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{ 
                        display: 'inline-flex', 
                        padding: '1.25rem', 
                        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', 
                        borderRadius: '24px', 
                        color: '#2563eb', 
                        marginBottom: '1.75rem',
                        boxShadow: '0 8px 16px rgba(37, 99, 235, 0.1)'
                    }}>
                        {step === 1 ? <KeyRound size={48} /> : <Lock size={48} />}
                    </div>
                    <h1 className="login-hero__title" style={{ marginBottom: '0.75rem' }}>
                        {step === 1 ? 'Forgot Password?' : 'Reset Password'}
                    </h1>
                    <p className="login-hero__lead" style={{ fontSize: '1rem' }}>
                        {step === 1 
                            ? "Enter your institutional email and we'll send you a code to reset your password."
                            : `We've sent a 6-digit code to ${email}. Enter it below along with your new password.`
                        }
                    </p>
                </header>

                <div className="login-card-wrap animate-slide-up stagger-2">
                    <div className="login-card" style={{ padding: '2.5rem' }}>
                        {error && (
                            <div className="alert alert-error animate-fade-in" style={{ marginBottom: '1.5rem' }}>
                                <AlertCircle size={18} style={{ marginRight: '8px', flexShrink: 0 }} />
                                {error}
                            </div>
                        )}
                        {message && (
                            <div className="alert alert-success animate-fade-in" style={{ marginBottom: '1.5rem' }}>
                                <ShieldCheck size={18} style={{ marginRight: '8px', flexShrink: 0 }} />
                                {message}
                            </div>
                        )}

                        {step === 1 ? (
                            <form onSubmit={handleEmailSubmit}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="forgot-email">Email Address</label>
                                    <div style={{ position: 'relative' }}>
                                        <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input
                                            id="forgot-email"
                                            type="email"
                                            className="form-input"
                                            placeholder="you@school.edu"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            style={{ paddingLeft: '3rem' }}
                                            required
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={loading}
                                    style={{ 
                                        width: '100%', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        gap: '0.75rem',
                                        height: '3.5rem',
                                        borderRadius: '14px',
                                        marginTop: '1rem'
                                    }}
                                >
                                    {loading ? <RefreshCw className="animate-spin" size={20} /> : 'Send Reset Code'}
                                </button>
                                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                                    <Link to="/login" style={{ color: '#2563eb', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none' }}>Back to Sign In</Link>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleResetSubmit}>
                                <div className="otp-container">
                                    {code.map((digit, idx) => (
                                        <input
                                            key={idx}
                                            id={`otp-${idx}`}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            placeholder="0"
                                            onChange={(e) => handleOtpChange(idx, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                                            className={`otp-box animate-scale-in stagger-${idx + 1}`}
                                            required
                                        />
                                    ))}
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="new-password">New Password</label>
                                    <div className="password-input-wrapper">
                                        <input
                                            id="new-password"
                                            type={showPassword ? 'text' : 'password'}
                                            className="form-input"
                                            placeholder="••••••••"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            minLength={8}
                                        />
                                        <button
                                            type="button"
                                            className="password-toggle-btn"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    <div className="password-requirements" style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                        {[
                                            { label: '8+ Characters', met: newPassword.length >= 8 },
                                            { label: '1+ Number', met: /\d/.test(newPassword) },
                                            { label: '1+ Symbol', met: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) }
                                        ].map((req, i) => (
                                            <div key={i} style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '0.4rem', 
                                                fontSize: '0.72rem',
                                                fontWeight: 600,
                                                color: req.met ? '#10b981' : '#94a3b8',
                                                transition: 'all 0.3s ease'
                                            }}>
                                                <ShieldCheck size={12} style={{ opacity: req.met ? 1 : 0.4 }} />
                                                {req.label}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="confirm-password">Confirm Password</label>
                                    <input
                                        id="confirm-password"
                                        type={showPassword ? 'text' : 'password'}
                                        className="form-input"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={loading}
                                    style={{ 
                                        width: '100%', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        gap: '0.75rem',
                                        height: '3.5rem',
                                        borderRadius: '14px',
                                        marginTop: '1.5rem'
                                    }}
                                >
                                    {loading ? <RefreshCw className="animate-spin" size={20} /> : 'Reset Password'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                <footer className="animate-fade-in stagger-5" style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--login-text-muted)', fontSize: '0.85rem' }}>
                    <p>Protected by System Security Protocol</p>
                </footer>
            </div>
        </div>
    );
};

export default ForgotPassword;
