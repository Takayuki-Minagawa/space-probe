import { useEffect, useState } from "react";
import ExperimentLab from "./ExperimentLab";
import HomeHero from "./HomeHero";
import type { View } from "./HomeHero";
import { useReducedMotion, useStoredSetting } from "./hooks";
import { translator } from "./i18n";
import type { LabId, Lang } from "./learning";
import { ManualDialog, SiteFooter, SiteHeader } from "./SiteChrome";
import type { Theme } from "./SiteChrome";
import SolarSystemLab from "./SolarSystemLab";
import { useExperimentLab } from "./useExperimentLab";

const isLang = (raw: string): raw is Lang => raw === "ja" || raw === "en";
const isTheme = (raw: string): raw is Theme =>
  raw === "dark" || raw === "light";

export default function App() {
  const [lang, setLang] = useStoredSetting<Lang>("prl-language", "ja", isLang);
  const [theme, setTheme] = useStoredSetting<Theme>(
    "prl-theme",
    "dark",
    isTheme,
  );
  const [view, setView] = useState<View>(() =>
    window.location.hash === "#calculation-walkthrough" ? "lessons" : "routes",
  );
  const [manualOpen, setManualOpen] = useState(false);
  const experiment = useExperimentLab(lang);
  const reduceMotion = useReducedMotion(experiment.pause);
  const tr = translator(lang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title =
      lang === "en"
        ? "Planetary Route Lab | Orbital mechanics playground"
        : "惑星航路ラボ | 動かして学ぶ惑星探査";
  }, [lang]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const openLab = (id: LabId) => {
    setView("lessons");
    experiment.changeLab(id);
  };
  const showRoutes = () => {
    setView("routes");
    experiment.pause();
  };

  return (
    <>
      <a className="skip-link" href="#main">
        {tr("メインへ移動", "Skip to content")}
      </a>
      <SiteHeader
        lang={lang}
        theme={theme}
        onToggleLang={() => setLang(lang === "en" ? "ja" : "en")}
        onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
        onOpenManual={() => setManualOpen(true)}
      />
      <main id="main" className="app-shell">
        <HomeHero
          lang={lang}
          view={view}
          lab={experiment.lab}
          completed={experiment.completed}
          onShowRoutes={showRoutes}
          onOpenLab={openLab}
        />
        {view === "routes" ? (
          <SolarSystemLab lang={lang} reduceMotion={reduceMotion} />
        ) : (
          <ExperimentLab
            lang={lang}
            reduceMotion={reduceMotion}
            state={experiment}
          />
        )}
      </main>
      <SiteFooter lang={lang} />
      <ManualDialog
        lang={lang}
        open={manualOpen}
        onClose={() => setManualOpen(false)}
      />
    </>
  );
}
