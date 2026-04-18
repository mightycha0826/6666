import {
  GoogleGenerativeAI,
  GenerativeModel,
  type Content,
} from "@google/generative-ai";
import type { Message, ReportMetadata } from "@/types";

export const SOCRATIC_SYSTEM_INSTRUCTION = `
You are "Academic Insight Pro", a senior Socratic research mentor reviewing a
student's academic paper. Your pedagogy has three strict phases and you must
never skip or merge them.

PHASE 1 — ACCURACY CHECK (Authorship + Comprehension):
  * Ask the student EXACTLY 3 pointed questions grounded in the specific
    content of the uploaded document (cite phrases, numbers, or section
    headings from the paper).
  * Each question must probe whether the student genuinely wrote the section
    and understands the underlying logic (e.g., why a method was chosen, how
    a formula was derived, what a cited author actually argued).
  * Number the questions 1–3. Do not answer them yourself.

PHASE 2 — CONSTRUCTIVE FEEDBACK (only after the student replies):
  * Identify logical fallacies, unsupported leaps, weak or missing data
    points, ambiguous definitions, and citation gaps.
  * Be specific: quote the sentence or paraphrase the claim before critiquing.
  * Maintain a respectful, mentor-like tone; never belittle the student.

PHASE 3 — SUGGESTION (Exactly 3 Actionable Steps):
  * Output a section titled "Actionable Steps to Improve Academic Rigor".
  * Provide EXACTLY 3 numbered, concrete steps (e.g., "Run a Cronbach's
    alpha on the 12-item survey in Section 3.2 and report the value").
  * Each step must be independently verifiable by the student.

GLOBAL RULES:
  * Always ground statements in the provided document context.
  * If the document does not contain enough information to judge a claim,
    say so explicitly instead of inventing details.
  * Use Markdown. Keep paragraphs tight. No filler.
`.trim();

export interface GeminiChatOptions {
  apiKey?: string;
  model?: string;
  report: ReportMetadata | null;
  history: Message[];
  userMessage: string;
  signal?: AbortSignal;
}

export interface GeminiChatResult {
  text: string;
}

function getApiKey(explicit?: string): string {
  const key =
    explicit ??
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ??
    process.env.GEMINI_API_KEY ??
    "";
  if (!key) {
    throw new Error(
      "Gemini API key missing. Set GEMINI_API_KEY (server) or NEXT_PUBLIC_GEMINI_API_KEY (client).",
    );
  }
  return key;
}

function buildReportContext(report: ReportMetadata | null): string {
  if (!report) return "No document has been uploaded yet.";
  const snippet = (report.rawText ?? "").slice(0, 12000);
  return [
    `FILE: ${report.fileName} (${report.fileType}, ${report.fileSize} bytes)`,
    `KEY FINDINGS: ${report.keyFindings.join(" | ")}`,
    `METHODOLOGY: ${report.methodology.join(" | ")}`,
    `CORE ARGUMENTS: ${report.coreArguments.join(" | ")}`,
    snippet ? `--- DOCUMENT EXCERPT ---\n${snippet}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function toGeminiHistory(history: Message[]): Content[] {
  return history
    .filter((m) => m.role === "student" || m.role === "ai")
    .map<Content>((m) => ({
      role: m.role === "student" ? "user" : "model",
      parts: [{ text: m.content }],
    }));
}

export function getGeminiModel(opts?: {
  apiKey?: string;
  model?: string;
}): GenerativeModel {
  const genAI = new GoogleGenerativeAI(getApiKey(opts?.apiKey));
  return genAI.getGenerativeModel({
    model: opts?.model ?? "gemini-1.5-pro",
    systemInstruction: SOCRATIC_SYSTEM_INSTRUCTION,
  });
}

export async function sendSocraticMessage(
  options: GeminiChatOptions,
): Promise<GeminiChatResult> {
  const model = getGeminiModel({
    apiKey: options.apiKey,
    model: options.model ?? "gemini-1.5-flash",
  });

  const context = buildReportContext(options.report);
  const history = toGeminiHistory(options.history);

  const chat = model.startChat({
    history: [
      {
        role: "user",
        parts: [{ text: `DOCUMENT CONTEXT:\n${context}` }],
      },
      {
        role: "model",
        parts: [
          {
            text: "Document context received. I will follow the three-phase Socratic protocol.",
          },
        ],
      },
      ...history,
    ],
    generationConfig: {
      temperature: 0.4,
      topP: 0.9,
      maxOutputTokens: 1024,
    },
  });

  const result = await chat.sendMessage(options.userMessage);
  return { text: result.response.text() };
}

export async function analyzeDocument(
  rawText: string,
  opts?: { apiKey?: string; model?: string },
): Promise<Pick<ReportMetadata, "keyFindings" | "methodology" | "coreArguments">> {
  const model = getGeminiModel({
    apiKey: opts?.apiKey,
    model: opts?.model ?? "gemini-1.5-flash",
  });

  const prompt = `Extract three arrays from this academic document. Respond with
STRICT JSON of the shape:
{"keyFindings": string[], "methodology": string[], "coreArguments": string[]}

Each array: 3–5 concise bullet strings, no numbering, no markdown. Document:
"""
${rawText.slice(0, 20000)}
"""`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) {
    return { keyFindings: [], methodology: [], coreArguments: [] };
  }
  try {
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as {
      keyFindings?: string[];
      methodology?: string[];
      coreArguments?: string[];
    };
    return {
      keyFindings: parsed.keyFindings ?? [],
      methodology: parsed.methodology ?? [],
      coreArguments: parsed.coreArguments ?? [],
    };
  } catch {
    return { keyFindings: [], methodology: [], coreArguments: [] };
  }
}

export function handleTTS(text: string): void {
  // Placeholder: wire a real TTS provider (ElevenLabs, Google Cloud TTS, etc.)
  // eslint-disable-next-line no-console
  console.log("[TTS]", text);
}
