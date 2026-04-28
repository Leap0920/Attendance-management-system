import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import MagicRings from '../../components/MagicRings/MagicRings';
import './Login.css'; // Reuse login styles

const VerifyEmail: React.FC = () => {
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const [staticRingsFallback, setStaticRingsFallback] = useState(false);
    
    const { verifyEmail, resendCode } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email || '';

    useEffect(() => {
        if (!email) {
            navigate('/login');
        }
    }, [email, navigate]);

    const handleChange = (index: number, value: string) => {
        if (value.length > 1) value = value.slice(-1);
        if (!/^\d*$/.test(value)) return;

        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);

        // Auto focus next
        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const otpCode = code.join('');
        if (otpCode.length !== 6) {
            setError('Please enter the full 6-digit code');
            return;
        }

        setError('');
        setLoading(true);
        try {
            await verifyEmail(email, otpCode);
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            navigate(`/${user.role || ''}`);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Verification failed. Please check the code.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResending(true);
        setError('');
        setMessage('');
        try {
            await resendCode(email);
            setMessage('Verification code resent to your email.');
        } catch (err: any) {
            setError('Failed to resend code. Please try again later.');
        } finally {
            setResending(false);
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

            <div className="login-page__inner" style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '1.5rem' }}>
                <header className="login-hero animate-slide-up stagger-1" style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <div style={{ 
                        display: 'inline-flex', 
                        padding: '1.25rem', 
                        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', 
                        borderRadius: '24px', 
                        color: '#2563eb', 
                        marginBottom: '1.75rem',
                        boxShadow: '0 8px 16px rgba(37, 99, 235, 0.1)'
                    }}>
                        <ShieldCheck size={48} />
                    </div>
                    <h1 className="login-hero__title" style={{ marginBottom: '0.75rem' }}>Secure Verification</h1>
                    <p className="login-hero__lead" style={{ fontSize: '1rem' }}>
                        We've sent a 6-digit verification code to
                        <span style={{ 
                            display: 'block', 
                            marginTop: '0.5rem', 
                            color: '#2563eb', 
                            fontWeight: 700,
                            background: '#f0f7ff',
                            padding: '0.5rem 1rem',
                            borderRadius: '12px',
                            border: '1px dashed #bfdbfe'
                        }}>{email}</span>
                    </p>
                </header>

                <div className="login-card-wrap animate-slide-up stagger-2" style={{ maxWidth: '460px', margin: '0 auto' }}>
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

                        <form onSubmit={handleSubmit}>
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
                                        onChange={(e) => handleChange(idx, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(idx, e)}
                                        className={`otp-box animate-scale-in stagger-${idx + 1}`}
                                        autoFocus={idx === 0}
                                        required
                                    />
                                ))}
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
                                    fontSize: '1.05rem',
                                    borderRadius: '14px',
                                    boxShadow: '0 10px 20px -5px rgba(37, 99, 235, 0.3)'
                                }}
                            >
                                {loading ? (
                                    <>
                                        <RefreshCw size={20} className="animate-spin" /> Verifying...
                                    </>
                                ) : (
                                    <>
                                        Verify & Continue <ArrowRight size={20} />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="login-card__footer animate-fade-in stagger-5" style={{ marginTop: '2rem' }}>
                            <p style={{ color: 'var(--login-text-muted)', fontSize: '0.9rem' }}>Didn't receive the code?</p>
                            <button
                                onClick={handleResend}
                                disabled={resending}
                                className="hover:translate-y-[-1px] transition-transform"
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--login-blue)',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    marginTop: '0.6rem',
                                    fontSize: '0.95rem'
                                }}
                            >
                                {resending ? 'Sending...' : (
                                    <>
                                        <RefreshCw size={18} className={resending ? 'animate-spin' : ''} /> Resend OTP
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                <footer className="animate-fade-in stagger-5" style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--login-text-muted)', fontSize: '0.85rem' }}>
                    <p>Protected by System Security Protocol</p>
                </footer>
            </div>
        </div>
    );
};

export default VerifyEmail;
