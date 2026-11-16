"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

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
        <p className="text-xs font-medium text-[#c2341a]">Delete {userName}?</p>
        <div className="flex gap-2">
          <button
            className="ui-button-danger min-h-10 px-3 text-xs"
            disabled={isLoading}
            onClick={handleDelete}
            type="button"
          >
            {isLoading ? "Deleting..." : "Confirm"}
          </button>
          <button
            className="ui-button-secondary min-h-10 px-3 text-xs"
            disabled={isLoading}
            onClick={() => setIsConfirming(false)}
            type="button"
          >
            Cancel
          </button>
        </div>
        {message && (
          <p className={`text-xs font-medium ${message.startsWith("✓") ? "text-[#1c7a33]" : "text-[#c2341a]"}`}>
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <button
      className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-[#c2341a] transition hover:bg-[#ffe6e0]"
      onClick={() => setIsConfirming(true)}
      type="button"
    >
      <Trash2 size={14} />
      Delete
    </button>
  );
}
