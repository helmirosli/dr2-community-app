"use client";

import { useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";

type FileInputProps = {
  name: string;
  accept?: string;
  hint?: string;
  required?: boolean;
};

export function FileInput({
  name,
  accept = "application/pdf,image/jpeg,image/png,image/webp",
  hint = "PDF, JPG, PNG or WebP · max 10 MB",
  required,
}: FileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileName(e.target.files?.[0]?.name ?? null);
  }

  function handleClear() {
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <input
        ref={inputRef}
        accept={accept}
        className="sr-only"
        name={name}
        required={required}
        type="file"
        onChange={handleChange}
      />

      {fileName ? (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <Paperclip className="shrink-0 text-slate-400" size={15} />
          <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{fileName}</span>
          <button
            className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
            onClick={handleClear}
            title="Remove file"
            type="button"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        <button
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm font-medium text-slate-500 transition hover:border-slate-300 hover:bg-white hover:text-slate-700"
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          <Paperclip size={15} />
          Choose file
        </button>
      )}

      <p className="mt-1.5 text-xs text-slate-400">{hint}</p>
    </div>
  );
}
