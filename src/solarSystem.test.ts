import { describe, expect, it } from "vitest";
import {
  K,
  capture,
  dot,
  elements,
  escape,
  hohmann,
  norm,
  sub,
} from "./physics";
import {
  BODIES,
  PLANET_IDS,
  calculateRoute,
  defaultRouteInputs,
  routeAt,
  sampleRoute,
  type BodyId,
  type PlanetId,
} from "./solarSystem";

const planetPairs = PLANET_IDS.flatMap((origin) =>
  PLANET_IDS.filter((destination) => destination !== origin).map(
    (destination) => [origin, destination] as const,
  ),
);
const relative = (actual: number, expected: number) =>
  Math.abs((actual - expected) / expected);

describe("planetary route model", () => {
  it.each(planetPairs)(
    "%s → %s reaches the destination and conserves energy",
    (origin, destination) => {
      const route = calculateRoute(defaultRouteInputs(origin, destination));
      const initial = routeAt(route, 0),
        endpoint = routeAt(route, route.flightTime);
      expect(route.encounter).toBe(true);
      expect(route.arrivalMiss).toBeLessThan(0.1);
      expect(route.capture.status).toBe("target");
      expect(norm(sub(initial.probe.r, initial.origin.r))).toBeLessThan(1e-6);
      expect(
        relative(norm(endpoint.probe.r), BODIES[destination].orbitRadius),
      ).toBeLessThan(1e-10);
      expect(route.departureDeltaV).toBeGreaterThan(0);
      expect(route.arrivalDeltaV).toBeGreaterThan(0);
      expect(route.eccentricity).toBeGreaterThanOrEqual(0);
      expect(route.eccentricity).toBeLessThan(1);
      const referenceEnergy = elements(initial.probe, K.muSun).energy;
      for (const { state } of sampleRoute(route, 13)) {
        expect(
          relative(elements(state, K.muSun).energy, referenceEnergy),
        ).toBeLessThan(1e-9);
        expect([...state.r, ...state.v].every(Number.isFinite)).toBe(true);
      }
    },
  );

  it("retains all original Earth → Mars numerical references", () => {
    const route = calculateRoute(defaultRouteInputs());
    const old = hohmann();
    expect(route.flightTime).toBe(old.flightTime);
    expect(route.phaseAngle).toBe(old.phaseAngle);
    expect(route.departureExcess).toBe(old.vInfinityDepart);
    expect(route.arrivalExcess).toBe(old.vInfinityArrive);
    expect(route.departureDeltaV).toBeCloseTo(
      escape(200, old.vInfinityDepart).deltaV,
      12,
    );
    expect(route.arrivalDeltaV).toBeCloseTo(capture(300, 0).circularDeltaV, 12);
  });

  it.each(["mercury", "venus"] as const)(
    "Earth → %s correctly slows in the Sun frame",
    (destination) => {
      const inward = calculateRoute(defaultRouteInputs("earth", destination));
      const outward = calculateRoute(defaultRouteInputs(destination, "earth"));
      expect(inward.departureSignedChange).toBeLessThan(0);
      expect(inward.arrivalSignedChange).toBeLessThan(0);
      expect(inward.departureExcess).toBeGreaterThan(0);
      expect(inward.flightTime).toBe(outward.flightTime);
      expect(inward.departureExcess).toBeCloseTo(outward.arrivalExcess, 12);
      expect(inward.arrivalExcess).toBeCloseTo(outward.departureExcess!, 12);
    },
  );

  it("distinguishes planet-alone masses from planet-and-moons systems", () => {
    expect(BODIES.jupiter.mu).toBeCloseTo(126686531.9003704, 5);
    expect(BODIES.jupiter.mu).toBeLessThan(126712764.1);
    expect(BODIES.mars.mu).toBe(K.muMars);
    expect(BODIES.saturn.radius).toBe(60268);
  });

  it.each(["mercury", "mars", "neptune", "moon"] as const)(
    "phase offsets miss %s without modifying the ideal transfer",
    (destination) => {
      const input = defaultRouteInputs("earth", destination);
      const reference = calculateRoute(input);
      const changed = calculateRoute({ ...input, phaseOffset: 10 });
      expect(changed.encounter).toBe(false);
      // Equal-radius chord for a 10-degree timing miss.
      expect(
        relative(
          changed.arrivalMiss,
          2 * changed.targetRadius * Math.sin(Math.PI / 36),
        ),
      ).toBeLessThan(1e-9);
      expect(changed.flightTime).toBe(reference.flightTime);
      expect(changed.departureDeltaV).toBe(reference.departureDeltaV);
      expect(changed.arrivalDeltaV).toBe(reference.arrivalDeltaV);
      // Local target attainment is only a hypothetical reference when the route misses.
      expect(changed.capture.status).toBe("target");
    },
  );

  it.each(["mercury", "mars", "neptune", "moon"] as const)(
    "waiting changes %s encounter and one relative period restores it",
    (destination) => {
      const input = defaultRouteInputs("earth", destination);
      const route = calculateRoute(input);
      const missed = calculateRoute({
        ...input,
        waitDays: route.synodicPeriod / K.DAY / 4,
      });
      expect(missed.encounter).toBe(false);
      expect(
        relative(missed.arrivalMiss, Math.SQRT2 * route.targetRadius),
      ).toBeLessThan(1e-8);
      expect(
        calculateRoute({ ...input, waitDays: route.synodicPeriod / K.DAY })
          .encounter,
      ).toBe(true);
    },
  );

  it("parking and target heights affect the corresponding local burn only", () => {
    const input = defaultRouteInputs();
    const reference = calculateRoute(input);
    const departure = calculateRoute({ ...input, departureAltitude: 1000 });
    const arrival = calculateRoute({ ...input, arrivalAltitude: 1000 });
    expect(departure.departureDeltaV).not.toBe(reference.departureDeltaV);
    expect(departure.arrivalDeltaV).toBe(reference.arrivalDeltaV);
    expect(arrival.departureDeltaV).toBe(reference.departureDeltaV);
    expect(arrival.arrivalDeltaV).not.toBe(reference.arrivalDeltaV);
    expect(departure.flightTime).toBe(reference.flightTime);
    expect(arrival.flightTime).toBe(reference.flightTime);
  });
});

describe("geocentric lunar transfer", () => {
  it("uses a bound Earth-centered injection, with independent approximate lunar capture", () => {
    const route = calculateRoute(defaultRouteInputs("earth", "moon"));
    expect(route.frame).toBe("earth");
    expect(route.mu).toBe(K.muEarth);
    expect(route.departureExcess).toBeNull();
    expect(route.departureRadius).toBe(K.rEarth + 200);
    expect(route.flightTime / K.DAY).toBeCloseTo(4.978, 2);
    expect(route.departureDeltaV).toBeCloseTo(3.131, 2);
    expect(route.arrivalExcess).toBeCloseTo(0.831, 2);
    expect(route.arrivalDeltaV).toBeCloseTo(0.821, 2);
    expect(routeAt(route, route.flightTime / 2).origin).toEqual({
      r: [0, 0],
      v: [0, 0],
    });
    expect(elements(routeAt(route, 0).probe, K.muEarth).energy).toBeLessThan(0);
  });

  it("changes transfer time with parking height and conserves Earth-frame invariants", () => {
    const input = defaultRouteInputs("earth", "moon");
    const baseline = calculateRoute(input);
    const route = calculateRoute({ ...input, departureAltitude: 1000 });
    expect(route.flightTime).toBeGreaterThan(baseline.flightTime);
    const initial = routeAt(route, 0).probe;
    const initialOrbit = elements(initial, route.mu);
    for (const { state } of sampleRoute(route, 15)) {
      expect(
        relative(elements(state, route.mu).energy, initialOrbit.energy),
      ).toBeLessThan(1e-9);
      expect(
        relative(
          elements(state, route.mu).angularMomentum,
          initialOrbit.angularMomentum,
        ),
      ).toBeLessThan(1e-9);
    }
    expect(dot(initial.r, initial.v)).toBeCloseTo(0, 10);
  });
});

describe("local capture and input domain", () => {
  it("recognizes an excessive burn that reverses velocity into an unbound orbit", () => {
    const route = calculateRoute({
      ...defaultRouteInputs("neptune", "mercury"),
      captureFraction: 1.5,
    });
    expect(route.capture.postBurnSpeed).toBeLessThan(0);
    expect(route.capture.elements.energy).toBeGreaterThan(0);
    expect(route.capture.status).toBe("flyby");
  });

  it.each(["mercury", "mars", "jupiter", "moon"] as const)(
    "%s separates capture fraction from arrival timing",
    (destination) => {
      const input = defaultRouteInputs("earth", destination);
      const none = calculateRoute({ ...input, captureFraction: 0 });
      const circular = calculateRoute(input);
      const excessive = calculateRoute({ ...input, captureFraction: 1.5 });
      expect(none.capture.status).toBe("flyby");
      expect(none.capture.elements.energy).toBeGreaterThan(0);
      expect(circular.capture.status).toBe("target");
      expect(excessive.capture.status).not.toBe("target");
      expect(circular.arrivalMiss).toBe(none.arrivalMiss);
      expect(circular.arrivalDeltaV).toBe(none.arrivalDeltaV);
      expect(circular.captureBurn).toBe(circular.arrivalDeltaV);
      expect(none.captureBurn).toBe(0);
    },
  );

  it.each(planetPairs)(
    "%s → %s remains finite at supported height and braking boundaries",
    (origin, destination) => {
      const route = calculateRoute({
        ...defaultRouteInputs(origin, destination),
        departureAltitude: 100000,
        arrivalAltitude: 100000,
        captureFraction: 1.5,
        waitDays: 100000,
      });
      expect(Number.isFinite(route.arrivalMiss)).toBe(true);
      expect(Number.isFinite(route.totalDeltaV)).toBe(true);
      expect(Number.isFinite(route.capture.elements.energy)).toBe(true);
      expect(sampleRoute(route, 3)).toHaveLength(3);
    },
  );

  it("rejects unsupported origins, same-body routes, lunar origin and non-Earth lunar routes", () => {
    expect(() => defaultRouteInputs("earth", "earth")).toThrow(RangeError);
    expect(() => defaultRouteInputs("mars", "moon")).toThrow(RangeError);
    expect(() => defaultRouteInputs("moon" as PlanetId, "earth")).toThrow(
      RangeError,
    );
    expect(() => defaultRouteInputs("earth", "pluto" as BodyId)).toThrow(
      RangeError,
    );
  });

  it.each([
    { departureAltitude: -1 },
    { arrivalAltitude: 99 },
    { departureAltitude: 100001 },
    { arrivalAltitude: Number.NaN },
    { waitDays: Infinity },
    { waitDays: -1 },
    { phaseOffset: 181 },
    { captureFraction: -0.1 },
    { captureFraction: 1.501 },
  ])("rejects invalid parameters %o", (patch) => {
    expect(() => calculateRoute({ ...defaultRouteInputs(), ...patch })).toThrow(
      RangeError,
    );
  });

  it("rejects invalid timeline and sample requests without silently clipping", () => {
    const route = calculateRoute(defaultRouteInputs());
    expect(() => routeAt(route, -1)).toThrow(RangeError);
    expect(() => routeAt(route, route.flightTime + 1)).toThrow(RangeError);
    expect(() => routeAt(route, NaN)).toThrow(RangeError);
    expect(() => sampleRoute(route, 1)).toThrow(RangeError);
    expect(() => sampleRoute(route, 3.5)).toThrow(RangeError);
    expect(sampleRoute(route)).toHaveLength(181);
  });
});
