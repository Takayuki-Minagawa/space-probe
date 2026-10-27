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
  reverseLunarInputs,
  reverseRouteInputs,
  routeAt,
  sampleRoute,
  type BodyId,
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
      expect(inward.departureExcess).toBeCloseTo(outward.arrivalExcess!, 12);
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

describe("planetary outbound and return references", () => {
  it.each(PLANET_IDS.filter((id) => id !== "earth"))(
    "Earth ↔ %s shares flight time and exchanges local burns at matching heights",
    (planet) => {
      const input = defaultRouteInputs("earth", planet);
      const outbound = calculateRoute(input);
      const inbound = calculateRoute(reverseRouteInputs(input));
      expect(inbound.frame).toBe("sun");
      expect(inbound.lunarDirection).toBeNull();
      expect(inbound.encounterKind).toBe("body-center");
      expect(inbound.flightTime).toBe(outbound.flightTime);
      expect(inbound.departureDeltaV).toBe(outbound.arrivalDeltaV);
      expect(inbound.arrivalDeltaV).toBe(outbound.departureDeltaV);
      expect(inbound.totalDeltaV).toBe(outbound.totalDeltaV);
      expect(inbound.departureExcess).toBe(outbound.arrivalExcess);
      expect(inbound.arrivalExcess).toBe(outbound.departureExcess);
      expect(inbound.arrivalExcess).toBeGreaterThan(0);
      expect(inbound.departureSignedChange).toBe(-outbound.arrivalSignedChange);
      expect(inbound.arrivalSignedChange).toBe(-outbound.departureSignedChange);
      expect(inbound.phaseAngle).not.toBe(outbound.phaseAngle);
      expect(inbound.encounter).toBe(true);
      expect(inbound.capture.status).toBe("target");
      const unbraked = calculateRoute({
        ...inbound.inputs,
        captureFraction: 0,
      });
      expect(unbraked.capture.status).toBe("flyby");
      expect(unbraked.capture.elements.energy).toBeGreaterThan(0);
    },
  );

  it.each(PLANET_IDS.filter((id) => id !== "earth"))(
    "Earth ↔ %s preserves edited body altitudes and resets independent reference timing",
    (planet) => {
      const input = {
        ...defaultRouteInputs("earth", planet),
        departureAltitude: 1200,
        arrivalAltitude: BODIES[planet].defaultAltitude + 700,
        phaseOffset: 35,
        waitDays: 25,
        captureFraction: 0.4,
      };
      const original = { ...input };
      const reversed = reverseRouteInputs(input);
      expect(reversed).toEqual({
        origin: planet,
        destination: "earth",
        departureAltitude: input.arrivalAltitude,
        arrivalAltitude: input.departureAltitude,
        phaseOffset: 0,
        waitDays: 0,
        captureFraction: 1,
      });
      const reference = {
        ...input,
        phaseOffset: 0,
        waitDays: 0,
        captureFraction: 1,
      };
      expect(reverseRouteInputs(reversed)).toEqual(reference);
      expect(input).toEqual(original);
      const outbound = calculateRoute(reference);
      const inbound = calculateRoute(reversed);
      expect(inbound.flightTime).toBe(outbound.flightTime);
      expect(inbound.departureParkingRadius).toBe(
        outbound.arrivalParkingRadius,
      );
      expect(inbound.arrivalParkingRadius).toBe(
        outbound.departureParkingRadius,
      );
      expect(inbound.departureDeltaV).toBe(outbound.arrivalDeltaV);
      expect(inbound.arrivalDeltaV).toBe(outbound.departureDeltaV);
      expect(inbound.totalDeltaV).toBe(outbound.totalDeltaV);
      expect(inbound.encounter).toBe(true);
      expect(outbound.encounter).toBe(true);
    },
  );

  it("validates a reference before resetting its edited fields", () => {
    const input = defaultRouteInputs("earth", "mars");
    for (const patch of [
      { origin: "pluto" as BodyId },
      { destination: "earth" as BodyId },
      { origin: "moon" as BodyId },
      { departureAltitude: 149 },
      { arrivalAltitude: NaN },
      { waitDays: -1 },
      { phaseOffset: 181 },
      { captureFraction: 1.501 },
    ]) {
      expect(() => reverseRouteInputs({ ...input, ...patch })).toThrow(
        RangeError,
      );
    }
  });

  it("keeps both lunar directions compatible with the lunar-only wrapper", () => {
    for (const [origin, destination] of [
      ["earth", "moon"],
      ["moon", "earth"],
    ] as const) {
      const input = defaultRouteInputs(origin, destination);
      expect(reverseRouteInputs(input)).toEqual(reverseLunarInputs(input));
    }
    const venusToMars = defaultRouteInputs("venus", "mars");
    expect(reverseRouteInputs(reverseRouteInputs(venusToMars))).toEqual(
      venusToMars,
    );
  });
});

describe("geocentric lunar transfer", () => {
  it("uses a bound Earth-centered injection, with independent approximate lunar capture", () => {
    const route = calculateRoute(defaultRouteInputs("earth", "moon"));
    expect(route.frame).toBe("earth");
    expect(route.lunarDirection).toBe("outbound");
    expect(route.encounterKind).toBe("body-center");
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

describe("lunar return and reversible reference", () => {
  it.each([
    [200, 100],
    [150, 50],
    [1000, 500],
    [100000, 100000],
  ])(
    "preserves time and swaps burns for Earth %i km / Moon %i km",
    (earthAltitude, moonAltitude) => {
      const outboundInput = {
        ...defaultRouteInputs("earth", "moon"),
        departureAltitude: earthAltitude,
        arrivalAltitude: moonAltitude,
      };
      const outbound = calculateRoute(outboundInput);
      const returning = calculateRoute(reverseLunarInputs(outboundInput));
      expect(returning.lunarDirection).toBe("return");
      expect(returning.frame).toBe("earth");
      expect(returning.mu).toBe(K.muEarth);
      expect(returning.flightTime).toBe(outbound.flightTime);
      expect(returning.departureDeltaV).toBe(outbound.arrivalDeltaV);
      expect(returning.arrivalDeltaV).toBe(outbound.departureDeltaV);
      expect(returning.totalDeltaV).toBe(outbound.totalDeltaV);
      expect(returning.departureExcess).toBe(outbound.arrivalExcess);
      expect(returning.arrivalExcess).toBeNull();
      expect(returning.transferDepartureSpeed).toBe(
        outbound.transferArrivalSpeed,
      );
      expect(returning.transferArrivalSpeed).toBe(
        outbound.transferDepartureSpeed,
      );
      expect(returning.encounter).toBe(true);
      expect(returning.capture.status).toBe("target");
    },
  );

  it("retains per-body heights while resetting timing and braking for a reference", () => {
    const input = {
      ...defaultRouteInputs("earth", "moon"),
      departureAltitude: 800,
      arrivalAltitude: 350,
      phaseOffset: 75,
      waitDays: 12,
      captureFraction: 0.25,
    };
    const reverse = reverseLunarInputs(input);
    expect(reverse).toEqual({
      origin: "moon",
      destination: "earth",
      departureAltitude: 350,
      arrivalAltitude: 800,
      phaseOffset: 0,
      waitDays: 0,
      captureFraction: 1,
    });
    expect(reverseLunarInputs(reverse)).toEqual({
      ...input,
      phaseOffset: 0,
      waitDays: 0,
      captureFraction: 1,
    });
    expect(input.phaseOffset).toBe(75);
    expect(() => reverseLunarInputs(defaultRouteInputs())).toThrow(RangeError);
    expect(() =>
      reverseLunarInputs({ ...input, departureAltitude: -1 }),
    ).toThrow(RangeError);
  });

  it("uses bound Earth arrival directly and leaves an ellipse without braking", () => {
    const input = defaultRouteInputs("moon", "earth");
    expect(input.departureAltitude).toBe(100);
    expect(input.arrivalAltitude).toBe(200);
    const route = calculateRoute({ ...input, captureFraction: 0 });
    expect(route.arrivalExcess).toBeNull();
    expect(route.capture.beforeBurn).toBe(route.transferArrivalSpeed);
    expect(route.arrivalDeltaV).toBe(
      route.transferArrivalSpeed - Math.sqrt(K.muEarth / (K.rEarth + 200)),
    );
    expect(route.capture.status).toBe("captured");
    expect(route.capture.elements.energy).toBeLessThan(0);
    expect(route.capture.elements.periapsisRadius).toBeCloseTo(
      K.rEarth + 200,
      7,
    );
    expect(route.capture.elements.apoapsisRadius).toBeCloseTo(
      BODIES.moon.orbitRadius,
      5,
    );
    expect(route.captureBurn).toBe(0);
    expect(route.capture.elements.semiMajor).toBeCloseTo(route.semiMajor, 5);
  });

  it("shows partial circularization, circular arrival, and unsafe excessive braking", () => {
    const input = defaultRouteInputs("moon", "earth");
    const none = calculateRoute({ ...input, captureFraction: 0 });
    const partial = calculateRoute({ ...input, captureFraction: 0.5 });
    const circular = calculateRoute(input);
    const excessive = calculateRoute({ ...input, captureFraction: 1.5 });
    expect(partial.capture.status).toBe("captured");
    expect(partial.capture.elements.periapsisRadius).toBeCloseTo(
      circular.arrivalParkingRadius,
      7,
    );
    expect(partial.capture.elements.apoapsisRadius!).toBeLessThan(
      none.capture.elements.apoapsisRadius!,
    );
    expect(partial.capture.elements.apoapsisRadius!).toBeGreaterThan(
      circular.arrivalParkingRadius,
    );
    expect(circular.capture.status).toBe("target");
    expect(circular.capture.elements.eccentricity).toBeLessThan(1e-12);
    expect(excessive.capture.status).toBe("unsafe");
    expect(excessive.capture.elements.periapsisRadius).toBeLessThan(K.rEarth);
    for (const route of [none, partial, circular, excessive]) {
      expect(route.capture.elements.energy).toBeLessThan(0);
      expect(route.arrivalMiss).toBe(circular.arrivalMiss);
      expect(route.arrivalDeltaV).toBe(circular.arrivalDeltaV);
      expect(route.flightTime).toBe(circular.flightTime);
    }
  });

  it.each([
    { phaseOffset: 90, waitDays: 0 },
    { phaseOffset: -180, waitDays: 1 },
    { phaseOffset: 180, waitDays: 100000 },
  ])("changes orientation only for %o", (patch) => {
    const input = defaultRouteInputs("moon", "earth");
    const reference = calculateRoute(input);
    const route = calculateRoute({ ...input, ...patch });
    expect(route.encounterKind).toBe("orbit-radius");
    expect(route.encounterTolerance).toBe(1);
    expect(route.phaseAngle).toBe(0);
    expect(route.nTarget).toBe(0);
    expect(route.departurePhase).toBe(route.departureAngle);
    expect(route.synodicPeriod).toBeCloseTo(
      (2 * Math.PI) / route.nDeparture,
      7,
    );
    expect(route.encounter).toBe(true);
    expect(route.arrivalMiss).toBeCloseTo(reference.arrivalMiss, 5);
    expect(route.flightTime).toBe(reference.flightTime);
    expect(route.totalDeltaV).toBe(reference.totalDeltaV);
    const initial = routeAt(route, 0);
    expect(norm(sub(initial.origin.r, initial.probe.r))).toBeLessThan(1e-8);
    expect(
      norm(sub(initial.probe.r, routeAt(reference, 0).probe.r)),
    ).toBeGreaterThan(1);
    const endpoint = routeAt(route, route.flightTime);
    expect(endpoint.target).toEqual({ r: [0, 0], v: [0, 0] });
    expect(endpoint.distance).toBeCloseTo(route.targetRadius, 5);
    expect(endpoint.distance).toBeGreaterThan(6000);
    expect(route.arrivalMiss).toBe(
      Math.abs(endpoint.distance - route.targetRadius),
    );
    expect(norm(endpoint.origin.r)).toBeCloseTo(BODIES.moon.orbitRadius, 7);
  });

  it("preserves Earth-frame energy and angular momentum from Moon to perigee", () => {
    const route = calculateRoute(defaultRouteInputs("moon", "earth"));
    const initial = elements(routeAt(route, 0).probe, route.mu);
    for (const { state } of sampleRoute(route, 15)) {
      const orbit = elements(state, route.mu);
      expect(relative(orbit.energy, initial.energy)).toBeLessThan(1e-9);
      expect(
        relative(orbit.angularMomentum, initial.angularMomentum),
      ).toBeLessThan(1e-9);
      expect([...state.r, ...state.v].every(Number.isFinite)).toBe(true);
    }
  });

  it("checks Moon departure and Earth arrival bounds against their own bodies", () => {
    const input = defaultRouteInputs("moon", "earth");
    expect(() => calculateRoute({ ...input, departureAltitude: 49 })).toThrow(
      RangeError,
    );
    expect(() => calculateRoute({ ...input, arrivalAltitude: 149 })).toThrow(
      RangeError,
    );
    expect(() =>
      calculateRoute({ ...input, departureAltitude: 100001 }),
    ).toThrow(RangeError);
    expect(() => calculateRoute({ ...input, arrivalAltitude: 100001 })).toThrow(
      RangeError,
    );
    const route = calculateRoute({
      ...input,
      departureAltitude: 50,
      arrivalAltitude: 150,
    });
    expect(route.encounter).toBe(true);
    expect(route.capture.status).toBe("target");
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

  it("rejects unknown bodies, same-body routes, and lunar routes beyond Earth", () => {
    expect(() => defaultRouteInputs("earth", "earth")).toThrow(RangeError);
    expect(() => defaultRouteInputs("mars", "moon")).toThrow(RangeError);
    expect(() => defaultRouteInputs("moon", "mars")).toThrow(RangeError);
    expect(() => defaultRouteInputs("moon", "moon")).toThrow(RangeError);
    expect(() => defaultRouteInputs("pluto" as BodyId, "earth")).toThrow(
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
