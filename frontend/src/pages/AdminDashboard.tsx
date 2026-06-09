import { useState, useEffect } from 'react';
import { adminAPI } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer
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
        loadMetrics(true);
        const intervalId = setInterval(() => {
            loadMetrics(false);
        }, 3000);
        return () => clearInterval(intervalId);
    }, []);

    async function loadMetrics(isInitial = false) {
        if (isInitial) setLoading(true);
        try {
            const res = await adminAPI.getMetrics();
            setMetrics(res.data.metrics);
        } catch (err: unknown) {
            setError(
                (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
                'Failed to load metrics.'
            );
        } finally {
            if (isInitial) setLoading(false);
        }
    }

    const metricCards = metrics
        ? [
            { label: 'Total Users', value: metrics.total_users, icon: '👥' },
            { label: 'Students', value: metrics.total_students, icon: '🎓' },
            { label: 'Admins', value: metrics.total_admins, icon: '🛡️' },
            { label: 'PDFs Uploaded', value: metrics.total_pdfs_uploaded, icon: '📄' },
        ]
        : [];

    const performanceChartData = metrics ? [
        { name: 'Faithfulness', value: metrics.faithfulness },
        { name: 'Relevancy', value: metrics.relevancy },
        { name: 'Accuracy', value: metrics.fetching_accuracy },
    ] : [];

    const scopeChartData = metrics ? [
        { name: 'In-Scope', value: metrics.scope_adherence },
        { name: 'Off-Scope', value: 100 - metrics.scope_adherence },
    ] : [];

    const SCOPE_COLORS = ['#bb6e93ff', '#231123ff'];

    return (
        <div className="admin-dashboard">
            {/* Decorative blobs */}
            <div className="blob blob-tl" />
            <div className="blob blob-br" />
            <div className="blob blob-dots">
                <span /><span /><span />
            </div>

            <header className="admin-header">
                <div className="admin-header-left">
                    <p className="admin-eyebrow">Overview</p>
                    <h1 className="admin-title">Admin Dashboard</h1>
                    <p className="admin-subtitle">Welcome back, <strong>{user?.full_name || 'Admin'}</strong></p>
                </div>
            </header>

            <div className="admin-content">
                {loading ? (
                    <div className="admin-metrics-grid">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="metric-card skeleton-card">
                                <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                                <div className="skeleton" style={{ width: '70px', height: '26px', marginTop: '10px' }} />
                                <div className="skeleton" style={{ width: '90px', height: '14px', marginTop: '6px' }} />
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="admin-error card">
                        <p>{error}</p>
                        <button className="btn btn-primary btn-sm" onClick={() => loadMetrics(true)}>Retry</button>
                    </div>
                ) : (
                    <div className="admin-metrics-grid animate-fade-in">
                        {metricCards.map((metric, i) => (
                            <div
                                key={i}
                                className="metric-card animate-fade-in"
                                style={{ animationDelay: `${i * 0.08}s` }}
                            >
                                <div className="metric-icon">{metric.icon}</div>
                                <div className="metric-value">{metric.value.toLocaleString()}</div>
                                <div className="metric-label">{metric.label}</div>
                            </div>
                        ))}
                    </div>
                )}

                {metrics && (
                    <div className="admin-charts-grid animate-fade-in" style={{ animationDelay: '0.35s' }}>
                        {/* Radar Chart */}
                        <div className="chart-card">
                            <div className="chart-header">
                                <h3 className="chart-title">AI Response Analysis</h3>
                                <span className="chart-badge">{metrics.total_queries_logged} Queries</span>
                            </div>
                            <div className="chart-body">
                                <ResponsiveContainer width="100%" height={240}>
                                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={performanceChartData}>
                                        <PolarGrid stroke="#e8d5de" />
                                        <PolarAngleAxis dataKey="name" tick={{ fill: '#3d1f3d', fontSize: 12, fontFamily: 'inherit' }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                        <Radar
                                            name="Score"
                                            dataKey="value"
                                            stroke="#3d1f3d"
                                            fill="#c9a0b4"
                                            fillOpacity={0.45}
                                        />
                                        <Tooltip
                                            formatter={(value) => [`${value}%`, 'Score']}
                                            contentStyle={{ borderRadius: '10px', border: 'none', background: '#f5eef0', fontSize: '14px' }}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="chart-footer">Faithfulness, relevancy & retrieval accuracy breakdown.</p>
                        </div>

                        {/* Donut Chart */}
                        <div className="chart-card">
                            <div className="chart-header">
                                <h3 className="chart-title">Literature Adherence</h3>
                                <span className="chart-badge">{metrics.total_uploads_logged} Uploads</span>
                            </div>
                            <div className="chart-body">
                                <ResponsiveContainer width="100%" height={240}>
                                    <PieChart>
                                        <Pie
                                            data={scopeChartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={78}
                                            paddingAngle={4}
                                            dataKey="value"
                                        >
                                            {scopeChartData.map((_entry, index) => (
                                                <Cell key={`cell-${index}`} fill={SCOPE_COLORS[index % SCOPE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value) => [`${value}%`, 'Rate']}
                                            contentStyle={{ borderRadius: '10px', border: 'none', background: '#f5eef0', fontSize: '20px' }}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={28}
                                            iconType="circle"
                                            iconSize={9}
                                            wrapperStyle={{ fontSize: '14px', color: '#3d1f3d' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="chart-footer">In-scope vs off-topic uploaded materials.</p>
                        </div>

                        {/* Rejection List */}
                        <div className="chart-card">
                            <div className="chart-header">
                                <h3 className="chart-title">Rejection Reasons</h3>
                            </div>
                            <div className="rejection-list">
                                {metrics.rejection_summary.length > 0 ? (
                                    metrics.rejection_summary.map((item, idx) => (
                                        <div key={idx} className="rejection-item">
                                            <span className="rejection-reason">{item.reason}</span>
                                            <span className="rejection-count">{item.count}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="rejection-empty">No rejections recorded yet.</div>
                                )}
                            </div>
                            <p className="chart-footer">Why materials were filtered out.</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="admin-profile-fixed">
                <button className="logout-btn" onClick={logout}>Log Out</button>
            </div>
        </div>
    );
}