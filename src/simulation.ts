import {
  K,
  hohmann,
  missionAt,
  escape,
  capture,
  flyby,
  elements,
  propagate,
  firstImpactTime,
  norm,
  rad,
  deg,
} from "./physics";
import type { State, Vec } from "./physics";
import type { LabId } from "./learning";
export const H = hohmann();
export type Parameters = {
  altitude: number;
  burn: number;
  vinf: number;
  phase: number;
  wait: number;
  angle: number;
  side: 1 | -1;
};
export const defaults = (lab: LabId): Parameters => ({
  altitude:
    lab === "capture"
      ? 300
      : lab === "basics"
        ? 800
        : lab === "flyby"
          ? 1000
          : 200,
  burn: lab === "capture" ? capture(300, 0).circularDeltaV : 0.5,
  vinf: lab === "flyby" ? 6 : H.vInfinityDepart,
  phase: deg(H.phaseAngle),
  wait: 0,
  angle: 0,
  side: 1,
});
export type Sample = { time: number; state: State };
export function simulate(lab: LabId, p: Parameters) {
  if (!["basics", "escape", "transfer", "capture", "flyby"].includes(lab))
    throw new RangeError("Unknown experiment");
  const transfer = lab === "transfer";
  const mu = transfer ? K.muSun : lab === "capture" ? K.muMars : K.muEarth;
  const bodyRadius = transfer ? 0 : lab === "capture" ? K.rMars : K.rEarth;
  // Auxiliary displays keep canonical independent-lab values. Never apply a
  // different lab's input domain (e.g. a negative basic burn) to capture.
  const escapeResult =
    lab === "escape"
      ? escape(p.altitude, p.vinf)
      : escape(200, H.vInfinityDepart);
  const captureResult =
    lab === "capture"
      ? capture(p.altitude, p.burn)
      : capture(300, capture(300, 0).circularDeltaV);
  const flybyResult =
    lab === "flyby"
      ? flyby(p.vinf, p.altitude, rad(p.angle), p.side)
      : flyby(6, 1000, 0, 1);
  let initial: State;
  if (transfer) initial = missionAt(0, rad(p.phase), p.wait * K.DAY).spacecraft;
  else if (lab === "basics") {
    if (!Number.isFinite(p.altitude) || p.altitude < 0 || p.altitude > 100000)
      throw new RangeError("parking altitude: outside 0…100000");
    if (!Number.isFinite(p.burn) || p.burn < -20 || p.burn > 30)
      throw new RangeError("signed burn: outside −20…30");
    initial = {
      r: [K.rEarth + p.altitude, 0],
      v: [0, Math.sqrt(mu / (K.rEarth + p.altitude)) + p.burn],
    };
  } else if (lab === "escape") initial = escapeResult.initial;
  else if (lab === "capture") initial = captureResult.initial;
  else initial = flybyResult.periapsisState;
  const orbit = elements(initial, mu);
  const minimumAltitude = lab === "capture" ? K.safeMars : K.safeEarth;
  const blocked =
    (lab === "flyby" && !flybyResult.safe) ||
    (!transfer && p.altitude < minimumAltitude) ||
    orbit.type === "radial";
  // A stopped encounter has no valid incoming/outgoing timeline to animate.
  const start = lab === "flyby" && !blocked ? -7200 : 0;
  const proposedEnd = transfer
    ? H.flightTime
    : lab === "flyby"
      ? 7200
      : Math.min(orbit.period ?? 10800, 43200);
  const impact =
    transfer || lab === "flyby" || blocked
      ? null
      : firstImpactTime(initial, mu, bodyRadius, proposedEnd);
  const end = blocked ? start : (impact ?? proposedEnd);
  const at = (time: number): State => {
    if (!Number.isFinite(time))
      throw new RangeError("simulation time: finite number required");
    const boundedTime = Math.max(start, Math.min(end, time));
    return transfer
      ? missionAt(boundedTime, rad(p.phase), p.wait * K.DAY).spacecraft
      : blocked
        ? initial
        : propagate(initial, mu, boundedTime);
  };
  const samples: Sample[] = Array.from({ length: 181 }, (_, i) => {
    const time = i === 180 ? end : start + ((end - start) * i) / 180;
    return { time, state: at(time) };
  });
  const extent = transfer
    ? 1.82 * K.AU
    : Math.max(bodyRadius * 1.8, ...samples.map((s) => norm(s.state.r))) * 1.12;
  const arrival = transfer
    ? missionAt(H.flightTime, rad(p.phase), p.wait * K.DAY)
    : missionAt(H.flightTime);
  const safe =
    !blocked &&
    (transfer || orbit.periapsisRadius >= bodyRadius + minimumAltitude - 1e-6);
  const initialAtPeriapsis =
    Math.abs(norm(initial.r) - orbit.periapsisRadius) < 1e-6 * norm(initial.r);
  // Local initial states are tangent at an apsis. Retrograde burns make the
  // initial position apoapsis, so half a period is then periapsis, not apoapsis.
  const periapsisTime =
    lab === "flyby"
      ? 0
      : initialAtPeriapsis
        ? 0
        : orbit.period === null
          ? null
          : orbit.period / 2;
  const apoapsisTime =
    orbit.period === null ? null : initialAtPeriapsis ? orbit.period / 2 : 0;
  return {
    lab,
    mu,
    bodyRadius,
    initial,
    orbit,
    start,
    end,
    at,
    samples,
    extent,
    impact,
    blocked,
    safe,
    arrival,
    escapeResult,
    captureResult,
    flybyResult,
    periapsisTime,
    apoapsisTime,
  };
}
export type Simulation = ReturnType<typeof simulate>;
export const vectorPath = (points: Vec[], project: (v: Vec) => Vec) =>
  points
    .map((p, i) => {
      const [x, y] = project(p);
      return `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
