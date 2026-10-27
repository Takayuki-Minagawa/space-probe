import { expect, test, type Page } from "@playwright/test";

const errors = new WeakMap<Page, string[]>();
const destinations = [
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "moon",
];

async function setNumber(page: Page, id: string, value: string) {
  await page.locator(`#solar-${id}`).fill(value);
  await page.locator(`#solar-${id}`).blur();
}

test.beforeEach(async ({ page }) => {
  const messages: string[] = [];
  errors.set(page, messages);
  page.on("pageerror", (error) => messages.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") messages.push(message.text());
  });
  await page.goto("/");
  await expect(page.getByTestId("solar-system-lab")).toBeVisible();
});

test.afterEach(async ({ page }) => {
  expect(errors.get(page) ?? []).toEqual([]);
});

test("all Earth destinations, return journeys, TeX and mobile layout", async ({
  page,
}) => {
  for (const destination of destinations) {
    await page.locator("#solar-destination").selectOption(destination);
    await expect(page.getByTestId("route-diagram")).toBeVisible();
    await expect(page.getByTestId("route-arrival-miss")).toHaveText("0 km");
    await expect(page.getByTestId("route-capture-status")).toContainText(
      "目標円軌道",
    );
    await expect(page.locator(".solar-calculations .katex-error")).toHaveCount(
      0,
    );
    expect(
      await page.locator(".solar-calculations .katex-mathml").count(),
    ).toBeGreaterThanOrEqual(4);
    await expect(page.getByTestId("route-flight-time")).not.toContainText(
      /NaN|Infinity/,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.locator("#solar-origin").selectOption("venus");
  await expect(page.locator("#solar-destination")).toHaveValue("earth");
  await expect(page.getByTestId("route-diagram")).toHaveAttribute(
    "aria-label",
    /金星から地球/,
  );
  await expect(page.getByTestId("route-arrival-miss")).toHaveText("0 km");
  await page.locator("#solar-destination").selectOption("moon");
  await expect(page.locator("#solar-origin")).toHaveValue("earth");
  await expect(page.getByTestId("route-flight-time")).toContainText("4.98");
  await expect(page.getByTestId("route-departure-dv")).toContainText("3.131");
});

test("phase miss, altitude effects, capture braking and invalid-input recovery", async ({
  page,
}) => {
  const baselineTime = await page.getByTestId("route-flight-time").innerText();
  const baselineBurn = await page.getByTestId("route-departure-dv").innerText();
  await setNumber(page, "phaseOffset", "10");
  await expect(page.getByTestId("route-arrival-miss")).not.toHaveText("0 km");
  await expect(page.getByTestId("route-flight-time")).toHaveText(baselineTime);
  await expect(page.locator(".solar-capture .solar-budget-note")).toContainText(
    "到着したと仮定",
  );
  await setNumber(page, "departureAltitude", "1000");
  await expect(page.getByTestId("route-departure-dv")).not.toHaveText(
    baselineBurn,
  );
  await setNumber(page, "captureFraction", "0");
  await expect(page.getByTestId("route-capture-status")).toContainText(
    "通過する軌道",
  );
  await setNumber(page, "captureFraction", "1.5");
  await expect(page.getByTestId("route-capture-status")).toContainText(
    "最低高度を下回る",
  );
  await setNumber(page, "departureAltitude", "");
  await expect(page.locator(".solar-invalid")).toContainText("入力を確認");
  await expect(page.getByTestId("route-diagram")).toHaveCount(0);
  await expect(page.locator(".solar-calculations")).toHaveCount(0);
  await page.getByRole("button", { name: "参考に戻す", exact: true }).click();
  await expect(page.getByTestId("route-arrival-miss")).toHaveText("0 km");
  await expect(page.getByTestId("route-capture-status")).toContainText(
    "目標円軌道",
  );
  await expect(page.locator("#solar-departureAltitude")).toHaveValue("200");
});

test("lunar controls use an Earth frame and support arrival navigation with reduced motion", async ({
  page,
}) => {
  await page.locator("#solar-destination").selectOption("moon");
  await expect(page.locator(".solar-plot-heading")).toContainText("地球中心");
  const originalTime = await page.getByTestId("route-flight-time").innerText();
  await setNumber(page, "departureAltitude", "1000");
  await expect(page.getByTestId("route-flight-time")).not.toHaveText(
    originalTime,
  );
  await setNumber(page, "waitDays", "0.01");
  await expect(page.getByTestId("route-arrival-miss")).not.toHaveText("0 km");
  await page.getByRole("button", { name: "参考に戻す", exact: true }).click();
  const probe = page.locator(".solar-probe");
  const start = await probe.getAttribute("d");
  await page.getByRole("button", { name: "到着時刻", exact: true }).click();
  await expect(
    page.getByRole("slider", { name: "航路の経過時間", exact: true }),
  ).toHaveValue("1");
  await expect(probe).not.toHaveAttribute("d", start!);
  await page.getByRole("button", { name: "出発", exact: true }).click();
  await expect(probe).toHaveAttribute("d", start!);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "航路を再生", exact: true }).click();
  await expect(
    page.getByRole("slider", { name: "航路の経過時間", exact: true }),
  ).not.toHaveValue("0");
  await page.getByRole("button", { name: "一時停止", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "航路を再生", exact: true }),
  ).toBeEnabled();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    page.getByRole("button", { name: "航路を再生", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "到着時刻", exact: true }),
  ).toBeEnabled();
});

test("English, light theme and bilingual guide cover the expanded model", async ({
  page,
}) => {
  await page.getByRole("button", { name: "ライトモード", exact: true }).click();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.locator("#solar-destination").selectOption("neptune");
  await expect(page.getByTestId("route-flight-time")).toContainText("years");
  await expect(page.locator(".solar-calculations")).toContainText(
    "How this route is calculated",
  );
  await page
    .getByText("Model assumptions and interpretation", { exact: true })
    .click();
  await expect(page.locator(".solar-assumptions")).toContainText(
    "solid surface",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Quick guide", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Choose a solar system route",
  );
  await expect(page.getByRole("dialog")).toContainText(
    "This injection does not escape Earth",
  );
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page
    .getByRole("button", { name: "03 Journey to Mars", exact: true })
    .click();
  await expect(page.getByTestId("solar-system-lab")).toHaveCount(0);
  await page.getByRole("button", { name: /Solar system routes/ }).click();
  await expect(page.getByTestId("solar-system-lab")).toBeVisible();
});
