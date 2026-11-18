"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Download, FileText, Paperclip, X } from "lucide-react";

type FileViewerProps = {
  files: Array<{
    id: string;
    originalFilename: string;
    storagePath: string;
    mimeType: string;
    url?: string | null;
  }>;
  triggerLabel?: string;
};

export function FileViewer({ files, triggerLabel = "View files" }: FileViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(files[0]?.id || null);
  const dialogTitleId = useId();

  // Esc closes the viewer, and the page behind it stays put while it is open.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (files.length === 0) {
    return <span className="text-[var(--ink-2)]">No files</span>;
  }

  // The viewer stays mounted when the review inbox moves to the next receipt, so the remembered file can belong to the
  // previous one; fall back to this receipt's first file instead of showing an empty box.
  const selectedFile = files.find((f) => f.id === selectedFileId) ?? files[0];
  const sourceOf = (file: (typeof files)[number]) => file.url ?? `/api/uploads/${file.storagePath}`;

  return (
    <>
      <button
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#ddf5fd] px-3 text-xs font-semibold text-[#0b6e8e] ring-1 ring-inset ring-[#0b6e8e]/15 transition hover:bg-[#cdeffb] active:scale-95"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <Paperclip size={13} aria-hidden="true" />
        {triggerLabel}
        <span className="tabular-nums opacity-70">{files.length}</span>
      </button>

      {/* Drawn on <body>: inside a list row, an ancestor with a filter or transform would cut the overlay down to the row. */}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-50 grid items-end bg-[var(--night)]/60 backdrop-blur-sm sm:place-items-center sm:p-6" onClick={() => setIsOpen(false)}>
          <div
            className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_40px_80px_-20px_rgba(0,0,0,.5)] sm:max-w-3xl sm:rounded-[28px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between gap-3 border-b border-black/5 px-5 py-4 sm:px-6">
              <h3 className="font-heading text-lg font-bold text-[var(--ink)]" id={dialogTitleId}>
                Attached files <span className="font-sans text-sm font-normal text-[var(--ink-2)]">{files.length}</span>
              </h3>
              <button
                className="grid size-10 place-items-center rounded-full text-[var(--ink-2)] transition hover:bg-black/5"
                onClick={() => setIsOpen(false)}
                type="button"
                aria-label="Close file viewer"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </header>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden sm:flex-row">
              {/* Only worth a list when there is more than one file. */}
              {files.length > 1 && (
                <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-black/5 p-3 sm:w-52 sm:flex-col sm:overflow-y-auto sm:border-b-0 sm:border-r">
                  {files.map((file) => (
                    <button
                      className={`flex min-w-0 shrink-0 items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-xs font-semibold transition sm:w-full ${
                        selectedFile?.id === file.id ? "bg-[#ddf5fd] text-[#0b6e8e]" : "text-[var(--ink-2)] hover:bg-[var(--paper)]"
                      }`}
                      key={file.id}
                      onClick={() => setSelectedFileId(file.id)}
                      type="button"
                    >
                      <FileText size={14} aria-hidden="true" className="shrink-0" />
                      <span className="max-w-40 truncate sm:max-w-none">{file.originalFilename}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="min-h-0 flex-1 overflow-auto bg-[var(--paper)] p-4 sm:p-5">
                {selectedFile && (
                  <div className="grid gap-3">
                    <p className="break-all text-sm font-semibold text-[var(--ink)]">{selectedFile.originalFilename}</p>

                    {selectedFile.mimeType.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element -- user upload of unknown size and host
                      <img
                        alt={selectedFile.originalFilename}
                        className="max-h-[60vh] w-full rounded-2xl bg-white object-contain p-2 ring-1 ring-black/5"
                        src={sourceOf(selectedFile)}
                      />
                    ) : selectedFile.mimeType === "application/pdf" ? (
                      <embed src={sourceOf(selectedFile)} type="application/pdf" className="h-[60vh] w-full rounded-2xl bg-white ring-1 ring-black/5" />
                    ) : (
                      <div className="grid justify-items-center gap-2 rounded-2xl bg-white p-8 text-center text-sm text-[var(--ink-2)] ring-1 ring-black/5">
                        <FileText size={28} aria-hidden="true" />
                        Preview not available for this file type
                      </div>
                    )}

                    <a className="ui-button-secondary w-fit" href={sourceOf(selectedFile)} download={selectedFile.originalFilename}>
                      <Download size={16} aria-hidden="true" />
                      Download
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
