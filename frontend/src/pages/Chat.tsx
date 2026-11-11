import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../hooks/useSession";
import ChatMessage from "../components/ChatMessage";
import CareerCard from "../components/CareerCard";
import { Career } from "../types";

const STATE_LABELS: Record<string, string> = {
  onboarding: "Getting to know you",
  broad_careers: "Career Discovery — broad options",
  onboarding_education: "Your education background",
  filtered_careers: "Career Discovery — filtered for you",
  goal_setting: "Setting your goals",
  skill_gap: "Skill Assessment",
  roadmap: "Your Learning Roadmap",
  checkin: "Progress Check-in",
  complete: "Journey Complete",
};

export default function Chat() {
  const {
    session,
    loading,
    error,
    isDemoMode,
    lastAgentTurn,
    startSession,
    sendMessage,
    selectCareer,
    saveCareer,
    dismissCareer,
    clearError,
  } = useSession();
  const [input, setInput] = useState("");
  const [localCareers, setLocalCareers] = useState<Career[]>([]);
  const [careerStage, setCareerStage] = useState<"broad" | "filtered" | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Start session if none
  useEffect(() => {
    if (!session) {
      startSession();
    }
  }, []); // eslint-disable-line

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.conversation]);

  // Extract careers from last turn
  useEffect(() => {
    if (lastAgentTurn?.careers) {
      setLocalCareers(lastAgentTurn.careers);
      setCareerStage(lastAgentTurn.careerStage);
    }
    // Auto-navigate to roadmap if roadmap was generated
    if (lastAgentTurn?.roadmap) {
      setTimeout(() => navigate("/roadmap"), 1500);
    }
  }, [lastAgentTurn, navigate]);

  async function handleSend() {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput("");
    await sendMessage(msg);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleExploreCareer(careerId: string) {
    await selectCareer(careerId);
    navigate("/roadmap");
  }

  async function handleSaveCareer(careerId: string) {
    await saveCareer(careerId);
  }

  async function handleDismissCareer(careerId: string) {
    setLocalCareers((prev) => prev.filter((c) => c.id !== careerId));
    await dismissCareer(careerId);
  }

  // Show career cards after broad or filtered discovery
  const showCareers =
    (session?.agentState === "broad_careers" ||
      session?.agentState === "filtered_careers" ||
      session?.agentState === "goal_setting") &&
    localCareers.length > 0;

  // Determine if we should show the education prompt
  const isEducationStep = session?.agentState === "onboarding_education";

  const stateLabel = session ? STATE_LABELS[session.agentState] ?? session.agentState : "Loading…";

  return (
    <div className="chat-layout">
      <div className="chat-header">
        <div className="chat-stage">{stateLabel}</div>
        {isDemoMode && (
          <div className="rai-notice" style={{ marginTop: "0.5rem" }}>
            ⚠ <strong>Demo mode:</strong> IBM Granite is not connected. Responses use sample data.{" "}
            <a href="/#ibm-setup">See README</a> to connect real IBM services.
          </div>
        )}
      </div>

      <div className="chat-messages" role="log" aria-live="polite" aria-label="Conversation">
        {!session && loading && (
          <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
            <div className="spinner" style={{ margin: "0 auto 0.75rem" }} />
            Starting your session…
          </div>
        )}

        {session?.conversation.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}

        {loading && (
          <div className="message message-assistant">
            <div className="message-avatar" style={{ background: "var(--accent)", color: "white" }}>🎓</div>
            <div className="message-bubble" style={{ color: "var(--muted)" }}>
              <div className="spinner" />
            </div>
          </div>
        )}

        {/* Career cards — shown after broad discovery */}
        {showCareers && (
          <div style={{ width: "100%", alignSelf: "stretch" }}>
            {careerStage === "broad" && (
              <div className="rai-notice" style={{ marginBottom: "0.75rem" }}>
                🌍 <strong>Broad career options</strong> — these span multiple fields. No specific program required.
              </div>
            )}
            {careerStage === "filtered" && (
              <div className="rai-notice" style={{ marginBottom: "0.75rem" }}>
                🎓 <strong>Filtered for your background</strong> — careers with a clear path from your studies.
              </div>
            )}
            <div className="career-grid">
              {localCareers
                .filter((c) => !session?.dismissedCareerIds.includes(c.id))
                .map((career) => (
                  <CareerCard
                    key={career.id}
                    career={career}
                    saved={session?.savedCareers.some((s) => s.id === career.id)}
                    onExplore={() => handleExploreCareer(career.id)}
                    onSave={() => handleSaveCareer(career.id)}
                    onDismiss={() => handleDismissCareer(career.id)}
                  />
                ))}
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: "0.75rem" }}>
              💡 <em>These are suggestions to explore, not predictions of career success or employment outcomes.</em>
            </p>
          </div>
        )}

        {/* Education step hint */}
        {isEducationStep && !loading && (
          <div className="rai-notice" style={{ marginTop: "0.5rem" }}>
            📚 <strong>Tip:</strong> You can say something like <em>"BSc Computer Science, second year"</em> or <em>"I'm studying nursing, final year"</em>.
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            {error}
            <button className="btn btn-sm btn-secondary" style={{ marginLeft: "0.75rem" }} onClick={clearError}>
              Dismiss
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <div className="chat-input-row">
          <textarea
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your response… (Enter to send, Shift+Enter for new line)"
            disabled={loading || !session}
            aria-label="Your message"
            rows={1}
          />
          <button
            className="chat-send-btn"
            onClick={handleSend}
            disabled={loading || !input.trim() || !session}
            aria-label="Send message"
          >
            {loading ? (
              <span className="spinner" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} />
            ) : (
              "➤"
            )}
          </button>
        </div>
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.4rem" }}>
          You can skip questions and edit your answers anytime from the{" "}
          <a href="/profile">Profile page</a>.
        </p>
      </div>
    </div>
  );
}
