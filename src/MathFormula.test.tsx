import { renderToStaticMarkup } from "react-dom/server";
import katex from "katex";
import { describe, expect, it } from "vitest";
import { LABS } from "./learning";
import MathFormula from "./MathFormula";

describe("TeX formulas", () => {
  it.each(LABS)(
    "$id has valid mathematical notation in the detailed lesson",
    (lesson) => {
      const html = katex.renderToString(lesson.formula, {
        displayMode: true,
        throwOnError: true,
        strict: "error",
        trust: false,
      });
      expect(html).toContain("<math");
      expect(html).not.toContain("katex-error");
    },
  );

  it("provides MathML and TeX source alongside the visual fractions and roots", () => {
    const tex = String.raw`v=\sqrt{\frac{\mu}{r}}`;
    const html = renderToStaticMarkup(<MathFormula tex={tex} />);
    expect(html).toContain("katex-mathml");
    expect(html).toContain("<mfrac>");
    expect(html).toContain("<msqrt>");
    expect(html).toContain('encoding="application/x-tex"');
    expect(html).toContain('aria-hidden="true"');
  });
});
