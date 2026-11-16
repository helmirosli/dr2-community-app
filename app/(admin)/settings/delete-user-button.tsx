"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { deleteUser } from "@/lib/actions/user-management";

type DeleteUserButtonProps = {
  userId: string;
  userName: string;
};

/** Delete asks first: the trash icon opens an inline "Delete / Cancel" confirmation. */
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

  const feedback = message ? (
    <span role="status" className={`text-xs font-medium ${message.startsWith("✓") ? "text-[#1c7a33]" : "text-[#c2341a]"}`}>
      {message}
    </span>
  ) : null;

  if (!isConfirming) {
    return (
      <span className="flex items-center gap-2">
        {feedback}
        <button
          aria-label={`Delete ${userName}`}
          className="grid size-10 place-items-center rounded-full text-[var(--ink-2)] transition hover:bg-[#ffe6e0] hover:text-[#c2341a]"
          onClick={() => setIsConfirming(true)}
          title="Delete"
          type="button"
        >
          <Trash2 size={16} />
        </button>
      </span>
    );
  }

  return (
    <span className="flex flex-wrap items-center justify-end gap-2">
      {feedback}
      <span className="flex items-center gap-1 rounded-full bg-[#ffe6e0] py-1 pl-3 pr-1" role="group" aria-label="Confirm delete">
        <span className="text-xs font-semibold text-[#c2341a]">Delete?</span>
        <button
          className="min-h-8 rounded-full bg-[#c2341a] px-3 text-xs font-semibold text-white disabled:opacity-50"
          disabled={isLoading}
          onClick={handleDelete}
          type="button"
        >
          {isLoading ? "Deleting…" : "Delete"}
        </button>
        <button
          className="min-h-8 rounded-full px-2 text-xs font-semibold text-[var(--ink-2)] hover:bg-white/60"
          disabled={isLoading}
          onClick={() => setIsConfirming(false)}
          type="button"
        >
          Cancel
        </button>
      </span>
    </span>
  );
}
