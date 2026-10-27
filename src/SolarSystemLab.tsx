import { useEffect, useId, useMemo, useState } from "react";
import { Icon, ParameterInput } from "./components";
import type { Lang } from "./learning";
import MathFormula from "./MathFormula";
import { K, deg, norm } from "./physics";
import type { Vec } from "./physics";
import {
  BODIES,
  BODY_IDS,
  PLANET_IDS,
  calculateRoute,
  defaultRouteInputs,
  routeAt,
  sampleRoute,
} from "./solarSystem";
import type { BodyId, PlanetId, RouteInputs, RouteResult } from "./solarSystem";
import "./SolarSystemLab.css";

interface SolarSystemLabProps {
  lang: Lang;
  reduceMotion: boolean;
}

type NumericInput = Exclude<keyof RouteInputs, "origin" | "destination">;

export default function SolarSystemLab({
  lang,
  reduceMotion,
}: SolarSystemLabProps) {
  const [inputs, setInputs] = useState(() => defaultRouteInputs());
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [revision, setRevision] = useState(0);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const headingId = useId();
  const tr = (ja: string, en: string) => (lang === "ja" ? ja : en);
  const f = (value: number, digits = 3) =>
    value.toLocaleString(lang === "ja" ? "ja-JP" : "en-US", {
      maximumFractionDigits: digits,
    });
  const tn = (value: number, digits = 3) =>
    f(value, digits).replaceAll(",", String.raw`{,}`);
  const result = useMemo(() => {
    try {
      return calculateRoute(inputs);
    } catch {
      return null;
    }
  }, [inputs]);
  const reference = useMemo(
    () => calculateRoute(defaultRouteInputs(inputs.origin, inputs.destination)),
    [inputs.origin, inputs.destination],
  );
  const valid = result !== null && !Object.values(invalid).some(Boolean);
  const route = valid ? result : null;
  const samples = useMemo(() => (result ? sampleRoute(result) : []), [result]);
  const earthRoutes = useMemo(
    () =>
      BODY_IDS.filter((id) => id !== "earth").map((id) =>
        calculateRoute(defaultRouteInputs("earth", id)),
      ),
    [],
  );
  const origin = BODIES[inputs.origin];
  const destination = BODIES[inputs.destination];
  const lunar = inputs.destination === "moon";
  const waitLimit = Math.min(
    100000,
    Math.max(1, Math.ceil(reference.synodicPeriod / K.DAY)),
  );
  const now = route ? routeAt(route, route.flightTime * progress) : null;
  const difference = (current: number, baseline: number, unit: string) => {
    const delta = current - baseline;
    return `${tr("参考との差", "From reference")} ${Math.abs(delta) < 0.0005 ? "0" : `${delta > 0 ? "+" : ""}${f(delta)}`} ${unit}`;
  };
  const duration = (seconds: number) =>
    `${f(seconds / K.DAY, 2)} ${tr("日", "days")}${seconds > 365.25 * K.DAY ? ` · ${f(seconds / (365.25 * K.DAY), 2)} ${tr("年", "years")}` : ""}`;

  useEffect(() => {
    if (!playing || !valid || reduceMotion) return;
    let handle = 0;
    let last: number | undefined;
    const tick = (stamp: number) => {
      if (last !== undefined) {
        // Capture the elapsed frame time before React defers the state updater.
        const elapsed = Math.max(0, Math.min(stamp - last, 100)) / 24000;
        setProgress((current) => Math.min(1, current + elapsed));
      }
      last = stamp;
      handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [playing, valid, reduceMotion]);
  useEffect(() => {
    if (progress >= 1) setPlaying(false);
  }, [progress]);
  useEffect(() => {
    if (reduceMotion) setPlaying(false);
  }, [reduceMotion]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);

  function selectRoute(from: PlanetId, to: BodyId) {
    const nextOrigin = to === "moon" ? "earth" : from;
    const nextTarget =
      nextOrigin === to ? (nextOrigin === "earth" ? "mars" : "earth") : to;
    setInputs(defaultRouteInputs(nextOrigin, nextTarget));
    setInvalid({});
    setRevision((value) => value + 1);
    setProgress(0);
    setPlaying(false);
  }
  function change(key: NumericInput, value: number) {
    setInputs((current) => ({ ...current, [key]: value }));
    setProgress(0);
    setPlaying(false);
  }
  function field(
    key: NumericInput,
    label: string,
    min: number,
    max: number,
    step: number,
    unit: string,
  ) {
    return (
      <ParameterInput
        key={`${key}-${revision}`}
        id={`solar-${key}`}
        label={label}
        value={inputs[key]}
        min={min}
        max={max}
        step={step}
        unit={unit}
        lang={lang}
        onChange={(value) => change(key, value)}
        onValidityChange={(okay) => {
          setInvalid((current) =>
            current[key] === !okay ? current : { ...current, [key]: !okay },
          );
          if (!okay) setPlaying(false);
        }}
      />
    );
  }
  const captureLabels = {
    target: tr("目標円軌道に一致", "Target circular orbit matched"),
    captured: tr("捕獲・目標とは異なる軌道", "Captured into a different orbit"),
    flyby: tr("非束縛・通過する軌道", "Unbound passing trajectory"),
    unsafe: tr("モデルの最低高度を下回る", "Below the model altitude limit"),
  };

  return (
    <section
      className="solar-lab"
      data-testid="solar-system-lab"
      aria-labelledby={headingId}
    >
      <div className="solar-intro">
        <div>
          <span className="section-kicker">
            {tr("太陽系を、同じ物差しで", "ONE MODEL, MANY WORLDS")}
          </span>
          <h2 id={headingId}>
            {tr("次は、どこへ行こう？", "Where will you go next?")}
          </h2>
          <p>
            {tr(
              "月も、8つの惑星も。出発と到着の天体を選び、時間・噴射・待ち合わせの関係を調べましょう。",
              "Explore the Moon and all eight planets. Choose a route and explore travel time, burns, and meeting a moving world.",
            )}
          </p>
        </div>
        <span className="solar-model-badge">
          {tr("8惑星 ＋ 月", "8 planets + the Moon")}
          <small>
            {tr(
              "円軌道・同一平面の学習モデル",
              "Circular, coplanar teaching model",
            )}
          </small>
        </span>
      </div>

      <div
        className="solar-presets"
        aria-label={tr("航路の例", "Example routes")}
      >
        {(
          [
            ["earth", "moon"],
            ["earth", "mars"],
            ["earth", "jupiter"],
            ["venus", "earth"],
          ] as [PlanetId, BodyId][]
        ).map(([from, to]) => (
          <button
            key={to}
            type="button"
            onClick={() => selectRoute(from, to)}
            aria-pressed={inputs.origin === from && inputs.destination === to}
          >
            {BODIES[from].name[lang]} <span aria-hidden="true">→</span>{" "}
            {BODIES[to].name[lang]}
          </button>
        ))}
      </div>

      <div className="solar-workspace">
        <aside
          className="solar-settings"
          aria-label={tr("航路の設定", "Route settings")}
        >
          <div className="solar-settings-heading">
            <h3>{tr("航路をつくる", "Build a route")}</h3>
            <button
              type="button"
              className="solar-reset"
              onClick={() => selectRoute(inputs.origin, inputs.destination)}
            >
              <Icon name="reset" size={15} />
              {tr("参考に戻す", "Reset reference")}
            </button>
          </div>
          <div className="solar-selectors">
            <label htmlFor="solar-origin">
              {tr("出発天体", "Departure body")}
              <select
                id="solar-origin"
                value={inputs.origin}
                onChange={(event) => {
                  const from = event.target.value as PlanetId;
                  selectRoute(
                    from,
                    inputs.destination === "moon" && from !== "earth"
                      ? "earth"
                      : inputs.destination,
                  );
                }}
              >
                {PLANET_IDS.map((id) => (
                  <option key={id} value={id}>
                    {BODIES[id].name[lang]}
                  </option>
                ))}
              </select>
            </label>
            <span aria-hidden="true">→</span>
            <label htmlFor="solar-destination">
              {tr("目的地", "Destination")}
              <select
                id="solar-destination"
                value={inputs.destination}
                onChange={(event) =>
                  selectRoute(inputs.origin, event.target.value as BodyId)
                }
              >
                {BODY_IDS.map((id) => (
                  <option key={id} value={id} disabled={id === inputs.origin}>
                    {BODIES[id].name[lang]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="solar-control-note">
            {lunar
              ? tr(
                  "月を選ぶと出発天体は地球になります。",
                  "Selecting the Moon sets the departure body to Earth.",
                )
              : tr(
                  "地球を目的地にした帰路も計算できます。",
                  "You can also select Earth as a return destination.",
                )}
          </p>
          {field(
            "departureAltitude",
            tr("出発軌道の高度", "Departure orbit altitude"),
            origin.minimumAltitude,
            100000,
            10,
            "km",
          )}
          {field(
            "arrivalAltitude",
            tr("到着軌道の高度", "Arrival orbit altitude"),
            destination.minimumAltitude,
            100000,
            10,
            "km",
          )}
          {(origin.kind === "giant" || destination.kind === "giant") && (
            <p className="solar-control-note">
              {tr(
                "巨大惑星の高度は基準半径からの高さです。固体の地表ではなく、大気・環は計算に含みません。",
                "Giant-planet altitudes are above a reference radius, not a solid surface. Atmospheres and rings are omitted.",
              )}
            </p>
          )}
          <div className="solar-control-divider">
            <span>{tr("待ち合わせを変える", "Change the meeting")}</span>
          </div>
          {field(
            "phaseOffset",
            tr("初期位相のずれ", "Initial phase offset"),
            -180,
            180,
            1,
            "°",
          )}
          {field(
            "waitDays",
            tr("出発までの待ち時間", "Departure wait"),
            0,
            waitLimit,
            lunar ? 0.001 : 1,
            tr("日", "days"),
          )}
          <p className="solar-control-note">
            {lunar
              ? tr(
                  "待つ間、待機軌道の探査機と月が進みます。地球の自転を使った計算ではありません。",
                  "Waiting advances the parking spacecraft and the Moon. Earth’s surface rotation is not used.",
                )
              : tr(
                  "位相のずれ0°・待ち時間0日が、待ち合わせできる参考条件です。",
                  "Zero phase offset and zero wait give the reference meeting conditions.",
                )}
          </p>
          <div className="solar-control-divider">
            <span>{tr("到着後の局所実験", "Local arrival experiment")}</span>
          </div>
          {field(
            "captureFraction",
            tr("捕獲噴射の割合", "Capture burn fraction"),
            0,
            1.5,
            0.05,
            "×",
          )}
          <p className="solar-control-note">
            {tr(
              "1×＝目標円軌道に必要な減速の100%。0×なら減速しません。",
              "1× = 100% of the braking needed for the target circular orbit. 0× applies no burn.",
            )}
          </p>
        </aside>

        <div className="solar-flight">
          <div className="solar-plot-heading">
            <div>
              <span className="section-kicker">
                {lunar
                  ? tr("地球中心の遷移", "EARTH-CENTERED TRANSFER")
                  : tr("太陽中心の遷移", "SUN-CENTERED TRANSFER")}
              </span>
              <h3>
                {origin.name[lang]} <span aria-hidden="true">→</span>{" "}
                {destination.name[lang]}
              </h3>
            </div>
            <span className="solar-direction">
              {lunar
                ? tr("月へ向かう楕円", "Ellipse to the Moon")
                : reference.targetRadius < reference.departureRadius
                  ? tr("内側の軌道へ", "Toward an inner orbit")
                  : tr("外側の軌道へ", "Toward an outer orbit")}
            </span>
          </div>
          {route && now ? (
            <>
              <RouteDiagram
                route={route}
                time={route.flightTime * progress}
                samples={samples}
                lang={lang}
              />
              <div className="solar-timeline">
                <div className="solar-timeline-heading">
                  <span>
                    {tr("飛行の経過", "Flight progress")}{" "}
                    <strong>{duration(route.flightTime * progress)}</strong>
                  </span>
                  <span>{f(progress * 100, 0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.001"
                  value={progress}
                  aria-label={tr("航路の経過時間", "Route elapsed time")}
                  onChange={(event) => {
                    setProgress(Number(event.target.value));
                    setPlaying(false);
                  }}
                />
                <div className="solar-playback">
                  <button
                    type="button"
                    onClick={() => {
                      setProgress(0);
                      setPlaying(false);
                    }}
                  >
                    {tr("出発", "Departure")}
                  </button>
                  <button
                    type="button"
                    className="solar-play"
                    disabled={reduceMotion}
                    onClick={() => {
                      if (progress >= 1) setProgress(0);
                      setPlaying((value) => !value);
                    }}
                  >
                    <Icon name={playing ? "pause" : "play"} size={16} />
                    {playing
                      ? tr("一時停止", "Pause")
                      : tr("航路を再生", "Play route")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProgress(1);
                      setPlaying(false);
                    }}
                  >
                    {tr("到着時刻", "Arrival time")}
                  </button>
                  <span>
                    {tr("探査機の速さ", "Probe speed")}{" "}
                    <strong>{f(norm(now.probe.v))} km/s</strong>
                  </span>
                </div>
                <p className="solar-current-distance">
                  {tr(
                    "この時刻の目的地までの距離",
                    "Distance to destination now",
                  )}{" "}
                  <strong>{f(now.distance, 0)} km</strong>
                </p>
                {reduceMotion && (
                  <p className="solar-control-note">
                    {tr(
                      "動きを抑える設定です。時間スライダーと出発・到着ボタンで確認できます。",
                      "Reduced motion is enabled. Use the time slider or departure and arrival buttons.",
                    )}
                  </p>
                )}
              </div>
              <div
                className={`solar-meeting ${route.encounter ? "solar-meeting-good" : "solar-meeting-miss"}`}
                aria-live="polite"
              >
                <Icon name={route.encounter ? "check" : "orbit"} size={20} />
                <div>
                  <strong>
                    {route.encounter
                      ? tr(
                          "参考の待ち合わせ条件を満たす",
                          "Meeting tolerance satisfied",
                        )
                      : tr(
                          "この設定では、到着時にすれ違う",
                          "The destination is missed at arrival",
                        )}
                  </strong>
                  <p>
                    {tr(
                      "到着時刻での中心位置のずれ",
                      "Center-to-center miss at arrival",
                    )}{" "}
                    <b data-testid="route-arrival-miss">
                      {f(route.arrivalMiss, 0)} km
                    </b>{" "}
                    · {tr("教材の許容値", "Teaching tolerance")}{" "}
                    {f(route.encounterTolerance, 0)} km
                  </p>
                </div>
              </div>
              <div className="solar-metrics">
                <Metric
                  testId="route-flight-time"
                  label={tr("飛行時間", "Flight time")}
                  value={duration(route.flightTime)}
                  change={difference(
                    route.flightTime / K.DAY,
                    reference.flightTime / K.DAY,
                    tr("日", "days"),
                  )}
                />
                <Metric
                  testId="route-departure-dv"
                  label={tr("出発の噴射 Δv", "Departure burn Δv")}
                  value={`${f(route.departureDeltaV)} km/s`}
                  change={difference(
                    route.departureDeltaV,
                    reference.departureDeltaV,
                    "km/s",
                  )}
                />
                <Metric
                  label={tr(
                    "円軌道投入の参考 Δv",
                    "Reference circular capture Δv",
                  )}
                  value={`${f(route.arrivalDeltaV)} km/s`}
                  change={difference(
                    route.arrivalDeltaV,
                    reference.arrivalDeltaV,
                    "km/s",
                  )}
                />
                <Metric
                  label={tr(
                    "参考2噴射の合計 Δv",
                    "Reference two-burn total Δv",
                  )}
                  value={`${f(route.totalDeltaV)} km/s`}
                  change={difference(
                    route.totalDeltaV,
                    reference.totalDeltaV,
                    "km/s",
                  )}
                />
              </div>
              <p className="solar-budget-note">
                {tr(
                  "Δvは速度を変える量です。上記は参考の遭遇を仮定した出発・円軌道投入の概算で、地表打上げは含みません。位置がずれた場合、この捕獲噴射では修正できません。",
                  "Δv measures a change in velocity. These departure and circular-capture estimates assume the reference encounter and exclude surface launch. This capture burn cannot correct a missed destination.",
                )}
              </p>
            </>
          ) : (
            <div className="solar-invalid" role="status">
              <h3>{tr("入力を確認してください", "Check the inputs")}</h3>
              <p>
                {tr(
                  "表示範囲内の数値に戻すと、軌道と計算結果を再表示します。",
                  "Restore values within the displayed ranges to show the trajectory and results.",
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {route && (
        <>
          <section
            className="solar-calculations"
            id="solar-calculations"
            aria-labelledby="solar-calculations-title"
          >
            <div className="solar-section-heading">
              <div>
                <span className="section-kicker">
                  {tr("数字がつながる、4つのステップ", "FOLLOW THE NUMBERS")}
                </span>
                <h3 id="solar-calculations-title">
                  {tr("この航路の計算過程", "How this route is calculated")}
                </h3>
              </div>
              <p>
                {tr(
                  "入力を変えると、代入する数値も更新されます。",
                  "Changing the inputs also updates the substituted values.",
                )}
              </p>
            </div>
            <div className="solar-equations">
              <article>
                <span className="solar-step-number">01</span>
                <h4>
                  {tr(
                    "軌道から、時間を求める",
                    "From orbital radii to flight time",
                  )}
                </h4>
                <p>
                  {lunar
                    ? tr(
                        "出発は地球待機軌道、到着は月の公転半径。",
                        "Start at the Earth parking orbit and end at the Moon’s orbital radius.",
                      )
                    : tr(
                        "出発・到着天体の公転半径を使います。",
                        "Use the orbital radii of the departure and destination planets.",
                      )}
                </p>
                <MathFormula
                  tex={String.raw`\begin{aligned}r_1&=${tn(route.departureRadius, 1)}\,\mathrm{km}\\r_2&=${tn(route.targetRadius, 1)}\,\mathrm{km}\\\mu&=${tn(route.mu, 3)}\,\mathrm{km^3/s^2}\\a_{\mathrm T}&=\frac{r_1+r_2}{2}\\&=${tn(route.semiMajor, 1)}\,\mathrm{km}\\t_{\mathrm T}&=\pi\sqrt{\frac{a_{\mathrm T}^3}{\mu}}\\&=${tn(route.flightTime / K.DAY, 3)}\,\mathrm d\end{aligned}`}
                />
                <strong>{duration(route.flightTime)}</strong>
                <small>
                  {lunar
                    ? tr(
                        "約5日は低エネルギーの半楕円モデルの値です。有人ミッションの所要時間ではありません。待機高度を変えると飛行時間も変わります。",
                        "About five days is the low-energy half-ellipse result, not a crewed-mission duration. Parking altitude also changes flight time.",
                      )
                    : tr(
                        "待機高度や位相を変えても、この惑星間の遷移時間は固定です。",
                        "Parking altitude and phase do not change this interplanetary transfer time.",
                      )}
                </small>
              </article>
              <article>
                <span className="solar-step-number">02</span>
                <h4>
                  {tr("出発に必要な噴射を求める", "Find the departure burn")}
                </h4>
                <p>
                  {lunar
                    ? tr(
                        "地球に束縛された楕円へ直接投入します。",
                        "Inject directly into an ellipse bound to Earth.",
                      )
                    : tr(
                        "太陽中心での速度差と、天体を脱出する噴射を区別します。",
                        "Separate the heliocentric speed change from the local escape burn.",
                      )}
                </p>
                <MathFormula
                  tex={String.raw`\begin{aligned}v_{\mathrm{T1}}&=\sqrt{\mu\!\left(\frac{2}{r_1}-\frac{1}{a_{\mathrm T}}\right)}\\&=${tn(route.transferDepartureSpeed)}\,\mathrm{km/s}\\v_{\mathrm{c1}}&=\sqrt{\frac{\mu}{r_1}}=${tn(route.departureCircularSpeed)}\,\mathrm{km/s}\\\Delta v_{\mathrm{frame}}&=v_{\mathrm{T1}}-v_{\mathrm{c1}}\\&=${tn(route.departureSignedChange)}\,\mathrm{km/s}\end{aligned}`}
                />
                <MathFormula
                  tex={
                    lunar
                      ? String.raw`\Delta v_{\mathrm{depart}}=v_{\mathrm{T1}}-v_{\mathrm{c1}}`
                      : String.raw`\begin{aligned}v_{\infty,1}&=|\Delta v_{\mathrm{frame}}|\\r_{\mathrm{p1}}&=R_1+h_1\\&=${tn(origin.radius + inputs.departureAltitude)}\,\mathrm{km}\\\Delta v_{\mathrm{depart}}&=\sqrt{v_{\infty,1}^{2}+\frac{2\mu_1}{r_{\mathrm{p1}}}}\\&\quad-\sqrt{\frac{\mu_1}{r_{\mathrm{p1}}}}\end{aligned}`
                  }
                />
                <strong>{f(route.departureDeltaV)} km/s</strong>
                <small>
                  {!lunar && route.departureSignedChange < 0
                    ? tr(
                        "内側へ向かうには太陽中心の速さを下げます。局所の脱出噴射量は正の大きさです。",
                        "An inward transfer reduces heliocentric speed. The local escape burn is reported as a positive magnitude.",
                      )
                    : tr(
                        "地表から待機軌道への打上げは含みません。",
                        "Launch from the surface into the parking orbit is excluded.",
                      )}
                </small>
              </article>
              <article>
                <span className="solar-step-number">03</span>
                <h4>
                  {tr(
                    "動く目的地と、待ち合わせる",
                    "Meet a moving destination",
                  )}
                </h4>
                <p>
                  {tr(
                    "位相は出発の方向から見た目的地の先行角です。",
                    "Phase is the destination’s lead relative to the departure direction.",
                  )}
                </p>
                <MathFormula
                  tex={String.raw`\begin{aligned}n_i&=\sqrt{\frac{\mu}{r_i^3}}\\\phi_{\mathrm{ref}}&=(\pi-n_2t_{\mathrm T})\bmod 2\pi\\&=${tn(deg(route.phaseAngle))}^{\circ}\\\phi_{\mathrm{depart}}&=\phi_{\mathrm{ref}}+\Delta\phi_0\\&\quad+(n_2-n_1)t_{\mathrm{wait}}\\&\equiv ${tn(deg(route.departurePhase))}^{\circ}\\d_{\mathrm{arrival}}&=\left\|\mathbf r_{\mathrm{probe}}-\mathbf r_2\right\|\\&=${tn(route.arrivalMiss, 0)}\,\mathrm{km}\end{aligned}`}
                />
                <strong>{f(route.arrivalMiss, 0)} km</strong>
                <small>
                  {tr(
                    "距離は規定到着時刻で評価します。中心の一致は教材上の理想化で、実際の接近航路ではありません。",
                    "Distance is evaluated at the prescribed arrival time. Coincident centers are an idealization, not an operational approach.",
                  )}
                </small>
              </article>
              <article>
                <span className="solar-step-number">04</span>
                <h4>
                  {tr(
                    "到着後の円軌道投入を見積もる",
                    "Estimate circular capture",
                  )}
                </h4>
                <p>
                  {tr(
                    "到着速度を目的地の重力場へつなぐ独立した近似です。",
                    "An independent approximation connects the arrival speed to the destination’s gravity field.",
                  )}
                </p>
                <MathFormula
                  tex={String.raw`\begin{aligned}v_{\mathrm{T2}}&=\sqrt{\mu\!\left(\frac{2}{r_2}-\frac{1}{a_{\mathrm T}}\right)}\\&=${tn(route.transferArrivalSpeed)}\,\mathrm{km/s}\\v_{\mathrm{c2}}&=\sqrt{\frac{\mu}{r_2}}=${tn(route.targetCircularSpeed)}\,\mathrm{km/s}\end{aligned}`}
                />
                <MathFormula
                  tex={String.raw`\begin{aligned}v_{\infty,2}&=|v_{\mathrm{T2}}-v_{\mathrm{c2}}|\\&=${tn(route.arrivalExcess)}\,\mathrm{km/s}\\r_{\mathrm{p2}}&=R_2+h_2\\&=${tn(destination.radius + inputs.arrivalAltitude)}\,\mathrm{km}\\v_{\mathrm p}&=\sqrt{v_{\infty,2}^2+\frac{2\mu_2}{r_{\mathrm{p2}}}}\\&=${tn(route.capture.beforeBurn)}\,\mathrm{km/s}\\\Delta v_{\mathrm{circ}}&=v_{\mathrm p}-\sqrt{\frac{\mu_2}{r_{\mathrm{p2}}}}\\&=${tn(route.arrivalDeltaV)}\,\mathrm{km/s}\end{aligned}`}
                />
                <strong>{f(route.arrivalDeltaV)} km/s</strong>
                <small>
                  {lunar
                    ? tr(
                        "月の重力と地球の重力の連続した三体運動は解いていません。月到着の目安です。",
                        "This is a lunar arrival estimate; it does not solve continuous Earth–Moon three-body motion.",
                      )
                    : tr(
                        "惑星の作用圏をまたぐ連続した航法解ではありません。",
                        "This is not a continuous trajectory solution across the planet’s sphere of influence.",
                      )}
                </small>
              </article>
            </div>
          </section>

          <section
            className="solar-capture"
            aria-labelledby="solar-capture-title"
          >
            <div className="solar-section-heading">
              <div>
                <span className="section-kicker">
                  {tr(
                    "減速を変えると、どうなる？",
                    "WHAT DOES BRAKING CHANGE?",
                  )}
                </span>
                <h3 id="solar-capture-title">
                  {destination.name[lang]}
                  {tr("での捕獲実験", " capture experiment")}
                </h3>
              </div>
              <span className="solar-capture-fraction">
                {f(inputs.captureFraction * 100, 0)}%
              </span>
            </div>
            <p className="solar-budget-note">
              {route.encounter
                ? tr(
                    "参考の到着速度を使う局所実験です。遷移軌道から連続した接近・捕獲を保証しません。",
                    "This local experiment uses the reference arrival speed. It does not establish continuous approach and capture from the transfer trajectory.",
                  )
                : tr(
                    "目的地と遭遇していないため、以下は到着したと仮定した局所実験です。航路全体の成功を示しません。",
                    "The destination is missed, so the following is a hypothetical local experiment assuming arrival. It does not indicate mission success.",
                  )}
            </p>
            <div className="solar-capture-content">
              <div>
                <MathFormula
                  tex={String.raw`\begin{aligned}\Delta v_{\mathrm{applied}}&=${tn(inputs.captureFraction, 2)}\times ${tn(route.arrivalDeltaV)}\\&=${tn(route.captureBurn)}\,\mathrm{km/s}\\v_{\mathrm{after}}&=v_{\mathrm p}-\Delta v_{\mathrm{applied}}\\&=${tn(route.capture.postBurnSpeed)}\,\mathrm{km/s}\\\varepsilon&=\frac{v_{\mathrm{after}}^2}{2}-\frac{\mu_2}{r_{\mathrm{p2}}}\\&=${tn(route.capture.elements.energy)}\,\mathrm{km^2/s^2}\end{aligned}`}
                />
              </div>
              <div className="solar-capture-result">
                <strong data-testid="route-capture-status">
                  {!route.encounter && tr("仮定上の結果：", "Hypothetical: ")}
                  {captureLabels[route.capture.status]}
                </strong>
                <dl>
                  <div>
                    <dt>{tr("近点高度", "Periapsis altitude")}</dt>
                    <dd>
                      {f(
                        route.capture.elements.periapsisRadius -
                          destination.radius,
                        1,
                      )}{" "}
                      km
                    </dd>
                  </div>
                  <div>
                    <dt>{tr("遠点高度", "Apoapsis altitude")}</dt>
                    <dd>
                      {route.capture.elements.apoapsisRadius === null
                        ? tr("なし（非束縛）", "None (unbound)")
                        : `${f(route.capture.elements.apoapsisRadius - destination.radius, 1)} km`}
                    </dd>
                  </div>
                  <div>
                    <dt>{tr("モデルの最低高度", "Model minimum altitude")}</dt>
                    <dd>{f(destination.minimumAltitude, 0)} km</dd>
                  </div>
                </dl>
                <p>
                  {tr(
                    "減速が少ないと飛び去り、多すぎると反対側の高度が下がります。噴射後の接線速度が負になると進行方向が反転し、さらに噴射すると非束縛にもなります。最低高度は教材上の制約値です。",
                    "Too little braking leaves a flyby; too much lowers the opposite side. A negative post-burn tangential speed reverses direction; further braking can become unbound again. The minimum altitude is a teaching constraint.",
                  )}
                </p>
              </div>
            </div>
          </section>
        </>
      )}

      <section
        className="solar-comparison"
        aria-labelledby="solar-comparison-title"
      >
        <div className="solar-section-heading">
          <div>
            <span className="section-kicker">
              {tr("距離だけでは決まらない", "MORE THAN DISTANCE")}
            </span>
            <h3 id="solar-comparison-title">
              {tr("地球からの航路を比べる", "Compare routes from Earth")}
            </h3>
          </div>
          <p>
            {tr(
              "各天体の参考高度・待ち合わせ条件で比較。行を選ぶと設定します。",
              "Compared at each body’s reference altitudes and meeting conditions. Select a route to explore it.",
            )}
          </p>
        </div>
        <div
          className="solar-table-scroll"
          tabIndex={0}
          role="region"
          aria-label={tr(
            "地球発の航路比較表",
            "Earth departure comparison table",
          )}
        >
          <table>
            <thead>
              <tr>
                <th scope="col">{tr("目的地", "Destination")}</th>
                <th scope="col">{tr("飛行時間", "Flight time")}</th>
                <th scope="col">{tr("出発 Δv", "Departure Δv")}</th>
                <th scope="col">{tr("円軌道投入 Δv", "Capture Δv")}</th>
                <th scope="col">{tr("到着高度", "Arrival altitude")}</th>
              </tr>
            </thead>
            <tbody>
              {earthRoutes.map((item) => (
                <tr
                  key={item.destination.id}
                  className={
                    inputs.origin === "earth" &&
                    inputs.destination === item.destination.id
                      ? "solar-selected-row"
                      : ""
                  }
                >
                  <th scope="row">
                    <button
                      type="button"
                      onClick={() => selectRoute("earth", item.destination.id)}
                    >
                      {item.destination.name[lang]}
                      <Icon name="arrow" size={13} />
                    </button>
                  </th>
                  <td>{duration(item.flightTime)}</td>
                  <td>{f(item.departureDeltaV)} km/s</td>
                  <td>{f(item.arrivalDeltaV)} km/s</td>
                  <td>{f(item.inputs.arrivalAltitude, 0)} km</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="solar-budget-note">
          {tr(
            "月は地球中心、惑星は太陽中心の遷移です。噴射量は参考の2噴射のみを比べています。月と惑星では重力場の接続近似が異なります。",
            "The lunar transfer is Earth-centered; planetary transfers are Sun-centered. Only the two reference burns are compared, with different gravity-field approximations for lunar and planetary arrivals.",
          )}
        </p>
      </section>

      <details className="solar-assumptions">
        <summary>
          {tr(
            "このモデルの仮定と読み方",
            "Model assumptions and interpretation",
          )}
        </summary>
        <p>
          {tr(
            "惑星の公転を同じ平面の円軌道として、半楕円のホーマン遷移を計算します。月は地球中心の待機円軌道から月の平均公転距離へ向かう楕円です。表示する時刻は相対時間で、実際の打上げ日ではありません。大気、軌道の傾き、複数天体の重力、途中の修正噴射、スウィングバイはこの航路計算に含みません。",
            "Planets follow circular orbits in one plane, joined by a half-ellipse Hohmann transfer. The lunar case starts from an Earth-centered parking circle and reaches the Moon’s mean orbital distance. Time is relative, not a real launch date. Atmospheres, inclination, multi-body gravity, corrections, and gravity assists are not included in these routes.",
          )}
        </p>
        <p>
          {tr(
            "木星・土星・天王星・海王星の高度は、採用した基準半径からの高さです。着陸できる固体表面を意味しません。環や放射線も扱わず、最低高度は安全を保証するものではありません。天体の大きさは見やすく拡大し、軌道距離は線形の共通縮尺で描きます。",
            "For Jupiter, Saturn, Uranus, and Neptune, altitude is measured above the adopted reference radius, not a landable solid surface. Rings and radiation are omitted; minimum altitudes do not guarantee safety. Body markers are enlarged for visibility; orbital distances use a common linear scale.",
          )}
        </p>
        <p>
          <a
            href="https://ssd.jpl.nasa.gov/astro_par.html"
            target="_blank"
            rel="noreferrer"
          >
            JPL · {tr("天体定数", "Astrodynamic parameters")}
          </a>{" "}
          ·{" "}
          <a
            href="https://github.com/Takayuki-Minagawa/space-probe/blob/main/docs/MODEL_SPEC.md"
            target="_blank"
            rel="noreferrer"
          >
            {tr("計算モデル・出典", "Model and sources")}
          </a>
        </p>
      </details>
    </section>
  );
}

function Metric({
  label,
  value,
  change,
  testId,
}: {
  label: string;
  value: string;
  change: string;
  testId?: string;
}) {
  return (
    <div className="solar-metric">
      <span>{label}</span>
      <strong data-testid={testId}>{value}</strong>
      <small>{change}</small>
    </div>
  );
}

function RouteDiagram({
  route,
  time,
  samples,
  lang,
}: {
  route: RouteResult;
  time: number;
  samples: { time: number; state: { r: Vec } }[];
  lang: Lang;
}) {
  const tr = (ja: string, en: string) => (lang === "ja" ? ja : en);
  const current = routeAt(route, time);
  const extent = Math.max(route.departureRadius, route.targetRadius) * 1.18;
  const scale = 208 / extent;
  const center: Vec = [365, 250];
  const project = (point: Vec): Vec => [
    center[0] + point[0] * scale,
    center[1] - point[1] * scale,
  ];
  const pointPath = (points: Vec[]) =>
    points
      .map((point, i) => {
        const projected = project(point);
        return `${i === 0 ? "M" : "L"}${projected[0].toFixed(2)},${projected[1].toFixed(2)}`;
      })
      .join(" ");
  const origin = project(current.origin.r);
  const target = project(current.target.r);
  const probe = project(current.probe.r);
  const depart = project(samples[0].state.r);
  const trail = [
    ...samples
      .filter((sample) => sample.time <= time)
      .map((sample) => sample.state.r),
    current.probe.r,
  ];
  const lunar = route.frame === "earth";
  const targetName = route.destination.name[lang];
  const closeToCenter = (position: Vec) =>
    Math.hypot(position[0] - center[0], position[1] - center[1]) < 45;
  const originLabel: Vec = closeToCenter(origin)
    ? [center[0] + 58, center[1] + 40]
    : [origin[0] + 12, origin[1] + 24];
  const targetLabel: Vec = closeToCenter(target)
    ? [center[0] + 58, center[1] - 35]
    : [target[0] + 13, target[1] - 15];
  return (
    <figure className="solar-diagram">
      <svg
        data-testid="route-diagram"
        viewBox="0 0 730 480"
        role="img"
        aria-label={tr(
          `${route.origin.name.ja}から${route.destination.name.ja}への物理計算に基づく航路図`,
          `Calculated transfer from ${route.origin.name.en} to ${route.destination.name.en}`,
        )}
      >
        <title>
          {tr(
            "同じ時刻の天体と探査機",
            "Bodies and spacecraft at the same time",
          )}
        </title>
        <path d="M65 250H665M365 35V465" className="solar-grid" />
        <circle
          cx={center[0]}
          cy={center[1]}
          r={route.departureRadius * scale}
          className="solar-origin-orbit"
        />
        <circle
          cx={center[0]}
          cy={center[1]}
          r={route.targetRadius * scale}
          className="solar-target-orbit"
        />
        <path
          d={pointPath(samples.map((sample) => sample.state.r))}
          className="solar-route-path"
        />
        <path d={pointPath(trail)} className="solar-route-trail" />
        <circle
          cx={center[0]}
          cy={center[1]}
          r={lunar ? 9 : 8}
          className={lunar ? "solar-center-earth" : "solar-center-sun"}
        />
        <text
          x={center[0] - 15}
          y={center[1] - 17}
          textAnchor="end"
          className="solar-svg-label"
        >
          {lunar ? tr("地球", "Earth") : tr("太陽", "Sun")}
        </text>
        {!lunar && (
          <>
            <circle
              cx={origin[0]}
              cy={origin[1]}
              r="6"
              className="solar-origin-marker"
            />
            <path
              d={`M${origin[0]},${origin[1]}L${originLabel[0] - 6},${originLabel[1] - 5}`}
              className="solar-label-line"
            />
            <text
              x={originLabel[0]}
              y={originLabel[1]}
              className="solar-svg-label"
            >
              {route.origin.name[lang]}
            </text>
          </>
        )}
        <circle
          cx={depart[0]}
          cy={depart[1]}
          r="4"
          className="solar-depart-marker"
        >
          <title>{tr("出発位置", "Departure point")}</title>
        </circle>
        <path
          d={`M${target[0]},${target[1]}L${targetLabel[0] - 5},${targetLabel[1] + 4}`}
          className="solar-label-line"
        />
        <circle
          cx={target[0]}
          cy={target[1]}
          r="8"
          className="solar-target-marker"
        />
        <text x={targetLabel[0]} y={targetLabel[1]} className="solar-svg-label">
          {targetName}
        </text>
        {time > 0 && (
          <line
            x1={probe[0]}
            y1={probe[1]}
            x2={target[0]}
            y2={target[1]}
            className="solar-distance-line"
          />
        )}
        <circle
          cx={probe[0]}
          cy={probe[1]}
          r="11"
          className="solar-probe-halo"
        />
        <path
          d={`M${probe[0]},${probe[1] - 7}l5 11-5-2-5 2Z`}
          transform={`rotate(${90 - deg(Math.atan2(current.probe.v[1], current.probe.v[0]))} ${probe[0]} ${probe[1]})`}
          className="solar-probe"
        />
        <text x="25" y="31" className="solar-svg-note">
          {tr("反時計回りに公転", "Counterclockwise motion")}
        </text>
        <text x="25" y="453" className="solar-svg-note">
          {lunar
            ? tr("地球中心距離 · km", "Earth-centered distance · km")
            : tr("太陽中心距離 · AU", "Sun-centered distance · AU")}
        </text>
        <text x="705" y="453" textAnchor="end" className="solar-svg-note">
          {tr("天体マーカーは拡大表示", "Body markers enlarged")}
        </text>
      </svg>
      <figcaption className="solar-legend">
        <span>
          <i className="solar-legend-line" />
          {tr("探査機の遷移軌道", "Probe transfer")}
        </span>
        <span>
          <i className="solar-legend-origin" />
          {lunar
            ? tr("地球待機軌道", "Earth parking orbit")
            : route.origin.name[lang]}
        </span>
        <span>
          <i className="solar-legend-target" />
          {targetName}
        </span>
        <span>
          <i className="solar-legend-distance" />
          {tr("同時刻の位置差", "Same-time separation")}
        </span>
      </figcaption>
    </figure>
  );
}
