import { useEffect, useState } from "react";

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * A setting mirrored to localStorage. Storage is optional: a blocked or full
 * store never breaks the app, it only forgets the choice on reload.
 */
export function useStoredSetting<T extends string>(
  key: string,
  fallback: T,
  accept: (raw: string) => raw is T,
) {
  const [value, setValue] = useState<T>(() => {
    const raw = readStorage(key);
    return raw !== null && accept(raw) ? raw : fallback;
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* Storage is optional. */
    }
  }, [key, value]);
  return [value, setValue] as const;
}

/** Call `onHide` when the tab goes to the background, so playback never runs unseen. */
export function usePauseWhenHidden(onHide: () => void) {
  useEffect(() => {
    const pause = () => {
      if (document.hidden) onHide();
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, [onHide]);
}

/** Track `prefers-reduced-motion`; `onChange` runs whenever the preference flips. */
export function useReducedMotion(onChange?: () => void) {
  const [reduceMotion, setReduceMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReduceMotion(media.matches);
      onChange?.();
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [onChange]);
  return reduceMotion;
}
