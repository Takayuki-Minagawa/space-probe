import { expect, test, type Page } from "@playwright/test";
const errors = new WeakMap<Page, string[]>();
async function setNumber(page: Page, name: string, value: string) {
  const field = page.locator("#solar-" + name);
  await field.fill(value);
  await field.blur();
}
test.beforeEach(async ({ page }) => {
  const messages: string[] = [];
  errors.set(page, messages);
  page.on("pageerror", (error) => messages.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") messages.push(message.text());
  });
  await page.goto("/");
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page) ?? []).toEqual([]);
});

test("Moon departure models a bound return to an Earth parking orbit", async ({
  page,
}) => {
  await page.locator("#solar-origin").selectOption("moon");
  await expect(page.locator("#solar-destination")).toHaveValue("earth");
  await expect(page.getByTestId("route-flight-time")).toContainText("4.98");
  await expect(page.getByTestId("route-departure-dv")).toContainText("0.822");
  await expect(page.getByTestId("route-arrival-dv")).toContainText("3.131");
  await expect(page.getByTestId("route-total-dv")).toContainText("3.953");
  await expect(page.getByTestId("route-diagram")).toHaveAttribute(
    "aria-label",
    /月から地球/,
  );
  await expect(page.getByTestId("route-arrival-miss")).toHaveText("0 km");
  const path = await page.locator(".solar-route-path").getAttribute("d");
  await setNumber(page, "phaseOffset", "45");
  await setNumber(page, "waitDays", "10");
  await expect(page.locator(".solar-route-path")).not.toHaveAttribute(
    "d",
    path!,
  );
  await expect(page.getByTestId("route-arrival-miss")).toHaveText("0 km");
  await expect(page.getByTestId("route-flight-time")).toContainText("4.98");
  await setNumber(page, "captureFraction", "0");
  await expect(page.getByTestId("route-capture-status")).toContainText("束縛");
  await expect(page.getByTestId("route-capture-status")).not.toContainText(
    "非束縛",
  );
  await setNumber(page, "captureFraction", "1");
  await expect(page.getByTestId("route-capture-status")).toContainText(
    "目標円軌道",
  );
  await setNumber(page, "captureFraction", "1.5");
  await expect(page.getByTestId("route-capture-status")).toContainText(
    "最低高度を下回る",
  );
  await expect(page.locator(".katex-error")).toHaveCount(0);
});

test("lunar comparison preserves body altitudes and swaps ideal burns", async ({
  page,
}) => {
  await page.locator("#solar-destination").selectOption("moon");
  await setNumber(page, "departureAltitude", "1000");
  await setNumber(page, "arrivalAltitude", "500");
  const flight = await page.getByTestId("route-flight-time").innerText();
  const departure = await page.getByTestId("route-departure-dv").innerText();
  const arrival = await page.getByTestId("route-arrival-dv").innerText();
  const total = await page.getByTestId("route-total-dv").innerText();
  const comparison = page.getByTestId("lunar-comparison");
  await expect(comparison).toBeVisible();
  expect(
    await comparison.locator(".katex-mathml").count(),
  ).toBeGreaterThanOrEqual(2);
  await setNumber(page, "phaseOffset", "15");
  await setNumber(page, "waitDays", "0.01");
  await setNumber(page, "captureFraction", "0.5");
  await comparison
    .getByRole("button", { name: "復路を表示", exact: true })
    .click();
  await expect(page.locator("#solar-origin")).toHaveValue("moon");
  await expect(page.locator("#solar-departureAltitude")).toHaveValue("500");
  await expect(page.locator("#solar-arrivalAltitude")).toHaveValue("1000");
  await expect(page.locator("#solar-phaseOffset")).toHaveValue("0");
  await expect(page.locator("#solar-waitDays")).toHaveValue("0");
  await expect(page.locator("#solar-captureFraction")).toHaveValue("1");
  await expect(page.getByTestId("route-flight-time")).toHaveText(flight);
  await expect(page.getByTestId("route-departure-dv")).toHaveText(arrival);
  await expect(page.getByTestId("route-arrival-dv")).toHaveText(departure);
  await expect(page.getByTestId("route-total-dv")).toHaveText(total);
  await setNumber(page, "departureAltitude", "800");
  await comparison
    .getByRole("button", { name: "往路を表示", exact: true })
    .click();
  await expect(page.locator("#solar-origin")).toHaveValue("earth");
  await expect(page.locator("#solar-departureAltitude")).toHaveValue("1000");
  await expect(page.locator("#solar-arrivalAltitude")).toHaveValue("800");
  await setNumber(page, "arrivalAltitude", "");
  await expect(page.locator(".solar-invalid")).toBeVisible();
  await expect(comparison).toHaveCount(0);
  await page.getByRole("button", { name: "参考に戻す", exact: true }).click();
  await expect(comparison).toBeVisible();
});

test("English return equations and comparison fit light and mobile layouts", async ({
  page,
}) => {
  await page.locator("#solar-origin").selectOption("moon");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("button", { name: "Light mode", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByTestId("lunar-comparison")).toContainText("Earth");
  await expect(page.getByTestId("lunar-comparison")).toContainText("Moon");
  await expect(page.getByTestId("route-diagram")).toHaveAttribute(
    "aria-label",
    /Moon to Earth/,
  );
  await expect(page.locator(".katex-error")).toHaveCount(0);
  expect(
    await page.getByTestId("lunar-comparison").locator(".katex-mathml").count(),
  ).toBeGreaterThanOrEqual(2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Quick guide", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Compare lunar outbound and return",
  );
  await expect(page.getByRole("dialog")).toContainText(
    "atmospheric entry and landing are not modeled",
  );
});
