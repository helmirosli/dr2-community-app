"use client";

import { useFormStatus } from "react-dom";

type Props = {
  action: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
};

export function PendingIconButton({ action, children, className }: Props) {
  return (
    <form action={action}>
      <Inner className={className}>
        {children}
      </Inner>
    </form>
  );
}

function Inner({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      className={className}
      disabled={pending}
      type="submit"
    >
      {children}
    </button>
  );
}
