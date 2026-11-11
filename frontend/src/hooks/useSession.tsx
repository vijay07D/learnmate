// Session context — manages the student session across the app

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { AgentTurn, StudentSession } from "../types";
import { api } from "../utils/api";

interface SessionContextValue {
  session: StudentSession | null;
  loading: boolean;
  error: string | null;
  isDemoMode: boolean;
  lastAgentTurn: AgentTurn | null;
  startSession: () => Promise<void>;
  sendMessage: (message: string) => Promise<AgentTurn>;
  selectCareer: (careerId: string) => Promise<void>;
  saveCareer: (careerId: string) => Promise<void>;
  dismissCareer: (careerId: string) => Promise<void>;
  generateRoadmap: () => Promise<void>;
  completeMilestone: (stepId: string) => Promise<void>;
  updateStepNotes: (stepId: string, notes: string) => Promise<void>;
  updateWeeklyHours: (hours: number) => Promise<void>;
  respondToRevision: (accept: boolean) => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const SESSION_ID_KEY = "learnmate_session_id";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<StudentSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [lastAgentTurn, setLastAgentTurn] = useState<AgentTurn | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // On mount: check live demo mode, then restore session only if it matches current mode
  useEffect(() => {
    api.health().then((h) => {
      setIsDemoMode(h.demoMode);
      const savedId = localStorage.getItem(SESSION_ID_KEY);
      if (!savedId) return;
      api
        .getSession(savedId)
        .then((s) => {
          // If the backend switched from demo→live, drop the stale demo session
          // so the student starts fresh with real AI responses
          const sessionWasDemo = s.conversation.length > 0 && s.conversation[0].content.includes("sample data");
          if (!h.demoMode && sessionWasDemo) {
            localStorage.removeItem(SESSION_ID_KEY);
            return;
          }
          setSession(s);
        })
        .catch(() => localStorage.removeItem(SESSION_ID_KEY));
    }).catch(() => {
      // Backend not reachable — restore session anyway, will show connection error
      const savedId = localStorage.getItem(SESSION_ID_KEY);
      if (savedId) {
        api.getSession(savedId).then((s) => setSession(s)).catch(() => localStorage.removeItem(SESSION_ID_KEY));
      }
    });
  }, []);

  const startSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { sessionId, agentTurn } = await api.startSession();
      localStorage.setItem(SESSION_ID_KEY, sessionId);
      const s = await api.getSession(sessionId);
      setSession(s);
      setLastAgentTurn(agentTurn);
      setIsDemoMode(agentTurn.isDemo);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (message: string): Promise<AgentTurn> => {
      if (!session) throw new Error("No active session");
      setLoading(true);
      setError(null);
      try {
        const { agentTurn, session: updated } = await api.sendMessage(session.id, message);
        setSession(updated);
        setLastAgentTurn(agentTurn);
        setIsDemoMode(agentTurn.isDemo);
        return agentTurn;
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [session]
  );

  const selectCareer = useCallback(
    async (careerId: string) => {
      if (!session) return;
      setLoading(true);
      setError(null);
      try {
        const { agentTurn, session: updated } = await api.selectCareer(session.id, careerId);
        setSession(updated);
        setLastAgentTurn(agentTurn);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [session]
  );

  const saveCareer = useCallback(
    async (careerId: string) => {
      if (!session) return;
      await api.saveCareer(session.id, careerId);
      const updated = await api.getSession(session.id);
      setSession(updated);
    },
    [session]
  );

  const dismissCareer = useCallback(
    async (careerId: string) => {
      if (!session) return;
      await api.dismissCareer(session.id, careerId);
      const updated = await api.getSession(session.id);
      setSession(updated);
    },
    [session]
  );

  const generateRoadmap = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const { agentTurn, session: updated } = await api.generateRoadmap(session.id);
      setSession(updated);
      setLastAgentTurn(agentTurn);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  const completeMilestone = useCallback(
    async (stepId: string) => {
      if (!session) return;
      setLoading(true);
      try {
        const { agentTurn, session: updated } = await api.completeMilestone(session.id, stepId);
        setSession(updated);
        setLastAgentTurn(agentTurn);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [session]
  );

  const updateStepNotes = useCallback(
    async (stepId: string, notes: string) => {
      if (!session) return;
      await api.updateStepNotes(session.id, stepId, notes);
    },
    [session]
  );

  const updateWeeklyHours = useCallback(
    async (hours: number) => {
      if (!session) return;
      const { session: updated } = await api.updateWeeklyHours(session.id, hours);
      setSession(updated);
    },
    [session]
  );

  const respondToRevision = useCallback(
    async (accept: boolean) => {
      if (!session) return;
      setLoading(true);
      try {
        const { agentTurn, session: updated } = await api.respondToRevision(session.id, accept);
        setSession(updated);
        setLastAgentTurn(agentTurn);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [session]
  );

  const refreshSession = useCallback(async () => {
    if (!session) return;
    const updated = await api.getSession(session.id);
    setSession(updated);
  }, [session]);

  return (
    <SessionContext.Provider
      value={{
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
        generateRoadmap,
        completeMilestone,
        updateStepNotes,
        updateWeeklyHours,
        respondToRevision,
        refreshSession,
        clearError,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
