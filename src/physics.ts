/** Deterministic educational two-body model. All internal units: km, s, rad. */
export const K = Object.freeze({
  version: "planar-two-body-1.0.0",
  AU: 149597870.7,
  DAY: 86400,
  muSun: 132712440041.279419,
  muEarth: 398600.435507,
  muMars: 42828.37362,
  rEarth: 6378.137,
  rMars: 3389.5,
  orbitEarth: 149597870.7,
  orbitMars: 1.523679 * 149597870.7,
  safeEarth: 150,
  safeMars: 100,
});

export const CONSTANT_SOURCES = [
  {
    url: "https://ssd.jpl.nasa.gov/astro_par.html",
    accessed: "2026-10-27",
    values:
      "AU [km], DAY [s], muSun / muEarth [km³/s²]; DE440, converted from SI where needed",
  },
  {
    url: "https://ssd.jpl.nasa.gov/sats/phys_par/",
    accessed: "2026-10-27",
    values: "muMars [km³/s²], Mars alone, not Mars system",
  },
  {
    url: "./惑星探査シミュレーター_AI開発指示書.md",
    accessed: "2026-10-27",
    values:
      "Fixed educational radii [km], circular Mars orbit [AU]; safety altitude is a teaching constraint, not an operational limit",
  },
] as const;

export type Vec = [number, number];
export type State = { r: Vec; v: Vec };
export type OrbitElements = {
  energy: number;
  angularMomentum: number;
  eccentricity: number;
  semiMajor: number | null;
  periapsisRadius: number;
  apoapsisRadius: number | null;
  period: number | null;
  type: "circular" | "elliptic" | "parabolic" | "hyperbolic" | "radial";
};

export const norm = (v: Vec) => Math.hypot(v[0], v[1]);
export const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1]];
export const scale = (a: Vec, factor: number): Vec => [
  a[0] * factor,
  a[1] * factor,
];
export const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1];
export const rotate = (v: Vec, angle: number): Vec => [
  v[0] * Math.cos(angle) - v[1] * Math.sin(angle),
  v[0] * Math.sin(angle) + v[1] * Math.cos(angle),
];
export const rad = (degrees: number) => (degrees * Math.PI) / 180;
export const deg = (radians: number) => (radians * 180) / Math.PI;
export const normalizeAngle = (angle: number) =>
  ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

function finite(value: number, name: string) {
  if (!Number.isFinite(value))
    throw new RangeError(`${name}: finite number required`);
}
function range(value: number, minimum: number, maximum: number, name: string) {
  finite(value, name);
  if (value < minimum || value > maximum)
    throw new RangeError(`${name}: outside ${minimum}…${maximum}`);
}
function validateState(state: State, mu: number) {
  range(mu, Number.MIN_VALUE, 1e15, "mu");
  for (const value of [...state.r, ...state.v]) finite(value, "state");
  range(norm(state.r), 1e-6, 1e14, "radius");
  range(norm(state.v), 0, 1e5, "speed");
}

export function elements(state: State, mu: number): OrbitElements {
  validateState(state, mu);
  const radius = norm(state.r);
  const speedSquared = dot(state.v, state.v);
  const energy = speedSquared / 2 - mu / radius;
  const angularMomentum = state.r[0] * state.v[1] - state.r[1] * state.v[0];
  const eccentricityVector = scale(
    sub(
      scale(state.r, speedSquared - mu / radius),
      scale(state.v, dot(state.r, state.v)),
    ),
    1 / mu,
  );
  const eccentricity = norm(eccentricityVector);
  const parabolic = Math.abs(energy) <= (1e-12 * mu) / radius;
  const semiMajor = parabolic ? null : -mu / (2 * energy);
  const periapsisRadius = angularMomentum ** 2 / (mu * (1 + eccentricity));
  const bound = energy < 0 && !parabolic;
  return {
    energy,
    angularMomentum,
    eccentricity,
    semiMajor,
    periapsisRadius,
    apoapsisRadius:
      bound && semiMajor !== null ? semiMajor * (1 + eccentricity) : null,
    period:
      bound && semiMajor !== null
        ? 2 * Math.PI * Math.sqrt(semiMajor ** 3 / mu)
        : null,
    type:
      Math.abs(angularMomentum) < 1e-12 * Math.sqrt(mu * radius)
        ? "radial"
        : parabolic
          ? "parabolic"
          : energy > 0
            ? "hyperbolic"
            : eccentricity < 1e-9
              ? "circular"
              : "elliptic",
  };
}

/** Stable Stumpff functions at the parabolic boundary (z = 0). */
function stumpff(z: number): [number, number] {
  if (Math.abs(z) < 0.01) {
    let c = 0.5,
      s = 1 / 6,
      tc = c,
      ts = s;
    for (let k = 1; k < 12; k++) {
      tc *= -z / ((2 * k + 1) * (2 * k + 2));
      ts *= -z / ((2 * k + 2) * (2 * k + 3));
      c += tc;
      s += ts;
    }
    return [c, s];
  }
  if (z > 0) {
    const q = Math.sqrt(z);
    return [(1 - Math.cos(q)) / z, (q - Math.sin(q)) / q ** 3];
  }
  const q = Math.sqrt(-z);
  if (q > 600)
    throw new RangeError(
      "propagation: hyperbolic extent exceeds supported range",
    );
  return [(Math.cosh(q) - 1) / -z, (Math.sinh(q) - q) / q ** 3];
}

/** Universal-variable Kepler solution; root bracketing prevents unconstrained Newton divergence. */
export function propagate(
  initial: State,
  mu: number,
  timeSeconds: number,
): State {
  validateState(initial, mu);
  range(timeSeconds, -1e10, 1e10, "time");
  const orbit = elements(initial, mu);
  if (orbit.type === "radial")
    throw new RangeError(
      "propagation: radial collision orbit is outside this model",
    );
  const time = orbit.period ? timeSeconds % orbit.period : timeSeconds;
  if (time === 0) return { r: [...initial.r], v: [...initial.v] };
  const radius0 = norm(initial.r);
  const velocityScale = Math.sqrt(mu / radius0);
  const r0 = scale(initial.r, 1 / radius0);
  const v0 = scale(initial.v, 1 / velocityScale);
  const radial = dot(r0, v0);
  const alpha = 2 - dot(v0, v0);
  const tau = (time * velocityScale) / radius0;
  const evaluate = (chi: number) => {
    const z = alpha * chi * chi;
    const [c, s] = stumpff(z);
    return {
      f: radial * chi * chi * c + (1 - alpha) * chi ** 3 * s + chi - tau,
      derivative: radial * chi * (1 - z * s) + (1 - alpha) * chi * chi * c + 1,
      c,
      s,
    };
  };
  let edge = Math.sign(tau) * Math.min(1, Math.abs(tau));
  let bracketed = false;
  for (let iteration = 0; iteration < 100; iteration++) {
    if (evaluate(edge).f * Math.sign(tau) >= 0) {
      bracketed = true;
      break;
    }
    edge *= 2;
  }
  if (!bracketed)
    throw new Error("propagation: unable to bracket Kepler solution");
  let lo = Math.min(0, edge),
    hi = Math.max(0, edge),
    chi = (lo + hi) / 2;
  let converged = false;
  for (let iteration = 0; iteration < 100; iteration++) {
    const result = evaluate(chi);
    if (Math.abs(result.f) <= 2e-14 * Math.max(1, Math.abs(tau))) {
      converged = true;
      break;
    }
    if (result.f > 0) hi = chi;
    else lo = chi;
    const proposed = chi - result.f / result.derivative;
    chi = proposed > lo && proposed < hi ? proposed : (lo + hi) / 2;
  }
  if (!converged)
    throw new Error("propagation: Kepler solution did not converge");
  const { c, s } = evaluate(chi);
  const f = 1 - chi * chi * c;
  const g = tau - chi ** 3 * s;
  const r = add(scale(r0, f), scale(v0, g));
  const radius = norm(r);
  const fDot = (alpha * chi ** 3 * s - chi) / radius;
  const gDot = 1 - (chi * chi * c) / radius;
  const v = add(scale(r0, fDot), scale(v0, gDot));
  return { r: scale(r, radius0), v: scale(v, velocityScale) };
}

/** First future physical surface crossing; unlike plotting, this uses the body's true radius. */
export function firstImpactTime(
  initial: State,
  mu: number,
  bodyRadius: number,
  maximumTime: number,
): number | null {
  range(bodyRadius, 1e-6, 1e12, "body radius");
  range(maximumTime, 0, 1e10, "maximum time");
  const orbit = elements(initial, mu);
  const r0 = norm(initial.r);
  if (r0 <= bodyRadius) return 0;
  if (orbit.periapsisRadius >= bodyRadius || orbit.eccentricity < 1e-10)
    return null;
  if (orbit.type === "radial") return 0; // Invalid radial orbit: stop rather than render through the surface.
  const e = orbit.eccentricity;
  let impact: number;
  if (orbit.semiMajor !== null && orbit.energy < 0) {
    const a = orbit.semiMajor;
    const initialE = Math.atan2(
      dot(initial.r, initial.v) / (e * Math.sqrt(mu * a)),
      (1 - r0 / a) / e,
    );
    const crossingE =
      2 * Math.PI -
      Math.acos(Math.max(-1, Math.min(1, (1 - bodyRadius / a) / e)));
    impact =
      normalizeAngle(
        crossingE -
          e * Math.sin(crossingE) -
          (initialE - e * Math.sin(initialE)),
      ) * Math.sqrt(a ** 3 / mu);
  } else if (orbit.semiMajor !== null && orbit.energy > 0) {
    const a = -orbit.semiMajor;
    const h0 = Math.asinh(dot(initial.r, initial.v) / (e * Math.sqrt(mu * a)));
    const hc = -Math.acosh((bodyRadius / a + 1) / e);
    impact =
      (e * Math.sinh(hc) - hc - (e * Math.sinh(h0) - h0)) *
      Math.sqrt(a ** 3 / mu);
  } else {
    const p = orbit.angularMomentum ** 2 / mu;
    const d0 = dot(initial.r, initial.v) / Math.sqrt(mu * p);
    const dc = -Math.sqrt(bodyRadius / orbit.periapsisRadius - 1);
    impact =
      Math.sqrt((2 * orbit.periapsisRadius ** 3) / mu) *
      (dc + dc ** 3 / 3 - d0 - d0 ** 3 / 3);
  }
  return impact >= 0 && impact <= maximumTime ? impact : null;
}

export function hohmann() {
  const semiMajor = (K.orbitEarth + K.orbitMars) / 2;
  const eccentricity =
    (K.orbitMars - K.orbitEarth) / (K.orbitMars + K.orbitEarth);
  const flightTime = Math.PI * Math.sqrt(semiMajor ** 3 / K.muSun);
  const nEarth = Math.sqrt(K.muSun / K.orbitEarth ** 3),
    nMars = Math.sqrt(K.muSun / K.orbitMars ** 3);
  const vEarth = Math.sqrt(K.muSun / K.orbitEarth),
    vMars = Math.sqrt(K.muSun / K.orbitMars);
  const vTransferDepart = Math.sqrt(
    K.muSun * (2 / K.orbitEarth - 1 / semiMajor),
  );
  const vTransferArrive = Math.sqrt(
    K.muSun * (2 / K.orbitMars - 1 / semiMajor),
  );
  const vInfinityDepart = vTransferDepart - vEarth,
    vInfinityArrive = vMars - vTransferArrive;
  return {
    semiMajor,
    eccentricity,
    flightTime,
    phaseAngle: normalizeAngle(Math.PI - nMars * flightTime),
    synodicPeriod: (2 * Math.PI) / (nEarth - nMars),
    nEarth,
    nMars,
    vEarth,
    vMars,
    vTransferDepart,
    vTransferArrive,
    vInfinityDepart,
    vInfinityArrive,
    c3: vInfinityDepart ** 2,
  };
}

const REFERENCE = hohmann();
function circle(radius: number, speed: number, angle: number): State {
  return { r: rotate([radius, 0], angle), v: rotate([0, speed], angle) };
}

export function missionAt(
  elapsedSeconds: number,
  phaseAngleRad = REFERENCE.phaseAngle,
  waitSeconds = 0,
) {
  range(elapsedSeconds, 0, REFERENCE.flightTime, "mission time");
  range(waitSeconds, 0, 10 * REFERENCE.synodicPeriod, "departure wait");
  range(phaseAngleRad, -100 * Math.PI, 100 * Math.PI, "phase angle");
  const departureAngle = REFERENCE.nEarth * waitSeconds;
  const initial: State = {
    r: rotate([K.orbitEarth, 0], departureAngle),
    v: rotate([0, REFERENCE.vTransferDepart], departureAngle),
  };
  const spacecraft = propagate(initial, K.muSun, elapsedSeconds);
  const earth = circle(
    K.orbitEarth,
    REFERENCE.vEarth,
    REFERENCE.nEarth * (waitSeconds + elapsedSeconds),
  );
  const mars = circle(
    K.orbitMars,
    REFERENCE.vMars,
    phaseAngleRad + REFERENCE.nMars * (waitSeconds + elapsedSeconds),
  );
  const missDistance = norm(sub(spacecraft.r, mars.r));
  // At a non-encounter this subtraction is only a velocity comparison, not a physical local arrival.
  const endpoint = propagate(initial, K.muSun, REFERENCE.flightTime);
  const marsAtArrival = circle(
    K.orbitMars,
    REFERENCE.vMars,
    phaseAngleRad + REFERENCE.nMars * (waitSeconds + REFERENCE.flightTime),
  );
  return {
    spacecraft,
    earth,
    mars,
    missDistance,
    encounter: missDistance <= 10000,
    phaseAtDeparture: normalizeAngle(
      phaseAngleRad + (REFERENCE.nMars - REFERENCE.nEarth) * waitSeconds,
    ),
    departureVInfinity: sub(
      initial.v,
      circle(K.orbitEarth, REFERENCE.vEarth, departureAngle).v,
    ),
    arrivalVInfinity: sub(endpoint.v, marsAtArrival.v),
  };
}

export function escape(altitude: number, vInfinity: number) {
  range(altitude, 0, 100000, "parking altitude");
  range(vInfinity, 0, 100, "v infinity");
  const radius = K.rEarth + altitude;
  const circularSpeed = Math.sqrt(K.muEarth / radius),
    escapeSpeed = Math.sqrt((2 * K.muEarth) / radius);
  const periapsisSpeed = Math.sqrt(vInfinity ** 2 + escapeSpeed ** 2);
  const initial: State = { r: [radius, 0], v: [0, periapsisSpeed] };
  return {
    radius,
    circularSpeed,
    escapeSpeed,
    periapsisSpeed,
    deltaV: periapsisSpeed - circularSpeed,
    initial,
  };
}

export function capture(
  altitude: number,
  burn: number,
  vInfinity = REFERENCE.vInfinityArrive,
  targetApoapsisAltitude = altitude,
) {
  range(altitude, 0, 100000, "periapsis altitude");
  range(burn, 0, 30, "capture burn");
  range(vInfinity, 0, 100, "v infinity");
  range(targetApoapsisAltitude, altitude, 1e7, "target apoapsis altitude");
  const radius = K.rMars + altitude;
  const beforeBurn = Math.sqrt(vInfinity ** 2 + (2 * K.muMars) / radius);
  const circularDeltaV = beforeBurn - Math.sqrt(K.muMars / radius);
  const targetSemiMajor = (radius + K.rMars + targetApoapsisAltitude) / 2;
  const targetDeltaV =
    beforeBurn - Math.sqrt(K.muMars * (2 / radius - 1 / targetSemiMajor));
  const postBurnSpeed = beforeBurn - burn;
  const initial: State = { r: [radius, 0], v: [0, postBurnSpeed] };
  const orbitalElements = elements(initial, K.muMars);
  const safe = orbitalElements.periapsisRadius >= K.rMars + K.safeMars - 1e-7;
  const bound = orbitalElements.energy < (-1e-12 * K.muMars) / radius;
  const targetReached =
    safe &&
    bound &&
    Math.abs(orbitalElements.periapsisRadius - radius) <= radius * 0.01 &&
    orbitalElements.apoapsisRadius !== null &&
    Math.abs(
      orbitalElements.apoapsisRadius - (K.rMars + targetApoapsisAltitude),
    ) <=
      (K.rMars + targetApoapsisAltitude) * 0.01;
  const status: "flyby" | "unsafe" | "captured" | "target" = !safe
    ? "unsafe"
    : !bound
      ? "flyby"
      : targetReached
        ? "target"
        : "captured";
  return {
    initial,
    beforeBurn,
    circularDeltaV,
    targetDeltaV,
    postBurnSpeed,
    elements: orbitalElements,
    safe,
    targetReached,
    status,
  };
}

/** Earth flyby. `angleRad` is incoming excess-velocity direction in inertial axes; Earth moves +y. */
export function flyby(
  vInfinity: number,
  altitude: number,
  angleRad: number,
  side: 1 | -1,
) {
  range(vInfinity, 0.1, 100, "v infinity");
  range(altitude, -K.rEarth + 1, 1000000, "flyby altitude");
  range(angleRad, -100 * Math.PI, 100 * Math.PI, "incoming angle");
  if (side !== 1 && side !== -1)
    throw new RangeError("flyby side: use +1 or -1");
  const radius = K.rEarth + altitude;
  const eccentricity = 1 + (radius * vInfinity ** 2) / K.muEarth;
  const turnAngle = 2 * Math.asin(1 / eccentricity);
  const incoming = rotate([vInfinity, 0], angleRad);
  const outgoing = rotate(incoming, side * turnAngle);
  const planetVelocity: Vec = [0, REFERENCE.vEarth];
  const sunIncoming = add(planetVelocity, incoming),
    sunOutgoing = add(planetVelocity, outgoing);
  const periapsisAngle = angleRad - side * Math.acos(1 / eccentricity);
  const periapsisSpeed = Math.sqrt(vInfinity ** 2 + (2 * K.muEarth) / radius);
  const periapsisState: State = {
    r: rotate([radius, 0], periapsisAngle),
    v: rotate([0, side * periapsisSpeed], periapsisAngle),
  };
  const safe = altitude >= K.safeEarth;
  const status: "safe" | "collision" | "outside-model" =
    altitude <= 0 ? "collision" : !safe ? "outside-model" : "safe";
  return {
    turnAngle,
    eccentricity,
    incoming,
    outgoing,
    planetVelocity,
    sunIncoming,
    sunOutgoing,
    speedChange: norm(sunOutgoing) - norm(sunIncoming),
    periapsisState,
    safe,
    status,
  };
}
