import { Icon } from "./components";
import { translator } from "./i18n";
import { LABS } from "./learning";
import type { LabId, Lang } from "./learning";

export type View = "routes" | "lessons";

interface HomeHeroProps {
  lang: Lang;
  view: View;
  lab: LabId;
  completed: LabId[];
  onShowRoutes: () => void;
  onOpenLab: (id: LabId) => void;
}

/** Decorative orbits: a transfer ellipse between two circular orbits, turning slowly. */
function HeroOrbits() {
  return (
    <svg
      className="hero-orbits"
      viewBox="-160 -160 320 320"
      aria-hidden="true"
      focusable="false"
    >
      <g className="hero-orbits-spin">
        {[52, 84, 118, 148].map((r) => (
          <circle key={r} className="hero-orbit" r={r} />
        ))}
        {/* Hohmann ellipse from r = 84 to r = 148, periapsis on +x */}
        <ellipse
          className="hero-transfer"
          cx={-(148 - 84) / 2}
          rx={(84 + 148) / 2}
          ry={Math.sqrt(84 * 148)}
        />
        <circle className="hero-planet hero-planet-inner" cx={52} r={3} />
        <circle className="hero-planet hero-planet-earth" cx={84} r={5} />
        <circle className="hero-planet hero-planet-mars" cx={-148} r={4} />
        <circle className="hero-planet hero-planet-outer" cx={0} cy={118} r={6} />
        <circle className="hero-probe" cx={-52} cy={-110} r={2.5} />
      </g>
      <circle className="hero-sun" r={9} />
      <circle className="hero-sun-glow" r={18} />
    </svg>
  );
}

/** The landing section: headline, key facts, and the two ways into the lab. */
export default function HomeHero({
  lang,
  view,
  lab,
  completed,
  onShowRoutes,
  onOpenLab,
}: HomeHeroProps) {
  const tr = translator(lang);
  const routesActive = view === "routes";
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <div className="section-kicker">
            <span className="status-dot" />
            INTERACTIVE ORBITAL MECHANICS
            <span className="version">SOLAR SYSTEM EDITION / 02</span>
          </div>
          <h1 id="hero-title">
            {tr("軌道を変える。旅が見える。", "Change an orbit. Discover a journey.")}
          </h1>
          <p>
            {tr(
              "月も、8つの惑星も。行き先と条件を変え、軌道・飛行時間・必要なΔvを比べよう。",
              "Explore the Moon and all eight planets. Change destinations and conditions to compare orbits, flight times, and required Δv.",
            )}
          </p>
          <ul className="hero-facts" aria-label={tr("教材の概要", "At a glance")}>
            <li>
              <strong>58</strong>
              <span>{tr("通りの航路", "routes")}</span>
            </li>
            <li>
              <strong>5</strong>
              <span>{tr("つの基礎実験", "guided experiments")}</span>
            </li>
            <li>
              <strong>TeX</strong>
              <span>{tr("で追える計算過程", "step-by-step equations")}</span>
            </li>
          </ul>
        </div>
        <HeroOrbits />
      </section>
      <section className="mode-nav" aria-label={tr("学習モード", "Learning modes")}>
        <button
          className={`mode-card route-mode-button${routesActive ? " active" : ""}`}
          aria-pressed={routesActive}
          onClick={onShowRoutes}
        >
          <span className="mode-card-head">
            <span className="mode-icon">
              <Icon name="globe" />
            </span>
            <span className="mode-title">
              {tr("太陽系の航路", "Solar system routes")}
            </span>
            <small>{tr("8惑星 ＋ 月", "8 planets + the Moon")}</small>
          </span>
          <span className="mode-description">
            {tr(
              "出発地と目的地を選び、高度・位相・噴射量を変えて、往路と復路を比べる。",
              "Pick an origin and destination, then vary altitude, phase, and burns to compare both directions.",
            )}
          </span>
          <span className="mode-cta">
            {routesActive
              ? tr("表示中", "Showing now")
              : tr("航路を開く", "Open the routes")}
            <Icon name="arrow" size={14} />
          </span>
        </button>
        <div className={`mode-card experiments-card${routesActive ? "" : " active"}`}>
          <div className="mode-card-head">
            <span className="mode-icon">
              <Icon name="orbit" />
            </span>
            <span className="mode-title">{tr("基礎実験", "Guided experiments")}</span>
            <div className="progress-label">
              <span>{tr("基礎実験の進み具合", "FOUNDATIONS PROGRESS")}</span>
              <strong>
                {String(completed.length).padStart(2, "0")}
                <small> / 05</small>
              </strong>
              <div className="progress-track">
                <i style={{ width: `${completed.length * 20}%` }} />
              </div>
            </div>
          </div>
          <nav className="chapter-nav" aria-label={tr("学習の章", "Learning chapters")}>
            {LABS.map((l) => {
              const active = !routesActive && lab === l.id;
              return (
                <button
                  key={l.id}
                  className={active ? "chapter active" : "chapter"}
                  aria-label={`${l.number} ${l.title[lang]}`}
                  aria-current={active ? "step" : undefined}
                  onClick={() => onOpenLab(l.id)}
                >
                  <span className="chapter-number">
                    {completed.includes(l.id) ? (
                      <Icon name="check" size={15} />
                    ) : (
                      l.number
                    )}
                  </span>
                  <span className="chapter-title">{l.title[lang]}</span>
                  {active && <span className="chapter-dot" />}
                </button>
              );
            })}
          </nav>
        </div>
      </section>
    </>
  );
}
