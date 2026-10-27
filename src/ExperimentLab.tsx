import CalculationWalkthrough from "./CalculationWalkthrough";
import { Icon, ParameterInput } from "./components";
import { numberFormatter, translator } from "./i18n";
import type { Lang } from "./learning";
import MathFormula from "./MathFormula";
import OrbitDiagram, { SpeedChart } from "./OrbitDiagram";
import type { Layers } from "./OrbitDiagram";
import { K, deg, norm } from "./physics";
import { H, defaults } from "./simulation";
import type { Parameters } from "./simulation";
import type { ExperimentLabState } from "./useExperimentLab";

interface ExperimentLabProps {
  lang: Lang;
  reduceMotion: boolean;
  state: ExperimentLabState;
}

const LAYER_KEYS: readonly (keyof Layers)[] = [
  "vectors",
  "trail",
  "predicted",
  "markers",
  "reference",
];

/** One guided experiment: diagram, controls, metrics, walkthrough, and challenge. */
export default function ExperimentLab({
  lang,
  reduceMotion,
  state,
}: ExperimentLabProps) {
  const {
    lab,
    lesson,
    p,
    sim,
    reference,
    valid,
    displayable,
    current,
    now,
    timeScale,
    isMission,
    playing,
    rate,
    frame,
    layers,
    invalid,
    revision,
    prediction,
    hint,
    evaluated,
    outcome,
    metrics,
    next,
  } = state;
  const tr = translator(lang);
  const fmt = numberFormatter(lang, { fixed: true });
  const unit = isMission ? tr("日", "days") : "h";
  const layerLabels: Record<keyof Layers, string> = {
    vectors: tr("速度ベクトル", "Velocity"),
    trail: tr("過去の軌跡", "Trail"),
    predicted: tr("予測軌道", "Prediction"),
    markers: tr("イベント点", "Event markers"),
    reference: tr("参考を重ねる", "Compare reference"),
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
      onChange={(v) => state.change(key, v)}
      onValidityChange={(ok) => state.setFieldValidity(key, ok)}
    />
  );
  const frameLabel = isMission
    ? tr("太陽中心の全体図", "Heliocentric overview")
    : lab === "capture"
      ? tr("火星中心の捕獲実験", "Mars-centered capture lab")
      : lab === "flyby" && frame === "sun"
        ? tr("太陽中心の速度合成", "Heliocentric vector sum")
        : tr("地球中心の局所実験", "Earth-centered local lab");

  return (
    <>
      <section className="workspace-heading">
        <div>
          <span className="eyebrow">EXPERIMENT {lesson.number}</span>
          <h2>{lesson.subtitle[lang]}</h2>
        </div>
        <span className="model-badge">
          {tr("円軌道・二体近似", "Circular / two-body model")}
        </span>
      </section>
      {isMission && (
        <section
          className="first-experiment"
          aria-label={tr("はじめての実験", "First experiment")}
        >
          <div>
            <strong>
              {tr(
                "まずは、到着する瞬間を比べよう。",
                "Start by comparing the moment of arrival.",
              )}
            </strong>
            <p>
              {tr(
                "参考設定 → 先行角を10°変更 → 火星とのずれを確認。約259日の飛行時間は同じです。",
                "Reference → shift the lead angle by 10° → inspect the miss. The flight still takes about 259 days.",
              )}
            </p>
          </div>
          <div className="first-experiment-actions">
            <button onClick={() => state.applyExample(defaults("transfer"))}>
              {tr("参考設定の到着を見る", "See reference arrival")}
            </button>
            <button
              onClick={() =>
                state.applyExample({
                  ...defaults("transfer"),
                  phase: deg(H.phaseAngle) + 10,
                })
              }
            >
              {tr("先行角を10°変えて比べる", "Compare a 10° phase shift")}
            </button>
            <a href="#calculation-walkthrough">
              {tr("計算の流れを見る", "Follow the calculation")} ↓
            </a>
          </div>
        </section>
      )}
      <div className="workspace">
        <section
          className="simulation-panel"
          aria-label={tr("シミュレーション", "Simulation")}
        >
          <div className="plot-toolbar">
            <div className="frame-label">
              <span className="status-dot" />
              {frameLabel}
            </div>
            {lab === "flyby" ? (
              <div className="segmented">
                <button
                  aria-pressed={frame === "planet"}
                  onClick={() => state.setFrame("planet")}
                >
                  {tr("惑星中心", "Planet")}
                </button>
                <button
                  aria-pressed={frame === "sun"}
                  onClick={() => state.setFrame("sun")}
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
          {sim ? (
            <OrbitDiagram
              sim={sim}
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
            {LAYER_KEYS.map((key) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={layers[key]}
                  onChange={(e) => state.toggleLayer(key, e.target.checked)}
                />
                {layerLabels[key]}
              </label>
            ))}
          </div>
          <div className="timeline">
            <div className="playback-row">
              <div className="transport">
                <button
                  className="play-button"
                  disabled={!displayable}
                  aria-label={
                    reduceMotion
                      ? tr("1ステップ", "One step")
                      : playing
                        ? tr("一時停止", "Pause")
                        : tr("再生", "Play")
                  }
                  onClick={() =>
                    reduceMotion ? state.step() : state.togglePlay()
                  }
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
                  onClick={() => state.seek(sim?.start ?? 0)}
                >
                  <Icon name="reset" size={18} />
                </button>
                {!reduceMotion && (
                  <button
                    className="icon-button"
                    aria-label={tr("1ステップ", "One step")}
                    disabled={!valid}
                    onClick={() => {
                      state.pause();
                      state.step();
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
                  onChange={(e) => state.setRate(Number(e.target.value))}
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
              disabled={!displayable}
              onChange={(e) => state.seek(Number(e.target.value))}
            />
            <div className="event-row">
              <button onClick={() => state.seek(sim?.start ?? 0)}>
                {isMission
                  ? tr("出発", "Departure")
                  : lab === "flyby"
                    ? tr("接近", "Approach")
                    : tr("噴射直後", "After burn")}
              </button>
              <button
                disabled={!valid}
                onClick={() =>
                  state.seek(
                    lab === "flyby"
                      ? 0
                      : ((sim?.start ?? 0) + (sim?.end ?? 0)) / 2,
                  )
                }
              >
                {lab === "flyby"
                  ? tr("近点", "Periapsis")
                  : isMission
                    ? tr("飛行の中間", "Mid-transfer")
                    : tr("中間時刻", "Midpoint")}
              </button>
              <button
                disabled={!valid}
                onClick={() => state.seek(sim?.end ?? 0)}
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
                {field("phase", tr("位相角", "Phase angle"), 0, 360, 0.001, "°")}
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
                {field("burn", tr("減速Δv", "Braking Δv"), 0, 5, 0.001, "km/s")}
                <button
                  className="text-button"
                  disabled={invalid.altitude || !state.model}
                  onClick={state.setCircularizationBurn}
                >
                  {tr("円軌道化に必要なΔvを設定", "Set circularization Δv")}{" "}
                  <Icon name="arrow" size={14} />
                </button>
              </>
            )}
            {lab === "flyby" && (
              <>
                {field("vinf", tr("接近速度", "Incoming v∞"), 1, 15, 0.1, "km/s")}
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
                    {tr("通過側（速度を回す向き）", "Pass side (velocity rotation)")}
                  </span>
                  <div className="segmented">
                    <button
                      aria-pressed={p.side === 1}
                      onClick={() => state.change("side", 1)}
                    >
                      {tr("反時計回り", "Counterclockwise")}
                    </button>
                    <button
                      aria-pressed={p.side === -1}
                      onClick={() => state.change("side", -1)}
                    >
                      {tr("時計回り", "Clockwise")}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          <button className="reference-button" onClick={state.reset}>
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
          metrics.map((m) => (
            <div className="metric" key={m.label}>
              <span>{m.label}</span>
              <strong>
                {m.value}
                <small>{m.unit}</small>
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
      <div id="calculation-walkthrough">
        <CalculationWalkthrough
          lab={lab}
          parameters={p}
          simulation={sim}
          reference={reference}
          lang={lang}
          onPreset={state.applyExample}
        />
      </div>
      <div className="learning-grid">
        <section className="lesson-panel">
          <div className="lesson-heading">
            <span className="eyebrow">LEARNING CHALLENGE / {lesson.number}</span>
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
                onClick={() => state.choosePrediction(i)}
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
              onClick={state.evaluate}
              disabled={!valid || prediction === null}
            >
              {tr("結果を確かめる", "Check my result")}
              <Icon name="arrow" size={15} />
            </button>
            <button className="text-button" onClick={state.revealHint}>
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
                  ? tr("予想の考え方は合っています。", "Your prediction is correct.")
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
            <span className="eyebrow">{tr("計算結果", "MODEL VALUES")}</span>
            <span className="mini-tag">
              {isMission
                ? tr("太陽中心", "SUN-CENTERED")
                : lab === "capture"
                  ? tr("火星中心", "MARS-CENTERED")
                  : tr("地球中心", "EARTH-CENTERED")}
            </span>
          </div>
          <h3>{tr("数字から、動きを読む", "Read the motion in the numbers")}</h3>
          {sim && <SpeedChart sim={sim} time={now} lang={lang} />}
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
                <td>{displayable ? fmt(sim!.orbit.energy, 3) : "—"} km²/s²</td>
              </tr>
              <tr>
                <th>{tr("比角運動量", "Specific angular momentum")}</th>
                <td>
                  {displayable ? fmt(sim!.orbit.angularMomentum, 1) : "—"} km²/s
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
            <MathFormula tex={lesson.formula} className="details-formula" />
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
            {tr("次の実験で、旅の続きを。", "The next experiment is another discovery.")}
          </p>
        </div>
        <button onClick={() => state.changeLab(next.id)}>
          {next.title[lang]}
          <Icon name="arrow" size={18} />
        </button>
      </section>
    </>
  );
}
