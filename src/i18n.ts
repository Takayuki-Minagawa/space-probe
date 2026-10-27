import type { Lang } from "./learning";

/** BCP 47 locale used for number formatting in each UI language. */
export const localeOf = (lang: Lang) => (lang === "ja" ? "ja-JP" : "en-US");

/** Pick the copy for the active language: `tr("日本語", "English")`. */
export const translator =
  (lang: Lang) =>
  (ja: string, en: string): string =>
    lang === "ja" ? ja : en;

export interface NumberFormatOptions {
  /** Pad with trailing zeros so every value shows the same digits. */
  fixed?: boolean;
}

/**
 * Locale-aware number formatting shared by every panel.
 * `digits` caps the fraction; with `fixed` it also becomes the minimum.
 */
export const numberFormatter =
  (lang: Lang, { fixed = false }: NumberFormatOptions = {}) =>
  (value: number, digits = 3): string =>
    value.toLocaleString(localeOf(lang), {
      maximumFractionDigits: digits,
      minimumFractionDigits: fixed ? digits : undefined,
    });

/** Thousands separators inside TeX must be braced so KaTeX keeps them tight. */
export const texNumber =
  (lang: Lang) =>
  (value: number, digits = 3): string =>
    numberFormatter(lang)(value, digits).replaceAll(",", String.raw`{,}`);
