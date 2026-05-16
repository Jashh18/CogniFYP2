import { useState, useEffect } from 'react';
import { adminAPI } from '../lib/api';
import { useAuth } from '../lib/auth';
import { 
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    PieChart, Pie, Cell, Legend 
} from 'recharts';
import './AdminDashboard.css';

interface Metrics {
    total_users: number;
    total_students: number;
    total_admins: number;
    total_pdfs_uploaded: number;
    fetching_accuracy: number;
    faithfulness: number;
    relevancy: number;
    answering_reliability: number;
    scope_adherence: number;
    rejection_summary: { reason: string; count: number }[];
    total_queries_logged: number;
    total_uploads_logged: number;
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

    // Data for the cards on top
    const metricCards = metrics
        ? [
            { label: 'Total Users', value: metrics.total_users, icon: '👥', color: 'var(--primary-500)' },
            { label: 'Students', value: metrics.total_students, icon: '🎓', color: 'var(--accent-500)' },
            { label: 'Admins', value: metrics.total_admins, icon: '🛡️', color: 'var(--success)' },
            { label: 'PDFs Uploaded', value: metrics.total_pdfs_uploaded, icon: '📄', color: 'var(--info)' },
        ]
        : [];

    // Chart data from real metrics
    const performanceChartData = metrics ? [
        { name: 'Faithfulness', value: metrics.faithfulness },
        { name: 'Relevancy', value: metrics.relevancy },
        { name: 'Accuracy', value: metrics.fetching_accuracy },
    ] : [];

    const scopeChartData = metrics ? [
        { name: 'In-Scope', value: metrics.scope_adherence },
        { name: 'Off-Scope', value: 100 - metrics.scope_adherence },
    ] : [];

    const SCOPE_COLORS = ['var(--success)', 'var(--danger)'];

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
                        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                        gap: '1.5rem',
                        marginTop: '2rem'
                    }}
                >
                    {metrics && (
                        <>
                            {/* 1. AI PERFORMANCE ANALYSIS (RADAR) */}
                            <div className="chart-card card animate-fade-in" style={{ animationDelay: '0.4s' }}>
                                <div className="chart-header">
                                    <h3>AI Response Analysis</h3>
                                    <span className="badge badge-info">{metrics.total_queries_logged} Queries</span>
                                </div>
                                <div style={{ height: 300, marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={performanceChartData}>
                                            <PolarGrid stroke="var(--bg-elevated)" />
                                            <PolarAngleAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} />
                                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                            <Radar
                                                name="Score"
                                                dataKey="value"
                                                stroke="var(--primary-500)"
                                                fill="var(--primary-500)"
                                                fillOpacity={0.5}
                                            />
                                            <Tooltip formatter={(value) => [`${value}%`, 'Score']} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="chart-footer">Comprehensive breakdown of RAG performance across faithfulness, relevancy, and retrieval accuracy.</p>
                            </div>

                            {/* 2. LITERATURE SCOPE ADHERENCE (DONUT) */}
                            <div className="chart-card card animate-fade-in" style={{ animationDelay: '0.5s' }}>
                                <div className="chart-header">
                                    <h3>Literature Adherence</h3>
                                    <span className="badge badge-success">{metrics.total_uploads_logged} Uploads</span>
                                </div>
                                <div style={{ height: 300, marginTop: '1rem' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={scopeChartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {scopeChartData.map((_entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={SCOPE_COLORS[index % SCOPE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => [`${value}%`, 'Rate']} />
                                            <Legend verticalAlign="bottom" height={36}/>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="chart-footer">Distribution of uploaded materials correctly identified as English Literature vs off-topic content.</p>
                            </div>

                            {/* 3. REJECTION ANALYSIS */}
                            <div className="chart-card card animate-fade-in" style={{ animationDelay: '0.6s' }}>
                                <h3>Common Rejection Reasons</h3>
                                <div className="rejection-list" style={{ marginTop: '1.5rem' }}>
                                    {metrics.rejection_summary.length > 0 ? (
                                        metrics.rejection_summary.map((item, idx) => (
                                            <div key={idx} className="rejection-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--bg-elevated)' }}>
                                                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{item.reason}</span>
                                                <span className="badge badge-danger">{item.count}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                            No rejections recorded yet.
                                        </div>
                                    )}
                                </div>
                                <p className="chart-footer" style={{ marginTop: 'auto' }}>Helps understand why certain materials are filtered out.</p>
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
