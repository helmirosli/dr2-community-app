"use client";

import { useState } from "react";
import { Trash2, AlertCircle, CheckCircle2 } from "lucide-react";

import { deleteUser } from "@/lib/actions/user-management";

type DeleteUserButtonProps = {
  userId: string;
  userName: string;
};

export function DeleteUserButton({ userId, userName }: DeleteUserButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    setMessage("");

    const result = await deleteUser(userId);

    if (result.ok) {
      setMessage(`✓ ${userName} deleted`);
      setIsConfirming(false);
    } else {
      setMessage(`✗ Failed: ${result.message}`);
    }

    setIsLoading(false);
    setTimeout(() => setMessage(""), 3000);
  };

  if (isConfirming) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-red-700">Delete {userName}?</p>
        <div className="flex gap-2">
          <button
            className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100"
            disabled={isLoading}
            onClick={handleDelete}
            type="button"
          >
            {isLoading ? "Deleting..." : "Confirm"}
          </button>
          <button
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            disabled={isLoading}
            onClick={() => setIsConfirming(false)}
            type="button"
          >
            Cancel
          </button>
        </div>
        {message && (
          <p className={`text-xs font-medium ${message.startsWith("✓") ? "text-emerald-700" : "text-red-700"}`}>
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <button
      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
      onClick={() => setIsConfirming(true)}
      type="button"
    >
      <Trash2 size={14} />
      Delete
    </button>
  );
}
