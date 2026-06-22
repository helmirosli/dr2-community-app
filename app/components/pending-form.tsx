"use client";

import { useFormStatus } from "react-dom";

type PendingFormProps = {
  action: () => Promise<void>;
  children: React.ReactNode;
};

function Inner({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <span className={pending ? "pointer-events-none opacity-50" : undefined}>
      {children}
    </span>
  );
}

export function PendingForm({ action, children }: PendingFormProps) {
  return (
    <form action={action}>
      <Inner>{children}</Inner>
    </form>
  );
}
