import { Link } from 'react-router-dom';
import './HomePage.css';

export default function HomePage() {
    return (
        <div className="home-page">
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
                        Your AI Companion for <br/>
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
                    <p style={{ color: 'var(--text-secondary)' }}>Everything you need to deeply understand your texts.</p>
                </div>
                
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon-wrapper">📝</div>
                        <h3>Intelligent Summaries</h3>
                        <p>Upload any PDF and instantly generate concise, structured summaries. Grasp the core themes and narrative arcs without getting lost in the details.</p>
                    </div>
                    
                    <div className="feature-card">
                        <div className="feature-icon-wrapper">💬</div>
                        <h3>Contextual Explanations</h3>
                        <p>Encounter a difficult passage? Ask Cogni directly. Our AI understands the context of your specific document and explains archaic language or complex metaphors.</p>
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
