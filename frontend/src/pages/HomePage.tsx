import { Link } from 'react-router-dom';
import './HomePage.css';

function BlobTL() {
    return (
        <svg className="blob-tl" viewBox="0 0 260 260" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="52" cy="68" r="32" fill="#3b2048" opacity="0.82"/>
            <circle cx="20" cy="118" r="15" fill="#3b2048" opacity="0.65"/>
            <circle cx="8"  cy="65"  r="7"  fill="#3b2048" opacity="0.45"/>
            <circle cx="112" cy="22" r="5"  fill="#3b2048" opacity="0.3"/>
            <path d="M-50 190 C10 130 70 148 90 225 C108 290 50 340 -50 320 Z" fill="#e8a0bc" opacity="0.42"/>
            <path d="M-70 170 C5 118 55 140 72 218 C90 280 25 340 -70 318 Z" fill="#f5c8d8" opacity="0.52"/>
        </svg>
    );
}

function BlobTR() {
    return (
        <svg className="blob-tr" viewBox="0 0 340 340" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M170 -18 C240 8 320 54 336 142 C352 226 298 302 210 318 C126 334 76 268 112 176 C138 108 112 36 170 -18Z" fill="#d4a0bc" opacity="0.36"/>
            <path d="M200 -26 C264 2 336 48 340 130 C344 212 290 288 208 298 C140 308 108 250 140 162 C164 96 148 18 200 -26Z" fill="#f5c8d8" opacity="0.48"/>
            <circle cx="308" cy="50"  r="20" fill="#3b2048" opacity="0.78"/>
            <circle cx="332" cy="94"  r="12" fill="#3b2048" opacity="0.62"/>
            <circle cx="326" cy="16"  r="6"  fill="#3b2048" opacity="0.42"/>
            <path d="M276 8 C294 34 312 16 320 44 C328 72 300 90 282 72 C264 54 256 -8 276 8Z" fill="none" stroke="#3b2048" strokeWidth="2" opacity="0.45"/>
        </svg>
    );
}

function BlobBL() {
    return (
        <svg className="blob-bl" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M-50 148 C-16 82 52 64 116 100 C178 134 196 218 144 264 C94 308 12 306 -32 256 C-72 214 -82 206 -50 148Z" fill="#f5c8d8" opacity="0.55"/>
            <path d="M-68 162 C-24 104 38 88 100 124 C162 158 178 232 128 278 C78 322 4 320 -40 272 C-80 232 -108 218 -68 162Z" fill="#e8a0bc" opacity="0.38"/>
            <path d="M16 228 C40 254 32 292 16 300 C2 308 -28 298 -28 272 C-28 246 -6 204 16 228Z" fill="none" stroke="#3b2048" strokeWidth="2" opacity="0.5"/>
            <path d="M50 260 C72 282 64 310 50 318 C38 326 18 316 22 294 C26 272 28 238 50 260Z" fill="none" stroke="#3b2048" strokeWidth="1.5" opacity="0.4"/>
        </svg>
    );
}

function BlobBR() {
    return (
        <svg className="blob-br" viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M90 72 C134 56 196 74 214 138 C232 200 198 258 142 262 C88 266 52 220 66 164 C76 122 52 86 90 72Z" fill="#d4a0bc" opacity="0.32"/>
            <path d="M116 58 C154 44 208 68 218 130 C228 192 196 248 144 250 C96 252 68 210 80 154 C90 112 86 72 116 58Z" fill="#f5c8d8" opacity="0.42"/>
        </svg>
    );
}

export default function HomePage() {
    return (
        <div className="home-page">
            <BlobTL />
            <BlobTR />
            <BlobBL />
            <BlobBR />

            <nav className="home-navbar">
                <div className="nav-brand">
                    <div className="nav-brand-icon">C</div>
                    Cogni
                </div>
                <div className="nav-actions">
                    <Link to="/login" className="btn btn-ghost">Log In</Link>
                    <Link to="/signup" className="btn btn-primary">Sign Up</Link>
                </div>
            </nav>

            <main className="home-hero">
                <div className="hero-content">
                    <div className="hero-badge animate-fade-in">Designed for Literature Undergraduates</div>
                    <h1 className="hero-title animate-fade-in" style={{ animationDelay: '0.1s' }}>
                        Your AI Companion for <br />
                        <span className="text-gradient">Literary Analysis</span>
                    </h1>
                    <p className="hero-subtitle animate-fade-in" style={{ animationDelay: '0.2s' }}>
                        Cogni transforms complex texts into clear summaries, interactive flashcards,
                        and contextual explanations, helping you master your reading assignments with ease.
                    </p>
                    <div className="hero-actions animate-fade-in" style={{ animationDelay: '0.3s' }}>
                        <Link to="/signup" className="btn btn-primary btn-lg">Start Analyzing</Link>
                        <a href="#how-it-works" className="btn btn-secondary btn-lg">How It Works</a>
                    </div>
                </div>
            </main>

            <section className="home-features">
                <div className="features-header">
                    <h2 className="features-title">Master Your Syllabus</h2>
                    <p className="features-subtitle">Everything you need to deeply understand your texts.</p>
                </div>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon-wrapper">📝</div>
                        <h3>Intelligent Summaries</h3>
                        <p>Upload any PDF and instantly generate concise, structured summaries. Grasp core themes and narrative arcs without getting lost in the details.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon-wrapper">💬</div>
                        <h3>Contextual Explanations</h3>
                        <p>Encounter a difficult passage? Ask Cogni directly. Our AI understands the context of your document and explains archaic language or complex metaphors.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon-wrapper">🃏</div>
                        <h3>Interactive Flashcards</h3>
                        <p>Automatically generate study flashcards from your readings. Perfect for memorizing key quotes, character motives, and literary devices before exams.</p>
                    </div>
                </div>
            </section>

            <section id="how-it-works" className="home-how-it-works">
                <h2 className="features-title">How It Works</h2>
                <div className="steps-container">
                    <div className="step">
                        <div className="step-number">1</div>
                        <h3>Upload Text</h3>
                        <p>Provide your reading material in PDF format. Cogni securely processes and indexes the entire document.</p>
                    </div>
                    <div className="step">
                        <div className="step-number">2</div>
                        <h3>Analyze</h3>
                        <p>Choose between generating a summary, asking direct questions, or creating flashcards tailored to the text.</p>
                    </div>
                    <div className="step">
                        <div className="step-number">3</div>
                        <h3>Excel</h3>
                        <p>Review the insights, master the material faster, and approach your essays and exams with confidence.</p>
                    </div>
                </div>
            </section>

            <footer className="home-footer">
                <p>&copy; {new Date().getFullYear()} Cogni AI Study Assistant. All rights reserved.</p>
            </footer>
        </div>
    );
}