import { describe, expect, it } from "vitest";
import { localeOf, numberFormatter, texNumber, translator } from "./i18n";

describe("i18n helpers", () => {
  it("maps each UI language to its formatting locale", () => {
    expect(localeOf("ja")).toBe("ja-JP");
    expect(localeOf("en")).toBe("en-US");
  });
  it("picks the copy for the active language", () => {
    expect(translator("ja")("日本語", "English")).toBe("日本語");
    expect(translator("en")("日本語", "English")).toBe("English");
  });
  it("caps fraction digits and only pads when fixed", () => {
    expect(numberFormatter("en")(3.14159, 2)).toBe("3.14");
    expect(numberFormatter("en")(3, 2)).toBe("3");
    expect(numberFormatter("en", { fixed: true })(3, 2)).toBe("3.00");
    expect(numberFormatter("en")(1234567.891, 1)).toBe("1,234,567.9");
  });
  it("braces thousands separators for TeX", () => {
    expect(texNumber("en")(149597870.7, 1)).toBe(
      String.raw`149{,}597{,}870.7`,
    );
  });
});
