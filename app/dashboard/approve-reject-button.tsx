"use client";

import { useFormStatus } from "react-dom";

type Props = {
  action: () => Promise<void>;
  label: React.ReactNode;
  className?: string;
};

function Inner(props: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      className={props.className}
      disabled={pending}
      formAction={props.action}
      type="submit"
    >
      {pending ? "Processing..." : props.label}
    </button>
  );
}

export function ApproveRejectButton(props: Props) {
  return (
    <form>
      <Inner {...props} />
    </form>
  );
}
