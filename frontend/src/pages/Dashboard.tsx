import { useNavigate } from "react-router-dom";
import { useSession } from "../hooks/useSession";

export default function Dashboard() {
  const { session, isDemoMode } = useSession();
  const navigate = useNavigate();

  if (!session) return <div className="container" style={{ padding: "2rem" }}>No active session. <a href="/chat">Start a session</a></div>;

  const completedSteps = session.roadmap?.steps.filter((s) => s.completed).length ?? 0;
  const totalSteps = session.roadmap?.steps.length ?? 0;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <main className="container">
      {isDemoMode && (
        <div className="alert alert-warn" style={{ marginTop: "1rem" }}>
          ⚠ <strong>Demo mode active.</strong> Career matches and roadmaps use sample data. See README to enable IBM Granite.
        </div>
      )}

      <div className="page-header">
        <h1>Your Dashboard</h1>
        <p>An overview of your career exploration journey</p>
      </div>

      <div className="dashboard-grid">
        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          <div className="card">
            <h3 style={{ marginBottom: "0.75rem", fontSize: "0.95rem" }}>Profile Summary</h3>
            {session.profile.interests.length > 0 && (
              <div style={{ marginBottom: "0.6rem" }}>
                <div className="roadmap-section-label">Interests</div>
                <div className="profile-tags" style={{ marginTop: "0.3rem" }}>
                  {session.profile.interests.slice(0, 6).map((i) => <span key={i} className="tag">{i}</span>)}
                </div>
              </div>
            )}
            {session.profile.skills.length > 0 && (
              <div style={{ marginBottom: "0.6rem" }}>
                <div className="roadmap-section-label">Skills</div>
                <div className="profile-tags" style={{ marginTop: "0.3rem" }}>
                  {session.profile.skills.slice(0, 6).map((s) => <span key={s} className="tag tag-blue">{s}</span>)}
                </div>
              </div>
            )}
            {session.profile.education && (
              <div>
                <div className="roadmap-section-label">Education</div>
                <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{session.profile.education}</p>
              </div>
            )}
            <button className="btn btn-secondary btn-sm" style={{ marginTop: "0.75rem", width: "100%" }} onClick={() => navigate("/profile")}>
              Edit profile
            </button>
          </div>

          {session.roadmap && (
            <div className="card">
              <h3 style={{ marginBottom: "0.75rem", fontSize: "0.95rem" }}>Roadmap Progress</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "0.5rem" }}>{session.roadmap.careerTitle}</p>
              <div className="progress-bar" style={{ marginBottom: "0.4rem" }}>
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <p style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                {completedSteps} of {totalSteps} milestones complete ({progress}%)
              </p>
              <button className="btn btn-primary btn-sm" style={{ marginTop: "0.75rem", width: "100%" }} onClick={() => navigate("/roadmap")}>
                View roadmap →
              </button>
            </div>
          )}
        </aside>

        {/* Main content */}
        <div>
          {/* Selected career */}
          {session.selectedCareerId && (
            <div className="card" style={{ marginBottom: "1rem" }}>
              <div className="roadmap-section-label" style={{ marginBottom: "0.25rem" }}>Exploring</div>
              <h2 style={{ fontSize: "1.1rem" }}>
                {session.savedCareers.find((c) => c.id === session.selectedCareerId)?.title ?? session.selectedCareerId}
              </h2>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
                <button className="btn btn-primary btn-sm" onClick={() => navigate("/roadmap")}>View roadmap</button>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate("/careers")}>Explore other careers</button>
              </div>
            </div>
          )}

          {/* Saved careers */}
          <div className="card" style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h3 style={{ fontSize: "0.95rem" }}>Saved Careers ({session.savedCareers.length})</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate("/careers")}>Browse all</button>
            </div>
            {session.savedCareers.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
                No saved careers yet. <a href="/chat">Continue chatting</a> to discover careers.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {session.savedCareers.map((c) => (
                  <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{c.title}</span>
                      <span className="tag" style={{ marginLeft: "0.5rem" }}>{c.field}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="card">
            <h3 style={{ fontSize: "0.95rem", marginBottom: "0.75rem" }}>Continue your journey</h3>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button className="btn btn-primary btn-sm" onClick={() => navigate("/chat")}>💬 Chat with LearnMate</button>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate("/careers")}>🌍 Explore careers</button>
              {session.roadmap && <button className="btn btn-secondary btn-sm" onClick={() => navigate("/roadmap")}>🗺 My roadmap</button>}
            </div>
          </div>
        </div>
      </div>

      <div className="rai-notice" style={{ marginTop: "1.5rem" }}>
        🛡 <strong>Responsible AI reminder:</strong> Career suggestions are guidance, not a guarantee of employment or success. You make all final decisions.
      </div>
    </main>
  );
}
