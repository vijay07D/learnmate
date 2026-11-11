import { useState } from "react";
import { RoadmapStep } from "../types";
import { useSession } from "../hooks/useSession";

interface Props {
  step: RoadmapStep;
  onComplete: () => void;
}

export default function RoadmapStepCard({ step, onComplete }: Props) {
  const { updateStepNotes, loading } = useSession();
  const [notes, setNotes] = useState(step.notes);
  const [noteSaved, setNoteSaved] = useState(false);
  const [expanded, setExpanded] = useState(!step.completed);

  async function handleSaveNotes() {
    await updateStepNotes(step.id, notes);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  }

  return (
    <div className={`roadmap-step ${step.completed ? "completed" : ""}`}>
      <div className="roadmap-step-header">
        <div>
          <span style={{ fontSize: "0.73rem", color: "var(--muted)", fontWeight: 600 }}>
            STAGE {step.stage}
          </span>
          <div className="roadmap-step-title">{step.objective}</div>
        </div>
        <div className="roadmap-step-meta">
          <span className={`difficulty-badge difficulty-${step.difficulty}`}>{step.difficulty}</span>
          <span className="tag">~{step.estimatedWeeks}w</span>
          {step.completed && <span className="tag tag-green">✓ Complete</span>}
          <button
            style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginBottom: "0.75rem" }}>
            {step.skills.map((s) => <span key={s} className="tag tag-blue">{s}</span>)}
          </div>

          <div className="roadmap-section">
            <div className="roadmap-section-label">📚 Resource</div>
            <p className="roadmap-section">{step.resource}</p>
          </div>

          <div className="roadmap-section">
            <div className="roadmap-section-label">🛠 Project</div>
            <p>{step.project}</p>
          </div>

          <div className="roadmap-section">
            <div className="roadmap-section-label">🏁 Milestone</div>
            <p>{step.milestone}</p>
          </div>

          <div className="roadmap-section">
            <div className="roadmap-section-label">📝 Your Notes</div>
            <textarea
              className="roadmap-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your notes, reflections, or links here…"
            />
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.4rem", alignItems: "center" }}>
              <button className="btn btn-secondary btn-sm" onClick={handleSaveNotes}>
                Save notes
              </button>
              {noteSaved && <span style={{ color: "var(--green)", fontSize: "0.82rem" }}>Saved!</span>}
            </div>
          </div>

          {!step.completed && (
            <div style={{ marginTop: "0.75rem" }}>
              <button
                className="btn btn-green btn-sm"
                onClick={onComplete}
                disabled={loading}
              >
                ✓ Mark milestone complete
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
