"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, Target, Microscope, BookOpen } from "lucide-react";
import ChatWindow from "@/components/ChatWindow";
import { useApp } from "@/context/AppContext";
import { analyzeDocument, sendSocraticMessage } from "@/lib/gemini";
import type { Message } from "@/types";

function SkeletonLine({ width = "100%" }: { width?: string }) {
  return (
    <div
      className="h-3 animate-pulse rounded bg-slate-200"
      style={{ width }}
    />
  );
}

function SidebarSection({
  icon,
  title,
  items,
  loading,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  loading: boolean;
}) {
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center gap-2 text-slate-900">
        {icon}
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      </div>
      {loading ? (
        <div className="space-y-2">
          <SkeletonLine width="92%" />
          <SkeletonLine width="76%" />
          <SkeletonLine width="84%" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-xs text-slate-500">No items extracted yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li
              key={`${title}-${idx}`}
              className="rounded-md bg-white px-3 py-2 text-xs leading-relaxed text-slate-700 shadow-sm ring-1 ring-slate-100"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function ChatbotPage() {
  const router = useRouter();
  const {
    report,
    setReport,
    addMessage,
    messages,
    setIsThinking,
    updateMessage,
  } = useApp();
  const [loadingSidebar, setLoadingSidebar] = useState<boolean>(true);

  useEffect(() => {
    if (!report) {
      router.replace("/");
      return;
    }

    let cancelled = false;

    async function bootstrap() {
      if (!report) return;
      const needsAnalysis =
        report.keyFindings.length === 0 &&
        report.methodology.length === 0 &&
        report.coreArguments.length === 0;

      if (needsAnalysis) {
        try {
          const extracted = await analyzeDocument(report.rawText ?? "");
          if (cancelled) return;
          setReport({ ...report, ...extracted });
        } catch {
          if (!cancelled) {
            setReport({
              ...report,
              keyFindings: ["Unable to extract — Gemini key missing or invalid."],
              methodology: [],
              coreArguments: [],
            });
          }
        }
      }

      if (!cancelled) setLoadingSidebar(false);

      if (messages.length === 0) {
        const aiId = `${Date.now().toString(36)}-intro`;
        const placeholder: Message = {
          id: aiId,
          role: "ai",
          content: "",
          createdAt: Date.now(),
        };
        addMessage(placeholder);
        setIsThinking(true);
        try {
          const { text } = await sendSocraticMessage({
            report,
            history: [],
            userMessage:
              "Begin Phase 1. Ask me exactly 3 Socratic questions grounded in my uploaded paper to verify authorship and comprehension.",
          });
          if (!cancelled) updateMessage(aiId, { content: text });
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : "Gemini unavailable.";
          if (!cancelled)
            updateMessage(aiId, {
              content: `Welcome! I couldn't reach Gemini (${msg}). You can still chat — configure your API key to enable live Socratic feedback.`,
            });
        } finally {
          if (!cancelled) setIsThinking(false);
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!report) return null;

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="h-screen w-full bg-slate-50"
    >
      <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col md:flex-row">
        <aside className="w-full shrink-0 border-r border-slate-200 bg-slate-50 p-5 md:w-[30%] md:max-w-[420px]">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            New upload
          </button>

          <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900">
              <FileText className="h-4 w-4 text-blue-600" />
              <h2 className="truncate text-sm font-semibold">
                {report.fileName}
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {(report.fileSize / 1024).toFixed(1)} KB &middot;{" "}
              {new Date(report.uploadedAt).toLocaleString()}
            </p>
          </div>

          <SidebarSection
            icon={<Target className="h-4 w-4 text-blue-600" />}
            title="Key Findings"
            items={report.keyFindings}
            loading={loadingSidebar}
          />
          <SidebarSection
            icon={<Microscope className="h-4 w-4 text-blue-600" />}
            title="Methodology"
            items={report.methodology}
            loading={loadingSidebar}
          />
          <SidebarSection
            icon={<BookOpen className="h-4 w-4 text-blue-600" />}
            title="Core Arguments"
            items={report.coreArguments}
            loading={loadingSidebar}
          />
        </aside>

        <div className="flex-1 md:w-[70%]">
          <ChatWindow />
        </div>
      </div>
    </motion.main>
  );
}
