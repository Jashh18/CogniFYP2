import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useNavigate, Link } from 'react-router-dom';
import './AuthPages.css';

export default function LoginPage() {
    const { login, logout } = useAuth();
    const navigate = useNavigate();
    const [loginRole, setLoginRole] = useState<'student' | 'admin'>('student');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!email || !password) {
            setError('Please fill in all fields.');
            return;
        }

        setError('');
        setLoading(true);
        try {
            const userData = await login(email, password);

            if (loginRole === 'admin' && userData?.role !== 'admin') {
                setError('No such admin exist');
                await logout();
                setLoading(false);
                return;
            }
            if (loginRole === 'student' && userData?.role !== 'student') {
                setError('No such student exist');
                await logout();
                setLoading(false);
                return;
            }

            if (userData?.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/');
            }
        } catch (err: unknown) {
            setError(
                (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
                'Login failed. Please sign up or check your credentials.'
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-bg" />

            <div className="auth-container animate-scale">
                <div className="auth-logo">
                    <span className="auth-logo-icon">📚</span>
                    <h1>Cogni</h1>
                    <p>Your AI Study Companion</p>
                </div>

                <div className="auth-tabs">
                    <button
                        className={`auth-tab ${loginRole === 'student' ? 'active' : ''}`}
                        onClick={() => setLoginRole('student')}
                        id="tab-student"
                    >
                        <span className="tab-icon">🎓</span>
                        <span className="tab-label">Student</span>
                    </button>
                    <button
                        className={`auth-tab ${loginRole === 'admin' ? 'active' : ''}`}
                        onClick={() => setLoginRole('admin')}
                        id="tab-admin"
                    >
                        <span className="tab-icon">🛡️</span>
                        <span className="tab-label">Admin</span>
                    </button>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <h2>{loginRole === 'admin' ? 'Admin Login' : 'Student Login'}</h2>

                    {error && (
                        <div className="auth-error animate-fade-in" id="login-error">
                            {error}
                        </div>
                    )}

                    <div className="input-group">
                        <label htmlFor="login-email">Email</label>
                        <input
                            id="login-email"
                            type="email"
                            className="input-field"
                            placeholder="email@gmail.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="login-password">Password</label>
                        <input
                            id="login-password"
                            type="password"
                            className="input-field"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg auth-submit"
                        disabled={loading}
                        id="login-submit"
                    >
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>

                    {loginRole === 'student' && (
                        <p className="auth-switch">
                            Don't have an account? <Link to="/signup">Sign Up</Link>
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
}