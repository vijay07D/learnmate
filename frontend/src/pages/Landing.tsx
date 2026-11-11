import { useNavigate } from "react-router-dom";
import { useSession } from "../hooks/useSession";

const SESSION_ID_KEY = "learnmate_session_id";

export default function Landing() {
  const { session, startSession, loading, isDemoMode } = useSession();
  const navigate = useNavigate();

  async function handleStart() {
    await startSession();
    navigate("/chat");
  }

  function handleContinue() {
    navigate("/chat");
  }

  function handleNewJourney() {
    localStorage.removeItem(SESSION_ID_KEY);
    window.location.reload();
  }

  return (
    <div className="landing">
      <section className="hero">
        <h1>Discover your career path<br />with AI guidance</h1>
        <p>
          LearnMate asks the right questions, finds careers that match your unique strengths, and
          builds a personalized learning roadmap — powered by IBM watsonx.ai.
        </p>
        {isDemoMode && (
          <div className="rai-notice" style={{ maxWidth: "560px", margin: "0 auto 1rem", textAlign: "left" }}>
            ⚠ <strong>Demo mode:</strong> IBM watsonx.ai is not connected. Responses use sample data.
          </div>
        )}
        <div className="hero-cta">
          {session ? (
            <>
              <button className="btn-hero" onClick={handleContinue} disabled={loading}>
                Continue my journey →
              </button>
              <button
                className="btn btn-secondary"
                style={{ marginTop: "0.75rem" }}
                onClick={handleNewJourney}
              >
                Start a new journey
              </button>
            </>
          ) : (
            <button className="btn-hero" onClick={handleStart} disabled={loading}>
              {loading ? "Starting…" : "Start my journey →"}
            </button>
          )}
        </div>
      </section>

      <section className="features">
        <h2>How LearnMate works</h2>
        <p className="features-sub">A personalized AI agent, not a quiz or a search box</p>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">💬</div>
            <h3>Conversational onboarding</h3>
            <p>The agent learns about your interests, skills, and goals through natural conversation — no forms, no long surveys.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🌍</div>
            <h3>Diverse career discovery</h3>
            <p>Get recommendations across technology, design, business, health tech, sustainability, education, and digital media.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🗺</div>
            <h3>Personalized roadmap</h3>
            <p>A sequenced learning plan with resources, projects, and milestones — built around your schedule and skill gaps.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔄</div>
            <h3>Adaptive check-ins</h3>
            <p>The agent checks in on your progress and proposes roadmap adjustments. You always approve changes before they happen.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔬</div>
            <h3>IBM Granite powered</h3>
            <p>Career matching, skill gap analysis, and roadmap generation use IBM Granite via watsonx.ai — a real enterprise LLM.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🛡</div>
            <h3>Responsible AI</h3>
            <p>LearnMate explains every recommendation, avoids stereotypes, and never promises outcomes. You stay in control.</p>
          </div>
        </div>
      </section>

      <section className="responsible-ai-section">
        <div className="container">
          <h2>🛡 Responsible AI principles</h2>
          <ul>
            <li>You make the final decisions — LearnMate advises and explains, not decides.</li>
            <li>Every career recommendation includes a clear reason based on your profile.</li>
            <li>We do not infer suitability from sensitive personal attributes.</li>
            <li>Only information needed for personalization is collected. Nothing is shared externally.</li>
            <li>Resources are described as topic areas or search phrases — not invented URLs or certifications.</li>
            <li>LearnMate does not promise admission, employment, income, or career success.</li>
            <li>You can review and edit your profile at any time.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
