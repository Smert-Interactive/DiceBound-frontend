import { useId } from "react";
import type { AriaAttributes } from "react";

interface FieldAccessibilityOptions {
  id?: string;
  hint?: string;
  error?: string;
  describedBy?: string;
  invalid?: AriaAttributes["aria-invalid"];
}

export function joinDescriptions(...ids: (string | undefined)[]) {
  const tokens = ids.flatMap((id) => id?.split(/\s+/).filter(Boolean) ?? []);
  return [...new Set(tokens)].join(" ") || undefined;
}

export function useFieldAccessibility({
  id: suppliedId,
  hint,
  error,
  describedBy,
  invalid,
}: FieldAccessibilityOptions) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const labelId = `${id}-label`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return {
    id,
    labelId,
    hintId,
    errorId,
    describedBy: joinDescriptions(
      describedBy,
      hint ? hintId : undefined,
      error ? errorId : undefined,
    ),
    invalid: error ? true : invalid,
  };
}
