import { useState, useEffect, useRef } from 'react';
import { aiAPI } from '../lib/api';
import './SummaryTab.css';

interface SummaryTabProps {
    documentId: string;
    sessionId?: string;
}

export default function SummaryTab({ documentId, sessionId }: SummaryTabProps) {
    const [summary, setSummary] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    const hasLoaded = useRef<string | null>(null);

    useEffect(() => {
        // Only load if we haven't loaded for this specific document AND session combination
        const cacheKey = `${documentId}-${sessionId || 'new'}`;
        if (documentId && hasLoaded.current !== cacheKey) {
            hasLoaded.current = cacheKey;
            generateSummary();
        }
    }, [documentId, sessionId]);

    async function generateSummary() {
        setLoading(true);
        setError('');
        try {
            const res = await aiAPI.getSummary(documentId, sessionId);
            setSummary(res.data.summary);
        } catch (err: unknown) {
            const serverError = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            const isRateLimit = serverError?.toLowerCase().includes('rate limit') ||
                serverError?.toLowerCase().includes('429');
            setError(
                isRateLimit
                    ? '⏳ AI rate limit reached. Please wait 30–60 seconds and click "Try Again".'
                    : (serverError || 'Failed to generate summary. Please try again.')
            );
        } finally {
            setLoading(false);
        }
    }

    function handleRetry() {
        hasLoaded.current = false;
        generateSummary();
    }

    function handleCopy() {
        navigator.clipboard.writeText(summary);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div className="summary-tab animate-fade-in" id="summary-tab">
            <div className="summary-header">
                <h3>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    Document Summary
                </h3>
                {summary && (
                    <button className="btn btn-secondary btn-sm" onClick={handleCopy} id="copy-summary">
                        {copied ? (
                            <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                Copied!
                            </>
                        ) : (
                            <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                                Copy
                            </>
                        )}
                    </button>
                )}
            </div>

            <div className="summary-content">
                {loading ? (
                    <div className="summary-loading">
                        <div className="summary-spinner" />
                        <p>Generating summary from your document...</p>
                        <span className="summary-loading-sub">This may take up to a minute for larger documents</span>
                    </div>
                ) : error ? (
                    <div className="summary-error">
                        <p>{error}</p>
                        <button className="btn btn-primary btn-sm" onClick={handleRetry}>
                            Try Again
                        </button>
                    </div>
                ) : (
                    <div className="summary-text">
                        {summary.split('\n').map((paragraph, i) => (
                            <p key={i}>{paragraph}</p>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
