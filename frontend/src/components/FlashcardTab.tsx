import { useState, useEffect, useRef } from 'react';
import { aiAPI } from '../lib/api';
import './FlashcardTab.css';

interface Flashcard {
    question: string;
    answer: string;
}

interface FlashcardTabProps {
    documentId: string;
}

export default function FlashcardTab({ documentId }: FlashcardTabProps) {
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const hasLoaded = useRef(false);

    useEffect(() => {
        if (documentId && !hasLoaded.current) {
            hasLoaded.current = true;
            loadFlashcards();
        }
    }, [documentId]);

    async function loadFlashcards() {
        setLoading(true);
        setError('');
        try {
            const res = await aiAPI.getFlashcards(documentId);
            setFlashcards(res.data.flashcards || []);
        } catch (err: unknown) {
            const serverError = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            const isRateLimit = serverError?.toLowerCase().includes('rate limit') ||
                serverError?.toLowerCase().includes('429');
            setError(
                isRateLimit
                    ? '⏳ AI rate limit reached. Please wait 30–60 seconds and click "Try Again".'
                    : (serverError || 'Failed to generate flashcards. Please try again.')
            );
        } finally {
            setLoading(false);
        }
    }

    function handleRetry() {
        hasLoaded.current = false;
        setFlashcards([]);
        setCurrentIndex(0);
        loadFlashcards();
    }

    function goNext() {
        setFlipped(false);
        setCurrentIndex((prev) => Math.min(prev + 1, flashcards.length - 1));
    }

    function goPrev() {
        setFlipped(false);
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
    }

    const card = flashcards[currentIndex];

    return (
        <div className="flashcard-tab animate-fade-in" id="flashcard-tab">
            <div className="flashcard-header">
                <h3>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                    Flashcards
                </h3>
                {flashcards.length > 0 && (
                    <span className="flashcard-counter badge badge-primary">
                        {currentIndex + 1} / {flashcards.length}
                    </span>
                )}
            </div>

            <div className="flashcard-content">
                {loading ? (
                    <div className="flashcard-loading">
                        <div className="summary-spinner" />
                        <p>Generating flashcards...</p>
                        <span className="summary-loading-sub">Identifying key concepts — may take a minute for larger documents</span>
                    </div>
                ) : error ? (
                    <div className="flashcard-error">
                        <p>{error}</p>
                        <button className="btn btn-primary btn-sm" onClick={handleRetry}>
                            Try Again
                        </button>
                    </div>
                ) : card ? (
                    <>
                        <div
                            className={`flashcard ${flipped ? 'flipped' : ''}`}
                            onClick={() => setFlipped(!flipped)}
                            id="flashcard"
                        >
                            <div className="flashcard-inner">
                                <div className="flashcard-front">
                                    <span className="flashcard-label">Question</span>
                                    <p>{card.question}</p>
                                    <span className="flashcard-hint">Click to reveal answer</span>
                                </div>
                                <div className="flashcard-back">
                                    <span className="flashcard-label">Answer</span>
                                    <p>{card.answer}</p>
                                    <span className="flashcard-hint">Click to see question</span>
                                </div>
                            </div>
                        </div>

                        <div className="flashcard-nav">
                            <button
                                className="btn btn-secondary"
                                onClick={goPrev}
                                disabled={currentIndex === 0}
                                id="flashcard-prev"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="15 18 9 12 15 6" />
                                </svg>
                                Previous
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={goNext}
                                disabled={currentIndex === flashcards.length - 1}
                                id="flashcard-next"
                            >
                                Next
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flashcard-empty">
                        <p>No flashcards available for this document.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
