import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  formatParameterValue,
  Icon,
  ParameterInput,
  validateParameter,
} from "./components";

describe("reference parameter formatting", () => {
  it("uses the step precision with at least three decimals and removes trailing zeroes", () => {
    expect(formatParameterValue(44.3441712345, 0.001)).toBe("44.344");
    expect(formatParameterValue(44.3441712345, 0.0001)).toBe("44.3442");
    expect(formatParameterValue(2.944691, 0.01)).toBe("2.945");
    expect(formatParameterValue(200, 10)).toBe("200");
    expect(formatParameterValue(0.000012345, 1e-7)).toBe("0.0000123");
  });

  it("formats display only without emitting rounded values back to the simulation", () => {
    const changes: number[] = [];
    const value = 44.3441712345;
    const html = renderToStaticMarkup(
      <ParameterInput
        id="reference"
        label="Reference"
        value={value}
        min={0}
        max={360}
        step={0.001}
        unit="°"
        onChange={(next) => changes.push(next)}
        lang="en"
      />,
    );
    expect(html).toContain('value="44.344"');
    expect(html).toContain('value="44.3441712345"'); // Slider retains the real parameter.
    expect(changes).toEqual([]);
  });
});

describe("numeric parameter validation", () => {
  it("preserves the distinction between empty input and zero", () => {
    expect(validateParameter("", 0, 10, "ja")).toEqual({
      valid: false,
      error: "数値を入力してください。",
    });
    expect(validateParameter("  ", 0, 10, "en").valid).toBe(false);
    expect(validateParameter("0", 0, 10, "en")).toEqual({
      valid: true,
      value: 0,
    });
  });

  it("rejects non-finite numbers, malformed input, and non-decimal notation", () => {
    for (const value of [
      "NaN",
      "Infinity",
      "-Infinity",
      "1e999",
      "1e",
      "0x10",
      "1 km",
      "--1",
    ]) {
      expect(validateParameter(value, -100, 100, "en").valid, value).toBe(
        false,
      );
    }
  });

  it("accepts exact boundary values and preserves unrounded precision", () => {
    expect(validateParameter("-2", -2, 5, "en")).toEqual({
      valid: true,
      value: -2,
    });
    expect(validateParameter("5", -2, 5, "en")).toEqual({
      valid: true,
      value: 5,
    });
    expect(validateParameter("44.3441712345", 0, 180, "ja")).toEqual({
      valid: true,
      value: 44.3441712345,
    });
    expect(validateParameter("2.5e-2", 0, 1, "en")).toEqual({
      valid: true,
      value: 0.025,
    });
  });

  it("provides localized instructions for out-of-range input", () => {
    expect(validateParameter("-1", 0, 10, "ja")).toEqual({
      valid: false,
      error: "0〜10の範囲で入力してください。",
    });
    expect(validateParameter("11", 0, 10, "en")).toEqual({
      valid: false,
      error: "Enter a value from 0 to 10.",
    });
  });
});

describe("accessible parameter and icon markup", () => {
  it("associates the numerical control with its label and unit, and names the slider separately", () => {
    const html = renderToStaticMarkup(
      <ParameterInput
        id="phase"
        label="火星先行角"
        value={44.3442}
        min={0}
        max={180}
        step={0.0001}
        unit="°"
        onChange={() => {}}
        lang="ja"
      />,
    );
    expect(html).toContain('<label for="phase">火星先行角</label>');
    expect(html).toContain('aria-label="火星先行角 (slider)"');
    expect(html).toContain('aria-describedby="phase-unit"');
    expect(html).toContain('id="phase-unit"');
    expect(html).toContain('value="44.3442"');
    expect(html).toContain('aria-invalid="false"');
    expect(html).not.toContain('role="alert"');
  });

  it("renders out-of-range values as an accessible error instead of a valid simulation input", () => {
    const html = renderToStaticMarkup(
      <ParameterInput
        id="altitude"
        label="Altitude"
        value={-20}
        min={100}
        max={1000}
        step={10}
        unit="km"
        onChange={() => {}}
        lang="en"
      />,
    );
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="altitude-unit altitude-error"');
    expect(html).toContain('id="altitude-error" role="alert"');
    expect(html).toContain("Enter a value from 100 to 1000.");
  });

  it("keeps decorative icons out of the accessibility tree", () => {
    const html = renderToStaticMarkup(<Icon name="orbit" size={28} />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('focusable="false"');
    expect(html).toContain('width="28"');
    expect(html).toContain("<ellipse");
  });
});
