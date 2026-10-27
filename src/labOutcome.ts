import { numberFormatter, translator } from "./i18n";
import { LABS } from "./learning";
import type { LabId, Lang } from "./learning";
import { K, deg, flyby, missionAt, norm, rad } from "./physics";
import { H } from "./simulation";
import type { Parameters, Simulation } from "./simulation";

/** Simulated time at which each lab's timeline starts. The flyby begins two hours before periapsis. */
export const labStartTime = (lab: LabId) => (lab === "flyby" ? -7200 : 0);

/** The lab after `lab` in the chapter order, wrapping around to the first. */
export const nextLab = (lab: LabId) =>
  LABS[(LABS.findIndex((l) => l.id === lab) + 1) % LABS.length];

export interface Outcome {
  good: boolean;
  title: string;
  reason: string;
}

export interface OutcomeContext {
  lab: LabId;
  p: Parameters;
  /** `null` while inputs are invalid or the model rejected them. */
  sim: Simulation | null;
  /** Pass sides visited in the flyby lab; both must be tried to complete it. */
  visitedSides: number[];
  lang: Lang;
}

/** Judge the current experiment against the lab's teaching target. */
export function describeOutcome({
  lab,
  p,
  sim,
  visitedSides,
  lang,
}: OutcomeContext): Outcome {
  const tr = translator(lang);
  if (!sim)
    return {
      good: false,
      title: tr("入力を確認してください", "Check your inputs"),
      reason: tr(
        "値を入力範囲内に戻すと、計算結果を再表示します。",
        "Enter a value within the allowed range to recalculate.",
      ),
    };
  if (sim.blocked)
    return {
      good: false,
      title: tr("モデルの範囲外・停止", "Outside model · stopped"),
      reason: tr(
        "近点を安全高度以上にしてください。地球150 km、火星100 kmは教材上の制約値です。",
        "Raise periapsis above the teaching safety limit: Earth 150 km, Mars 100 km.",
      ),
    };
  switch (lab) {
    case "transfer":
      return {
        good: sim.arrival.encounter,
        title: sim.arrival.encounter
          ? tr("到着予測：遭遇条件内", "Predicted arrival: encounter")
          : tr("到着予測：火星とすれ違い", "Predicted arrival: missed Mars"),
        reason: sim.arrival.encounter
          ? tr(
              "約259日後、探査機と火星が同じ場所に到着します。教材上の許容距離は10,000 kmです。",
              "The probe and Mars arrive together after about 259 days. The teaching tolerance is 10,000 km.",
            )
          : tr(
              "軌道は交差しても、同じ時刻の火星は別の場所にいます。位相角か待ち時間を一つずつ変えてみましょう。",
              "The orbits intersect, but Mars is elsewhere at that time. Adjust the phase angle or departure wait, one at a time.",
            ),
      };
    case "capture": {
      const status = sim.captureResult.status;
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
    case "basics":
      return {
        good:
          p.burn > 0 &&
          sim.safe &&
          ["elliptic", "circular"].includes(sim.orbit.type),
        title:
          sim.impact !== null
            ? tr("地表と交差：衝突で停止", "Surface crossing: stopped at impact")
            : ["parabolic", "hyperbolic"].includes(sim.orbit.type)
              ? tr("脱出軌道", "Escape trajectory")
              : p.burn > 0
                ? tr("反対側の高度が上昇", "The opposite side rises")
                : tr("円軌道と比較しよう", "Compare with the circular orbit"),
        reason: tr(
          "順行噴射は反対側を高くし、逆行噴射は低くします。脱出速度以上では戻らない軌道になります。",
          "A prograde burn raises the opposite side; a retrograde burn lowers it. At escape speed the orbit becomes unbound.",
        ),
      };
    case "escape":
      return {
        good:
          p.altitude >= 1000 && Math.abs(p.vinf - H.vInfinityDepart) < 0.001,
        title: tr("地球中心の脱出条件を計算", "Earth-centered escape calculated"),
        reason: tr(
          "高度を200 kmから1,000 kmへ変え、参考値3.611 km/sと比較しましょう。v∞・脱出速度・噴射Δvは異なる量です。",
          "Change altitude from 200 to 1,000 km and compare with the 3.611 km/s reference. v∞, escape speed and burn Δv are different quantities.",
        ),
      };
    case "flyby": {
      const opposite = flyby(
        p.vinf,
        p.altitude,
        rad(p.angle),
        p.side === 1 ? -1 : 1,
      );
      return {
        good:
          visitedSides.length === 2 &&
          sim.flybyResult.speedChange * opposite.speedChange < -1e-8,
        title:
          sim.flybyResult.speedChange >= 0
            ? tr("太陽中心では加速", "Heliocentric speed increases")
            : tr("太陽中心では減速", "Heliocentric speed decreases"),
        reason: tr(
          "通過側を切り替えて比較しましょう。惑星中心の入出v∞は等しく、太陽中心では惑星速度とのベクトル合成で速さが変わります。",
          "Switch sides to compare. Incoming and outgoing planet-relative v∞ have equal magnitudes; adding the planet velocity changes heliocentric speed.",
        ),
      };
    }
  }
}

export interface Metric {
  label: string;
  value: string;
  unit: string;
}

export interface MetricContext {
  lab: LabId;
  p: Parameters;
  sim: Simulation;
  reference: Simulation;
  lang: Lang;
}

/** The four headline numbers shown under the diagram for a displayable simulation. */
export function labMetrics({
  lab,
  p,
  sim,
  reference,
  lang,
}: MetricContext): Metric[] {
  const tr = translator(lang);
  const fmt = numberFormatter(lang, { fixed: true });
  const metric = (label: string, value: string, unit: string): Metric => ({
    label,
    value,
    unit,
  });
  switch (lab) {
    case "transfer":
      return [
        metric(
          tr("遷移の飛行時間", "Transfer time"),
          fmt(H.flightTime / K.DAY, 2),
          tr("日", "days"),
        ),
        metric(
          tr("出発時の火星先行角", "Mars phase at departure"),
          fmt(
            deg(missionAt(0, rad(p.phase), p.wait * K.DAY).phaseAtDeparture),
            3,
          ),
          "°",
        ),
        metric(
          tr("到着時の位置誤差", "Arrival miss distance"),
          fmt(sim.arrival.missDistance, 0),
          "km",
        ),
        metric(
          tr("参考噴射Δv合計", "Reference total burn Δv"),
          fmt(
            reference.escapeResult.deltaV +
              reference.captureResult.circularDeltaV,
            3,
          ),
          "km/s",
        ),
      ];
    case "escape":
      return [
        metric(
          tr("地球中心・円軌道速度", "Earth: circular speed"),
          fmt(sim.escapeResult.circularSpeed, 3),
          "km/s",
        ),
        metric(
          tr("地球中心・脱出速度", "Earth: escape speed"),
          fmt(sim.escapeResult.escapeSpeed, 3),
          "km/s",
        ),
        metric(
          tr("必要な噴射Δv", "Required burn Δv"),
          fmt(sim.escapeResult.deltaV, 3),
          "km/s",
        ),
        metric("C3", fmt(p.vinf * p.vinf, 3), "km²/s²"),
      ];
    case "capture":
      return [
        metric(
          tr("火星中心・到着v∞", "Mars: arrival v∞"),
          fmt(H.vInfinityArrive, 3),
          "km/s",
        ),
        metric(
          tr("噴射前の近火点速度", "Speed before burn"),
          fmt(sim.captureResult.beforeBurn, 3),
          "km/s",
        ),
        metric(
          tr("円軌道化の必要Δv", "Circularization Δv"),
          fmt(sim.captureResult.circularDeltaV, 3),
          "km/s",
        ),
        metric(
          tr("噴射後の近点高度", "Post-burn periapsis"),
          fmt(sim.orbit.periapsisRadius - K.rMars, 0),
          "km",
        ),
      ];
    case "flyby":
      return [
        metric(
          tr("旋回角", "Turn angle"),
          fmt(deg(sim.flybyResult.turnAngle), 2),
          "°",
        ),
        metric(
          tr("惑星中心・入出v∞", "Planet: in / out v∞"),
          fmt(p.vinf, 2),
          "km/s",
        ),
        metric(
          tr("太陽中心・接近前速度", "Sun: incoming speed"),
          fmt(norm(sim.flybyResult.sunIncoming), 3),
          "km/s",
        ),
        metric(
          tr("太陽中心・速さの変化", "Sun: speed change"),
          `${sim.flybyResult.speedChange >= 0 ? "+" : ""}${fmt(sim.flybyResult.speedChange, 3)}`,
          "km/s",
        ),
      ];
    case "basics":
      return [
        metric(
          tr("噴射後の初速", "Initial speed after burn"),
          fmt(norm(sim.initial.v), 3),
          "km/s",
        ),
        metric(
          tr("近点高度", "Periapsis altitude"),
          fmt(sim.orbit.periapsisRadius - K.rEarth, 0),
          "km",
        ),
        metric(
          tr("遠点高度", "Apoapsis altitude"),
          sim.orbit.apoapsisRadius
            ? fmt(sim.orbit.apoapsisRadius - K.rEarth, 0)
            : "—",
          "km",
        ),
        metric(
          tr("離心率", "Eccentricity"),
          fmt(sim.orbit.eccentricity, 3),
          "e",
        ),
      ];
  }
}
