"use client";

import { useFormStatus } from "react-dom";

type PendingButtonProps = {
  /** Server action passed to <form action={...}> */
  action: () => Promise<void>;
  /** Default button text */
  label: React.ReactNode;
  /** Text shown while action is in-flight */
  loadingLabel?: React.ReactNode;
  /** Additional CSS classes for the button */
  className?: string;
  /** Button type (default "submit") */
  type?: "submit" | "button";
};

export function PendingButton({
  action,
  label,
  loadingLabel,
  className,
  type = "submit",
}: PendingButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      className={className}
      disabled={pending}
      formAction={action}
      type={type}
    >
      {pending ? loadingLabel ?? "Loading..." : label}
    </button>
  );
}
