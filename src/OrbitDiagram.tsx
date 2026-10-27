import { K, missionAt, rad, norm } from "./physics";
import type { Vec } from "./physics";
import type { Lang } from "./learning";
import { vectorPath } from "./simulation";
import type { Simulation, Parameters } from "./simulation";
import MathFormula from "./MathFormula";
export type Layers = {
  vectors: boolean;
  trail: boolean;
  predicted: boolean;
  markers: boolean;
  reference: boolean;
};
export default function OrbitDiagram({
  sim,
  reference,
  time,
  p,
  lang,
  layers,
  frame,
}: {
  sim: Simulation;
  reference: Simulation;
  time: number;
  p: Parameters;
  lang: Lang;
  layers: Layers;
  frame: "planet" | "sun";
}) {
  const en = lang === "en";
  const isMission = sim.lab === "transfer";
  const isVectors = sim.lab === "flyby" && frame === "sun";
  const extent = layers.reference
    ? Math.max(sim.extent, reference.extent)
    : sim.extent;
  const zoom = 215 / extent;
  const project = (v: Vec): Vec => [380 + v[0] * zoom, 253 - v[1] * zoom];
  const boundedTime = Math.max(sim.start, Math.min(sim.end, time));
  const spacecraft = sim.at(boundedTime);
  const [sx, sy] = project(spacecraft.r);
  const mission = isMission
    ? missionAt(boundedTime, rad(p.phase), p.wait * K.DAY)
    : null;
  const label = (v: Vec, text: string, color: string, r = 5, offsetY = -11) => {
    const [x, y] = project(v);
    return (
      <g>
        <circle cx={x} cy={y} r={r} fill={color} />
        <text
          x={x + 12}
          y={y + offsetY}
          style={{ fill: color }}
          className="plot-label"
        >
          {text}
        </text>
      </g>
    );
  };
  const arrow = (
    origin: Vec,
    vector: Vec,
    name: string,
    color: string,
    scale = 3.2,
  ) => (
    <g>
      <path
        d={`M${origin[0]},${origin[1]} l${vector[0] * scale},${-vector[1] * scale}`}
        stroke={color}
        strokeWidth="2"
        markerEnd="url(#arrow)"
        fill="none"
      />
      <text
        x={origin[0] + vector[0] * scale + 8}
        y={origin[1] - vector[1] * scale - 8}
        fill={color}
        className="plot-label"
      >
        {name}
      </text>
    </g>
  );
  return (
    <svg
      className="orbit-svg"
      viewBox="0 0 760 510"
      role="img"
      aria-label={
        en
          ? "Computed orbital trajectory. Numerical state is provided below."
          : "物理計算に基づく軌道図。数値は下の状態表で確認できます。"
      }
    >
      <defs>
        <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">
          <path d="M44 0H0V44" fill="none" className="grid-line" />
        </pattern>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M0 0 10 5 0 10Z" fill="context-stroke" />
        </marker>
        <radialGradient id="sun">
          <stop stopColor="#fae7ad" />
          <stop offset="1" stopColor="#dca65a" />
        </radialGradient>
      </defs>
      <rect width="760" height="510" fill="url(#grid)" />
      <path d="M380 30V478M55 253H705" className="axis-line" />
      <text x="28" y="32" className="plot-caption">
        {isVectors
          ? en
            ? "HELIOCENTRIC VELOCITY VECTORS"
            : "太陽中心・速度ベクトル"
          : isMission
            ? en
              ? "HELIOCENTRIC / AU"
              : "太陽中心 / AU"
            : en
              ? "PLANET-CENTERED / km"
              : "惑星中心 / km"}
      </text>
      <text x="28" y="486" className="plot-caption">
        {en ? "2D · COPLANAR · TWO-BODY" : "2次元 · 同一平面 · 二体問題"}
      </text>
      {sim.blocked ? (
        <g>
          <text x="380" y="230" textAnchor="middle" className="plot-label">
            {en
              ? "Simulation stopped: outside the supported safe domain"
              : "教材の安全範囲外のため、シミュレーションを停止"}
          </text>
          <text x="380" y="263" textAnchor="middle" className="plot-caption">
            {en
              ? "Raise the altitude or adjust the burn before continuing."
              : "高度または噴射量を変更して、条件を見直してください。"}
          </text>
        </g>
      ) : isVectors ? (
        <g>
          <circle cx="225" cy="310" r="5" fill="var(--ink)" />
          {arrow(
            [225, 310],
            sim.flybyResult.planetVelocity,
            en ? "Planet velocity" : "惑星の速度",
            "var(--earth)",
            5,
          )}
          {arrow(
            [225, 310],
            sim.flybyResult.sunIncoming,
            en ? "Sun: incoming" : "太陽中心：接近前",
            "var(--muted)",
            5,
          )}
          {arrow(
            [225, 310],
            sim.flybyResult.sunOutgoing,
            en ? "Sun: outgoing" : "太陽中心：通過後",
            "var(--accent)",
            5,
          )}
          {arrow(
            [225, 310 - sim.flybyResult.planetVelocity[1] * 5],
            sim.flybyResult.incoming,
            "v∞ in",
            "var(--mars)",
            5,
          )}
          {arrow(
            [225, 310 - sim.flybyResult.planetVelocity[1] * 5],
            sim.flybyResult.outgoing,
            "v∞ out",
            "var(--accent)",
            5,
          )}
          <foreignObject x="225" y="350" width="400" height="40">
            <MathFormula
              tex={String.raw`\mathbf v_{\mathrm{Sun}}=\mathbf v_{\mathrm{Planet}}+\mathbf v_\infty`}
              display={false}
            />
          </foreignObject>
          <text x="225" y="401" className="plot-caption">
            {en ? "Vector scale: 5 px per km/s" : "ベクトル縮尺：5 px / (km/s)"}
          </text>
        </g>
      ) : (
        <>
          {isMission ? (
            <>
              <circle
                cx="380"
                cy="253"
                r={K.orbitEarth * zoom}
                className="earth-orbit"
              />
              <circle
                cx="380"
                cy="253"
                r={K.orbitMars * zoom}
                className="mars-orbit"
              />
              <circle cx="380" cy="253" r="12" fill="url(#sun)" />
              <text x="398" y="258" className="plot-label">
                {en ? "Sun" : "太陽"}
              </text>
              {mission &&
                label(
                  mission.earth.r,
                  en ? "Earth" : "地球",
                  "var(--earth)",
                  7,
                )}
              {mission &&
                label(
                  mission.mars.r,
                  en ? "Mars · now" : "火星・同時刻",
                  "var(--mars)",
                  6,
                  Math.hypot(
                    mission.mars.r[0] - sim.arrival.mars.r[0],
                    mission.mars.r[1] - sim.arrival.mars.r[1],
                  ) <
                    extent * 0.12
                    ? -64
                    : -11,
                )}
              {layers.markers && (
                <>
                  {label(
                    sim.arrival.mars.r,
                    en ? "Mars at arrival" : "到着時の火星",
                    "var(--mars)",
                    3,
                    -38,
                  )}
                  {label(
                    sim.arrival.spacecraft.r,
                    en ? "Arrival point" : "到着予定点",
                    "var(--accent)",
                    3,
                    -11,
                  )}
                </>
              )}
              <text
                x="400"
                y={253 + K.orbitEarth * zoom - 8}
                className="plot-caption"
              >
                1.00 AU
              </text>
              <text
                x="400"
                y={253 + K.orbitMars * zoom - 9}
                className="plot-caption"
              >
                1.52 AU
              </text>
            </>
          ) : (
            <>
              <circle
                cx="380"
                cy="253"
                r={sim.bodyRadius * zoom}
                fill={
                  sim.lab === "capture"
                    ? "var(--mars-fill)"
                    : "var(--earth-fill)"
                }
                stroke={sim.lab === "capture" ? "var(--mars)" : "var(--earth)"}
                strokeWidth="1.4"
              />
              <circle
                cx="380"
                cy="253"
                r={
                  (sim.bodyRadius +
                    (sim.lab === "capture" ? K.safeMars : K.safeEarth)) *
                  zoom
                }
                fill="none"
                stroke="var(--muted)"
                strokeDasharray="2 5"
                opacity=".5"
              />
              <text x="380" y="258" textAnchor="middle" className="plot-label">
                {sim.lab === "capture"
                  ? en
                    ? "Mars"
                    : "火星"
                  : en
                    ? "Earth"
                    : "地球"}
              </text>
              {layers.reference &&
                (sim.lab === "basics" || sim.lab === "escape") && (
                  <>
                    <circle
                      cx="380"
                      cy="253"
                      r={norm(sim.initial.r) * zoom}
                      fill="none"
                      stroke="var(--muted)"
                      strokeDasharray="2 5"
                    />
                    <text
                      x="394"
                      y={253 + norm(sim.initial.r) * zoom - 7}
                      className="plot-caption"
                    >
                      {en ? "Initial parking circle" : "噴射前の待機円軌道"}
                    </text>
                  </>
                )}
              {layers.markers &&
                label(
                  sim.initial.r,
                  sim.lab === "flyby"
                    ? en
                      ? "Periapsis"
                      : "近点"
                    : en
                      ? "Burn · t = 0"
                      : "噴射点 · t = 0",
                  "var(--mars)",
                  4,
                )}
              {layers.markers &&
                sim.apoapsisTime !== null &&
                sim.apoapsisTime > 0 &&
                sim.apoapsisTime <= sim.end &&
                sim.orbit.eccentricity > 1e-7 &&
                label(
                  sim.at(sim.apoapsisTime).r,
                  en ? "Apoapsis" : "遠点",
                  "var(--muted)",
                  3,
                )}
              {layers.markers &&
                sim.periapsisTime !== null &&
                sim.periapsisTime > 0 &&
                sim.periapsisTime <= sim.end &&
                sim.orbit.eccentricity > 1e-7 &&
                label(
                  sim.at(sim.periapsisTime).r,
                  en ? "Periapsis" : "近点",
                  "var(--muted)",
                  3,
                )}
              {sim.lab === "flyby" &&
                layers.vectors &&
                [sim.flybyResult.incoming, sim.flybyResult.outgoing].map(
                  (direction, i) => {
                    const length = norm(direction),
                      sign = i ? 1 : -1;
                    const far: Vec = [
                      (direction[0] / length) * extent * sign * 3,
                      (direction[1] / length) * extent * sign * 3,
                    ];
                    // The asymptotes intersect at the hyperbola's center, e|a| along
                    // the periapsis direction. The orientation includes passing side.
                    const factor =
                      sim.flybyResult.eccentricity /
                      (sim.flybyResult.eccentricity - 1);
                    const center: Vec = [
                      sim.initial.r[0] * factor,
                      sim.initial.r[1] * factor,
                    ];
                    return (
                      <path
                        key={i}
                        d={vectorPath(
                          [center, [center[0] + far[0], center[1] + far[1]]],
                          project,
                        )}
                        stroke="var(--muted)"
                        strokeDasharray="5 6"
                        fill="none"
                      />
                    );
                  },
                )}
            </>
          )}
          {layers.reference && (
            <path
              d={vectorPath(
                reference.samples.map((s) => s.state.r),
                project,
              )}
              className="reference-path"
            />
          )}
          {layers.predicted && (
            <path
              d={vectorPath(
                sim.samples.map((s) => s.state.r),
                project,
              )}
              className="predicted-path"
            />
          )}
          {layers.trail && (
            <path
              d={vectorPath(
                [
                  ...sim.samples
                    .filter((s) => s.time <= boundedTime)
                    .map((s) => s.state.r),
                  spacecraft.r,
                ],
                project,
              )}
              className="trail-path"
            />
          )}
          {layers.vectors &&
            arrow(
              [sx, sy],
              spacecraft.v,
              "v",
              "var(--accent)",
              isMission ? 1.8 : 5,
            )}
          <circle cx={sx} cy={sy} r="11" fill="var(--accent)" opacity=".12" />
          <path d={`M${sx} ${sy - 6}l5 11-5-2-5 2Z`} fill="var(--accent)" />
          <text
            x={sx + 14}
            y={sy + 20}
            className="plot-label"
            fill="var(--accent)"
          >
            {en ? "Probe" : "探査機"}
          </text>
          {!isMission && (
            <>
              <path d="M620 454h80m-80-4v8m80-8v8" stroke="var(--muted)" />
              <text
                x="660"
                y="443"
                textAnchor="middle"
                className="plot-caption"
              >
                {Math.round(80 / zoom).toLocaleString()} km
              </text>
            </>
          )}
        </>
      )}
    </svg>
  );
}

export function SpeedChart({
  sim,
  time,
  lang,
}: {
  sim: Simulation;
  time: number;
  lang: Lang;
}) {
  if (sim.blocked)
    return (
      <p className="plot-caption">
        {lang === "ja"
          ? "条件が範囲外のため、速度グラフは表示しません。"
          : "Speed chart unavailable for this out-of-range state."}
      </p>
    );
  const speeds = sim.samples.map((s) => norm(s.state.v));
  const low = Math.min(...speeds) * 0.95,
    high = Math.max(low + 0.05, Math.max(...speeds) * 1.05);
  const project = (i: number, v: number): Vec => [
    40 + (i / 180) * 600,
    85 - ((v - low) / (high - low)) * 60,
  ];
  const boundedTime = Math.max(sim.start, Math.min(sim.end, time));
  const current =
    40 +
    (sim.end === sim.start
      ? 0
      : (boundedTime - sim.start) / (sim.end - sim.start)) *
      600;
  const unit = sim.lab === "transfer" ? (lang === "ja" ? "日" : "days") : "h";
  const scale = sim.lab === "transfer" ? K.DAY : 3600;
  return (
    <svg
      viewBox="0 0 680 110"
      className="speed-chart"
      role="img"
      aria-label={
        lang === "ja" ? "速度と仮想時刻のグラフ" : "Speed over simulation time"
      }
    >
      <path d="M40 85H640" stroke="var(--line)" />
      <path
        d={speeds
          .map((v, i) => {
            const [x, y] = project(i, v);
            return `${i ? "L" : "M"}${x},${y}`;
          })
          .join(" ")}
        stroke="var(--accent)"
        strokeWidth="2"
        fill="none"
      />
      <path
        d={`M${current} 15V88`}
        stroke="var(--mars)"
        strokeDasharray="3 4"
      />
      <text x="8" y="22" className="plot-caption">
        {high.toFixed(1)}
      </text>
      <text x="8" y="85" className="plot-caption">
        {low.toFixed(1)}
      </text>
      <text x="40" y="105" className="plot-caption">
        {(sim.start / scale).toFixed(1)} {unit}
      </text>
      <text x="340" y="105" textAnchor="middle" className="plot-caption">
        {lang === "ja"
          ? "速度 (km/s) / 仮想時刻"
          : "Speed (km/s) / simulation time"}
      </text>
      <text x="640" y="105" textAnchor="end" className="plot-caption">
        {(sim.end / scale).toFixed(1)} {unit}
      </text>
    </svg>
  );
}
