"use client";

import { useState } from "react";
import { Download, Eye, EyeOff, X } from "lucide-react";

type FileViewerProps = {
  files: Array<{
    id: string;
    originalFilename: string;
    storagePath: string;
    mimeType: string;
  }>;
  triggerLabel?: string;
};

export function FileViewer({ files, triggerLabel = "View files" }: FileViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(files[0]?.id || null);

  if (files.length === 0) {
    return <span className="text-slate-500">No files</span>;
  }

  const selectedFile = files.find((f) => f.id === selectedFileId);

  return (
    <>
      <button
        className="inline-flex items-center gap-1.5 rounded-md bg-cyan-50 px-2.5 py-1.5 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-200 transition hover:bg-cyan-100"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <Eye size={14} />
        {files.length} {files.length === 1 ? "file" : "files"}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="w-full max-h-[90vh] rounded-t-lg bg-white shadow-lg sm:rounded-lg sm:max-w-2xl overflow-hidden flex flex-col sm:w-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Attached files ({files.length})
              </h3>
              <button
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-1 overflow-hidden">
              {/* File list */}
              <div className="w-40 border-r border-slate-100 overflow-y-auto">
                {files.map((file) => (
                  <button
                    className={`w-full border-b border-slate-100 px-4 py-3 text-left text-xs font-medium transition ${
                      selectedFileId === file.id
                        ? "bg-cyan-50 text-cyan-700"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                    key={file.id}
                    onClick={() => setSelectedFileId(file.id)}
                    type="button"
                  >
                    <p className="truncate">{file.originalFilename}</p>
                  </button>
                ))}
              </div>

              {/* File preview */}
              <div className="flex-1 overflow-auto bg-slate-50 p-4">
                {selectedFile && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-600 uppercase">Filename</p>
                      <p className="mt-1 text-sm text-slate-900 break-all">{selectedFile.originalFilename}</p>
                    </div>

                    {/* File preview based on type */}
                    {selectedFile.mimeType.startsWith("image/") ? (
                      <div className="mt-4">
                        <p className="text-xs font-semibold text-slate-600 uppercase">Preview</p>
                        <img
                          alt={selectedFile.originalFilename}
                          className="mt-2 max-w-full rounded-lg border border-slate-200"
                          src={`/api/uploads/${selectedFile.storagePath}`}
                        />
                      </div>
                    ) : selectedFile.mimeType === "application/pdf" ? (
                      <div className="mt-4">
                        <p className="text-xs font-semibold text-slate-600 uppercase">Preview</p>
                        <embed
                          src={`/api/uploads/${selectedFile.storagePath}`}
                          type="application/pdf"
                          className="w-full h-96 rounded-lg border border-slate-200 mt-2"
                        />
                      </div>
                    ) : (
                      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-center">
                        <p className="text-sm text-slate-600">Preview not available for this file type</p>
                      </div>
                    )}

                    <button
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 mt-4"
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = `/api/uploads/${selectedFile.storagePath}`;
                        link.download = selectedFile.originalFilename;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      type="button"
                    >
                      <Download size={16} />
                      Download
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
