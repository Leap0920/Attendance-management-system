import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Mail, ArrowRight, RefreshCw } from 'lucide-react';
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

            <div className="login-page__inner" style={{ maxWidth: '500px', display: 'block' }}>
                <header className="login-hero" style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'inline-flex', padding: '1rem', background: '#eff6ff', borderRadius: '20px', color: '#2563eb', marginBottom: '1.5rem' }}>
                        <ShieldCheck size={40} />
                    </div>
                    <h1 className="login-hero__title">Verify your email</h1>
                    <p className="login-hero__lead">
                        We've sent a 6-digit verification code to <br />
                        <strong style={{ color: 'var(--login-text)' }}>{email}</strong>
                    </p>
                </header>

                <div className="login-card-wrap">
                    <div className="login-card">
                        {error && <div className="alert alert-error">{error}</div>}
                        {message && <div className="alert alert-success">{message}</div>}

                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '2rem' }}>
                                {code.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        id={`otp-${idx}`}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleChange(idx, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(idx, e)}
                                        className="form-input"
                                        style={{
                                            width: '3.5rem',
                                            height: '4rem',
                                            textAlign: 'center',
                                            fontSize: '1.5rem',
                                            fontWeight: 'bold',
                                            padding: 0
                                        }}
                                        required
                                    />
                                ))}
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}
                            >
                                {loading ? 'Verifying...' : (
                                    <>
                                        Verify Account <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="login-card__footer">
                            <p>Didn't receive the code?</p>
                            <button
                                onClick={handleResend}
                                disabled={resending}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--login-blue)',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    marginTop: '0.5rem'
                                }}
                            >
                                {resending ? 'Resending...' : (
                                    <>
                                        <RefreshCw size={16} className={resending ? 'animate-spin' : ''} /> Resend Code
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmail;
