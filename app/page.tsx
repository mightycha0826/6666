"use client";

import { motion } from "framer-motion";
import { GraduationCap, ShieldCheck, BrainCircuit } from "lucide-react";
import FileUpload from "@/components/FileUpload";

export default function HomePage() {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-b from-slate-50 to-white"
    >
      <section className="mx-auto flex max-w-5xl flex-col items-center px-6 pb-20 pt-20 text-center">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
          <GraduationCap className="h-3.5 w-3.5 text-blue-600" />
          AI-powered Socratic feedback
        </span>

        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Academic Insight Pro
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          Upload your research and verify your depth of understanding.
        </p>

        <div className="mt-10 flex w-full justify-center">
          <FileUpload />
        </div>

        <div className="mt-16 grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
          <FeatureCard
            icon={<BrainCircuit className="h-5 w-5 text-blue-600" />}
            title="Authorship Check"
            body="Three targeted Socratic questions grounded in your document."
          />
          <FeatureCard
            icon={<ShieldCheck className="h-5 w-5 text-blue-600" />}
            title="Rigor Audit"
            body="Identifies logical fallacies and weak data points."
          />
          <FeatureCard
            icon={<GraduationCap className="h-5 w-5 text-blue-600" />}
            title="Actionable Next Steps"
            body="Exactly three concrete steps to raise academic rigor."
          />
        </div>
      </section>
    </motion.main>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
    </div>
  );
}
