// API client for LearnMate backend

import { AgentTurn, StudentSession } from "../types";

const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  startSession: () =>
    request<{ sessionId: string; agentTurn: AgentTurn }>("/sessions", { method: "POST" }),

  getSession: (id: string) => request<StudentSession>(`/sessions/${id}`),

  sendMessage: (id: string, message: string) =>
    request<{ agentTurn: AgentTurn; session: StudentSession }>(`/sessions/${id}/message`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  selectCareer: (id: string, careerId: string) =>
    request<{ agentTurn: AgentTurn; session: StudentSession }>(`/sessions/${id}/select-career`, {
      method: "POST",
      body: JSON.stringify({ careerId }),
    }),

  saveCareer: (id: string, careerId: string) =>
    request<{ success: boolean }>(`/sessions/${id}/save-career`, {
      method: "POST",
      body: JSON.stringify({ careerId }),
    }),

  dismissCareer: (id: string, careerId: string) =>
    request<{ success: boolean }>(`/sessions/${id}/dismiss-career`, {
      method: "POST",
      body: JSON.stringify({ careerId }),
    }),

  generateRoadmap: (id: string) =>
    request<{ agentTurn: AgentTurn; session: StudentSession }>(`/sessions/${id}/generate-roadmap`, {
      method: "POST",
    }),

  completeMilestone: (id: string, stepId: string) =>
    request<{ agentTurn: AgentTurn; session: StudentSession }>(`/sessions/${id}/complete-milestone`, {
      method: "POST",
      body: JSON.stringify({ stepId }),
    }),

  updateStepNotes: (id: string, stepId: string, notes: string) =>
    request<{ success: boolean }>(`/sessions/${id}/steps/${stepId}/notes`, {
      method: "PATCH",
      body: JSON.stringify({ notes }),
    }),

  updateWeeklyHours: (id: string, hours: number) =>
    request<{ agentTurn: AgentTurn; session: StudentSession }>(`/sessions/${id}/weekly-hours`, {
      method: "PATCH",
      body: JSON.stringify({ hours }),
    }),

  respondToRevision: (id: string, accept: boolean) =>
    request<{ agentTurn: AgentTurn; session: StudentSession }>(`/sessions/${id}/revision-response`, {
      method: "POST",
      body: JSON.stringify({ accept }),
    }),

  updateProfile: (id: string, updates: Record<string, unknown>) =>
    request<{ profile: unknown }>(`/sessions/${id}/profile`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),

  health: () => request<{ status: string; demoMode: boolean }>("/health"),
};
