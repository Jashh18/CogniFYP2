import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import FileUpload from '../components/FileUpload';
import SummaryTab from '../components/SummaryTab';
import QueryTab from '../components/QueryTab';
import FlashcardTab from '../components/FlashcardTab';
import Sidebar from '../components/Sidebar';
import ProfilePopup from '../components/ProfilePopup';
import { chatAPI } from '../lib/api';
import './StudentDashboard.css';

// Type for the tabs
type TabType = 'summary' | 'explanation' | 'flashcards';

// Interface for the document
interface Document {
    id: string;
    filename: string;
    chunk_count: number;
}

export default function StudentDashboard() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('summary');
    const [currentDoc, setCurrentDoc] = useState<Document | null>(null);
    const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isProfilePopupOpen, setIsProfilePopupOpen] = useState(false);

    useEffect(() => {
        const storedDoc = localStorage.getItem('current_document');
        if (storedDoc) {
            try {
                setCurrentDoc(JSON.parse(storedDoc));
            } catch (e) {
                localStorage.removeItem('current_document');
            }
        }
    }, []);

    async function handleUploadComplete(doc: Document) {
        setCurrentDoc(doc);
        localStorage.setItem('current_document', JSON.stringify(doc));
        try {
            // Automatically create a 1-to-1 chat session for this new document
            const res = await chatAPI.createSession({ document_id: doc.id, title: doc.filename });
            setActiveSessionId(res.data.session.id);
        } catch (e) {
            console.error("Failed to auto-create session:", e);
            setActiveSessionId(undefined);
        }
        setActiveTab('explanation');
    }

    const greeting = getGreeting();

    return (
        <div className="landing-page">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button className="btn btn-icon" onClick={() => setIsSidebarOpen(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {currentDoc && (
                        <button className="btn btn-secondary btn-sm" onClick={() => { 
                            setCurrentDoc(null); 
                            localStorage.removeItem('current_document');
                            setActiveSessionId(undefined);
                            setActiveTab('summary');
                        }}>
                            Upload New Document
                        </button>
                    )}
                    <div style={{ position: 'relative' }}>
                        <button 
                            className="btn btn-icon" 
                            style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-400), var(--primary-600))', color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
                            onClick={() => setIsProfilePopupOpen(!isProfilePopupOpen)}
                        >
                            {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                        </button>
                        <ProfilePopup isOpen={isProfilePopupOpen} onClose={() => setIsProfilePopupOpen(false)} />
                    </div>
                </div>
            </header>

            <Sidebar 
                isOpen={isSidebarOpen} 
                onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                onSelectSession={(doc, sessionId) => {
                    setCurrentDoc(doc);
                    localStorage.setItem('current_document', JSON.stringify(doc));
                    setActiveSessionId(sessionId);
                    setActiveTab('explanation');
                    setIsSidebarOpen(false);
                }}
                currentSessionId={activeSessionId}
            />

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
                            <p className="welcome-sub" style={{marginBottom: '2rem', marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '1.1rem'}}>
                                Welcome to your workspace. Upload a PDF of your reading material below to begin generating summaries, creating flashcards, and asking contextual questions.
                            </p>
                            <FileUpload onUploadComplete={handleUploadComplete} />
                        </div>

                        {/* Recent documents section (not used for now) */}
                        {/* {documents.length > 0 && (
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
                        )} */}
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

                        {/* Tabs for each features */}   
                        <div className="workspace-content card">
                            <div style={{ display: activeTab === 'summary' ? 'block' : 'none' }}>
                                <SummaryTab documentId={currentDoc.id} sessionId={activeSessionId} />
                            </div>
                            
                            <div style={{ display: activeTab === 'explanation' ? 'block' : 'none' }}>
                                <QueryTab
                                    {...({
                                        documentId: currentDoc.id,
                                        initialSessionId: activeSessionId,
                                    } as any)}
                                />
                            </div>

                            <div style={{ display: activeTab === 'flashcards' ? 'block' : 'none' }}>
                                <FlashcardTab documentId={currentDoc.id} sessionId={activeSessionId} />
                            </div>
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
