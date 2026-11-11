import { Career } from "../types";
import { useSession } from "../hooks/useSession";

interface Props {
  career: Career;
  onExplore?: () => void;
  onSave?: () => void;
  onDismiss?: () => void;
  saved?: boolean;
  dismissed?: boolean;
}

const FIELD_COLORS: Record<string, string> = {
  Technology: "tag-blue",
  Design: "tag-purple",
  Business: "tag",
  "Health Technology": "tag-green",
  Sustainability: "tag-green",
  Education: "tag",
  "Digital Media": "tag-purple",
  Finance: "tag-blue",
  "Public Sector": "tag",
};

export default function CareerCard({ career, onExplore, onSave, onDismiss, saved, dismissed }: Props) {
  const { session, saveCareer, dismissCareer, loading } = useSession();

  if (dismissed) return null;

  async function handleSave() {
    if (onSave) {
      onSave();
    } else if (session) {
      await saveCareer(career.id);
    }
  }

  async function handleDismiss() {
    if (onDismiss) {
      onDismiss();
    } else if (session) {
      await dismissCareer(career.id);
    }
  }

  return (
    <div className="card career-card">
      <div className="career-card-header">
        <h3>{career.title}</h3>
        <span className={`tag ${FIELD_COLORS[career.field] ?? "tag"}`}>{career.field}</span>
      </div>
      <p className="career-card-desc">{career.description}</p>
      {career.fitReason && (
        <div className="career-card-fit">💡 {career.fitReason}</div>
      )}
      <div style={{ marginBottom: "0.75rem" }}>
        <span className="roadmap-section-label">Skills you may develop</span>
        <div className="profile-tags" style={{ marginTop: "0.35rem" }}>
          {career.skillsNeeded.slice(0, 4).map((s) => (
            <span key={s} className="tag">{s}</span>
          ))}
        </div>
      </div>
      {career.relatedCareers && career.relatedCareers.length > 0 && (
        <div style={{ marginBottom: "0.75rem" }}>
          <span className="roadmap-section-label">Related paths</span>
          <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: "0.2rem" }}>
            {career.relatedCareers.slice(0, 3).join(" · ")}
          </p>
        </div>
      )}
      <div className="career-card-actions">
        {onExplore && (
          <button
            className="btn btn-primary btn-sm"
            onClick={onExplore}
            disabled={loading}
            title="Select this career and generate your personalized roadmap"
          >
            Build my roadmap →
          </button>
        )}
        {session && !saved && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleSave}
            disabled={loading}
          >
            ⭐ Save
          </button>
        )}
        {session && saved && (
          <span className="tag tag-green">⭐ Saved</span>
        )}
        {session && !saved && (
          <button
            className="btn btn-sm"
            style={{ color: "var(--muted)", background: "transparent", border: "none" }}
            onClick={handleDismiss}
            disabled={loading}
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
