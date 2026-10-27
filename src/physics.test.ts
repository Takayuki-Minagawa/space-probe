import { describe, expect, it } from "vitest";
import {
  K,
  capture,
  deg,
  dot,
  elements,
  escape,
  firstImpactTime,
  flyby,
  hohmann,
  missionAt,
  norm,
  normalizeAngle,
  propagate,
  rad,
  sub,
  type State,
} from "./physics";

const reference = hohmann();
const circular: State = { r: [7000, 0], v: [0, Math.sqrt(K.muEarth / 7000)] };
const relativeError = (actual: number, expected: number) =>
  Math.abs((actual - expected) / expected);

describe("published fixed-model reference values (independent expected constants)", () => {
  it.each([
    ["flight days", reference.flightTime / K.DAY, 258.8658],
    ["phase degrees", deg(reference.phaseAngle), 44.3442],
    ["departure excess speed", reference.vInfinityDepart, 2.94469],
    ["arrival excess speed", reference.vInfinityArrive, 2.6489],
    ["C3", reference.c3, 8.67119],
    ["escape burn", escape(200, reference.vInfinityDepart).deltaV, 3.61138],
    ["capture burn", capture(300, 0).circularDeltaV, 2.09138],
  ])("%s agrees within 0.1%%", (_name, actual, expected) => {
    expect(relativeError(Number(actual), Number(expected))).toBeLessThan(0.001);
  });
  it("keeps units and angle normalization explicit", () => {
    expect(rad(180)).toBe(Math.PI);
    expect(deg(Math.PI)).toBe(180);
    expect(normalizeAngle(-Math.PI / 2)).toBeCloseTo(1.5 * Math.PI, 14);
    expect(K.AU).toBe(149597870.7);
    expect(K.DAY).toBe(86400);
    expect(K.muMars).toBe(42828.37362); // Not the Mars system GM.
  });
});

describe("same-time Earth to Mars encounter", () => {
  it("meets Mars in reference setting but misses with wrong phase", () => {
    const correct = missionAt(reference.flightTime);
    expect(correct.missDistance).toBeLessThan(0.001);
    expect(correct.encounter).toBe(true);
    const wrong = missionAt(
      reference.flightTime,
      reference.phaseAngle + rad(10),
    );
    expect(wrong.encounter).toBe(false);
    expect(wrong.missDistance).toBeGreaterThan(3e7);
    expect(norm(wrong.spacecraft.r)).toBeCloseTo(K.orbitMars, 5);
  });
  it("waiting moves both planets and departure orientation", () => {
    const wait = 100 * K.DAY;
    const waited = missionAt(0, reference.phaseAngle, wait);
    const now = missionAt(0);
    expect(norm(sub(waited.earth.r, now.earth.r))).toBeGreaterThan(1e8);
    expect(norm(sub(waited.mars.r, now.mars.r))).toBeGreaterThan(1e8);
    expect(norm(sub(waited.spacecraft.r, waited.earth.r))).toBeLessThan(1e-6);
    expect(
      missionAt(reference.flightTime, reference.phaseAngle, wait).encounter,
    ).toBe(false);
    // One synodic period restores the relative geometry, not absolute directions.
    expect(
      missionAt(
        reference.flightTime,
        reference.phaseAngle,
        reference.synodicPeriod,
      ).encounter,
    ).toBe(true);
  });
  it("uses vector subtraction for relative arrival velocity", () => {
    expect(norm(missionAt(reference.flightTime).arrivalVInfinity)).toBeCloseTo(
      2.648895229,
      8,
    );
    expect(
      norm(
        missionAt(reference.flightTime, reference.phaseAngle + Math.PI)
          .arrivalVInfinity,
      ),
    ).toBeGreaterThan(45);
  });
});

describe("universal-variable propagation", () => {
  it("has independently known 7000 km circle speed and period", () => {
    expect(norm(circular.v)).toBeCloseTo(7.54605323, 6);
    expect(elements(circular, K.muEarth).period).toBeCloseTo(5828.5167, 3);
    const quarter = propagate(
      circular,
      K.muEarth,
      elements(circular, K.muEarth).period! / 4,
    );
    expect(quarter.r[0]).toBeCloseTo(0, 7);
    expect(quarter.r[1]).toBeCloseTo(7000, 7);
    expect(quarter.v[0]).toBeCloseTo(-norm(circular.v), 9);
  });
  it("reaches an ellipse apocenter with correct low speed", () => {
    // Independently specified 7000 x 14000 km apsides.
    const initial: State = {
      r: [7000, 0],
      v: [0, Math.sqrt(K.muEarth * (2 / 7000 - 1 / 10500))],
    };
    const orbit = elements(initial, K.muEarth);
    expect(orbit.periapsisRadius).toBeCloseTo(7000, 8);
    expect(orbit.apoapsisRadius).toBeCloseTo(14000, 8);
    const apo = propagate(initial, K.muEarth, orbit.period! / 2);
    expect(apo.r[0]).toBeCloseTo(-14000, 7);
    expect(apo.r[1]).toBeCloseTo(0, 7);
    expect(norm(apo.v)).toBeCloseTo(norm(initial.v) / 2, 9);
    // Equal time is not equal angle on an ellipse.
    const quarter = propagate(initial, K.muEarth, orbit.period! / 4);
    expect(quarter.r[0]).toBeLessThan(-5000);
  });
  it.each([
    0.75,
    1,
    1.2,
    Math.SQRT2 * (1 - 1e-10),
    Math.SQRT2,
    Math.SQRT2 * (1 + 1e-10),
    1.8,
  ])("conserves energy and angular momentum at speed factor %s", (factor) => {
    const initial: State = { r: [7000, 0], v: [0, norm(circular.v) * factor] };
    const original = elements(initial, K.muEarth);
    for (const time of [-10000, -1000, 0, 100, 1000, 10000]) {
      const result = elements(propagate(initial, K.muEarth, time), K.muEarth);
      expect(Math.abs(result.energy - original.energy)).toBeLessThan(
        Math.max(1e-9, Math.abs(original.energy) * 1e-8),
      );
      expect(
        relativeError(result.angularMomentum, original.angularMomentum),
      ).toBeLessThan(1e-8);
    }
  });
  it("is reversible and independent of frame rate / time partition", () => {
    const initial = escape(200, reference.vInfinityDepart).initial;
    const oneStep = propagate(initial, K.muEarth, 600);
    for (const fps of [30, 60, 120]) {
      // Animation state is always evaluated at absolute virtual time.
      const result = propagate(initial, K.muEarth, fps * (600 / fps));
      expect(result).toEqual(oneStep);
    }
    const twoSteps = propagate(
      propagate(initial, K.muEarth, 300),
      K.muEarth,
      300,
    );
    expect(norm(sub(oneStep.r, twoSteps.r))).toBeLessThan(1e-7);
    const restored = propagate(oneStep, K.muEarth, -600);
    expect(norm(sub(restored.r, initial.r))).toBeLessThan(1e-7);
    expect(norm(sub(restored.v, initial.v))).toBeLessThan(1e-10);
  });
  it("provides a first surface crossing to stop collision animations", () => {
    const initial: State = { r: [7000, 0], v: [0, 6.5] };
    const impact = firstImpactTime(initial, K.muEarth, K.rEarth, 10000);
    expect(impact).not.toBeNull();
    expect(norm(propagate(initial, K.muEarth, impact!).r)).toBeCloseTo(
      K.rEarth,
      7,
    );
    expect(norm(propagate(initial, K.muEarth, impact! - 1).r)).toBeGreaterThan(
      K.rEarth,
    );
    expect(firstImpactTime(circular, K.muEarth, K.rEarth, 10000)).toBeNull();
  });
  it("finds an inbound hyperbolic impact, but not outbound one", () => {
    const periapsis: State = { r: [6000, 0], v: [0, 12] };
    const inbound = propagate(periapsis, K.muEarth, -1000);
    const impact = firstImpactTime(inbound, K.muEarth, K.rEarth, 1000);
    expect(impact).toBeGreaterThan(0);
    expect(norm(propagate(inbound, K.muEarth, impact!).r)).toBeCloseTo(
      K.rEarth,
      6,
    );
    const outbound = propagate(periapsis, K.muEarth, 1000);
    expect(firstImpactTime(outbound, K.muEarth, K.rEarth, 1000)).toBeNull();
  });
});

describe("local departure and capture experiments", () => {
  it("keeps excess speed distinct from periapsis speed and burn", () => {
    const departure = escape(200, reference.vInfinityDepart);
    expect(departure.escapeSpeed / departure.circularSpeed).toBeCloseTo(
      Math.SQRT2,
      12,
    );
    expect(departure.periapsisSpeed).toBeGreaterThan(departure.escapeSpeed);
    expect(escape(2000, reference.vInfinityDepart).deltaV).toBeLessThan(
      departure.deltaV,
    );
    expect(elements(departure.initial, K.muEarth).energy).toBeCloseTo(
      reference.c3 / 2,
      10,
    );
  });
  it("classifies insufficient burn, safe ellipse and circular target using resulting state", () => {
    expect(capture(300, 0).status).toBe("flyby");
    expect(capture(300, 1).status).toBe("captured");
    const target = capture(300, capture(300, 0).circularDeltaV);
    expect(target.status).toBe("target");
    expect(target.elements.periapsisRadius).toBeCloseTo(K.rMars + 300, 8);
    expect(target.elements.apoapsisRadius).toBeCloseTo(K.rMars + 300, 8);
    expect(capture(300, 3).status).toBe("unsafe");
    expect(capture(50, capture(50, 0).circularDeltaV).status).toBe("unsafe");
  });
  it("supports a separate specified elliptical target", () => {
    const proposal = capture(300, 0, reference.vInfinityArrive, 10000);
    const target = capture(
      300,
      proposal.targetDeltaV,
      reference.vInfinityArrive,
      10000,
    );
    expect(target.status).toBe("target");
    expect(target.elements.apoapsisRadius).toBeCloseTo(K.rMars + 10000, 7);
  });
});

describe("Earth flyby geometry and energy", () => {
  it("conserves asymptotic excess-speed magnitude and permits acceleration or deceleration", () => {
    const positive = flyby(6, 500, 0, 1),
      negative = flyby(6, 500, 0, -1);
    expect(norm(positive.incoming)).toBeCloseTo(norm(positive.outgoing), 13);
    expect(norm(negative.incoming)).toBeCloseTo(norm(negative.outgoing), 13);
    expect(positive.speedChange).toBeGreaterThan(0);
    expect(negative.speedChange).toBeLessThan(0);
    expect(positive.turnAngle).toBeCloseTo(
      2 * Math.asin(1 / positive.eccentricity),
      14,
    );
    expect(flyby(6, 3000, 0, 1).turnAngle).toBeLessThan(positive.turnAngle);
    expect(flyby(10, 500, 0, 1).turnAngle).toBeLessThan(positive.turnAngle);
  });
  it("uses a physical oriented hyperbola with a faster periapsis", () => {
    for (const side of [-1, 1] as const) {
      const result = flyby(6, 500, rad(25), side);
      const inbound = propagate(result.periapsisState, K.muEarth, -1e7);
      const outbound = propagate(result.periapsisState, K.muEarth, 1e7);
      const cosine = (a: [number, number], b: [number, number]) =>
        dot(a, b) / (norm(a) * norm(b));
      expect(cosine(inbound.v, result.incoming)).toBeGreaterThan(1 - 1e-8);
      expect(cosine(outbound.v, result.outgoing)).toBeGreaterThan(1 - 1e-8);
      expect(norm(result.periapsisState.v)).toBeGreaterThan(6);
      expect(norm(result.periapsisState.r)).toBeCloseTo(K.rEarth + 500, 9);
    }
  });
  it("does not allow surface or sub-safety-altitude gain to count as safe", () => {
    expect(flyby(6, -1, 0, 1).status).toBe("collision");
    expect(flyby(6, 0, 0, 1).status).toBe("collision");
    expect(flyby(6, 100, 0, 1).status).toBe("outside-model");
    expect(flyby(6, K.safeEarth, 0, 1).safe).toBe(true);
  });
});

describe("input guards fail explicitly rather than producing stale or non-finite results", () => {
  it.each([NaN, Infinity, -Infinity])("rejects %s", (invalid) => {
    expect(() => escape(invalid, 3)).toThrow();
    expect(() => capture(300, invalid)).toThrow();
    expect(() => missionAt(0, invalid)).toThrow();
    expect(() => propagate(circular, K.muEarth, invalid)).toThrow();
  });
  it("rejects negative altitude, zero radius, extreme time and singular radial orbits", () => {
    expect(() => escape(-1, 3)).toThrow();
    expect(() => capture(300, -1)).toThrow();
    expect(() => elements({ r: [0, 0], v: [0, 1] }, K.muEarth)).toThrow();
    expect(() => propagate(circular, K.muEarth, 1e11)).toThrow();
    expect(() =>
      propagate({ r: [7000, 0], v: [0, 0] }, K.muEarth, 100),
    ).toThrow(/radial/);
    expect(() => flyby(0, 500, 0, 1)).toThrow();
    expect(() => capture(300, 0, 3, 100)).toThrow();
    expect(() => missionAt(reference.flightTime + 1)).toThrow();
  });
});
