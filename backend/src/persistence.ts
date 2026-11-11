// Local JSON file persistence (demo mode)
// Ready to be swapped for IBM Cloudant in production.

import fs from "fs";
import path from "path";
import { StudentSession } from "./types";

const DATA_DIR = path.resolve(__dirname, "../../../data");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function sessionPath(sessionId: string): string {
  return path.join(DATA_DIR, `session_${sessionId}.json`);
}

export function saveSession(session: StudentSession): void {
  ensureDataDir();
  session.updatedAt = new Date().toISOString();
  fs.writeFileSync(sessionPath(session.id), JSON.stringify(session, null, 2), "utf8");
}

export function loadSession(sessionId: string): StudentSession | null {
  const p = sessionPath(sessionId);
  if (!fs.existsSync(p)) return null;
  try {
    const raw = fs.readFileSync(p, "utf8");
    return JSON.parse(raw) as StudentSession;
  } catch {
    return null;
  }
}

export function deleteSession(sessionId: string): void {
  const p = sessionPath(sessionId);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}
