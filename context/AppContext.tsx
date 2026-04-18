"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from "react";
import type { Message, ReportMetadata, UserData } from "@/types";

interface AppContextValue {
  user: UserData | null;
  setUser: (user: UserData | null) => void;
  report: ReportMetadata | null;
  setReport: (report: ReportMetadata | null) => void;
  messages: Message[];
  addMessage: (message: Message) => void;
  updateMessage: (id: string, patch: Partial<Message>) => void;
  clearMessages: () => void;
  isThinking: boolean;
  setIsThinking: (thinking: boolean) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [report, setReport] = useState<ReportMetadata | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState<boolean>(false);

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const updateMessage = useCallback((id: string, patch: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    );
  }, []);

  const clearMessages = useCallback(() => setMessages([]), []);

  const value = useMemo<AppContextValue>(
    () => ({
      user,
      setUser,
      report,
      setReport,
      messages,
      addMessage,
      updateMessage,
      clearMessages,
      isThinking,
      setIsThinking,
    }),
    [user, report, messages, isThinking, addMessage, updateMessage, clearMessages],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used inside an <AppProvider>");
  }
  return ctx;
}
