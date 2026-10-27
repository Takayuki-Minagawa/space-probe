import { useEffect, useRef } from "react";
import { Icon } from "./components";
import { translator } from "./i18n";
import { manual } from "./learning";
import type { Lang } from "./learning";

export type Theme = "dark" | "light";

interface SiteHeaderProps {
  lang: Lang;
  theme: Theme;
  onToggleLang: () => void;
  onToggleTheme: () => void;
  onOpenManual: () => void;
}

export function SiteHeader({
  lang,
  theme,
  onToggleLang,
  onToggleTheme,
  onOpenManual,
}: SiteHeaderProps) {
  const tr = translator(lang);
  return (
    <header className="site-header">
      <a
        className="brand"
        href="#main"
        aria-label={tr("惑星航路ラボ", "Planetary Route Lab")}
      >
        <span className="brand-mark">
          <Icon name="orbit" size={30} />
        </span>
        <span>
          <strong>{tr("惑星航路ラボ", "Planetary Route Lab")}</strong>
          <small>PLANETARY ROUTE LAB</small>
        </span>
      </a>
      <div className="header-actions">
        <button className="quiet-button manual-button" onClick={onOpenManual}>
          <Icon name="book" />
          {tr("簡易マニュアル", "Quick guide")}
        </button>
        <span className="header-divider" />
        <button className="quiet-button" onClick={onToggleLang}>
          <Icon name="globe" />
          {lang === "en" ? "日本語" : "English"}
        </button>
        <button
          className="icon-button"
          aria-label={
            theme === "dark"
              ? tr("ライトモード", "Light mode")
              : tr("ダークモード", "Dark mode")
          }
          onClick={onToggleTheme}
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} />
        </button>
      </div>
    </header>
  );
}

export function SiteFooter({ lang }: { lang: Lang }) {
  const tr = translator(lang);
  return (
    <>
      <footer>
        <span className="footer-brand">
          <Icon name="orbit" size={20} /> PLANETARY ROUTE LAB
        </span>
        <p>
          {tr(
            "教育用の近似モデル。実際の打上げ・探査機運用・航法には使用できません。",
            "Educational approximation. Not for actual launches, spacecraft operations or navigation.",
          )}
        </p>
        <a
          href="https://ssd.jpl.nasa.gov/astro_par.html"
          target="_blank"
          rel="noreferrer"
        >
          {tr("参考資料：NASA / JPL", "References: NASA / JPL")} <span>↗</span>
        </a>
      </footer>
      <div className="persistent-notice">
        {tr(
          "教育用の近似モデル · 実際の打上げ・探査機運用・航法には使用できません",
          "Educational approximation · Not for actual launches, spacecraft operations or navigation",
        )}
      </div>
    </>
  );
}

interface ManualDialogProps {
  lang: Lang;
  open: boolean;
  onClose: () => void;
}

/** The bilingual quick guide, shown as a native modal dialog. */
export function ManualDialog({ lang, open, onClose }: ManualDialogProps) {
  const tr = translator(lang);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);
  const guide = manual[lang];
  return (
    <dialog
      ref={ref}
      className="manual-dialog"
      onClose={onClose}
      aria-labelledby="manual-title"
    >
      <div className="manual-top">
        <span className="eyebrow">FIELD GUIDE</span>
        <button
          className="icon-button"
          aria-label={tr("閉じる", "Close")}
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <h2 id="manual-title">{guide.title}</h2>
      <p>{guide.intro}</p>
      {guide.sections.map((s, i) => (
        <section key={s.title}>
          <span className="eyebrow">{String(i + 1).padStart(2, "0")}</span>
          <h3>{s.title}</h3>
          <p>{s.body}</p>
        </section>
      ))}
      <p>
        <a
          href="https://www.jpl.nasa.gov/edu/resources/lesson-plan/lets-go-to-mars-calculating-launch-windows/"
          target="_blank"
          rel="noreferrer"
        >
          NASA/JPL · {tr("火星への出発時期を学ぶ", "Calculating launch windows")}{" "}
          ↗
        </a>
      </p>
      <button className="reference-button" onClick={onClose}>
        {tr("実験に戻る", "Back to the experiment")}
      </button>
    </dialog>
  );
}
