import { useState, useRef, useEffect } from 'react';
import { aiAPI, chatAPI } from '../lib/api';
import './QueryTab.css';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    queryType?: string;
}

interface QueryTabProps {
    documentId: string;
    initialSessionId?: string;
}

export default function QueryTab({ documentId, initialSessionId }: QueryTabProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const historyLoadRef = useRef(false);

    useEffect(() => {
        // Smooth scrolling is expensive when a large history is loaded at once.
        const behavior: ScrollBehavior = historyLoadRef.current ? 'auto' : 'smooth';
        historyLoadRef.current = false;
        messagesEndRef.current?.scrollIntoView({ behavior });
    }, [messages]);

    // When a session is selected from sidebar, load its existing messages
    useEffect(() => {
        if (!initialSessionId) return;

        async function loadExistingMessages() {
            try {
                const res = await chatAPI.getMessages(initialSessionId);
                historyLoadRef.current = true;
                setMessages(res.data.messages || []);
                setSessionId(initialSessionId);
            } catch {
                // ignore errors; user can still start a new chat
            }
        }

        loadExistingMessages();
    }, [initialSessionId, documentId]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const query = input.trim();
        setInput('');
        setMessages((prev) => [...prev, { role: 'user', content: query }]);
        setLoading(true);

        try {
            const res = await aiAPI.askQuestion({
                document_id: documentId,
                query,
                session_id: sessionId,
            });

            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: res.data.answer,
                    queryType: res.data.query_type,
                },
            ]);
            if (res.data.session_id) setSessionId(res.data.session_id);
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: 'Sorry, I couldn\'t process your question. Please try again.' },
            ]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="query-tab" id="query-tab">
            <div className="query-header">
                <h3>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    Ask Questions
                </h3>
            </div>

            <div className="query-messages">
                {messages.length === 0 && (
                    <div className="query-empty">
                        <div className="query-empty-icon">💡</div>
                        <h4>Ask anything about your document</h4>
                        {/* <p>Try questions like:</p>
                        <div className="query-suggestions">
                            {[
                                'What are the main themes in this text?',
                                'Define the literary devices used here',
                                'Compare the characters in this chapter',
                            ].map((suggestion, i) => (
                                <button
                                    key={i}
                                    className="query-suggestion btn btn-secondary btn-sm"
                                    onClick={() => setInput(suggestion)}
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div> */}
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div key={i} className={`query-message ${msg.role} animate-fade-in`}>
                        {msg.role === 'assistant' && msg.queryType && (
                            <span className={`badge badge-primary query-type-badge`}>
                                {msg.queryType}
                            </span>
                        )}
                        <div className="message-content message-content-prewrap">{msg.content}</div>
                    </div>
                ))}

                {loading && (
                    <div className="query-message assistant animate-fade-in">
                        <div className="typing-indicator">
                            <span /><span /><span />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <form className="query-input-bar" onSubmit={handleSubmit}>
                <input
                    type="text"
                    className="input-field query-input"
                    placeholder="Ask a question about your document..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={loading}
                    id="query-input"
                />
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || !input.trim()}
                    id="query-submit"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                </button>
            </form>
        </div>
    );
}
