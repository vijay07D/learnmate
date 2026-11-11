import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../hooks/useSession";
import CareerCard from "../components/CareerCard";

export default function CareerExplore() {
  const { session, selectCareer, loading } = useSession();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"saved" | "broad" | "filtered">("saved");

  if (!session) return null;

  const savedCareers = session.savedCareers.filter((c) => !session.dismissedCareerIds.includes(c.id));
  const broadCareers = (session.broadCareerSuggestions || []).filter(
    (c) => !session.dismissedCareerIds.includes(c.id)
  );
  const filteredCareers = (session.filteredCareers || []).filter(
    (c) => !session.dismissedCareerIds.includes(c.id)
  );

  const hasBroad = broadCareers.length > 0;
  const hasFiltered = filteredCareers.length > 0;

  async function handleExplore(careerId: string) {
    await selectCareer(careerId);
    navigate("/roadmap");
  }

  const careersToShow =
    activeTab === "broad" ? broadCareers :
    activeTab === "filtered" ? filteredCareers :
    savedCareers;

  return (
    <main className="container">
      <div className="page-header">
        <h1>Career Explorer</h1>
        <p>Browse, compare, and select career paths. Choose one to generate your personalized learning roadmap.</p>
      </div>

      <div className="rai-notice">
        💡 These recommendations are based on your profile and are meant as starting points for exploration. They are not predictions of career success, employment outcomes, or salary.
      </div>

      {/* Tabs */}
      {(hasBroad || hasFiltered) && (
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          <button
            className={`btn btn-sm ${activeTab === "saved" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveTab("saved")}
          >
            ⭐ Saved ({savedCareers.length})
          </button>
          {hasBroad && (
            <button
              className={`btn btn-sm ${activeTab === "broad" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setActiveTab("broad")}
            >
              🌍 Broad options ({broadCareers.length})
            </button>
          )}
          {hasFiltered && (
            <button
              className={`btn btn-sm ${activeTab === "filtered" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setActiveTab("filtered")}
            >
              🎓 Filtered for you ({filteredCareers.length})
            </button>
          )}
        </div>
      )}

      {careersToShow.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "2.5rem" }}>
          <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>
            {activeTab === "saved"
              ? "No saved careers yet. Save some from the chat!"
              : "No careers in this list yet. Complete the chat journey to discover them."}
          </p>
          <button className="btn btn-primary" onClick={() => navigate("/chat")}>
            💬 Chat with LearnMate to discover careers
          </button>
        </div>
      ) : (
        <>
          <div className="career-grid">
            {careersToShow.map((career) => (
              <CareerCard
                key={career.id}
                career={career}
                saved={session.savedCareers.some((s) => s.id === career.id)}
                onExplore={() => handleExplore(career.id)}
              />
            ))}
          </div>

          {loading && (
            <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--muted)" }}>
              <div className="spinner" style={{ margin: "0 auto 0.5rem" }} />
              Generating your roadmap…
            </div>
          )}
        </>
      )}

      <div style={{ marginTop: "1.5rem" }}>
        <h3 style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>Looking for more options?</h3>
        <button className="btn btn-secondary" onClick={() => navigate("/chat")}>
          💬 Continue chatting to discover more careers
        </button>
      </div>
    </main>
  );
}
