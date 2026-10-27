/** Fixed circular, coplanar teaching model. Internal units: km, seconds, radians. */
import {
  K,
  elements,
  norm,
  normalizeAngle,
  propagate,
  rad,
  rotate,
  sub,
  type OrbitElements,
  type State,
} from "./physics";

export type PlanetId =
  | "mercury"
  | "venus"
  | "earth"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune";
export type BodyId = PlanetId | "moon";
export interface Body {
  id: BodyId;
  name: { ja: string; en: string };
  mu: number;
  radius: number;
  /** Heliocentric radius for planets; geocentric radius for the Moon. */
  orbitRadius: number;
  color: string;
  minimumAltitude: number;
  defaultAltitude: number;
  kind: "rocky" | "giant" | "moon";
}

export const PLANET_IDS: readonly PlanetId[] = Object.freeze([
  "mercury",
  "venus",
  "earth",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
]);
export const BODY_IDS: readonly BodyId[] = Object.freeze([
  ...PLANET_IDS,
  "moon",
]);

/**
 * Planet-alone GMs, not satellite-system GMs. Earth/Mars retain the original
 * lessons' rounded constants and orbital radii so their numerical results agree.
 * Giant radii are equatorial reference levels, not solid surfaces.
 * Minimum altitudes are lesson constraints, not operational safety guarantees.
 */
export const BODIES: Readonly<Record<BodyId, Readonly<Body>>> = Object.freeze({
  mercury: Object.freeze({
    id: "mercury",
    name: { ja: "水星", en: "Mercury" },
    mu: 22031.868551,
    radius: 2439.4,
    orbitRadius: 0.38709927 * K.AU,
    color: "#b6a89a",
    minimumAltitude: 100,
    defaultAltitude: 300,
    kind: "rocky",
  }),
  venus: Object.freeze({
    id: "venus",
    name: { ja: "金星", en: "Venus" },
    mu: 324858.592,
    radius: 6051.8,
    orbitRadius: 0.72333566 * K.AU,
    color: "#d8b671",
    minimumAltitude: 100,
    defaultAltitude: 300,
    kind: "rocky",
  }),
  earth: Object.freeze({
    id: "earth",
    name: { ja: "地球", en: "Earth" },
    mu: K.muEarth,
    radius: K.rEarth,
    orbitRadius: K.orbitEarth,
    color: "#7db6db",
    minimumAltitude: 150,
    defaultAltitude: 200,
    kind: "rocky",
  }),
  mars: Object.freeze({
    id: "mars",
    name: { ja: "火星", en: "Mars" },
    mu: K.muMars,
    radius: K.rMars,
    orbitRadius: K.orbitMars,
    color: "#dfa17b",
    minimumAltitude: 100,
    defaultAltitude: 300,
    kind: "rocky",
  }),
  jupiter: Object.freeze({
    id: "jupiter",
    name: { ja: "木星", en: "Jupiter" },
    mu: 126686531.9003704,
    radius: 71492,
    orbitRadius: 5.202887 * K.AU,
    color: "#d7bb9c",
    minimumAltitude: 1000,
    defaultAltitude: 10000,
    kind: "giant",
  }),
  saturn: Object.freeze({
    id: "saturn",
    name: { ja: "土星", en: "Saturn" },
    mu: 37931206.23436167,
    radius: 60268,
    orbitRadius: 9.53667594 * K.AU,
    color: "#d7cb97",
    minimumAltitude: 1000,
    defaultAltitude: 10000,
    kind: "giant",
  }),
  uranus: Object.freeze({
    id: "uranus",
    name: { ja: "天王星", en: "Uranus" },
    mu: 5793951.256527211,
    radius: 25559,
    orbitRadius: 19.18916464 * K.AU,
    color: "#85c6cc",
    minimumAltitude: 1000,
    defaultAltitude: 10000,
    kind: "giant",
  }),
  neptune: Object.freeze({
    id: "neptune",
    name: { ja: "海王星", en: "Neptune" },
    mu: 6835103.145462294,
    radius: 24764,
    orbitRadius: 30.06992276 * K.AU,
    color: "#91a8e6",
    minimumAltitude: 1000,
    defaultAltitude: 10000,
    kind: "giant",
  }),
  moon: Object.freeze({
    id: "moon",
    name: { ja: "月", en: "Moon" },
    mu: 4902.800118,
    radius: 1737.4,
    orbitRadius: 384400,
    color: "#c7cbd0",
    minimumAltitude: 50,
    defaultAltitude: 100,
    kind: "moon",
  }),
});

export const SOLAR_SYSTEM_MODEL = "circular-solar-lunar-1.2.0";
export const SOLAR_SYSTEM_SOURCES = [
  {
    url: "https://ssd.jpl.nasa.gov/astro_par.html",
    accessed: "2026-10-27",
    values: "AU, day, Sun/Earth/Mercury/Venus/Moon GMs; km and seconds",
  },
  {
    url: "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/gm_de440.tpc",
    accessed: "2026-10-27",
    values:
      "Planet-alone BODY499/599/699/799/899_GM; Mars rounded to the original lesson constant",
  },
  {
    url: "https://ssd.jpl.nasa.gov/planets/approx_pos.html",
    accessed: "2026-10-27",
    values:
      "Table 1 J2000 semimajor axes reused as fixed circular radii, except legacy Earth 1 AU and Mars 1.523679 AU; rates, inclinations and eccentricities omitted",
  },
  {
    url: "https://ssd.jpl.nasa.gov/planets/phys_par.html",
    accessed: "2026-10-27",
    values:
      "Mercury/Venus/Mars mean radii and giant equatorial radii; Earth uses legacy rounded 6378.137 km",
  },
  {
    url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html",
    accessed: "2026-10-27",
    values:
      "Moon mean radius 1737.4 km and 384400 km semimajor axis reused as a circular geocentric radius",
  },
] as const;

export interface RouteInputs {
  origin: BodyId;
  destination: BodyId;
  departureAltitude: number;
  arrivalAltitude: number;
  phaseOffset: number;
  waitDays: number;
  captureFraction: number;
}
export interface RouteResult {
  inputs: Readonly<RouteInputs>;
  origin: Readonly<Body>;
  destination: Readonly<Body>;
  frame: "sun" | "earth";
  lunarDirection: "outbound" | "return" | null;
  /** Return reaches an Earth-centered orbit radius, not Earth's center. */
  encounterKind: "body-center" | "orbit-radius";
  mu: number;
  departureRadius: number;
  targetRadius: number;
  departureParkingRadius: number;
  arrivalParkingRadius: number;
  semiMajor: number;
  eccentricity: number;
  flightTime: number;
  departureCircularSpeed: number;
  targetCircularSpeed: number;
  transferDepartureSpeed: number;
  transferArrivalSpeed: number;
  /** Signed change in central-frame tangential speed, not a local rocket burn. */
  departureSignedChange: number;
  arrivalSignedChange: number;
  /** Null for lunar injection: the Earth-centered transfer remains bound. */
  departureExcess: number | null;
  /** Null for lunar return: arrival is a bound Earth-centered perigee. */
  arrivalExcess: number | null;
  nDeparture: number;
  nTarget: number;
  /** Reference target lead, or zero when Earth is the stationary return target. */
  phaseAngle: number;
  departureAngle: number;
  /** On lunar return this is departure orientation, not a moving target's lead. */
  departurePhase: number;
  departureDeltaV: number;
  arrivalDeltaV: number;
  totalDeltaV: number;
  captureBurn: number;
  capture: {
    initial: State;
    elements: OrbitElements;
    status: "target" | "captured" | "flyby" | "unsafe";
    beforeBurn: number;
    postBurnSpeed: number;
  };
  arrivalMiss: number;
  encounter: boolean;
  encounterTolerance: number;
  synodicPeriod: number;
}

function bounded(value: number, min: number, max: number, name: string) {
  if (!Number.isFinite(value) || value < min || value > max)
    throw new RangeError(`${name}: expected a finite value in ${min}…${max}`);
}
function checkPair(origin: BodyId, destination: BodyId) {
  if (!BODY_IDS.includes(origin) || !BODY_IDS.includes(destination))
    throw new RangeError("Unknown origin or destination");
  if (origin === destination) throw new RangeError("Choose different bodies");
  if (destination === "moon" && origin !== "earth")
    throw new RangeError("Lunar routes depart from Earth");
  if (origin === "moon" && destination !== "earth")
    throw new RangeError("Lunar return routes arrive at Earth");
}

export function defaultRouteInputs(
  origin: BodyId = "earth",
  destination: BodyId = "mars",
): RouteInputs {
  checkPair(origin, destination);
  return {
    origin,
    destination,
    departureAltitude: BODIES[origin].defaultAltitude,
    arrivalAltitude: BODIES[destination].defaultAltitude,
    phaseOffset: 0,
    waitDays: 0,
    captureFraction: 1,
  };
}

/** Reverse a supported reference while retaining each body's parking altitude. */
export function reverseRouteInputs(input: RouteInputs): RouteInputs {
  calculateRoute(input);
  return {
    origin: input.destination,
    destination: input.origin,
    departureAltitude: input.arrivalAltitude,
    arrivalAltitude: input.departureAltitude,
    phaseOffset: 0,
    waitDays: 0,
    captureFraction: 1,
  };
}

/** Lunar-only wrapper retained for the dedicated Earth–Moon comparison. */
export function reverseLunarInputs(input: RouteInputs): RouteInputs {
  checkPair(input.origin, input.destination);
  if (input.origin !== "moon" && input.destination !== "moon")
    throw new RangeError("Only Earth–Moon routes can be reversed here");
  return reverseRouteInputs(input);
}

/**
 * An ideal Hohmann half ellipse plus independent local energy estimates.
 * No finite sphere-of-influence joins, atmosphere, rings, or ephemerides.
 * Earth-to-Moon injection and Moon-to-Earth arrival belong to a bound
 * Earth-centered ellipse. Moon capture/escape uses an independent local
 * energy estimate based on the aligned transfer's Moon-relative speed.
 */
export function calculateRoute(input: RouteInputs): RouteResult {
  checkPair(input.origin, input.destination);
  const origin = BODIES[input.origin],
    destination = BODIES[input.destination];
  bounded(
    input.departureAltitude,
    origin.minimumAltitude,
    100000,
    "departure altitude",
  );
  bounded(
    input.arrivalAltitude,
    destination.minimumAltitude,
    100000,
    "arrival altitude",
  );
  bounded(input.phaseOffset, -180, 180, "phase offset");
  bounded(input.waitDays, 0, 100000, "waiting days");
  bounded(input.captureFraction, 0, 1.5, "capture fraction");
  const inputs = Object.freeze({ ...input });
  const lunarOutbound = destination.id === "moon";
  const lunarReturn = origin.id === "moon";
  const lunar = lunarOutbound || lunarReturn;
  const mu = lunar ? K.muEarth : K.muSun;
  const departureParkingRadius = origin.radius + inputs.departureAltitude;
  const arrivalParkingRadius = destination.radius + inputs.arrivalAltitude;
  const departureRadius = lunarOutbound
    ? departureParkingRadius
    : origin.orbitRadius;
  const targetRadius = lunarReturn
    ? arrivalParkingRadius
    : destination.orbitRadius;
  const semiMajor = (departureRadius + targetRadius) / 2;
  const eccentricity =
    Math.abs(targetRadius - departureRadius) / (targetRadius + departureRadius);
  const flightTime = Math.PI * Math.sqrt(semiMajor ** 3 / mu);
  const departureCircularSpeed = Math.sqrt(mu / departureRadius);
  const targetCircularSpeed = Math.sqrt(mu / targetRadius);
  const transferDepartureSpeed = Math.sqrt(
    mu * (2 / departureRadius - 1 / semiMajor),
  );
  const transferArrivalSpeed = Math.sqrt(
    mu * (2 / targetRadius - 1 / semiMajor),
  );
  const departureSignedChange = transferDepartureSpeed - departureCircularSpeed;
  const arrivalSignedChange = targetCircularSpeed - transferArrivalSpeed;
  const departureExcess = lunarOutbound
    ? null
    : Math.abs(departureSignedChange);
  const arrivalExcess = lunarReturn ? null : Math.abs(arrivalSignedChange);
  const nDeparture = Math.sqrt(mu / departureRadius ** 3);
  // Earth is at the origin on return; it has no target orbital phase to catch.
  const nTarget = lunarReturn ? 0 : Math.sqrt(mu / targetRadius ** 3);
  const phaseAngle = lunarReturn
    ? 0
    : normalizeAngle(Math.PI - nTarget * flightTime);
  const waiting = inputs.waitDays * K.DAY;
  const departureAngle = normalizeAngle(
    nDeparture * waiting + (lunarReturn ? rad(inputs.phaseOffset) : 0),
  );
  const departurePhase = lunarReturn
    ? departureAngle
    : normalizeAngle(
        phaseAngle + rad(inputs.phaseOffset) + (nTarget - nDeparture) * waiting,
      );
  const departureDeltaV = lunarOutbound
    ? departureSignedChange
    : Math.sqrt(
        departureExcess! ** 2 + (2 * origin.mu) / departureParkingRadius,
      ) - Math.sqrt(origin.mu / departureParkingRadius);
  const beforeBurn = lunarReturn
    ? transferArrivalSpeed
    : Math.sqrt(
        arrivalExcess! ** 2 + (2 * destination.mu) / arrivalParkingRadius,
      );
  const arrivalDeltaV =
    beforeBurn - Math.sqrt(destination.mu / arrivalParkingRadius);
  const captureBurn = inputs.captureFraction * arrivalDeltaV;
  const postBurnSpeed = beforeBurn - captureBurn;
  const initial: State = {
    r: [arrivalParkingRadius, 0],
    v: [0, postBurnSpeed],
  };
  const orbit = elements(initial, destination.mu);
  const safe =
    orbit.type !== "radial" &&
    orbit.periapsisRadius >=
      destination.radius + destination.minimumAltitude - 1e-6;
  const bound = orbit.energy < (-1e-12 * destination.mu) / arrivalParkingRadius;
  const targetReached =
    safe &&
    bound &&
    orbit.apoapsisRadius !== null &&
    Math.abs(orbit.periapsisRadius - arrivalParkingRadius) <=
      arrivalParkingRadius * 0.01 &&
    Math.abs(orbit.apoapsisRadius - arrivalParkingRadius) <=
      arrivalParkingRadius * 0.01;
  const captureStatus = !safe
    ? "unsafe"
    : !bound
      ? "flyby"
      : targetReached
        ? "target"
        : "captured";
  const route: RouteResult = {
    inputs,
    origin,
    destination,
    frame: lunar ? "earth" : "sun",
    lunarDirection: lunarOutbound ? "outbound" : lunarReturn ? "return" : null,
    encounterKind: lunarReturn ? "orbit-radius" : "body-center",
    mu,
    departureRadius,
    targetRadius,
    departureParkingRadius,
    arrivalParkingRadius,
    semiMajor,
    eccentricity,
    flightTime,
    departureCircularSpeed,
    targetCircularSpeed,
    transferDepartureSpeed,
    transferArrivalSpeed,
    departureSignedChange,
    arrivalSignedChange,
    departureExcess,
    arrivalExcess,
    nDeparture,
    nTarget,
    phaseAngle,
    departureAngle,
    departurePhase,
    departureDeltaV,
    arrivalDeltaV,
    totalDeltaV: departureDeltaV + arrivalDeltaV,
    captureBurn,
    capture: {
      initial,
      elements: orbit,
      status: captureStatus,
      beforeBurn,
      postBurnSpeed,
    },
    arrivalMiss: 0,
    encounter: false,
    encounterTolerance: lunarReturn ? 1 : lunarOutbound ? 1000 : 10000,
    synodicPeriod: (2 * Math.PI) / Math.abs(nDeparture - nTarget),
  };
  const arrival = routeAt(route, flightTime);
  route.arrivalMiss = lunarReturn
    ? Math.abs(norm(arrival.probe.r) - targetRadius)
    : arrival.distance;
  route.encounter = route.arrivalMiss <= route.encounterTolerance;
  return route;
}

function circularState(radius: number, speed: number, angle: number): State {
  const normalized = normalizeAngle(angle);
  return {
    r: rotate([radius, 0], normalized),
    v: rotate([0, speed], normalized),
  };
}

/** Lunar return rotates departure with the Moon; Earth remains at the origin. */
export function routeAt(route: RouteResult, time: number) {
  bounded(time, 0, route.flightTime, "elapsed time");
  const initial = circularState(
    route.departureRadius,
    route.transferDepartureSpeed,
    route.departureAngle,
  );
  const probe = propagate(initial, route.mu, time);
  const origin: State =
    route.lunarDirection === "outbound"
      ? { r: [0, 0], v: [0, 0] }
      : circularState(
          route.departureRadius,
          route.departureCircularSpeed,
          route.departureAngle + route.nDeparture * time,
        );
  const target: State =
    route.lunarDirection === "return"
      ? { r: [0, 0], v: [0, 0] }
      : circularState(
          route.targetRadius,
          route.targetCircularSpeed,
          route.departureAngle + route.departurePhase + route.nTarget * time,
        );
  return { probe, origin, target, distance: norm(sub(probe.r, target.r)) };
}

export function sampleRoute(route: RouteResult, count = 181) {
  bounded(count, 2, 1001, "sample count");
  if (!Number.isInteger(count))
    throw new RangeError("Sample count must be an integer");
  return Array.from({ length: count }, (_, i) => {
    const time =
      i === count - 1 ? route.flightTime : (route.flightTime * i) / (count - 1);
    return { time, state: routeAt(route, time).probe };
  });
}
