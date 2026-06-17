"use client";

import { useActionState, useState } from "react";
import { Upload, AlertCircle, CheckCircle2 } from "lucide-react";

import { analyzePaymentFile, type FileAnalysisResult } from "@/lib/actions/file-upload";
import { ComparisonResults } from "./comparison-results";

type FormState = {
  ok: boolean;
  message: string;
  analysis?: FileAnalysisResult;
};

const initialState: FormState = {
  ok: false,
  message: "",
};

export function FileUploadForm() {
  const [state, action, pending] = useActionState(analyzePaymentFile, initialState);
  const [fileName, setFileName] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileName(file?.name || "");
  };

  return (
    <div className="space-y-6">
      <form action={action} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>Select CSV or Excel file</span>
            <input
              accept=".csv,.xlsx,.xls"
              className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:border-slate-400 hover:bg-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              name="file"
              onChange={handleFileChange}
              required
              type="file"
            />
            <span className="text-xs text-slate-500">CSV (.csv) or Excel (.xlsx, .xls) files only. Max 5MB.</span>
          </label>

          {state.message && (
            <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
              state.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}>
              {state.ok ? (
                <CheckCircle2 className="shrink-0" size={18} />
              ) : (
                <AlertCircle className="shrink-0" size={18} />
              )}
              <p>{state.message}</p>
            </div>
          )}

          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-60"
            disabled={pending || !fileName}
            type="submit"
          >
            <Upload size={18} />
            {pending ? "Analyzing..." : "Analyze File"}
          </button>
        </div>
      </form>

      {state.analysis && (
        <ComparisonResults analysis={state.analysis} />
      )}
    </div>
  );
}
