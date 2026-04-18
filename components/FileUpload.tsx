"use client";

import {
  ChangeEvent,
  DragEvent,
  useCallback,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CloudUpload, FileText, AlertTriangle, Loader2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { ReportMetadata, UploadProgress } from "@/types";

const ACCEPTED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const ACCEPTED_EXT = [".pdf", ".docx", ".txt"];
const MAX_BYTES = 10 * 1024 * 1024;

export default function FileUpload() {
  const router = useRouter();
  const { setReport } = useApp();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [progress, setProgress] = useState<UploadProgress>({
    percent: 0,
    status: "idle",
  });

  const validate = (file: File): string | null => {
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    const typeOk =
      ACCEPTED_MIME.includes(file.type) || ACCEPTED_EXT.includes(ext);
    if (!typeOk) return "Only .pdf, .docx, or .txt files are accepted.";
    if (file.size > MAX_BYTES) return "File exceeds the 10MB limit.";
    return null;
  };

  const simulateUpload = (file: File): Promise<void> =>
    new Promise((resolve) => {
      let pct = 0;
      setProgress({ percent: 0, status: "uploading" });
      const timer = setInterval(() => {
        pct = Math.min(100, pct + Math.round(8 + Math.random() * 14));
        setProgress({ percent: pct, status: "uploading" });
        if (pct >= 100) {
          clearInterval(timer);
          setProgress({ percent: 100, status: "processing" });
          resolve();
        }
      }, 180);
    });

  const readRawText = async (file: File): Promise<string> => {
    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      return await file.text();
    }
    return "";
  };

  const handleFile = useCallback(
    async (file: File) => {
      const err = validate(file);
      if (err) {
        setProgress({ percent: 0, status: "error", error: err });
        return;
      }

      await simulateUpload(file);
      const rawText = await readRawText(file);

      const report: ReportMetadata = {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || "unknown",
        uploadedAt: Date.now(),
        keyFindings: [],
        methodology: [],
        coreArguments: [],
        rawText,
      };
      setReport(report);
      setProgress({ percent: 100, status: "done" });
      router.push("/chatbot");
    },
    [router, setReport],
  );

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  const isBusy =
    progress.status === "uploading" || progress.status === "processing";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl"
    >
      <div
        role="button"
        tabIndex={0}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={[
          "group flex flex-col items-center justify-center gap-4 rounded-2xl",
          "border-2 border-dashed px-8 py-14 transition-colors cursor-pointer",
          "bg-white shadow-sm",
          dragActive
            ? "border-blue-500 bg-blue-50"
            : "border-slate-300 hover:border-blue-500",
        ].join(" ")}
      >
        <div className="rounded-full bg-slate-100 p-4 group-hover:bg-blue-100">
          <CloudUpload
            className="h-8 w-8 text-slate-600 group-hover:text-blue-600"
            aria-hidden
          />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-900">
            Drag & drop your paper here
          </p>
          <p className="mt-1 text-sm text-slate-500">
            or{" "}
            <span className="font-medium text-blue-600 underline">
              browse files
            </span>
            . Supported: PDF, DOCX, TXT &middot; Max 10MB.
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="hidden"
          onChange={onInputChange}
        />
      </div>

      {progress.status === "error" && (
        <div
          className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          <AlertTriangle className="h-4 w-4" />
          <span>{progress.error}</span>
        </div>
      )}

      {isBusy && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
            <span className="inline-flex items-center gap-2">
              {progress.status === "processing" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {progress.status === "processing"
                ? "Analyzing document…"
                : "Uploading…"}
            </span>
            <span className="font-mono text-slate-700">
              {progress.percent}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-200"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
