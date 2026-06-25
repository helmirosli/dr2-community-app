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
      <form action={action} className="ui-card p-6">
        <div className="grid gap-6">
          <label className="ui-label">
            <span>Select CSV or Excel file</span>
            <input
              accept=".csv,.xlsx,.xls"
              className="ui-file-input text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-blue-700 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
              name="file"
              onChange={handleFileChange}
              required
              type="file"
            />
            <span className="text-xs text-slate-500">CSV (.csv) or Excel (.xlsx, .xls) files only. Max 5MB.</span>
          </label>

          {state.message && (
            <div className={`flex items-start gap-3 ${
              state.ok
                ? "ui-alert-success"
                : "ui-alert-error"
            }`}>
              {state.ok ? (
                <CheckCircle2 className="shrink-0" size={18} />
              ) : (
                <AlertCircle className="shrink-0" size={18} />
              )}
              <p>{state.message}</p>
            </div>
          )}

          <button className="ui-button-primary" disabled={pending || !fileName} type="submit">
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
