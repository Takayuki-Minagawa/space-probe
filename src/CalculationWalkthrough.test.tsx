import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CalculationWalkthrough from "./CalculationWalkthrough";
import type { LabId, Lang } from "./learning";
import { defaults, simulate } from "./simulation";
import type { Parameters, Simulation } from "./simulation";

function renderCalculation(
  lab: LabId,
  parameters = defaults(lab),
  simulation: Simulation | null = simulate(lab, parameters),
  lang: Lang = "en",
) {
  return renderToStaticMarkup(
    <CalculationWalkthrough
      lab={lab}
      parameters={parameters}
      simulation={simulation}
      reference={simulate(lab, defaults(lab))}
      lang={lang}
      onPreset={() => {}}
    />,
  );
}

describe("calculation walkthrough", () => {
  it.each<LabId>(["basics", "escape", "transfer", "capture", "flyby"])(
    "%s renders finite values and localized explanations",
    (lab) => {
      const parameters = defaults(lab);
      const result = simulate(lab, parameters);
      for (const lang of ["ja", "en"] as const) {
        const html = renderCalculation(lab, parameters, result, lang);
        expect(html).toContain(
          lang === "ja" ? "計算の流れと比較" : "Follow the calculation",
        );
        expect(html).not.toMatch(/NaN|Infinity|undefined/);
        expect(html.match(/class="calculation-step"/g)).toHaveLength(3);
      }
    },
  );

  it("hides all calculation steps when inputs are invalid instead of showing stale reference values", () => {
    const invalid: Parameters = { ...defaults("transfer"), phase: NaN };
    const html = renderCalculation("transfer", invalid, null);
    expect(html).toContain("Correct inputs within the displayed ranges");
    expect(html).not.toContain('class="calculation-steps"');
    expect(html).not.toContain("NaN");
    expect(html.match(/<button /g)).toHaveLength(2);
  });

  it("hides stopped model calculations while keeping recovery examples available", () => {
    const parameters = { ...defaults("capture"), altitude: 0 };
    const html = renderCalculation("capture", parameters);
    expect(html).toContain("Raise the altitude");
    expect(html).not.toContain('class="calculation-steps"');
    expect(html).toContain("Match the 300 km circular orbit");
  });

  it("shows the current arrival miss while explaining that transfer duration stays fixed", () => {
    const parameters = { ...defaults("transfer"), wait: 30 };
    const html = renderCalculation("transfer", parameters);
    const referenceHtml = renderCalculation("transfer");
    expect(html).toContain("258.87 days");
    expect(html).toContain("Transfer shape, flight time");
    expect(html).not.toEqual(referenceHtml);
    expect(html).toContain("Initial lead");
  });

  it("does not invent an apoapsis or target capture after a zero burn", () => {
    const parameters = { ...defaults("capture"), altitude: 300, burn: 0 };
    const html = renderCalculation("capture", parameters);
    expect(html).toContain("Unbound flyby");
    expect(html).toContain("none (unbound)");
    expect(html).not.toContain("Target circular orbit reached");
  });
});
