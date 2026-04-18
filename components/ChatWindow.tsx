"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Square, Volume2, Sparkles, User } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { handleTTS, sendSocraticMessage } from "@/lib/gemini";
import type { Message } from "@/types";

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <span
        className="h-2 w-2 rounded-full bg-slate-400 animate-dot-jump"
        style={{ animationDelay: "0s" }}
      />
      <span
        className="h-2 w-2 rounded-full bg-slate-400 animate-dot-jump"
        style={{ animationDelay: "0.15s" }}
      />
      <span
        className="h-2 w-2 rounded-full bg-slate-400 animate-dot-jump"
        style={{ animationDelay: "0.3s" }}
      />
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isStudent = message.role === "student";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex w-full gap-3 ${
        isStudent ? "justify-end" : "justify-start"
      }`}
    >
      {!isStudent && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
          <Sparkles className="h-4 w-4" />
        </div>
      )}
      <div
        className={[
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
          isStudent
            ? "bg-blue-600 text-white rounded-br-sm"
            : "bg-slate-100 text-slate-900 rounded-bl-sm",
        ].join(" ")}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {!isStudent && (
          <div className="mt-2 flex items-center justify-end">
            <button
              type="button"
              onClick={() => handleTTS(message.content)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-200"
              aria-label="Read message aloud"
            >
              <Volume2 className="h-4 w-4" />
              <span>Listen</span>
            </button>
          </div>
        )}
      </div>
      {isStudent && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
          <User className="h-4 w-4" />
        </div>
      )}
    </motion.div>
  );
}

export default function ChatWindow() {
  const {
    messages,
    addMessage,
    updateMessage,
    report,
    isThinking,
    setIsThinking,
  } = useApp();
  const [input, setInput] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const orderedMessages = useMemo(() => messages, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [orderedMessages.length, isThinking]);

  const stopGeneration = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsThinking(false);
  };

  const submit = async () => {
    const trimmed = input.trim();
    if (!trimmed || isThinking) return;

    const studentMsg: Message = {
      id: uid(),
      role: "student",
      content: trimmed,
      createdAt: Date.now(),
    };
    addMessage(studentMsg);
    setInput("");

    const aiMsgId = uid();
    addMessage({
      id: aiMsgId,
      role: "ai",
      content: "",
      createdAt: Date.now(),
    });
    setIsThinking(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { text } = await sendSocraticMessage({
        report,
        history: [...messages, studentMsg],
        userMessage: trimmed,
        signal: controller.signal,
      });
      updateMessage(aiMsgId, { content: text });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Unexpected error from Gemini.";
      updateMessage(aiMsgId, {
        content: `I couldn't reach the Gemini API. (${msg})`,
      });
    } finally {
      setIsThinking(false);
      abortRef.current = null;
    }
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void submit();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto px-6 py-6"
      >
        <AnimatePresence initial={false}>
          {orderedMessages.map((m) =>
            m.role === "ai" && m.content === "" && isThinking ? null : (
              <MessageBubble key={m.id} message={m} />
            ),
          )}
        </AnimatePresence>

        {isThinking && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="rounded-2xl rounded-bl-sm bg-slate-100">
              <ThinkingDots />
            </div>
          </motion.div>
        )}
      </div>

      <form
        onSubmit={onSubmit}
        className="sticky bottom-0 border-t border-slate-200 bg-white px-4 py-3"
      >
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Ask about your paper, defend a claim, or request feedback…"
            className="min-h-[44px] max-h-40 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
          {isThinking ? (
            <button
              type="button"
              onClick={stopGeneration}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
            >
              <Square className="h-4 w-4" />
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Send className="h-4 w-4" />
              Send
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
