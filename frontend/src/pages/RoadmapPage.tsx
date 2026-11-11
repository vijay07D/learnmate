import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../hooks/useSession";
import RoadmapStepCard from "../components/RoadmapStepCard";
import ReactMarkdown from "react-markdown";

export default function RoadmapPage() {
  const { session, completeMilestone, respondToRevision, sendMessage, updateWeeklyHours, loading, lastAgentTurn, isDemoMode } = useSession();
  const [checkinInput, setCheckinInput] = useState("");
  const [hoursInput, setHoursInput] = useState("");
  const navigate = useNavigate();

  if (!session) return null;

  const { roadmap, pendingRoadmapRevision, revisionReason, agentState } = session;

  if (!roadmap) {
    return (
      <main className="container">
        <div className="page-header"><h1>Learning Roadmap</h1></div>
        <div className="card" style={{ textAlign: "center", padding: "2.5rem" }}>
          <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>No roadmap yet. Select a career to generate your personalized roadmap.</p>
          <button className="btn btn-primary" onClick={() => navigate("/careers")}>Explore careers →</button>
        </div>
      </main>
    );
  }

  const completedCount = roadmap.steps.filter((s) => s.completed).length;
  const progress = Math.round((completedCount / roadmap.steps.length) * 100);

  async function handleCheckin() {
    const msg = checkinInput.trim();
    if (!msg) return;
    setCheckinInput("");
    await sendMessage(msg);
  }

  async function handleUpdateHours() {
    const h = parseInt(hoursInput, 10);
    if (isNaN(h) || h < 1) return;
    await updateWeeklyHours(h);
    setHoursInput("");
  }

  return (
    <main className="container" style={{ paddingBottom: "2rem" }}>
      {isDemoMode && (
        <div className="alert alert-warn" style={{ marginTop: "1rem" }}>
          ⚠ <strong>Demo mode:</strong> This roadmap was generated with sample data, not IBM Granite.
        </div>
      )}

      <div className="page-header">
        <h1>Your Learning Roadmap</h1>
        <p>
          {roadmap.careerTitle} · {roadmap.weeklyStudyHours}h/week · ~{roadmap.totalWeeks} weeks total
        </p>
      </div>

      {/* Progress */}
      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Overall progress</span>
          <span style={{ fontSize: "0.88rem", color: "var(--muted)" }}>{completedCount}/{roadmap.steps.length} milestones</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: "0.35rem" }}>{progress}% complete</p>
      </div>

      {/* Pending revision */}
      {pendingRoadmapRevision && (
        <div className="revision-banner">
          <h3>🔄 Roadmap revision proposed</h3>
          <p>{revisionReason}</p>
          <p style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
            Revision: {pendingRoadmapRevision.totalWeeks} weeks total (currently {roadmap.totalWeeks} weeks).
            Your completed milestones will be preserved.
          </p>
          <div className="revision-actions">
            <button className="btn btn-green btn-sm" onClick={() => respondToRevision(true)} disabled={loading}>
              ✓ Accept revision
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => respondToRevision(false)} disabled={loading}>
              ✗ Keep current roadmap
            </button>
          </div>
        </div>
      )}

      {/* Agent check-in message */}
      {agentState === "checkin" && lastAgentTurn && (
        <div className="card" style={{ marginBottom: "1.25rem", borderLeft: "4px solid var(--accent)" }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--accent)", marginBottom: "0.4rem" }}>LearnMate check-in</div>
          <ReactMarkdown>{lastAgentTurn.message}</ReactMarkdown>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
            <textarea
              style={{ flex: 1, border: "1px solid var(--border)", borderRadius: "6px", padding: "0.5rem", fontSize: "0.88rem", fontFamily: "inherit", resize: "none", minHeight: "52px" }}
              value={checkinInput}
              onChange={(e) => setCheckinInput(e.target.value)}
              placeholder="Tell LearnMate what you found challenging, interesting, or what you learned…"
            />
            <button className="btn btn-primary btn-sm" onClick={handleCheckin} disabled={loading || !checkinInput.trim()}>
              Send
            </button>
          </div>
        </div>
      )}

      {/* Weekly hours adjustment */}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.88rem", color: "var(--muted)" }}>Weekly study hours:</span>
        <input
          type="number"
          min={1}
          max={40}
          value={hoursInput}
          onChange={(e) => setHoursInput(e.target.value)}
          placeholder={String(roadmap.weeklyStudyHours)}
          style={{ width: "70px", border: "1px solid var(--border)", borderRadius: "6px", padding: "0.35rem 0.5rem", fontSize: "0.88rem" }}
        />
        <button className="btn btn-secondary btn-sm" onClick={handleUpdateHours} disabled={!hoursInput}>
          Update
        </button>
      </div>

      {/* Steps */}
      <div className="roadmap-steps">
        {roadmap.steps.map((step) => (
          <RoadmapStepCard
            key={step.id}
            step={step}
            onComplete={() => completeMilestone(step.id)}
          />
        ))}
      </div>

      <div className="rai-notice" style={{ marginTop: "1.5rem" }}>
        🛡 Resources are described as topics or search phrases — not verified URLs or certifications. Always evaluate resources independently.
      </div>
    </main>
  );
}
