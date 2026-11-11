// IBM watsonx.ai integration
// Uses the chat completions API (/ml/v1/text/chat) which works with instruct models.
// Falls back to demo mode automatically when IBM credentials are absent.

import https from "https";

export function isDemoMode(): boolean {
  return (
    process.env.DEMO_MODE === "true" ||
    !process.env.IBM_CLOUD_API_KEY ||
    !process.env.IBM_WATSONX_PROJECT_ID
  );
}

// ── IAM token cache ────────────────────────────────────────────────────────────
let _iamToken: string | null = null;
let _iamExpiry = 0;

async function getIAMToken(): Promise<string> {
  const now = Date.now();
  if (_iamToken && now < _iamExpiry) return _iamToken;

  const apiKey = process.env.IBM_CLOUD_API_KEY!;
  const body = `grant_type=urn%3Aibm%3Aparams%3Aoauth%3Agrant-type%3Aapikey&apikey=${encodeURIComponent(apiKey)}`;

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "iam.cloud.ibm.com",
        path: "/identity/token",
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data) as { access_token: string; expires_in: number };
            if (!parsed.access_token) {
              reject(new Error(`IAM token error: ${data.slice(0, 200)}`));
              return;
            }
            _iamToken = parsed.access_token;
            _iamExpiry = now + (parsed.expires_in - 60) * 1000;
            resolve(_iamToken);
          } catch {
            reject(new Error("Failed to parse IAM token response"));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── watsonx.ai chat completions ───────────────────────────────────────────────
interface GraniteGenerateOptions {
  prompt: string;
  maxNewTokens?: number;
  temperature?: number;
  stopSequences?: string[];
  systemPrompt?: string;
}

export async function graniteGenerate(opts: GraniteGenerateOptions): Promise<string> {
  if (isDemoMode()) {
    throw new Error("DEMO_MODE: granite not called");
  }

  const token = await getIAMToken();
  const projectId = process.env.IBM_WATSONX_PROJECT_ID!;
  const modelId = process.env.IBM_GRANITE_MODEL_ID || "meta-llama/llama-3-3-70b-instruct";
  const baseUrl = process.env.IBM_WATSONX_URL || "https://au-syd.ml.cloud.ibm.com";
  const url = new URL("/ml/v1/text/chat?version=2023-05-29", baseUrl);

  // Strip the <END> marker from the prompt — the chat API doesn't need it
  const cleanPrompt = opts.prompt.replace(/<END>\s*$/, "").trim();

  // Extract system content if present (everything before the first user turn marker)
  const systemMatch = cleanPrompt.match(/^([\s\S]*?)(?:Student just said:|Student:|Conversation history:)/i);
  const systemContent = opts.systemPrompt ?? (systemMatch ? systemMatch[1].trim() : "You are LearnMate, a supportive career guidance assistant for students.");

  const payload = JSON.stringify({
    model_id: modelId,
    messages: [
      { role: "system", content: systemContent },
      { role: "user", content: cleanPrompt },
    ],
    max_tokens: opts.maxNewTokens ?? 800,
    temperature: opts.temperature ?? 0.5,
    project_id: projectId,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data) as {
              choices?: Array<{ message: { content: string } }>;
              errors?: Array<{ message: string }>;
            };
            if (parsed.errors?.length) {
              reject(new Error(parsed.errors[0].message));
              return;
            }
            const text = parsed.choices?.[0]?.message?.content?.trim() ?? "";
            resolve(text);
          } catch {
            reject(new Error("Failed to parse watsonx.ai response"));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

// ── JSON extraction helper ────────────────────────────────────────────────────
export function extractJSON<T>(raw: string): T | null {
  // Try fenced code block first, then bare object/array
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()) as T; } catch { /* fall through */ }
  }
  // Try to find first complete JSON object or array
  const bare = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (bare) {
    try { return JSON.parse(bare[0]) as T; } catch { /* fall through */ }
  }
  return null;
}
