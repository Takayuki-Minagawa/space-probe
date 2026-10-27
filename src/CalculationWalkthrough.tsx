import { useId } from "react";
import { localeOf, translator } from "./i18n";
import type { LabId, Lang } from "./learning";
import { K, capture, deg, norm, normalizeAngle } from "./physics";
import { H } from "./simulation";
import type { Parameters, Simulation } from "./simulation";
import MathFormula from "./MathFormula";
import "./CalculationWalkthrough.css";

export interface CalculationWalkthroughProps {
  lab: LabId;
  parameters: Parameters;
  simulation: Simulation | null;
  reference: Simulation;
  lang: Lang;
  onPreset: (patch: Partial<Parameters>) => void;
}

interface CalculationStep {
  title: string;
  input: string;
  inputTex?: string;
  equation: string;
  result: string;
  comparison: string;
}

export default function CalculationWalkthrough({
  lab,
  parameters: p,
  simulation,
  reference,
  lang,
  onPreset,
}: CalculationWalkthroughProps) {
  const headingId = useId();
  const tr = translator(lang);
  const f = (value: number, digits = 3) =>
    new Intl.NumberFormat(localeOf(lang), {
      maximumFractionDigits: digits,
    }).format(Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value);
  const texNumber = (value: number, digits = 3) =>
    f(value, digits).replaceAll(",", String.raw`{,}`);
  const difference = (
    value: number,
    baseline: number,
    unit: string,
    digits = 3,
  ) => {
    const delta = value - baseline;
    const rounded = Math.abs(delta) < 0.5 * 10 ** -digits ? 0 : delta;
    return `${rounded > 0 ? "+" : ""}${f(rounded, digits)} ${unit}`;
  };
  const compared = (
    value: number,
    baseline: number,
    unit: string,
    digits = 3,
  ) =>
    `${tr("参考との差", "Change from reference")} ${difference(value, baseline, unit, digits)}`;
  const day = tr("日", "days");
  const sim = simulation && !simulation.blocked ? simulation : null;
  const steps: CalculationStep[] = [];
  let note = "";
  let details = "";
  let presets: { label: string; patch: Partial<Parameters> }[] = [];

  if (lab === "transfer") {
    presets = [
      {
        label: tr("先行角を参考より10°進める", "Lead angle: reference +10°"),
        patch: { phase: deg(H.phaseAngle) + 10, wait: 0 },
      },
      {
        label: tr(
          "参考の角度で30日待つ",
          "Wait 30 days at the reference angle",
        ),
        patch: { phase: deg(H.phaseAngle), wait: 30 },
      },
    ];
    note = tr(
      "位相角や待ち時間を変えると、到着時の火星とのずれが変わります。この実験では遷移軌道の形・飛行時間・参考の噴射Δvは固定です。",
      "Phase and departure wait change the arrival miss. Transfer shape, flight time, and the reference burn Δv remain fixed in this experiment.",
    );
    details = tr(
      "位相角の入力は基準時刻での火星の先行角です。待つ間も地球と火星は異なる角速度で公転します。出発時の角度は一周以内に正規化し、参考との差は−180°〜180°で表します。10,000 kmは教材の遭遇許容値です。遭遇していない地点の速度差を、実際の火星到着v∞や必要な捕獲Δvとして扱うことはできません。",
      "The phase input is Mars’s lead at the reference epoch. Both planets move while waiting, at different angular rates. Departure phase is wrapped to one revolution; its reference difference is shown from −180° to 180°. The 10,000 km encounter tolerance is educational. A velocity difference at a miss is not a local Mars arrival v∞ or a required capture burn.",
    );
    if (sim) {
      const phase = deg(sim.arrival.phaseAtDeparture);
      const referencePhase = deg(reference.arrival.phaseAtDeparture);
      const phaseDelta =
        deg(
          normalizeAngle(
            sim.arrival.phaseAtDeparture -
              reference.arrival.phaseAtDeparture +
              Math.PI,
          ),
        ) - 180;
      const dx = sim.arrival.spacecraft.r[0] - sim.arrival.mars.r[0];
      const dy = sim.arrival.spacecraft.r[1] - sim.arrival.mars.r[1];
      steps.push(
        {
          title: tr("軌道から飛行時間を求める", "Find the flight time"),
          input: tr(
            "地球と火星の円軌道半径",
            "Earth and Mars circular orbit radii",
          ),
          inputTex: String.raw`\begin{aligned}
r_{\mathrm E}&=${texNumber(K.orbitEarth / K.AU)}\,\mathrm{AU}\\
r_{\mathrm M}&=${texNumber(K.orbitMars / K.AU, 6)}\,\mathrm{AU}\\
\mu_{\mathrm{Sun}}&=${texNumber(K.muSun / 1e11, 7)}\times10^{11}\,\mathrm{km^3/s^2}
\end{aligned}`,
          equation: String.raw`\begin{aligned}
a_{\mathrm T}&=\frac{r_{\mathrm E}+r_{\mathrm M}}{2}\\
&=\frac{${texNumber(K.orbitEarth / K.AU)}+${texNumber(K.orbitMars / K.AU, 6)}}{2}\,\mathrm{AU}\\
&=${texNumber(H.semiMajor, 1)}\,\mathrm{km}\\[3pt]
t_{\mathrm T}&=\pi\sqrt{\frac{a_{\mathrm T}^{3}}{\mu_{\mathrm{Sun}}}}\\
&=\frac{${texNumber(H.flightTime, 0)}}{86{,}400}\,\mathrm d
\end{aligned}`,
          result: `${f(H.flightTime / K.DAY, 2)} ${day}`,
          comparison: compared(
            H.flightTime / K.DAY,
            (reference.end - reference.start) / K.DAY,
            day,
            2,
          ),
        },
        {
          title: tr(
            "出発時の位置関係を求める",
            "Advance both planets to departure",
          ),
          input: tr(
            "基準時刻の先行角と出発待ち時間",
            "Initial lead and departure wait",
          ),
          inputTex: String.raw`\begin{aligned}
\phi_0&=${texNumber(p.phase)}^\circ\\
t_{\mathrm w}&=${texNumber(p.wait, 1)}\,\mathrm d
\end{aligned}`,
          equation: String.raw`\begin{aligned}
\Delta\phi&=(n_{\mathrm M}-n_{\mathrm E})t_{\mathrm w}\\
&=\frac{${texNumber(deg(H.nMars - H.nEarth) * K.DAY, 5)}^\circ}{\mathrm d}\\
&\qquad\times ${texNumber(p.wait, 1)}\,\mathrm d\\[3pt]
\phi_{\mathrm{depart}}&=(${texNumber(p.phase)}^\circ+\Delta\phi)\\
&\qquad\bmod\;360^\circ
\end{aligned}`,
          result: `${f(phase)}°`,
          comparison: `${tr("参考との差", "Change from reference")} ${difference(phaseDelta, 0, "°")} · ${tr("参考", "Reference")} ${f(referencePhase)}°`,
        },
        {
          title: tr("到着時の位置を比べる", "Compare positions at arrival"),
          input: tr(
            "同じ到着時刻での位置の差",
            "Position differences at the same arrival time",
          ),
          inputTex: String.raw`\begin{aligned}
\Delta x&=${texNumber(dx, 1)}\,\mathrm{km}\\
\Delta y&=${texNumber(dy, 1)}\,\mathrm{km}
\end{aligned}`,
          equation: String.raw`\begin{aligned}
d&=\left\lVert\mathbf r_{\mathrm{probe}}-\mathbf r_{\mathrm{Mars}}\right\rVert\\
&=\sqrt{(\Delta x)^2+(\Delta y)^2}
\end{aligned}`,
          result: `${f(sim.arrival.missDistance, 0)} km`,
          comparison: compared(
            sim.arrival.missDistance,
            reference.arrival.missDistance,
            "km",
            0,
          ),
        },
      );
    }
  } else if (lab === "escape") {
    presets = [
      {
        label: tr("200 kmから出発", "Depart from 200 km"),
        patch: { altitude: 200, vinf: H.vInfinityDepart },
      },
      {
        label: tr("1,000 kmから出発", "Depart from 1,000 km"),
        patch: { altitude: 1000, vinf: H.vInfinityDepart },
      },
    ];
    note = tr(
      "同じv∞で高度を変え、円軌道の速さと脱出噴射の差を比べましょう。地表から待機軌道へ上がるためのΔvは含みません。",
      "Keep v∞ fixed and compare circular speed with the departure burn at different altitudes. Launch into the parking orbit is not included.",
    );
    details = tr(
      "v∞は地球から十分遠い場所で残る相対速度です。待機軌道での脱出速度や噴射Δvとは異なります。高度を変えると必要Δvが常に単調に減るとは限りません。この地球中心の局所実験は、惑星間航路と連続した一本の解ではありません。",
      "v∞ is the residual Earth-relative speed far away. It differs from escape speed at the parking orbit and from burn Δv. Required Δv does not necessarily decrease monotonically with altitude. This Earth-centered lab is independent of the interplanetary trajectory.",
    );
    if (sim) {
      const current = sim.escapeResult;
      const base = reference.escapeResult;
      steps.push(
        {
          title: tr("高度を中心距離へ変える", "Convert altitude to radius"),
          input: tr("地表からの高度", "Altitude above the surface"),
          inputTex: String.raw`h=${texNumber(p.altitude, 0)}\,\mathrm{km}`,
          equation: String.raw`\begin{aligned}
r&=R_{\mathrm{Earth}}+h\\
&=(${texNumber(K.rEarth)}+${texNumber(p.altitude, 0)})\,\mathrm{km}
\end{aligned}`,
          result: `${f(current.radius)} km`,
          comparison: compared(current.radius, base.radius, "km"),
        },
        {
          title: tr(
            "噴射前後の速さを求める",
            "Find speeds before and after the burn",
          ),
          input: tr(
            "遠方で残る地球相対速度",
            "Residual Earth-relative speed far away",
          ),
          inputTex: String.raw`v_\infty=${texNumber(p.vinf)}\,\mathrm{km/s}`,
          equation: String.raw`\begin{aligned}
v_{\mathrm c}&=\sqrt{\frac{\mu_{\mathrm{Earth}}}{r}}\\
&=\sqrt{\frac{${texNumber(K.muEarth)}}{${texNumber(current.radius)}}}\,\mathrm{km/s}\\[3pt]
v_{\mathrm p}&=\sqrt{v_\infty^2+\frac{2\mu_{\mathrm{Earth}}}{r}}\\
&=\sqrt{${texNumber(p.vinf)}^2+${texNumber(current.escapeSpeed)}^2}\,\mathrm{km/s}
\end{aligned}`,
          result: `${f(current.circularSpeed)} → ${f(current.periapsisSpeed)} km/s`,
          comparison: `${tr("噴射後の速さの参考差", "Post-burn speed change from reference")} ${difference(current.periapsisSpeed, base.periapsisSpeed, "km/s")}`,
        },
        {
          title: tr("必要な噴射量を求める", "Subtract to find the burn"),
          input: tr(
            "噴射後の速さ − 円軌道の速さ",
            "Post-burn speed minus circular speed",
          ),
          equation: String.raw`\begin{aligned}
\Delta v&=v_{\mathrm p}-v_{\mathrm c}\\
&=(${texNumber(current.periapsisSpeed)}-${texNumber(current.circularSpeed)})\,\mathrm{km/s}
\end{aligned}`,
          result: `${f(current.deltaV)} km/s`,
          comparison: compared(current.deltaV, base.deltaV, "km/s"),
        },
      );
    }
  } else if (lab === "capture") {
    presets = [
      {
        label: tr("300 kmで減速しない", "No braking at 300 km"),
        patch: { altitude: 300, burn: 0 },
      },
      {
        label: tr(
          "300 kmの円軌道に合わせる",
          "Match the 300 km circular orbit",
        ),
        patch: { altitude: 300, burn: capture(300, 0).circularDeltaV },
      },
    ];
    note = tr(
      "減速が少ないと飛び去り、多すぎると反対側の高度が下がります。束縛されることと、安全な目標円軌道に入ることを分けて確かめます。",
      "Too little braking leaves a flyby; too much lowers the opposite side. Check bound capture separately from reaching the safe target orbit.",
    );
    details = tr(
      "到着v∞は参考ホーマン遷移の値で固定です。近火点で接線方向に瞬時噴射し、噴射後の状態から近点・遠点を計算します。目標達成には束縛軌道、全軌道で高度100 km以上、近点・遠点の中心距離が目標半径の1%以内が必要です。減速量が接近速度を超える場合、接線速度の符号が反転します。局所実験の成功で惑星間のずれは修正されません。",
      "Arrival v∞ is fixed to the reference Hohmann value. A tangential instantaneous burn defines the new apsides. The target must be bound, stay at least 100 km above the surface, and have both apsis radii within 1% of the target. Braking beyond the incoming speed reverses the tangential component. Local success does not correct a transfer miss.",
    );
    if (sim) {
      const current = sim.captureResult;
      const base = reference.captureResult;
      const radius = norm(sim.initial.r);
      const escapeSpeed = Math.sqrt((2 * K.muMars) / radius);
      const periapsis = current.elements.periapsisRadius - K.rMars;
      const apoapsis =
        current.elements.apoapsisRadius === null
          ? null
          : current.elements.apoapsisRadius - K.rMars;
      const statuses = {
        target: tr("目標円軌道を達成", "Target circular orbit reached"),
        captured: tr(
          "捕獲・目標とは異なる軌道",
          "Captured, but outside the target",
        ),
        flyby: tr("減速不足・フライバイ", "Unbound flyby"),
        unsafe: tr(
          "安全高度を下回る軌道",
          "Below the teaching safety altitude",
        ),
      };
      steps.push(
        {
          title: tr(
            "火星近くでの速さを求める",
            "Find the arrival speed near Mars",
          ),
          input: tr(
            "火星中心から近火点までの距離",
            "Mars-centered periapsis radius",
          ),
          inputTex: String.raw`\begin{aligned}
r_{\mathrm p}&=(${texNumber(K.rMars)}+${texNumber(p.altitude, 0)})\,\mathrm{km}\\
&=${texNumber(radius)}\,\mathrm{km}
\end{aligned}`,
          equation: String.raw`\begin{aligned}
v_{\mathrm p}&=\sqrt{v_\infty^2+\frac{2\mu_{\mathrm{Mars}}}{r_{\mathrm p}}}\\
&=\sqrt{${texNumber(H.vInfinityArrive)}^2+\frac{2\mu_{\mathrm{Mars}}}{${texNumber(radius)}}}\,\mathrm{km/s}
\end{aligned}`,
          result: `${f(current.beforeBurn)} km/s`,
          comparison: compared(current.beforeBurn, base.beforeBurn, "km/s"),
        },
        {
          title: tr("噴射で接線速度を変える", "Apply the tangential burn"),
          input: tr(
            "減速量と、その地点での脱出速度",
            "Braking burn and local escape speed",
          ),
          inputTex: String.raw`\begin{aligned}
\Delta v&=${texNumber(p.burn)}\,\mathrm{km/s}\\
v_{\mathrm{esc}}&=${texNumber(escapeSpeed)}\,\mathrm{km/s}
\end{aligned}`,
          equation: String.raw`\begin{aligned}
v_{\mathrm{after}}&=v_{\mathrm p}-\Delta v\\
&=(${texNumber(current.beforeBurn)}-${texNumber(p.burn)})\,\mathrm{km/s}\\
\lvert v_{\mathrm{after}}\rvert&${Math.abs(current.postBurnSpeed) < escapeSpeed ? "<" : String.raw`\ge`}v_{\mathrm{esc}}
\end{aligned}`,
          result: `${f(current.postBurnSpeed)} km/s`,
          comparison: compared(
            current.postBurnSpeed,
            base.postBurnSpeed,
            "km/s",
          ),
        },
        {
          title: tr("新しい軌道を判定する", "Check the resulting orbit"),
          input: tr(
            apoapsis === null
              ? "近点高度（下添字p）を確認。遠点はありません（非束縛）。"
              : "近点高度（下添字p）と遠点高度（下添字a）を確認します。",
            apoapsis === null
              ? "Check periapsis altitude (p). Apoapsis: none (unbound)."
              : "Check periapsis (p) and apoapsis (a) altitudes.",
          ),
          inputTex: String.raw`\varepsilon=${texNumber(current.elements.energy)}\,\mathrm{km^2/s^2}`,
          equation: String.raw`\begin{aligned}
h_{\mathrm p}&=r_{\mathrm p}-R_{\mathrm{Mars}}\\
&=${texNumber(periapsis, 1)}\,\mathrm{km}
${apoapsis === null ? "" : String.raw`\\[3pt]h_{\mathrm a}&=r_{\mathrm a}-R_{\mathrm{Mars}}\\&=${texNumber(apoapsis, 1)}\,\mathrm{km}`}
\end{aligned}`,
          result: statuses[current.status],
          comparison: `${tr("近点高度の参考差", "Periapsis altitude change from reference")} ${difference(periapsis, base.elements.periapsisRadius - K.rMars, "km", 1)}`,
        },
      );
    }
  } else if (lab === "basics") {
    presets = [
      {
        label: tr("800 kmで噴射なし", "No burn at 800 km"),
        patch: { altitude: 800, burn: 0 },
      },
      {
        label: tr("800 kmで+0.5 km/s", "+0.5 km/s at 800 km"),
        patch: { altitude: 800, burn: 0.5 },
      },
    ];
    note = tr(
      "同じ場所で速さを変えると、噴射地点の反対側の高度が変わります。噴射前後を比べ、円・楕円・脱出の違いを確かめましょう。",
      "A burn changes the opposite side of the orbit. Compare before and after the burn to explore circular, elliptical, and escape trajectories.",
    );
    details = tr(
      "半径は地球中心から測ります。符号付き噴射量を円軌道の接線速度に加え、その状態から軌道を再計算します。比軌道エネルギーが負なら束縛され、ゼロ以上では戻らない軌道です（境界には数値許容差があります）。近点が地表に入る場合、アニメーションは衝突時刻で停止します。",
      "Radius is measured from Earth’s center. The signed burn is added to circular tangential velocity, then the orbit is recomputed. Negative specific energy is bound; zero or positive energy is unbound, subject to numerical tolerance at the boundary. Surface-crossing trajectories stop at impact.",
    );
    if (sim) {
      const radius = norm(sim.initial.r);
      const speed = norm(sim.initial.v);
      const circularSpeed = sim.initial.v[1] - p.burn;
      const periapsis = sim.orbit.periapsisRadius - K.rEarth;
      const apoapsis =
        sim.orbit.apoapsisRadius === null
          ? null
          : sim.orbit.apoapsisRadius - K.rEarth;
      const referenceApoapsis = reference.orbit.apoapsisRadius;
      steps.push(
        {
          title: tr(
            "円軌道の速度へ噴射を加える",
            "Add a burn to circular velocity",
          ),
          input: tr("地球中心からの距離", "Distance from Earth’s center"),
          inputTex: String.raw`\begin{aligned}
r&=(${texNumber(K.rEarth)}+${texNumber(p.altitude, 0)})\,\mathrm{km}\\
&=${texNumber(radius)}\,\mathrm{km}
\end{aligned}`,
          equation: String.raw`\begin{aligned}
v_{\mathrm c}&=\sqrt{\frac{\mu_{\mathrm{Earth}}}{r}}\\
&=${texNumber(circularSpeed)}\,\mathrm{km/s}\\[3pt]
v_{\mathrm{after}}&=v_{\mathrm c}+\Delta v\\
&=\bigl(${texNumber(circularSpeed)}+(${texNumber(p.burn)})\bigr)\,\mathrm{km/s}
\end{aligned}`,
          result: `${f(speed)} km/s`,
          comparison: compared(speed, norm(reference.initial.v), "km/s"),
        },
        {
          title: tr("軌道エネルギーを求める", "Find the orbital energy"),
          input: tr(
            "噴射後の速さと中心距離",
            "Post-burn speed and central distance",
          ),
          inputTex: String.raw`\begin{aligned}
v&=${texNumber(speed)}\,\mathrm{km/s}\\
r&=${texNumber(radius)}\,\mathrm{km}
\end{aligned}`,
          equation: String.raw`\begin{aligned}
\varepsilon&=\frac{v^2}{2}-\frac{\mu_{\mathrm{Earth}}}{r}\\
&=\left(\frac{${texNumber(speed)}^2}{2}-\frac{${texNumber(K.muEarth)}}{${texNumber(radius)}}\right)\,\mathrm{km^2/s^2}
\end{aligned}`,
          result: `${f(sim.orbit.energy)} km²/s²`,
          comparison: compared(
            sim.orbit.energy,
            reference.orbit.energy,
            "km²/s²",
          ),
        },
        {
          title: tr("近点と遠点を比べる", "Compare periapsis and apoapsis"),
          input: tr(
            apoapsis === null
              ? "近点高度（下添字p）を確認。遠点はありません（非束縛）。"
              : "近点高度（下添字p）と遠点高度（下添字a）を比較します。",
            apoapsis === null
              ? "Check periapsis altitude (p). Apoapsis: none (unbound)."
              : "Compare periapsis (p) and apoapsis (a) altitudes.",
          ),
          inputTex: String.raw`e=${texNumber(sim.orbit.eccentricity, 5)}`,
          equation: String.raw`\begin{aligned}
h_{\mathrm p}&=r_{\mathrm p}-R_{\mathrm{Earth}}\\
&=${texNumber(periapsis, 1)}\,\mathrm{km}
${apoapsis === null ? "" : String.raw`\\[3pt]h_{\mathrm a}&=r_{\mathrm a}-R_{\mathrm{Earth}}\\&=${texNumber(apoapsis, 1)}\,\mathrm{km}`}
\end{aligned}`,
          result:
            sim.impact !== null
              ? tr(
                  "地表と交差・衝突で停止",
                  "Surface crossing: stops at impact",
                )
              : apoapsis === null
                ? tr("地球へ戻らない軌道", "Unbound trajectory")
                : `${tr("遠点高度", "Apoapsis altitude")} ${f(apoapsis, 1)} km`,
          comparison:
            apoapsis !== null && referenceApoapsis !== null
              ? `${tr("遠点高度の参考差", "Apoapsis altitude change from reference")} ${difference(apoapsis, referenceApoapsis - K.rEarth, "km", 1)}`
              : tr(
                  "遠点がないため参考差は算出しません。",
                  "No apoapsis difference is defined for an unbound orbit.",
                ),
        },
      );
    }
  } else {
    presets = [
      {
        label: tr("反時計回りに通過", "Pass counterclockwise"),
        patch: sim
          ? { side: 1 }
          : { altitude: 1000, vinf: 6, angle: 0, side: 1 },
      },
      {
        label: tr("時計回りに通過", "Pass clockwise"),
        patch: sim
          ? { side: -1 }
          : { altitude: 1000, vinf: 6, angle: 0, side: -1 },
      },
    ];
    note = tr(
      "惑星から十分遠い入出の速さは同じでも、向きが変わります。地球の公転速度を足すと、太陽中心の速さは増える場合も減る場合もあります。",
      "Far from Earth, incoming and outgoing relative speeds match but their directions differ. Adding Earth’s orbital velocity can raise or lower the Sun-relative speed.",
    );
    details = tr(
      "eは双曲線の離心率、δは入出の漸近速度ベクトルの旋回角です。回転行列Rで速度ベクトルの向きだけを変えます。近点での速さはv∞より大きくなります。太陽中心の図は遠方の速度ベクトルの足し算を示し、惑星間航路の続きを計算しているものではありません。太陽中心の速さの差は、燃料を消費した噴射Δvへ加算しません。",
      "e is hyperbolic eccentricity and δ is the turn between asymptotic velocity vectors. Rotation matrix R changes only the vector’s direction. Periapsis speed exceeds v∞. The Sun-frame diagram adds far-field velocity vectors; it does not continue an interplanetary path. The Sun-relative speed change is not propulsive Δv.",
    );
    if (sim) {
      const current = sim.flybyResult;
      const base = reference.flybyResult;
      const radius = norm(current.periapsisState.r);
      steps.push(
        {
          title: tr(
            "接近条件から双曲線を求める",
            "Find the encounter hyperbola",
          ),
          input: tr(
            "近点距離と接近速度",
            "Periapsis radius and incoming speed",
          ),
          inputTex: String.raw`\begin{aligned}
r_{\mathrm p}&=${texNumber(radius)}\,\mathrm{km}\\
v_\infty&=${texNumber(p.vinf)}\,\mathrm{km/s}
\end{aligned}`,
          equation: String.raw`\begin{aligned}
e&=1+\frac{r_{\mathrm p}v_\infty^2}{\mu_{\mathrm{Earth}}}\\
&=1+\frac{${texNumber(radius)}\times ${texNumber(p.vinf)}^2}{${texNumber(K.muEarth)}}
\end{aligned}`,
          result: `e = ${f(current.eccentricity, 5)}`,
          comparison: compared(
            current.eccentricity,
            base.eccentricity,
            "",
            5,
          ).trim(),
        },
        {
          title: tr("曲がる角度を求める", "Find the turning angle"),
          input: tr(
            "通過側が速度を回す向きを決めます。",
            "Passing side selects the rotation direction.",
          ),
          equation: String.raw`\begin{aligned}
\delta&=2\arcsin\!\left(\frac{1}{e}\right)\\
&=2\arcsin\!\left(\frac{1}{${texNumber(current.eccentricity, 5)}}\right)\\[3pt]
\mathbf v_{\infty,\mathrm{out}}&=\mathbf R(${p.side === 1 ? "+" : "-"}\delta)\,\mathbf v_{\infty,\mathrm{in}}
\end{aligned}`,
          result: `${f(deg(current.turnAngle), 2)}°`,
          comparison: compared(
            deg(current.turnAngle),
            deg(base.turnAngle),
            "°",
            2,
          ),
        },
        {
          title: tr("太陽から見た速さを比べる", "Compare Sun-relative speeds"),
          input: tr(
            "地球の公転速度をベクトルで加えます。",
            "Add Earth’s orbital velocity as a vector.",
          ),
          inputTex: String.raw`\begin{aligned}
\mathbf v_{\mathrm{Sun}}&=\mathbf v_{\mathrm{Earth}}+\mathbf v_\infty\\
\lVert\mathbf v_{\mathrm{Earth}}\rVert&=${texNumber(norm(current.planetVelocity))}\,\mathrm{km/s}
\end{aligned}`,
          equation: String.raw`\begin{aligned}
\Delta\lVert\mathbf v_{\mathrm{Sun}}\rVert&=\lVert\mathbf v_{\mathrm{Sun,out}}\rVert\\
&\quad-\lVert\mathbf v_{\mathrm{Sun,in}}\rVert\\
&=(${texNumber(norm(current.sunOutgoing))}-${texNumber(norm(current.sunIncoming))})\,\mathrm{km/s}
\end{aligned}`,
          result: `${difference(current.speedChange, 0, "km/s")}`,
          comparison: compared(current.speedChange, base.speedChange, "km/s"),
        },
      );
    }
  }

  return (
    <section className="calculation-walkthrough" aria-labelledby={headingId}>
      <div className="calculation-heading">
        <div>
          <span className="eyebrow">
            {tr("入力から結果まで", "FROM INPUT TO RESULT")}
          </span>
          <h2 id={headingId}>
            {tr("計算の流れと比較", "Follow the calculation")}
          </h2>
        </div>
        <p>
          {tr(
            "いまの設定を式に入れると、どうなる？",
            "What do your settings mean in the equations?",
          )}
        </p>
      </div>
      {sim ? (
        <>
          <ol className="calculation-steps">
            {steps.map((step, index) => (
              <li key={step.title} className="calculation-step">
                <div className="calculation-step-heading">
                  <span className="calculation-number" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3>{step.title}</h3>
                </div>
                <p className="calculation-input">{step.input}</p>
                {step.inputTex && (
                  <MathFormula
                    tex={step.inputTex}
                    className="calculation-input"
                    display={false}
                  />
                )}
                <MathFormula
                  tex={step.equation}
                  className="calculation-equation"
                />
                <p className="calculation-result">{step.result}</p>
                <p className="calculation-comparison">{step.comparison}</p>
              </li>
            ))}
          </ol>
          <p className="calculation-note">{note}</p>
          <details className="calculation-details">
            <summary>
              {tr(
                "式の読み方とモデルの範囲",
                "Reading the equations and model limits",
              )}
            </summary>
            <p>{details}</p>
            <p>
              {tr(
                "式への代入値は読みやすく丸めています。結果は丸め前の値で計算し、参考設定との差を表示します。",
                "Substituted values are rounded for readability. Results use unrounded values and are compared with the reference settings.",
              )}
            </p>
          </details>
        </>
      ) : (
        <p className="calculation-empty" role="status">
          {tr(
            "入力を表示された範囲内へ直すと、計算の流れと比較を表示します。安全高度を下回る場合は高度を上げてください。下の例からも設定を変更できます。",
            "Correct inputs within the displayed ranges to see the calculation. Raise the altitude if it is below the teaching safety limit. You can also try the examples below.",
          )}
        </p>
      )}
      <div
        className="calculation-presets"
        aria-label={tr("条件を変えて試す", "Try different settings")}
      >
        <span>{tr("試して比べる", "Try and compare")}</span>
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onPreset(preset.patch)}
          >
            {preset.label}
            <span aria-hidden="true">↗</span>
          </button>
        ))}
      </div>
      <p className="calculation-note">
        {tr(
          lab === "transfer"
            ? "例を選ぶと到着時点へ移動し、参考軌道を重ねます。"
            : "例を選ぶと実験の初期時刻へ戻り、参考軌道を重ねます。",
          lab === "transfer"
            ? "Examples jump to arrival and overlay the reference path."
            : "Examples return to the lab’s initial time and overlay the reference path.",
        )}
      </p>
    </section>
  );
}
