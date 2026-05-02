import { useState, useEffect } from 'react';
import { chatAPI, documentAPI } from '../lib/api';
import './Sidebar.css';

interface Session {
    chatid: string;
    pdfid: string;
    created_at: string;
}

interface Document {
    id: string;
    filename: string;
    chunk_count: number;
}

interface SidebarProps {
    isOpen: boolean;
    onToggle: () => void;
    onSelectSession: (doc: Document, sessionId: string) => void;
    currentSessionId?: string;
}

export default function Sidebar({ isOpen, onToggle, onSelectSession, currentSessionId }: SidebarProps) {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [sessionsRes, docsRes] = await Promise.all([
                chatAPI.listSessions(),
                documentAPI.list()
            ]);
            setSessions(sessionsRes.data.sessions || []);
            setDocuments(docsRes.data.documents || []);
        } catch (error) {
            console.error('Failed to fetch sidebar data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSessionClick = (session: Session) => {
        const doc = documents.find(d => d.id === session.pdfid);
        if (doc) {
            onSelectSession(doc, session.chatid);
        } else {
            console.warn('Document not found for this session');
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <>
            <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-header">
                    <h2>Chat History</h2>
                    <button className="btn-icon" onClick={onToggle}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <div className="sidebar-actions">
                    {/* New Chat button removed for 1-to-1 PDF relationship */}
                </div>

                <div className="sidebar-content">
                    {loading ? (
                        <div className="sidebar-loading">Loading...</div>
                    ) : sessions.length === 0 ? (
                        <div className="sidebar-empty">No chat history found.</div>
                    ) : (
                        <div className="session-list">
                            {sessions.map(session => (
                                <div 
                                    key={session.chatid} 
                                    className={`session-item ${currentSessionId === session.chatid ? 'active' : ''}`}
                                    onClick={() => handleSessionClick(session)}
                                >
                                    <div className="session-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                        </svg>
                                    </div>
                                    <div className="session-info">
                                        <div className="session-title">
                                            {documents.find(d => d.id === session.pdfid)?.filename || 'Unknown Document'}
                                        </div>
                                        <div className="session-date">{formatDate(session.created_at)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Backdrop for mobile */}
            {isOpen && <div className="sidebar-backdrop" onClick={onToggle}></div>}
        </>
    );
}
