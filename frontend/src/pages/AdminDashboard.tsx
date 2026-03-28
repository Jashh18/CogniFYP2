import { useState, useEffect } from 'react';
import { adminAPI } from '../lib/api';
import { useAuth } from '../lib/auth';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './AdminDashboard.css';
import { data } from 'react-router-dom';

// 1. SYSTEM RESPONSE TIME VS QUERIES
const performanceData = [
    { queries: 10, responseTime: 120 },
    { queries: 20, responseTime: 105 },
    { queries: 30, responseTime: 140 },
    { queries: 40, responseTime: 95 },
    { queries: 50, responseTime: 110 },
];

// 2. QUERY → RELEVANCE SCORE
const retrievalData = [
    { query: 'Definition', relevance: 92 },
    { query: 'Tone', relevance: 88 },
    { query: 'Setting', relevance: 95 },
    { query: 'Moral', relevance: 90 },
];

// 3. USER ENGAGEMENT (Queries per Session / Feature Usage)
const interactionData = [
    { session: '1', queries: 5 },
    { session: '2', queries: 8 },
    { session: '3', queries: 4 },
    { session: '4', queries: 10 },
];

interface Metrics {
    total_users: number;
    total_students: number;
    total_admins: number;
    total_pdfs_uploaded: number;
}

export default function AdminDashboard() {
    const { user, logout } = useAuth();
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadMetrics();
    }, []);

    async function loadMetrics() {
        setLoading(true);
        try {
            const res = await adminAPI.getMetrics();
            setMetrics(res.data.metrics);
        } catch (err: unknown) {
            setError(
                (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
                'Failed to load metrics.'
            );
        } finally {
            setLoading(false);
        }
    }

    const metricCards = metrics
        ? [
            { label: 'Total Users', value: metrics.total_users, icon: '👥', color: 'var(--primary-500)' },
            { label: 'Students', value: metrics.total_students, icon: '🎓', color: 'var(--accent-500)' },
            { label: 'Admins', value: metrics.total_admins, icon: '🛡️', color: 'var(--success)' },
            { label: 'PDFs Uploaded', value: metrics.total_pdfs_uploaded, icon: '📄', color: 'var(--info)' },
        ]
        : [];

    return (
        <div className="admin-dashboard">
            <header className="admin-header">
                <div className="admin-header-left">
                    <h1>
                        <span className="text-gradient">Admin Dashboard</span>
                    </h1>
                    <p>Welcome back, {user?.full_name || 'Admin'}</p>
                </div>
            </header>

            <div className="admin-content">
                {loading ? (
                    <div className="admin-metrics-grid">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="metric-card card">
                                <div className="skeleton" style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)' }} />
                                <div className="skeleton" style={{ width: '80px', height: '28px', marginTop: '12px' }} />
                                <div className="skeleton" style={{ width: '100px', height: '16px', marginTop: '8px' }} />
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="admin-error card">
                        <p>{error}</p>
                        <button className="btn btn-primary btn-sm" onClick={() => loadMetrics()}>
                            Retry
                        </button>
                    </div>
                ) : (
                    <div className="admin-metrics-grid animate-fade-in">
                        {metricCards.map((metric, i) => (
                            <div
                                key={i}
                                className="metric-card card animate-fade-in"
                                style={{
                                    animationDelay: `${i * 0.1}s`,
                                    borderTop: `3px solid ${metric.color}`,
                                }}
                            >
                                <div className="metric-icon" style={{ background: `${metric.color}15`, color: metric.color }}>
                                    {metric.icon}
                                </div>
                                <div className="metric-value">{metric.value.toLocaleString()}</div>
                                <div className="metric-label">{metric.label}</div>
                            </div>
                        ))}
                    </div>
                )}

                <div
                    className="admin-charts-grid"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '1.5rem',
                        marginTop: '2rem'
                    }}
                >
                    {false && (
                        <>
                            {/* 1. SYSTEM RESPONSE TIME VS QUERIES */}
                            <div className="chart-card card animate-fade-in" style={{ animationDelay: '0.5s' }}>
                                <h3>System Response Time</h3>
                                <div style={{ height: 300, marginTop: '1rem' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={performanceData}>
                                            <XAxis
                                                dataKey="queries"
                                                stroke="#6b7280"
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                                height={40}
                                                label={{ value: 'Number of Queries', position: 'insideBottom', offset: -1 }}
                                            />
                                            <YAxis
                                                stroke="#6b7280"
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                                label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                                            />
                                            <Tooltip cursor={{ fill: 'var(--bg-elevated)', opacity: 0.5 }} />
                                            <Bar dataKey="responseTime" fill="var(--primary-500)" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* 2. QUERY → RELEVANCE SCORE */}
                            <div className="chart-card card animate-fade-in" style={{ animationDelay: '0.6s' }}>
                                <h3>Query Relevance Score</h3>
                                <div style={{ height: 300, marginTop: '1rem' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={retrievalData}>
                                            <XAxis
                                                dataKey="query"
                                                stroke="#6b7280"
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                                height={40}
                                                label={{ value: 'Query', position: 'insideBottom', offset: -1 }}
                                            />
                                            <YAxis
                                                stroke="#6b7280"
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                                label={{ value: 'Relevance Score (%)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                                            />
                                            <Tooltip cursor={{ fill: 'var(--bg-elevated)', opacity: 0.5 }} />
                                            <Bar dataKey="relevance" fill="var(--success)" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* 3. USER ENGAGEMENT (Queries per Session) */}
                            <div className="chart-card card animate-fade-in" style={{ animationDelay: '0.7s' }}>
                                <h3>User Engagement</h3>
                                <div style={{ height: 300, marginTop: '1rem' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={interactionData}>
                                            <XAxis
                                                dataKey="session"
                                                stroke="#6b7280"
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                                height={40}
                                                label={{ value: 'Session', position: 'insideBottom', offset: -1 }}
                                            />
                                            <YAxis
                                                stroke="#6b7280"
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                                label={{ value: 'Queries per Session', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                                            />
                                            <Tooltip cursor={{ fill: 'var(--bg-elevated)', opacity: 0.5 }} />
                                            <Bar dataKey="queries" fill="var(--accent-500)" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="admin-profile-fixed" style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 100 }}>
                <button className="btn btn-danger" onClick={logout}>Log Out</button>
            </div>
        </div>
    );
}
