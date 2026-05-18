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

type TabType = 'summary' | 'explanation' | 'flashcards';

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
            } catch {
                localStorage.removeItem('current_document');
            }
        }
    }, []);

    async function handleUploadComplete(doc: Document) {
        setCurrentDoc(doc);
        localStorage.setItem('current_document', JSON.stringify(doc));
        try {
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
            {/* Decorative blobs */}
            <div className="sd-blob sd-blob-tr" />
            <div className="sd-blob sd-blob-bl" />
            <div className="sd-dots">
                <span /><span /><span />
            </div>

            {/* Header */}
            <header className="sd-header">
                <button className="sd-icon-btn" onClick={() => setIsSidebarOpen(true)} aria-label="Open sidebar">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </button>

                <div className="sd-header-right">
                    {currentDoc && (
                        <button
                            className="sd-upload-new-btn"
                            onClick={() => {
                                setCurrentDoc(null);
                                localStorage.removeItem('current_document');
                                setActiveSessionId(undefined);
                                setActiveTab('summary');
                            }}
                        >
                            Upload New
                        </button>
                    )}
                    <div style={{ position: 'relative' }}>
                        <button
                            className="sd-avatar-btn"
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

            <main className="landing-main">
                {!currentDoc ? (
                    <div className="landing-welcome animate-fade-in">
                        <div className="welcome-content">
                            <p className="welcome-eyebrow">Your workspace</p>
                            <h1>
                                {greeting},{' '}
                                <span className="welcome-name">
                                    {user?.full_name?.split(' ')[0] || 'Student'}
                                </span>
                            </h1>
                            <p className="welcome-sub">
                                Upload a PDF of your reading material to begin generating summaries,
                                creating flashcards, and asking contextual questions.
                            </p>
                            <FileUpload onUploadComplete={handleUploadComplete} />
                        </div>
                    </div>
                ) : (
                    <div className="landing-workspace animate-fade-in">
                        <div className="workspace-header">
                            <div className="workspace-doc-info">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                </svg>
                                <h2>{currentDoc.filename}</h2>
                            </div>
                        </div>

                        <div className="sd-tabs">
                            {(['summary', 'explanation', 'flashcards'] as TabType[]).map((tab) => {
                                const labels: Record<TabType, string> = {
                                    summary: '📝 Summary',
                                    explanation: '💬 Explanation',
                                    flashcards: '🃏 Flashcards',
                                };
                                return (
                                    <button
                                        key={tab}
                                        className={`sd-tab ${activeTab === tab ? 'active' : ''}`}
                                        onClick={() => setActiveTab(tab)}
                                    >
                                        {labels[tab]}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="workspace-content">
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