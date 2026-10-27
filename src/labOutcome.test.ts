import { describe, expect, it } from "vitest";
import {
  describeOutcome,
  labMetrics,
  labStartTime,
  nextLab,
} from "./labOutcome";
import { LABS } from "./learning";
import type { LabId } from "./learning";
import { defaults, simulate } from "./simulation";

const sim = (lab: LabId, patch = {}) => simulate(lab, { ...defaults(lab), ...patch });

describe("labStartTime / nextLab", () => {
  it("starts the flyby two hours before periapsis and every other lab at zero", () => {
    expect(labStartTime("flyby")).toBe(-7200);
    for (const lab of ["basics", "escape", "transfer", "capture"] as const)
      expect(labStartTime(lab)).toBe(0);
  });
  it("cycles through the chapters in order and wraps around", () => {
    expect(nextLab("basics").id).toBe("escape");
    expect(nextLab("flyby").id).toBe("basics");
    expect(LABS.map((l) => nextLab(l.id).id)).toHaveLength(LABS.length);
  });
});

describe("describeOutcome", () => {
  it("reports invalid input when no simulation is available", () => {
    const outcome = describeOutcome({
      lab: "basics",
      p: defaults("basics"),
      sim: null,
      visitedSides: [1],
      lang: "en",
    });
    expect(outcome.good).toBe(false);
    expect(outcome.title).toBe("Check your inputs");
  });
  it("marks the reference Mars transfer as an encounter and a shifted phase as a miss", () => {
    const p = defaults("transfer");
    const hit = describeOutcome({
      lab: "transfer",
      p,
      sim: sim("transfer"),
      visitedSides: [1],
      lang: "ja",
    });
    expect(hit.good).toBe(true);
    expect(hit.title).toContain("遭遇");
    const shifted = { ...p, phase: p.phase + 10 };
    const miss = describeOutcome({
      lab: "transfer",
      p: shifted,
      sim: sim("transfer", { phase: shifted.phase }),
      visitedSides: [1],
      lang: "en",
    });
    expect(miss.good).toBe(false);
    expect(miss.title).toContain("missed");
  });
  it("requires both pass sides before the flyby counts as understood", () => {
    const p = defaults("flyby");
    const flybySim = sim("flyby");
    const oneSide = describeOutcome({
      lab: "flyby",
      p,
      sim: flybySim,
      visitedSides: [1],
      lang: "en",
    });
    const bothSides = describeOutcome({
      lab: "flyby",
      p,
      sim: flybySim,
      visitedSides: [1, -1],
      lang: "en",
    });
    expect(oneSide.good).toBe(false);
    expect(bothSides.good).toBe(true);
  });
  it("accepts the escape lab only at the 1,000 km comparison altitude", () => {
    const p = defaults("escape");
    const low = describeOutcome({
      lab: "escape",
      p,
      sim: sim("escape"),
      visitedSides: [1],
      lang: "en",
    });
    const high = describeOutcome({
      lab: "escape",
      p: { ...p, altitude: 1000 },
      sim: sim("escape", { altitude: 1000 }),
      visitedSides: [1],
      lang: "en",
    });
    expect(low.good).toBe(false);
    expect(high.good).toBe(true);
  });
});

describe("labMetrics", () => {
  it("returns four labelled metrics for every lab in both languages", () => {
    for (const lab of LABS.map((l) => l.id)) {
      for (const lang of ["ja", "en"] as const) {
        const metrics = labMetrics({
          lab,
          p: defaults(lab),
          sim: sim(lab),
          reference: sim(lab),
          lang,
        });
        expect(metrics).toHaveLength(4);
        for (const m of metrics) {
          expect(m.label).not.toBe("");
          expect(m.value).not.toBe("");
        }
      }
    }
  });
  it("formats the Mars transfer time with fixed decimals in each locale", () => {
    const [time] = labMetrics({
      lab: "transfer",
      p: defaults("transfer"),
      sim: sim("transfer"),
      reference: sim("transfer"),
      lang: "en",
    });
    expect(time.value).toBe("258.87");
    expect(time.unit).toBe("days");
  });
});
