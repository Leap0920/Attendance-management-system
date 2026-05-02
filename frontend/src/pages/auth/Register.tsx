import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, User, Mail, Lock, Phone, Calendar, Info, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import MagicRings from '../../components/MagicRings/MagicRings';
import { AssistedPasswordConfirmation } from '../../components/ui/assisted-password-confirmation';
import './Login.css';

const Register: React.FC = () => {
    const location = useLocation();
    const [step, setStep] = useState(location.state?.step || 1);
    const [form, setForm] = useState({
        firstName: location.state?.firstName || '',
        lastName: location.state?.lastName || '',
        email: location.state?.email || '',
        password: '',
        role: 'student',
        studentId: '',
        department: '',
        phoneNumber: '',
        bio: '',
        gender: '',
        birthday: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [passwordsMatch, setPasswordsMatch] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [staticRingsFallback, setStaticRingsFallback] = useState(false);

    // On mount, if it's a reload, we want a clean state
    useEffect(() => {
        try {
            // Check if page was reloaded
            const isReload = (
                (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type === 'reload' ||
                (window.performance.navigation && window.performance.navigation.type === 1)
            );

            if (isReload) {
                setStep(1);
                setError('');
            }
        } catch (e) {
            console.error('Error checking navigation type:', e);
        }
    }, []);

    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (step < 3) {
            nextStep();
            return;
        }

        setError('');
        setLoading(true);
        try {
            const submissionData = {
                ...form,
                phoneNumber: `+63${form.phoneNumber}`
            };
            const result = await register(submissionData);
            if (result?.emailVerificationRequired) {
                navigate('/verify-email', { state: { email: result.email } });
            } else {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                navigate(`/${user.role || ''}`);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const renderProgress = () => (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '2rem', justifyContent: 'center' }}>
            {[1, 2, 3].map(i => (
                <div key={i} style={{
                    height: '4px',
                    width: '60px',
                    borderRadius: '2px',
                    background: i <= step ? 'var(--login-blue)' : '#e2e8f0',
                    transition: 'all 0.3s ease'
                }} />
            ))}
        </div>
    );

    return (
        <div className={`login-page${staticRingsFallback ? ' login-page--static-rings' : ''}`}>
            <div className="login-magic-rings">
                <MagicRings
                    color="#3b82f6"
                    colorTwo="#2563eb"
                    ringCount={5}
                    opacity={0.45}
                    onInitError={() => setStaticRingsFallback(true)}
                />
            </div>
            <div className="login-page__scrim" />

            <div className="login-page__inner" style={{ maxWidth: '480px', display: 'block' }}>
                <div className="login-card" style={{ padding: '2.5rem' }}>
                    <header style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <h1 className="login-card__title">Create Account</h1>
                        <p className="login-card__subtitle">Step {step} of 3: {
                            step === 1 ? 'Credential setup' : step === 2 ? 'Personal profile' : 'Institutional details'
                        }</p>
                        {renderProgress()}
                    </header>

                    {error && <div className="alert alert-error">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        {/* STEP 1: Account Basics */}
                        {step === 1 && (
                            <div className="animate-in">
                                <div className="form-group">
                                    <label className="form-label">Email Address</label>
                                    <div className="password-input-wrapper">
                                        <Mail size={18} className="input-icon" style={{ position: 'absolute', left: '1rem', color: '#64748b' }} />
                                        <input
                                            className="form-input"
                                            name="email"
                                            type="email"
                                            placeholder="you@university.edu"
                                            value={form.email}
                                            onChange={handleChange}
                                            required
                                            style={{ paddingLeft: '3rem' }}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Password</label>
                                    <div className="password-input-wrapper">
                                        <Lock size={18} className="input-icon" style={{ position: 'absolute', left: '1rem', color: '#64748b' }} />
                                        <input
                                            className="form-input"
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            value={form.password}
                                            onChange={handleChange}
                                            required
                                            minLength={8}
                                            style={{ paddingLeft: '3rem' }}
                                        />
                                        <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)}>
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    <div className="password-requirements" style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                        {[
                                            { label: '8+ Characters', met: form.password.length >= 8 },
                                            { label: '1+ Number', met: /\d/.test(form.password) },
                                            { label: '1+ Symbol', met: /[!@#$%^&*(),.?":{}|<>]/.test(form.password) }
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
                                                <CheckCircle size={12} style={{ opacity: req.met ? 1 : 0.4 }} />
                                                {req.label}
                                            </div>
                                        ))}
                                    </div>

                                    {form.password && (
                                        <div className="form-group animate-in" style={{ marginTop: '1.5rem' }}>
                                            <label className="form-label">Confirm Password</label>
                                            <AssistedPasswordConfirmation password={form.password} onMatch={setPasswordsMatch} />
                                        </div>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Account Role</label>
                                    <select className="form-input" name="role" value={form.role} onChange={handleChange}>
                                        <option value="student">Student</option>
                                        <option value="teacher">Teacher/Professor</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: Personal Profile */}
                        {step === 2 && (
                            <div className="animate-in">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">First Name</label>
                                        <input className="form-input" name="firstName" value={form.firstName} onChange={handleChange} required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Last Name</label>
                                        <input className="form-input" name="lastName" value={form.lastName} onChange={handleChange} required />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phone Number (Philippines)</label>
                                    <div className="password-input-wrapper" style={{ display: 'flex', alignItems: 'center' }}>
                                        <div style={{
                                            padding: '0.75rem 1rem',
                                            background: '#f1f5f9',
                                            border: '1px solid #e2e8f0',
                                            borderRight: 'none',
                                            borderRadius: '12px 0 0 12px',
                                            color: '#475569',
                                            fontWeight: 600,
                                            height: '46px',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}>+63</div>
                                        <input
                                            className="form-input"
                                            name="phoneNumber"
                                            value={form.phoneNumber}
                                            onChange={(e) => {
                                                let val = e.target.value.replace(/\D/g, '');
                                                if (val.startsWith('0')) val = val.substring(1);
                                                setForm({ ...form, phoneNumber: val.substring(0, 10) });
                                            }}
                                            placeholder="912 345 6789"
                                            maxLength={10}
                                            style={{
                                                borderRadius: '0 12px 12px 0',
                                                borderLeft: 'none',
                                                paddingLeft: '0.5rem',
                                                width: '100%'
                                            }}
                                            required
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Gender</label>
                                        <select className="form-input" name="gender" value={form.gender} onChange={handleChange}>
                                            <option value="">Select...</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Birthday</label>
                                        <input className="form-input" type="date" name="birthday" value={form.birthday} onChange={handleChange} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: Institutional Details */}
                        {step === 3 && (
                            <div className="animate-in">
                                <div className="form-group">
                                    <label className="form-label">Department / College</label>
                                    <input className="form-input" name="department" placeholder="e.g. Computer Science" value={form.department} onChange={handleChange} />
                                </div>
                                {form.role === 'student' && (
                                    <div className="form-group">
                                        <label className="form-label">Student ID Number</label>
                                        <input className="form-input" name="studentId" placeholder="e.g. 2023-100234" value={form.studentId} onChange={handleChange} />
                                    </div>
                                )}
                                <div className="form-group">
                                    <label className="form-label">Short Bio</label>
                                    <textarea
                                        className="form-input"
                                        name="bio"
                                        rows={3}
                                        placeholder="Tell us a bit about yourself..."
                                        value={form.bio}
                                        onChange={handleChange}
                                        style={{ resize: 'none', padding: '0.75rem' }}
                                    />
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                            {step > 1 && (
                                <button type="button" className="btn" onClick={prevStep} style={{ width: '40%', background: '#f1f5f9', color: '#475569' }}>
                                    <ArrowLeft size={18} /> Back
                                </button>
                            )}
                            <button type="submit" className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }} disabled={loading || (step === 1 && (!passwordsMatch || form.password.length < 8))}>
                                {loading ? 'Processing...' : step === 3 ? (
                                    <>Completing <CheckCircle size={18} /></>
                                ) : (
                                    <>Continue <ArrowRight size={18} /></>
                                )}
                            </button>
                        </div>
                    </form>

                    <p className="login-card__footer">
                        Already have an account? <Link to="/login">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
