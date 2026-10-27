import { useEffect, useRef, useState } from "react";
import type { Lang } from "./learning";

export type IconName =
  | "play"
  | "pause"
  | "reset"
  | "step"
  | "sun"
  | "moon"
  | "book"
  | "arrow"
  | "orbit"
  | "check"
  | "close"
  | "globe";

/** Decorative icons; the containing control supplies its own accessible name. */
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.65,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const shapes = {
    play: <path d="m9 5 10 7-10 7Z" />,
    pause: (
      <>
        <path d="M8 5v14M16 5v14" strokeWidth="3" />
      </>
    ),
    reset: (
      <>
        <path d="M4 10a8 8 0 1 1 1.7 7M4 4v6h6" />
      </>
    ),
    step: (
      <>
        <path d="m5 5 10 7-10 7ZM19 5v14" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6 19 19M5 19l1.4-1.4M17.6 6.4 19 5" />
      </>
    ),
    moon: <path d="M20.7 14.5A9 9 0 0 1 9.5 3.3a9 9 0 1 0 11.2 11.2Z" />,
    book: (
      <>
        <path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1ZM12 6v14" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    orbit: (
      <>
        <ellipse
          cx="12"
          cy="12"
          rx="10"
          ry="4.5"
          transform="rotate(-35 12 12)"
        />
        <circle cx="12" cy="12" r="3" />
        <path d="m18.5 4 1.5 1.5" strokeWidth="3" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="4" ry="9" />
        <path d="M3 12h18M5 6.5h14M5 17.5h14" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      {...common}
    >
      {shapes[name]}
    </svg>
  );
}

export type ParameterValidation =
  | { valid: true; value: number }
  | { valid: false; error: string };

/** Display rounding only: the unrounded prop remains the simulation input. */
export function formatParameterValue(value: number, step: number): string {
  if (!Number.isFinite(value)) return String(value);
  const [coefficient, exponent = "0"] = String(step).split("e");
  const decimals = (coefficient.split(".")[1]?.length ?? 0) - Number(exponent);
  const precision = Math.min(12, Math.max(3, decimals));
  return String(Number(value.toFixed(precision)));
}

/** A blank field must never quietly become zero or leave old results looking valid. */
export function validateParameter(
  raw: string,
  min: number,
  max: number,
  lang: Lang,
): ParameterValidation {
  if (!raw.trim()) {
    return {
      valid: false,
      error: lang === "ja" ? "数値を入力してください。" : "Enter a number.",
    };
  }
  const value = Number(raw);
  const numericSyntax = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
  if (!numericSyntax.test(raw.trim()) || !Number.isFinite(value)) {
    return {
      valid: false,
      error:
        lang === "ja"
          ? "有限の数値を入力してください。"
          : "Enter a finite number.",
    };
  }
  if (value < min || value > max) {
    return {
      valid: false,
      error:
        lang === "ja"
          ? `${min}〜${max}の範囲で入力してください。`
          : `Enter a value from ${min} to ${max}.`,
    };
  }
  return { valid: true, value };
}

export interface ParameterInputProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
  onValidityChange?: (valid: boolean) => void;
  lang: Lang;
}

export function ParameterInput({
  id,
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  onValidityChange,
  lang,
}: ParameterInputProps) {
  const [draft, setDraft] = useState(() => formatParameterValue(value, step));
  const emittedValue = useRef<number | undefined>(undefined);
  const validityCallback = useRef(onValidityChange);
  validityCallback.current = onValidityChange;
  const validation = validateParameter(draft, min, max, lang);
  const errorId = `${id}-error`;
  const unitId = `${id}-unit`;

  // Keep typed precision and partial decimal edits when the parent echoes our
  // own change. Only external/reference changes replace the displayed draft.
  useEffect(() => {
    if (
      emittedValue.current !== undefined &&
      Object.is(emittedValue.current, value)
    ) {
      emittedValue.current = undefined;
      return;
    }
    emittedValue.current = undefined;
    const next = validateParameter(String(value), min, max, lang);
    setDraft(formatParameterValue(value, step));
    validityCallback.current?.(next.valid);
  }, [value, min, max, step]); // Language changes translate the error without discarding the draft.

  function update(raw: string) {
    setDraft(raw);
    const next = validateParameter(raw, min, max, lang);
    onValidityChange?.(next.valid);
    if (next.valid) {
      emittedValue.current = next.value;
      onChange(next.value);
    }
  }

  return (
    <div className={`parameter${validation.valid ? "" : " parameter-invalid"}`}>
      <div className="parameter-heading">
        <label htmlFor={id}>{label}</label>
        <div className="parameter-value">
          <input
            id={id}
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            step={step}
            value={draft}
            onChange={(event) => update(event.target.value)}
            aria-invalid={!validation.valid}
            aria-describedby={`${unitId}${validation.valid ? "" : ` ${errorId}`}`}
          />
          <span id={unitId} className="parameter-unit">
            {unit}
          </span>
        </div>
      </div>
      <input
        type="range"
        id={`${id}-slider`}
        aria-label={`${label} (slider)`}
        aria-describedby={unitId}
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, value))}
        onChange={(event) => update(event.target.value)}
      />
      <div className="parameter-bounds" aria-hidden="true">
        <span>
          {min} {unit}
        </span>
        <span>
          {max} {unit}
        </span>
      </div>
      {!validation.valid && (
        <p id={errorId} role="alert" className="input-error">
          {validation.error}
        </p>
      )}
    </div>
  );
}
