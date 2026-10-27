import { useEffect, useMemo, useRef, useState } from "react";
import { K, norm, deg, missionAt, rad, flyby } from "./physics";
import { LABS, manual } from "./learning";
import type { Lang, LabId } from "./learning";
import { H, defaults, simulate } from "./simulation";
import type { Parameters } from "./simulation";
import OrbitDiagram, { SpeedChart } from "./OrbitDiagram";
import type { Layers } from "./OrbitDiagram";
import { Icon, ParameterInput } from "./components";

function saved(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
const allDefaults = () =>
  Object.fromEntries(LABS.map((l) => [l.id, defaults(l.id)])) as Record<
    LabId,
    Parameters
  >;
export default function App() {
  const [lang, setLang] = useState<Lang>(() =>
    saved("prl-language", "ja") === "en" ? "en" : "ja",
  );
  const [theme, setTheme] = useState(() =>
    saved("prl-theme", "dark") === "light" ? "light" : "dark",
  );
  const [lab, setLab] = useState<LabId>("transfer");
  const [settings, setSettings] = useState(allDefaults);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(20);
  const [frame, setFrame] = useState<"planet" | "sun">("planet");
  const [layers, setLayers] = useState<Layers>({
    vectors: false,
    trail: true,
    predicted: true,
    markers: true,
    reference: false,
  });
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [revision, setRevision] = useState(0);
  const [prediction, setPrediction] = useState<number | null>(null);
  const [hint, setHint] = useState(0);
  const [evaluated, setEvaluated] = useState(false);
  const [completed, setCompleted] = useState<LabId[]>([]);
  const [visitedSides, setVisitedSides] = useState<number[]>([1]);
  const [manualOpen, setManualOpen] = useState(false);
  const modalRef = useRef<HTMLDialogElement>(null);
  const [reduceMotion, setReduceMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const en = lang === "en";
  const tr = (ja: string, eng: string) => (en ? eng : ja);
  const p = settings[lab];
  const lesson = LABS.find((l) => l.id === lab)!;
  const result = useMemo(() => {
    try {
      return { sim: simulate(lab, p), error: false };
    } catch {
      return { sim: null, error: true };
    }
  }, [lab, p]);
  const reference = useMemo(() => simulate(lab, defaults(lab)), [lab]);
  const sim = result.sim;
  const valid = sim !== null && !Object.values(invalid).some(Boolean);
  const now = sim ? Math.max(sim.start, Math.min(sim.end, time)) : 0;
  const displayable = valid && !sim!.blocked;
  const current = displayable ? sim!.at(now) : null;
  const isMission = lab === "transfer";
  const unit = isMission ? tr("日", "days") : "h";
  const timeScale = isMission ? K.DAY : 3600;
  const fmt = (n: number, d = 2) =>
    n.toLocaleString(en ? "en-US" : "ja-JP", {
      maximumFractionDigits: d,
      minimumFractionDigits: d,
    });
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = en
      ? "Planetary Route Lab | Orbital mechanics playground"
      : "惑星航路ラボ | 動かして学ぶ惑星探査";
    try {
      localStorage.setItem("prl-language", lang);
    } catch {
      /* Storage is optional. */
    }
  }, [lang, en]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("prl-theme", theme);
    } catch {
      /* Storage is optional. */
    }
  }, [theme]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReduceMotion(media.matches);
      setPlaying(false);
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);
  useEffect(() => {
    if (!playing || !valid || !sim) return;
    let id = 0,
      last: number | undefined;
    const tick = (stamp: number) => {
      if (last !== undefined) {
        const dt = ((stamp - last) / 1000) * rate * (isMission ? K.DAY : 60);
        setTime((t) => {
          const next = Math.min(t + dt, sim.end);
          if (next >= sim.end) setPlaying(false);
          return next;
        });
      }
      last = stamp;
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing, valid, sim, rate, isMission]);
  useEffect(() => {
    if (manualOpen) modalRef.current?.showModal();
    else modalRef.current?.close();
  }, [manualOpen]);
  const changeLab = (id: LabId) => {
    setLab(id);
    setTime(id === "flyby" ? -7200 : 0);
    setPlaying(false);
    setInvalid({});
    setPrediction(null);
    setHint(0);
    setEvaluated(false);
    setFrame("planet");
    setRevision((r) => r + 1);
  };
  const change = (key: keyof Parameters, value: number) => {
    setSettings((s) => ({ ...s, [lab]: { ...s[lab], [key]: value } }));
    setTime(lab === "flyby" ? -7200 : 0);
    setPlaying(false);
    setEvaluated(false);
    if (key === "side") setVisitedSides((s) => [...new Set([...s, value])]);
    else if (lab === "flyby") setVisitedSides([p.side]);
  };
  const reset = () => {
    setSettings((s) => ({ ...s, [lab]: defaults(lab) }));
    setInvalid({});
    setRevision((r) => r + 1);
    setTime(lab === "flyby" ? -7200 : 0);
    setPlaying(false);
    setEvaluated(false);
    if (lab === "flyby") setVisitedSides([1]);
  };
  const field = (
    key: keyof Parameters,
    label: string,
    min: number,
    max: number,
    step: number,
    suffix: string,
  ) => (
    <ParameterInput
      key={`${lab}-${key}-${revision}`}
      id={`${lab}-${key}`}
      label={label}
      value={p[key]}
      min={min}
      max={max}
      step={step}
      unit={suffix}
      lang={lang}
      onChange={(v) => change(key, v)}
      onValidityChange={(ok) => {
        setInvalid((s) => (s[key] === !ok ? s : { ...s, [key]: !ok }));
        if (!ok) setPlaying(false);
      }}
    />
  );
  const step = () => {
    if (sim) setTime((t) => Math.min(sim.end, t + (sim.end - sim.start) / 100));
  };
  const outcome = (() => {
    if (!valid)
      return {
        good: false,
        title: tr("入力を確認してください", "Check your inputs"),
        reason: tr(
          "値を入力範囲内に戻すと、計算結果を再表示します。",
          "Enter a value within the allowed range to recalculate.",
        ),
      };
    if (sim!.blocked)
      return {
        good: false,
        title: tr("モデルの範囲外・停止", "Outside model · stopped"),
        reason: tr(
          "近点を安全高度以上にしてください。地球150 km、火星100 kmは教材上の制約値です。",
          "Raise periapsis above the teaching safety limit: Earth 150 km, Mars 100 km.",
        ),
      };
    if (lab === "transfer")
      return {
        good: sim!.arrival.encounter,
        title: sim!.arrival.encounter
          ? tr("到着予測：遭遇条件内", "Predicted arrival: encounter")
          : tr("到着予測：火星とすれ違い", "Predicted arrival: missed Mars"),
        reason: sim!.arrival.encounter
          ? tr(
              "約259日後、探査機と火星が同じ場所に到着します。教材上の許容距離は10,000 kmです。",
              "The probe and Mars arrive together after about 259 days. The teaching tolerance is 10,000 km.",
            )
          : tr(
              "軌道は交差しても、同じ時刻の火星は別の場所にいます。位相角か待ち時間を一つずつ変えてみましょう。",
              "The orbits intersect, but Mars is elsewhere at that time. Adjust the phase angle or departure wait, one at a time.",
            ),
      };
    if (lab === "capture") {
      const status = sim!.captureResult.status;
      return {
        good: status === "target",
        title: {
          target: tr("安全な目標円軌道を達成", "Safe target circular orbit"),
          captured: tr("捕獲：楕円軌道", "Captured: elliptical orbit"),
          flyby: tr("減速不足：フライバイ", "Insufficient burn: flyby"),
          unsafe: tr(
            "危険な軌道：成功ではありません",
            "Unsafe orbit: not a success",
          ),
        }[status],
        reason:
          status === "target"
            ? tr(
                "束縛軌道・安全高度100 km以上・目標近遠点の半径誤差1%以内を満たしています。",
                "Bound, above the 100 km safety limit, and both apsis radii within 1% of target.",
              )
            : status === "unsafe"
              ? tr(
                  "減速しすぎると反対側の高度が下がります。近点が地表や安全高度に入るため成功扱いしません。",
                  "Too much braking lowers the opposite side. A periapsis below the surface or safety altitude is not success.",
                )
              : tr(
                  "火星の近くに来ただけでは円軌道に入りません。減速Δvを調整して、噴射後の近点・遠点を比較しましょう。",
                  "Arrival alone does not create a circular orbit. Adjust the braking Δv and compare the post-burn apsides.",
                ),
      };
    }
    if (lab === "basics")
      return {
        good:
          p.burn > 0 &&
          sim!.safe &&
          ["elliptic", "circular"].includes(sim!.orbit.type),
        title:
          sim!.impact !== null
            ? tr(
                "地表と交差：衝突で停止",
                "Surface crossing: stopped at impact",
              )
            : ["parabolic", "hyperbolic"].includes(sim!.orbit.type)
              ? tr("脱出軌道", "Escape trajectory")
              : p.burn > 0
                ? tr("反対側の高度が上昇", "The opposite side rises")
                : tr("円軌道と比較しよう", "Compare with the circular orbit"),
        reason: tr(
          "順行噴射は反対側を高くし、逆行噴射は低くします。脱出速度以上では戻らない軌道になります。",
          "A prograde burn raises the opposite side; a retrograde burn lowers it. At escape speed the orbit becomes unbound.",
        ),
      };
    if (lab === "escape")
      return {
        good:
          p.altitude >= 1000 && Math.abs(p.vinf - H.vInfinityDepart) < 0.001,
        title: tr(
          "地球中心の脱出条件を計算",
          "Earth-centered escape calculated",
        ),
        reason: tr(
          "高度を200 kmから1,000 kmへ変え、参考値3.611 km/sと比較しましょう。v∞・脱出速度・噴射Δvは異なる量です。",
          "Change altitude from 200 to 1,000 km and compare with the 3.611 km/s reference. v∞, escape speed and burn Δv are different quantities.",
        ),
      };
    return {
      good:
        visitedSides.length === 2 &&
        sim!.flybyResult.speedChange *
          flyby(p.vinf, p.altitude, rad(p.angle), p.side === 1 ? -1 : 1)
            .speedChange <
          -1e-8,
      title:
        sim!.flybyResult.speedChange >= 0
          ? tr("太陽中心では加速", "Heliocentric speed increases")
          : tr("太陽中心では減速", "Heliocentric speed decreases"),
      reason: tr(
        "通過側を切り替えて比較しましょう。惑星中心の入出v∞は等しく、太陽中心では惑星速度とのベクトル合成で速さが変わります。",
        "Switch sides to compare. Incoming and outgoing planet-relative v∞ have equal magnitudes; adding the planet velocity changes heliocentric speed.",
      ),
    };
  })();
  const evaluate = () => {
    setEvaluated(true);
    if (outcome.good && prediction === lesson.answer)
      setCompleted((s) => (s.includes(lab) ? s : [...s, lab]));
  };
  const metrics = displayable
    ? lab === "transfer"
      ? [
          [
            tr("遷移の飛行時間", "Transfer time"),
            fmt(H.flightTime / K.DAY, 2),
            tr("日", "days"),
          ],
          [
            tr("出発時の火星先行角", "Mars phase at departure"),
            fmt(
              deg(missionAt(0, rad(p.phase), p.wait * K.DAY).phaseAtDeparture),
              3,
            ),
            "°",
          ],
          [
            tr("到着時の位置誤差", "Arrival miss distance"),
            fmt(sim!.arrival.missDistance, 0),
            "km",
          ],
          [
            tr("参考噴射Δv合計", "Reference total burn Δv"),
            fmt(
              reference.escapeResult.deltaV +
                reference.captureResult.circularDeltaV,
              3,
            ),
            "km/s",
          ],
        ]
      : lab === "escape"
        ? [
            [
              tr("地球中心・円軌道速度", "Earth: circular speed"),
              fmt(sim!.escapeResult.circularSpeed, 3),
              "km/s",
            ],
            [
              tr("地球中心・脱出速度", "Earth: escape speed"),
              fmt(sim!.escapeResult.escapeSpeed, 3),
              "km/s",
            ],
            [
              tr("必要な噴射Δv", "Required burn Δv"),
              fmt(sim!.escapeResult.deltaV, 3),
              "km/s",
            ],
            ["C3", fmt(p.vinf * p.vinf, 3), "km²/s²"],
          ]
        : lab === "capture"
          ? [
              [
                tr("火星中心・到着v∞", "Mars: arrival v∞"),
                fmt(H.vInfinityArrive, 3),
                "km/s",
              ],
              [
                tr("噴射前の近火点速度", "Speed before burn"),
                fmt(sim!.captureResult.beforeBurn, 3),
                "km/s",
              ],
              [
                tr("円軌道化の必要Δv", "Circularization Δv"),
                fmt(sim!.captureResult.circularDeltaV, 3),
                "km/s",
              ],
              [
                tr("噴射後の近点高度", "Post-burn periapsis"),
                fmt(sim!.orbit.periapsisRadius - K.rMars, 0),
                "km",
              ],
            ]
          : lab === "flyby"
            ? [
                [
                  tr("旋回角", "Turn angle"),
                  fmt(deg(sim!.flybyResult.turnAngle), 2),
                  "°",
                ],
                [
                  tr("惑星中心・入出v∞", "Planet: in / out v∞"),
                  fmt(p.vinf, 2),
                  "km/s",
                ],
                [
                  tr("太陽中心・接近前速度", "Sun: incoming speed"),
                  fmt(norm(sim!.flybyResult.sunIncoming), 3),
                  "km/s",
                ],
                [
                  tr("太陽中心・速さの変化", "Sun: speed change"),
                  `${sim!.flybyResult.speedChange >= 0 ? "+" : ""}${fmt(sim!.flybyResult.speedChange, 3)}`,
                  "km/s",
                ],
              ]
            : [
                [
                  tr("噴射後の初速", "Initial speed after burn"),
                  fmt(norm(sim!.initial.v), 3),
                  "km/s",
                ],
                [
                  tr("近点高度", "Periapsis altitude"),
                  fmt(sim!.orbit.periapsisRadius - K.rEarth, 0),
                  "km",
                ],
                [
                  tr("遠点高度", "Apoapsis altitude"),
                  sim!.orbit.apoapsisRadius
                    ? fmt(sim!.orbit.apoapsisRadius - K.rEarth, 0)
                    : "—",
                  "km",
                ],
                [
                  tr("離心率", "Eccentricity"),
                  fmt(sim!.orbit.eccentricity, 3),
                  "e",
                ],
              ]
    : [];
  return (
    <>
      <a className="skip-link" href="#main">
        {tr("メインへ移動", "Skip to content")}
      </a>
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
          <button
            className="quiet-button manual-button"
            onClick={() => setManualOpen(true)}
          >
            <Icon name="book" />
            {tr("簡易マニュアル", "Quick guide")}
          </button>
          <span className="header-divider" />
          <button
            className="quiet-button"
            onClick={() => setLang(en ? "ja" : "en")}
          >
            <Icon name="globe" />
            {en ? "日本語" : "English"}
          </button>
          <button
            className="icon-button"
            aria-label={
              theme === "dark"
                ? tr("ライトモード", "Light mode")
                : tr("ダークモード", "Dark mode")
            }
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} />
          </button>
        </div>
      </header>
      <main id="main" className="app-shell">
        <div className="section-kicker">
          <span className="status-dot" />
          INTERACTIVE ORBITAL MECHANICS{" "}
          <span className="version">LEARNING EDITION / 01</span>
        </div>
        <section className="intro">
          <div>
            <h1>
              {tr(
                "軌道を変える。旅が見える。",
                "Change an orbit. Discover a journey.",
              )}
            </h1>
            <p>
              {tr(
                "地球から火星へ。小さな実験で、宇宙の旅のしくみをひもとこう。",
                "From Earth to Mars. Discover how space travel works, one experiment at a time.",
              )}
            </p>
          </div>
          <div className="progress-label">
            <span>{tr("学習の進み具合", "YOUR PROGRESS")}</span>
            <strong>
              {String(completed.length).padStart(2, "0")}
              <small> / 05</small>
            </strong>
            <div className="progress-track">
              <i style={{ width: `${completed.length * 20}%` }} />
            </div>
          </div>
        </section>
        <nav
          className="chapter-nav"
          aria-label={tr("学習の章", "Learning chapters")}
        >
          {LABS.map((l) => (
            <button
              key={l.id}
              className={lab === l.id ? "chapter active" : "chapter"}
              aria-label={`${l.number} ${l.title[lang]}`}
              aria-current={lab === l.id ? "step" : undefined}
              onClick={() => changeLab(l.id)}
            >
              <span className="chapter-number">
                {completed.includes(l.id) ? (
                  <Icon name="check" size={15} />
                ) : (
                  l.number
                )}
              </span>
              <span>{l.title[lang]}</span>
              {lab === l.id && <span className="chapter-dot" />}
            </button>
          ))}
        </nav>
        <section className="workspace-heading">
          <div>
            <span className="eyebrow">EXPERIMENT {lesson.number}</span>
            <h2>{lesson.subtitle[lang]}</h2>
          </div>
          <span className="model-badge">
            {tr("円軌道・二体近似", "Circular / two-body model")}
          </span>
        </section>
        <div className="workspace">
          <section
            className="simulation-panel"
            aria-label={tr("シミュレーション", "Simulation")}
          >
            <div className="plot-toolbar">
              <div className="frame-label">
                <span className="status-dot" />
                {isMission
                  ? tr("太陽中心の全体図", "Heliocentric overview")
                  : lab === "capture"
                    ? tr("火星中心の捕獲実験", "Mars-centered capture lab")
                    : lab === "flyby" && frame === "sun"
                      ? tr("太陽中心の速度合成", "Heliocentric vector sum")
                      : tr("地球中心の局所実験", "Earth-centered local lab")}
              </div>
              {lab === "flyby" ? (
                <div className="segmented">
                  <button
                    aria-pressed={frame === "planet"}
                    onClick={() => setFrame("planet")}
                  >
                    {tr("惑星中心", "Planet")}
                  </button>
                  <button
                    aria-pressed={frame === "sun"}
                    onClick={() => setFrame("sun")}
                  >
                    {tr("太陽中心", "Sun")}
                  </button>
                </div>
              ) : (
                <span className="plot-tag">
                  {isMission ? "AU" : "km"} /{" "}
                  {isMission
                    ? tr("相対日数", "relative days")
                    : tr("独立した局所時刻", "independent local time")}
                </span>
              )}
            </div>
            {valid ? (
              <OrbitDiagram
                sim={sim!}
                reference={reference}
                time={now}
                p={p}
                lang={lang}
                layers={layers}
                frame={frame}
              />
            ) : (
              <div className="invalid-plot" role="status">
                <Icon name="orbit" size={44} />
                <h3>{tr("入力を確認してください", "Check your inputs")}</h3>
                <p>
                  {tr(
                    "範囲内の数値を入力すると軌道を再計算します。",
                    "Enter valid numbers to recalculate the trajectory.",
                  )}
                </p>
              </div>
            )}
            <div className="legend">
              <span>
                <i className="legend-earth" />
                {tr("地球", "Earth")}
              </span>
              <span>
                <i className="legend-mars" />
                {tr("火星", "Mars")}
              </span>
              <span>
                <i className="legend-route" />
                {tr("探査機の軌道", "Probe trajectory")}
              </span>
              <span>
                <i className="legend-reference" />
                {tr("参考設定（点線）", "Reference (dotted)")}
              </span>
            </div>
            <div className="layer-controls">
              {(
                [
                  "vectors",
                  "trail",
                  "predicted",
                  "markers",
                  "reference",
                ] as const
              ).map((key, i) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={layers[key]}
                    onChange={(e) =>
                      setLayers((s) => ({ ...s, [key]: e.target.checked }))
                    }
                  />
                  {
                    [
                      tr("速度ベクトル", "Velocity"),
                      tr("過去の軌跡", "Trail"),
                      tr("予測軌道", "Prediction"),
                      tr("イベント点", "Event markers"),
                      tr("参考を重ねる", "Compare reference"),
                    ][i]
                  }
                </label>
              ))}
            </div>
            <div className="timeline">
              <div className="playback-row">
                <div className="transport">
                  <button
                    className="play-button"
                    disabled={!valid || sim?.blocked}
                    aria-label={
                      reduceMotion
                        ? tr("1ステップ", "One step")
                        : playing
                          ? tr("一時停止", "Pause")
                          : tr("再生", "Play")
                    }
                    onClick={() => {
                      if (reduceMotion) {
                        step();
                        return;
                      }
                      if (sim && now >= sim.end) setTime(sim.start);
                      setPlaying((v) => !v);
                    }}
                  >
                    <Icon
                      name={reduceMotion ? "step" : playing ? "pause" : "play"}
                      size={17}
                    />
                    {reduceMotion
                      ? tr("ステップ", "Step")
                      : playing
                        ? tr("一時停止", "Pause")
                        : tr("再生", "Play")}
                  </button>
                  <button
                    className="icon-button"
                    aria-label={tr("最初から", "Restart")}
                    onClick={() => {
                      setTime(sim?.start ?? 0);
                      setPlaying(false);
                    }}
                  >
                    <Icon name="reset" size={18} />
                  </button>
                  {!reduceMotion && (
                    <button
                      className="icon-button"
                      aria-label={tr("1ステップ", "One step")}
                      disabled={!valid}
                      onClick={() => {
                        setPlaying(false);
                        step();
                      }}
                    >
                      <Icon name="step" size={18} />
                    </button>
                  )}
                </div>
                <div className="clock-value">
                  <small>
                    {isMission
                      ? tr("出発から", "SINCE DEPARTURE")
                      : tr("局所時刻", "LOCAL TIME")}
                  </small>
                  <strong>
                    {valid ? fmt(now / timeScale, 2) : "—"} <span>{unit}</span>
                  </strong>
                </div>
                <label className="speed-select">
                  <span>{tr("1秒で", "1 s =")}</span>
                  <select
                    aria-label={tr("再生速度", "Playback speed")}
                    value={rate}
                    onChange={(e) => setRate(Number(e.target.value))}
                  >
                    {[5, 20, 60].map((r) => (
                      <option key={r} value={r}>
                        {r} {isMission ? tr("日", "days") : tr("分", "min")}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <input
                className="seek"
                type="range"
                aria-label={tr("仮想時刻", "Simulation time")}
                min={sim?.start ?? 0}
                max={sim?.end ?? 1}
                step="any"
                value={now}
                disabled={!valid || sim?.blocked}
                onChange={(e) => {
                  setTime(Number(e.target.value));
                  setPlaying(false);
                }}
              />
              <div className="event-row">
                <button
                  onClick={() => {
                    setPlaying(false);
                    setTime(sim?.start ?? 0);
                  }}
                >
                  {isMission
                    ? tr("出発", "Departure")
                    : lab === "flyby"
                      ? tr("接近", "Approach")
                      : tr("噴射直後", "After burn")}
                </button>
                <button
                  disabled={!valid}
                  onClick={() => {
                    setPlaying(false);
                    setTime(
                      lab === "flyby"
                        ? 0
                        : ((sim?.start ?? 0) + (sim?.end ?? 0)) / 2,
                    );
                  }}
                >
                  {lab === "flyby"
                    ? tr("近点", "Periapsis")
                    : isMission
                      ? tr("飛行の中間", "Mid-transfer")
                      : tr("中間時刻", "Midpoint")}
                </button>
                <button
                  disabled={!valid}
                  onClick={() => {
                    setPlaying(false);
                    setTime(sim?.end ?? 0);
                  }}
                >
                  {sim?.impact !== null && sim?.impact !== undefined
                    ? tr("衝突", "Impact")
                    : isMission
                      ? `${tr("到着", "Arrival")} · ${fmt(H.flightTime / K.DAY, 1)} ${unit}`
                      : tr("区間の終わり", "End of interval")}
                </button>
              </div>
            </div>
            <p className="scale-note">
              {isMission
                ? tr(
                    "天体・探査機のマーカーは実寸ではありません。軌道の距離縮尺は共通です。",
                    "Body and probe markers are enlarged. Orbital distances share one scale.",
                  )
                : tr(
                    "惑星の実半径で衝突を判定。探査機マーカーは拡大表示です。",
                    "Collisions use the physical planet radius. The probe marker is enlarged.",
                  )}
              {reduceMotion &&
                ` ${tr("低モーション：ステップで操作します。", "Reduced motion: use step controls.")}`}
            </p>
          </section>
          <aside className="control-panel">
            <div className="panel-heading">
              <span className="eyebrow">MISSION CONTROL</span>
              <h3>{tr("条件を変えてみよう", "Make it your experiment")}</h3>
              <p>
                {tr(
                  "一つずつ変えて、軌道と数値を比べます。",
                  "Change one value and see what happens.",
                )}
              </p>
            </div>
            <div className="parameters">
              {lab === "transfer" && (
                <>
                  {field(
                    "phase",
                    tr("位相角", "Phase angle"),
                    0,
                    360,
                    0.001,
                    "°",
                  )}
                  <p className="field-note">
                    {tr(
                      "基準時刻で、地球より火星が先行する角度",
                      "How far Mars leads Earth at the reference epoch",
                    )}
                  </p>
                  {field(
                    "wait",
                    tr("出発までの待ち時間", "Departure wait"),
                    0,
                    780,
                    0.1,
                    tr("日", "days"),
                  )}
                  <p className="field-note">
                    {tr(
                      "待つ間は地球も火星も公転します。",
                      "Both Earth and Mars move while you wait.",
                    )}
                  </p>
                </>
              )}
              {lab === "basics" && (
                <>
                  {field(
                    "altitude",
                    tr("待機軌道高度", "Parking altitude"),
                    150,
                    2000,
                    10,
                    "km",
                  )}
                  {field(
                    "burn",
                    tr("接線方向の噴射", "Tangential burn"),
                    -3,
                    5,
                    0.01,
                    "km/s",
                  )}
                  <p className="field-note">
                    {tr(
                      "＋は順行（加速）、−は逆行（減速）",
                      "+ prograde (speed up), − retrograde (slow down)",
                    )}
                  </p>
                </>
              )}
              {lab === "escape" && (
                <>
                  {field(
                    "altitude",
                    tr("待機軌道高度", "Parking altitude"),
                    150,
                    30000,
                    10,
                    "km",
                  )}
                  {field(
                    "vinf",
                    tr("目標の超過速度 v∞", "Target excess speed v∞"),
                    0,
                    12,
                    0.01,
                    "km/s",
                  )}
                </>
              )}
              {lab === "capture" && (
                <>
                  {field(
                    "altitude",
                    tr("近火点高度", "Mars periapsis altitude"),
                    0,
                    3000,
                    10,
                    "km",
                  )}
                  {field(
                    "burn",
                    tr("減速Δv", "Braking Δv"),
                    0,
                    5,
                    0.001,
                    "km/s",
                  )}
                  <button
                    className="text-button"
                    disabled={invalid.altitude || !sim}
                    onClick={() => {
                      if (sim) {
                        change("burn", sim.captureResult.circularDeltaV);
                        setInvalid({});
                        setRevision((r) => r + 1);
                      }
                    }}
                  >
                    {tr("円軌道化に必要なΔvを設定", "Set circularization Δv")}{" "}
                    <Icon name="arrow" size={14} />
                  </button>
                </>
              )}
              {lab === "flyby" && (
                <>
                  {field(
                    "vinf",
                    tr("接近速度", "Incoming v∞"),
                    1,
                    15,
                    0.1,
                    "km/s",
                  )}
                  {field(
                    "altitude",
                    tr("近点高度", "Periapsis altitude"),
                    0,
                    20000,
                    10,
                    "km",
                  )}
                  {field(
                    "angle",
                    tr("入射方向", "Incoming direction"),
                    -180,
                    180,
                    1,
                    "°",
                  )}
                  <div className="side-select">
                    <span>
                      {tr(
                        "通過側（速度を回す向き）",
                        "Pass side (velocity rotation)",
                      )}
                    </span>
                    <div className="segmented">
                      <button
                        aria-pressed={p.side === 1}
                        onClick={() => change("side", 1)}
                      >
                        {tr("反時計回り", "Counterclockwise")}
                      </button>
                      <button
                        aria-pressed={p.side === -1}
                        onClick={() => change("side", -1)}
                      >
                        {tr("時計回り", "Clockwise")}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            <button className="reference-button" onClick={reset}>
              <Icon name="reset" size={15} />
              {tr("参考設定へ戻す", "Restore reference")}
            </button>
            <div
              className={`outcome ${outcome.good ? "success" : "notice"}`}
              role="status"
            >
              <div>
                <span className="status-dot" />
                <strong>{outcome.title}</strong>
              </div>
              <p>{outcome.reason}</p>
            </div>
            <div className="thinking-note">
              <span className="eyebrow">THINK ABOUT IT</span>
              <p>{lesson.question[lang]}</p>
            </div>
          </aside>
        </div>
        <div className="metric-strip">
          {metrics.length ? (
            metrics.map(([title, value, suffix]) => (
              <div className="metric" key={title}>
                <span>{title}</span>
                <strong>
                  {value}
                  <small>{suffix}</small>
                </strong>
              </div>
            ))
          ) : (
            <p>
              {tr(
                "計算結果は、有効な入力かつモデルの安全範囲内で表示します。",
                "Results require valid inputs within the model’s safe domain.",
              )}
            </p>
          )}
        </div>
        <p className="model-note">
          <Icon name="orbit" size={16} />
          {isMission
            ? tr(
                "参考Δvは地球脱出＋火星円軌道投入のみ。打上げ・修正・損失は含みません。遭遇しても捕獲は別の操作です。",
                "Reference Δv includes Earth escape and Mars circularization only; no launch, corrections or losses. Encounter and capture are different.",
              )
            : tr(
                "独立した局所実験です。惑星間航路と連続接続した航法解ではありません。火星捕獲の到着v∞は検証済み参考値を使います。",
                "This is an independent local experiment, not a continuously connected navigation solution. Mars capture uses the verified reference arrival v∞.",
              )}
        </p>
        <div className="learning-grid">
          <section className="lesson-panel">
            <div className="lesson-heading">
              <span className="eyebrow">
                LEARNING CHALLENGE / {lesson.number}
              </span>
              <span className="mini-tag">
                {tr(
                  "予想 → 操作 → 比較 → 理解",
                  "PREDICT → TRY → COMPARE → UNDERSTAND",
                )}
              </span>
            </div>
            <h3>{lesson.question[lang]}</h3>
            <div className="prediction-options">
              {lesson.prediction[lang].map((answer, i) => (
                <button
                  key={answer}
                  aria-pressed={prediction === i}
                  onClick={() => {
                    setPrediction(i);
                    setEvaluated(false);
                  }}
                >
                  <span>{String.fromCharCode(65 + i)}</span>
                  {answer}
                </button>
              ))}
            </div>
            <ol className="experiment-steps">
              {lesson.steps[lang].map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <div className="challenge-actions">
              <button
                className="primary-outline"
                onClick={evaluate}
                disabled={!valid || prediction === null}
              >
                {tr("結果を確かめる", "Check my result")}
                <Icon name="arrow" size={15} />
              </button>
              <button
                className="text-button"
                onClick={() =>
                  setHint((h) => Math.min(h + 1, lesson.hints[lang].length))
                }
              >
                {tr("ヒント", "Hint")} {hint}/{lesson.hints[lang].length}
              </button>
            </div>
            {hint > 0 && (
              <p className="hint-text">{lesson.hints[lang][hint - 1]}</p>
            )}
            {evaluated && (
              <div className="assessment" role="status">
                <strong>
                  {prediction === lesson.answer
                    ? tr(
                        "予想の考え方は合っています。",
                        "Your prediction is correct.",
                      )
                    : tr(
                        "結果から考え直してみましょう。",
                        "Use the result to revisit your prediction.",
                      )}
                </strong>
                <p>{lesson.predictionFeedback[lang]}</p>
                <p>
                  {outcome.good
                    ? tr(
                        "実験の到達条件も達成しました。",
                        "You also met the experiment target.",
                      )
                    : outcome.reason}
                </p>
              </div>
            )}
            <details>
              <summary>
                {tr("なぜそうなる？ 解説を読む", "Why does this happen?")}
              </summary>
              <p>{lesson.explanation[lang]}</p>
            </details>
          </section>
          <section className="telemetry-panel">
            <div className="lesson-heading">
              <span className="eyebrow">LIVE TELEMETRY</span>
              <span className="mini-tag">
                {isMission
                  ? tr("太陽中心", "SUN-CENTERED")
                  : lab === "capture"
                    ? tr("火星中心", "MARS-CENTERED")
                    : tr("地球中心", "EARTH-CENTERED")}
              </span>
            </div>
            <h3>
              {tr("数字から、動きを読む", "Read the motion in the numbers")}
            </h3>
            {valid && <SpeedChart sim={sim!} time={now} lang={lang} />}
            <table>
              <caption className="sr-only">
                {tr("現在の物理状態", "Current physical state")}
              </caption>
              <tbody>
                <tr>
                  <th>{tr("現在の速さ", "Current speed")}</th>
                  <td>{current ? fmt(norm(current.v), 3) : "—"} km/s</td>
                </tr>
                <tr>
                  <th>{tr("中心からの距離", "Distance from center")}</th>
                  <td>
                    {current
                      ? fmt(
                          norm(current.r) / (isMission ? K.AU : 1),
                          isMission ? 4 : 0,
                        )
                      : "—"}{" "}
                    {isMission ? "AU" : "km"}
                  </td>
                </tr>
                <tr>
                  <th>{tr("比軌道エネルギー", "Specific orbital energy")}</th>
                  <td>
                    {displayable ? fmt(sim!.orbit.energy, 3) : "—"} km²/s²
                  </td>
                </tr>
                <tr>
                  <th>{tr("比角運動量", "Specific angular momentum")}</th>
                  <td>
                    {displayable ? fmt(sim!.orbit.angularMomentum, 1) : "—"}{" "}
                    km²/s
                  </td>
                </tr>
              </tbody>
            </table>
            <details>
              <summary>
                {tr(
                  "詳細：式・単位・モデルの仮定",
                  "Details: formula, units & assumptions",
                )}
              </summary>
              <pre>{lesson.formula}</pre>
              <p>{lesson.assumptions[lang]}</p>
              <p>
                {tr(
                  "内部単位：km・s・rad。図と表は同じ状態ベクトルから計算します。",
                  "Internal units: km, s, rad. The diagram and table share the same state vector.",
                )}
              </p>
              <small>{K.version}</small>
            </details>
          </section>
        </div>
        <section className="next-chapter">
          <div>
            <span className="eyebrow">KEEP EXPLORING</span>
            <p>
              {tr(
                "次の実験で、旅の続きを。",
                "The next experiment is another discovery.",
              )}
            </p>
          </div>
          <button
            onClick={() =>
              changeLab(
                LABS[(LABS.findIndex((l) => l.id === lab) + 1) % LABS.length]
                  .id,
              )
            }
          >
            {
              LABS[(LABS.findIndex((l) => l.id === lab) + 1) % LABS.length]
                .title[lang]
            }
            <Icon name="arrow" size={18} />
          </button>
        </section>
      </main>
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
          NASA / JPL <span>↗</span>
        </a>
      </footer>
      <div className="persistent-notice">
        {tr(
          "教育用の近似モデル · 実際の打上げ・探査機運用・航法には使用できません",
          "Educational approximation · Not for actual launches, spacecraft operations or navigation",
        )}
      </div>
      <dialog
        ref={modalRef}
        className="manual-dialog"
        onClose={() => setManualOpen(false)}
        aria-labelledby="manual-title"
      >
        <div className="manual-top">
          <span className="eyebrow">FIELD GUIDE</span>
          <button
            className="icon-button"
            aria-label={tr("閉じる", "Close")}
            onClick={() => setManualOpen(false)}
          >
            <Icon name="close" />
          </button>
        </div>
        <h2 id="manual-title">{manual[lang].title}</h2>
        <p>{manual[lang].intro}</p>
        {manual[lang].sections.map((s, i) => (
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
            NASA/JPL ·{" "}
            {tr("火星への出発時期を学ぶ", "Calculating launch windows")} ↗
          </a>
        </p>
        <button
          className="reference-button"
          onClick={() => setManualOpen(false)}
        >
          {tr("実験に戻る", "Back to the experiment")}
        </button>
      </dialog>
    </>
  );
}
