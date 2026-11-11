import { useState } from "react";
import { useSession } from "../hooks/useSession";
import { api } from "../utils/api";

export default function ProfilePage() {
  const { session, refreshSession, isDemoMode } = useSession();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState(() => ({
    interests: session?.profile.interests.join(", ") ?? "",
    skills: session?.profile.skills.join(", ") ?? "",
    subjects: session?.profile.subjects.join(", ") ?? "",
    education: session?.profile.education ?? "",
    educationProgram: session?.profile.educationProgram ?? "",
    yearOfStudy: session?.profile.yearOfStudy ?? "",
    goals: session?.profile.goals ?? "",
    learningFormat: session?.profile.learningFormat ?? "",
    weeklyStudyHours: String(session?.profile.weeklyStudyHours ?? ""),
  }));

  if (!session) return null;

  function parseList(val: string) {
    return val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async function handleSave() {
    if (!session) return;
    await api.updateProfile(session.id, {
      interests: parseList(form.interests),
      skills: parseList(form.skills),
      subjects: parseList(form.subjects),
      education: form.education,
      educationProgram: form.educationProgram,
      yearOfStudy: form.yearOfStudy,
      goals: form.goals,
      learningFormat: form.learningFormat,
      weeklyStudyHours: form.weeklyStudyHours ? parseInt(form.weeklyStudyHours, 10) : null,
    });
    await refreshSession();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function field(label: string, name: keyof typeof form, placeholder: string, hint?: string) {
    return (
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", fontWeight: 600, fontSize: "0.88rem", marginBottom: "0.3rem" }}>
          {label}
        </label>
        {hint && <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.25rem" }}>{hint}</p>}
        <input
          style={{
            width: "100%",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "0.55rem 0.75rem",
            fontSize: "0.9rem",
            fontFamily: "inherit",
          }}
          value={form[name]}
          onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <main className="container" style={{ paddingBottom: "2rem" }}>
      <div className="page-header">
        <h1>Profile & Preferences</h1>
        <p>Review and update the information LearnMate uses to personalize your career suggestions and roadmap.</p>
      </div>

      {isDemoMode && (
        <div className="alert alert-warn">⚠ Demo mode — updates are saved to local session files only.</div>
      )}

      <div className="rai-notice">
        🛡 LearnMate only uses this information for personalization. No data is shared externally. You can edit or clear any field at any time.
      </div>

      <div className="card" style={{ maxWidth: "640px" }}>
        <h2 style={{ fontSize: "1rem", marginBottom: "1.25rem" }}>Your information</h2>

        {field("Interests", "interests", "e.g. coding, art, sports, music", "Separate multiple items with commas.")}
        {field("Skills & strengths", "skills", "e.g. communication, Python, design", "Include skills gained outside class too.")}
        {field("Favourite subjects", "subjects", "e.g. maths, psychology, history", "Subjects you enjoy or feel confident in.")}
        {field("Education / program", "education", "e.g. BSc Computer Science, Year 2")}
        {field("Program keywords", "educationProgram", "e.g. computer science, nursing, business", "Helps with career filtering. Use a short keyword.")}
        {field("Year of study", "yearOfStudy", "e.g. First year, Year 3, Final year")}
        {field("Long-term goals", "goals", "e.g. Work in healthcare tech, start a business")}
        {field(
          "Preferred learning format",
          "learningFormat",
          "e.g. video courses, hands-on projects, reading"
        )}

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", fontWeight: 600, fontSize: "0.88rem", marginBottom: "0.3rem" }}>
            Weekly study hours
          </label>
          <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.25rem" }}>
            How many hours per week can you realistically dedicate to learning?
          </p>
          <input
            type="number"
            min={1}
            max={40}
            style={{
              width: "120px",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "0.55rem 0.75rem",
              fontSize: "0.9rem",
            }}
            value={form.weeklyStudyHours}
            onChange={(e) => setForm((f) => ({ ...f, weeklyStudyHours: e.target.value }))}
            placeholder="5"
          />
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button className="btn btn-primary" onClick={handleSave}>
            Save changes
          </button>
          {saved && <span style={{ color: "var(--green)", fontSize: "0.88rem" }}>✓ Saved!</span>}
        </div>
      </div>

      <div className="card" style={{ maxWidth: "640px", marginTop: "1rem" }}>
        <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Session info</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
          Session ID: <code>{session.id.slice(0, 8)}…</code>
        </p>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
          Started: {new Date(session.createdAt).toLocaleString()}
        </p>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
          Agent state: <code>{session.agentState}</code>
        </p>
        {session.selectedCareerId && (
          <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
            Selected career: <code>{session.selectedCareerId}</code>
          </p>
        )}
        <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: "0.5rem" }}>
          To start a new session, clear your browser's local storage and refresh the page.
        </p>
      </div>
    </main>
  );
}
