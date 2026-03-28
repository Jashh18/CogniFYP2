import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { documentAPI } from '../lib/api';
import FileUpload from '../components/FileUpload';
import SummaryTab from '../components/SummaryTab';
import QueryTab from '../components/QueryTab';
import FlashcardTab from '../components/FlashcardTab';
import './LandingPage.css';

type TabType = 'summary' | 'explanation' | 'flashcards';

interface Document {
    id: string;
    filename: string;
    chunk_count: number;
}

export default function LandingPage() {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('summary');
    const [currentDoc, setCurrentDoc] = useState<Document | null>(null);
    const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
    const [documents, setDocuments] = useState<Document[]>([]);

    useEffect(() => {
        const storedDoc = localStorage.getItem('current_document');
        if (storedDoc) {
            try {
                setCurrentDoc(JSON.parse(storedDoc));
            } catch (e) {
                localStorage.removeItem('current_document');
            }
        }
        loadDocuments();
    }, []);

    async function loadDocuments() {
        try {
            const res = await documentAPI.list();
            setDocuments(res.data.documents);
        } catch (err) {
            console.error("Failed to load documents", err);
        }
    }

    async function handleUploadComplete(doc: Document) {
        setCurrentDoc(doc);
        localStorage.setItem('current_document', JSON.stringify(doc));
        setActiveSessionId(undefined);
        setActiveTab('explanation');
        loadDocuments();
    }

    const greeting = getGreeting();

    return (
        <div className="landing-page">
            <header style={{ display: 'flex', justifyContent: 'flex-end', padding: '1.5rem', gap: '1rem', position: 'absolute', top: 0, right: 0, zIndex: 10 }}>
                {currentDoc && (
                    <button className="btn btn-secondary btn-sm" onClick={() => { setCurrentDoc(null); localStorage.removeItem('current_document'); }}>
                        Upload New Document
                    </button>
                )}
                <button className="btn btn-danger btn-sm" onClick={logout}>
                    <svg style={{marginRight: '8px'}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Logout
                </button>
            </header>

            <main
                className="landing-main"
                style={{ marginLeft: '0', paddingTop: '4rem' }}
            >
                {!currentDoc ? (
                    <div className="landing-welcome animate-fade-in">
                        <div className="welcome-content">
                            <h1>
                                {greeting}, <span className="text-gradient" style={{ color: 'var(--primary-400)' }}>{user?.full_name?.split(' ')[0] || 'Student'}</span>
                            </h1>
                            <FileUpload onUploadComplete={handleUploadComplete} />
                        </div>

                        {documents.length > 0 && (
                            <div className="recent-docs-section animate-fade-in" style={{ marginTop: '3rem', width: '100%', maxWidth: '800px' }}>
                                <h3 style={{ marginBottom: '1.5rem', opacity: 0.8, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Documents</h3>
                                <div className="docs-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                                    {documents.map((doc) => (
                                        <div 
                                            key={doc.id} 
                                            className="doc-item card clickable animate-scale" 
                                            onClick={() => { setCurrentDoc(doc); localStorage.setItem('current_document', JSON.stringify(doc)); }}
                                            style={{ padding: '1.25rem', cursor: 'pointer', transition: 'all 0.3s ease' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ fontSize: '1.5rem' }}>📄</div>
                                                <div style={{ overflow: 'hidden' }}>
                                                    <div style={{ fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{doc.filename}</div>
                                                    <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{doc.chunk_count} segments</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="landing-workspace animate-fade-in">
                        <div className="workspace-header">
                            <div className="workspace-doc-info">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                </svg>
                                <h2>{currentDoc.filename}</h2>
                            </div>
                        </div>

                        <div className="tabs" id="feature-tabs">
                            <button
                                className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
                                onClick={() => setActiveTab('summary')}
                                id="tab-summary"
                            >
                                📝 Summary
                            </button>
                            <button
                                className={`tab ${activeTab === 'explanation' ? 'active' : ''}`}
                                onClick={() => setActiveTab('explanation')}
                                id="tab-explanation"
                            >
                                💬 Explanation
                            </button>
                            <button
                                className={`tab ${activeTab === 'flashcards' ? 'active' : ''}`}
                                onClick={() => setActiveTab('flashcards')}
                                id="tab-flashcards"
                            >
                                🃏 Flashcards
                            </button>
                        </div>

                        <div className="workspace-content card">
                            {activeTab === 'summary' && <SummaryTab documentId={currentDoc.id} />}
                            {activeTab === 'explanation' && (
                                <QueryTab
                                    {...({
                                        documentId: currentDoc.id,
                                        initialSessionId: activeSessionId,
                                    } as any)}
                                />
                            )}
                            {activeTab === 'flashcards' && <FlashcardTab documentId={currentDoc.id} />}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}
