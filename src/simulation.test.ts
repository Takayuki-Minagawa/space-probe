import { describe, expect, it } from "vitest";
import { defaults, H, simulate } from "./simulation";
import { K, norm, sub } from "./physics";
import type { LabId } from "./learning";

const labs: LabId[] = ["basics", "escape", "transfer", "capture", "flyby"];

describe("five independent experiments", () => {
  it.each(labs)(
    "%s reference has finite bounded samples and deterministic time",
    (lab) => {
      const sim = simulate(lab, defaults(lab));
      expect(sim.blocked).toBe(false);
      expect(sim.safe).toBe(true);
      expect(sim.samples).toHaveLength(181);
      expect(sim.samples[0].time).toBe(sim.start);
      expect(sim.samples[180].time).toBe(sim.end);
      expect(sim.extent).toBeGreaterThan(0);
      for (const sample of sim.samples) {
        expect(
          [...sample.state.r, ...sample.state.v].every(Number.isFinite),
        ).toBe(true);
        expect(norm(sample.state.r)).toBeGreaterThanOrEqual(
          sim.bodyRadius - 1e-6,
        );
        expect(sim.at(sample.time)).toEqual(sample.state);
      }
      expect(sim.at(sim.start - 1)).toEqual(sim.at(sim.start));
      expect(sim.at(sim.end + 1)).toEqual(sim.at(sim.end));
    },
  );
  it("starts with the verified successful mission and capture settings", () => {
    const transfer = simulate("transfer", defaults("transfer"));
    expect(transfer.end / K.DAY).toBeCloseTo(258.8658, 3);
    expect(transfer.arrival.encounter).toBe(true);
    expect(transfer.arrival.missDistance).toBeLessThan(0.001);
    expect(simulate("capture", defaults("capture")).captureResult.status).toBe(
      "target",
    );
    expect(
      simulate("escape", defaults("escape")).escapeResult.deltaV,
    ).toBeCloseTo(3.61138, 5);
  });
  it("never interprets another experiment’s input as relevant", () => {
    const basics = {
      ...defaults("basics"),
      burn: -0.1,
      vinf: NaN,
      phase: NaN,
      wait: -Infinity,
      angle: NaN,
    };
    expect(() => simulate("basics", basics)).not.toThrow();
    expect(simulate("basics", basics).initial.v[1]).toBeLessThan(
      simulate("basics", { ...defaults("basics"), burn: 0 }).initial.v[1],
    );
    expect(() =>
      simulate("transfer", {
        ...defaults("transfer"),
        altitude: NaN,
        burn: -Infinity,
        vinf: NaN,
      }),
    ).not.toThrow();
    expect(() =>
      simulate("escape", {
        ...defaults("escape"),
        burn: -5,
        angle: NaN,
        wait: NaN,
      }),
    ).not.toThrow();
    expect(() =>
      simulate("capture", { ...defaults("capture"), vinf: NaN, phase: NaN }),
    ).not.toThrow();
    expect(() =>
      simulate("flyby", { ...defaults("flyby"), burn: -Infinity, wait: NaN }),
    ).not.toThrow();
  });
  it("rejects invalid relevant inputs instead of silently fixing them", () => {
    expect(() =>
      simulate("basics", { ...defaults("basics"), altitude: -1 }),
    ).toThrow();
    expect(() =>
      simulate("basics", { ...defaults("basics"), burn: NaN }),
    ).toThrow();
    expect(() =>
      simulate("capture", { ...defaults("capture"), burn: -1 }),
    ).toThrow();
    expect(() =>
      simulate("transfer", { ...defaults("transfer"), phase: NaN }),
    ).toThrow();
    expect(() =>
      simulate("escape", { ...defaults("escape"), vinf: -1 }),
    ).toThrow();
    expect(() =>
      simulate("flyby", { ...defaults("flyby"), vinf: 0 }),
    ).toThrow();
    expect(() => simulate("basics", defaults("basics")).at(NaN)).toThrow();
  });
});

describe("physical events and stopping", () => {
  it("correctly identifies the initial apsis after prograde or retrograde burns", () => {
    const raised = simulate("basics", { ...defaults("basics"), burn: 0.5 });
    expect(raised.periapsisTime).toBe(0);
    expect(raised.apoapsisTime).toBeCloseTo(raised.orbit.period! / 2, 8);
    const lowered = simulate("basics", { ...defaults("basics"), burn: -0.1 });
    expect(lowered.apoapsisTime).toBe(0);
    expect(lowered.periapsisTime).toBeCloseTo(lowered.orbit.period! / 2, 8);
    expect(norm(lowered.at(lowered.periapsisTime!).r)).toBeLessThan(
      norm(lowered.initial.r),
    );
  });
  it.each(["basics", "capture"] as const)(
    "%s clips at the true surface and cannot seek past collision",
    (lab) => {
      const p = defaults(lab);
      p.burn = lab === "basics" ? -0.8 : 3;
      const sim = simulate(lab, p);
      expect(sim.impact).not.toBeNull();
      expect(sim.end).toBe(sim.impact);
      expect(sim.safe).toBe(false);
      expect(norm(sim.at(sim.end).r)).toBeCloseTo(sim.bodyRadius, 6);
      expect(norm(sim.at(sim.end - 1).r)).toBeGreaterThan(sim.bodyRadius);
      expect(sim.at(sim.end + 10000)).toEqual(sim.at(sim.end));
      expect(
        sim.samples.every(
          (sample) => norm(sample.state.r) >= sim.bodyRadius - 1e-6,
        ),
      ).toBe(true);
    },
  );
  it.each(["basics", "escape", "capture", "flyby"] as const)(
    "%s does not animate an initial condition below its safe altitude",
    (lab) => {
      const sim = simulate(lab, { ...defaults(lab), altitude: 50 });
      expect(sim.blocked).toBe(true);
      expect(sim.safe).toBe(false);
      expect(sim.end).toBe(sim.start);
      expect(sim.at(1000)).toEqual(sim.initial);
    },
  );
  it("stops unsafe flybys, including surface collisions, without a fictitious incoming timeline", () => {
    for (const altitude of [-1, 0, 100]) {
      const sim = simulate("flyby", { ...defaults("flyby"), altitude });
      expect(sim.blocked).toBe(true);
      expect(sim.start).toBe(0);
      expect(sim.end).toBe(0);
      expect(sim.safe).toBe(false);
    }
  });
  it("flyby visits periapsis at local time zero and keeps side-specific geometry", () => {
    const positive = simulate("flyby", defaults("flyby"));
    const negative = simulate("flyby", { ...defaults("flyby"), side: -1 });
    expect(positive.start).toBe(-7200);
    expect(positive.end).toBe(7200);
    expect(norm(positive.at(0).r)).toBeCloseTo(K.rEarth + 1000, 7);
    expect(positive.flybyResult.speedChange).toBeGreaterThan(0);
    expect(negative.flybyResult.speedChange).toBeLessThan(0);
    expect(norm(sub(positive.at(0).r, negative.at(0).r))).toBeGreaterThan(1000);
  });
  it("a phase miss is retained even when an independent capture is successful", () => {
    const transfer = simulate("transfer", {
      ...defaults("transfer"),
      phase: 0,
    });
    expect(transfer.arrival.encounter).toBe(false);
    expect(
      simulate("capture", defaults("capture")).captureResult.targetReached,
    ).toBe(true);
    expect(transfer.arrival.missDistance).toBeGreaterThan(1e8);
  });
});

describe("bounded extreme visual sampling", () => {
  const cases: [LabId, Partial<ReturnType<typeof defaults>>][] = [
    ["basics", { altitude: 150, burn: -3 }],
    ["basics", { altitude: 100000, burn: 30 }],
    [
      "basics",
      {
        altitude: 800,
        burn: Math.sqrt(K.muEarth / (K.rEarth + 800)) * (Math.SQRT2 - 1),
      },
    ],
    ["escape", { altitude: 150, vinf: 0 }],
    ["escape", { altitude: 100000, vinf: 100 }],
    ["capture", { altitude: 100, burn: 0 }],
    ["capture", { altitude: 100000, burn: 30 }],
    ["flyby", { altitude: 150, vinf: 0.1, angle: 180, side: -1 }],
    ["flyby", { altitude: 1000000, vinf: 100, angle: -180 }],
    ["transfer", { phase: 360, wait: H.synodicPeriod / K.DAY }],
  ];
  it.each(cases)("%s remains finite at %j", (lab, changes) => {
    const sim = simulate(lab, { ...defaults(lab), ...changes });
    expect(sim.samples).toHaveLength(181);
    expect(Number.isFinite(sim.extent)).toBe(true);
    for (const sample of sim.samples)
      expect(
        [...sample.state.r, ...sample.state.v].every(Number.isFinite),
      ).toBe(true);
  });
});
