import { expect, test, type Page } from "@playwright/test";

const errors = new WeakMap<Page, string[]>();
const planets = [
  ["mercury", "水星"],
  ["venus", "金星"],
  ["mars", "火星"],
  ["jupiter", "木星"],
  ["saturn", "土星"],
  ["uranus", "天王星"],
  ["neptune", "海王星"],
];
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

test("all seven Earth-planet pairs compare both directions and render equations", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const comparison = page.getByTestId("planetary-comparison");
  for (const [id, name] of planets) {
    await page.locator("#solar-destination").selectOption(id);
    await expect(comparison).toBeVisible();
    await expect(comparison).toContainText(name);
    const time = await page.getByTestId("route-flight-time").innerText();
    const departure = await page.getByTestId("route-departure-dv").innerText();
    const arrival = await page.getByTestId("route-arrival-dv").innerText();
    const total = await page.getByTestId("route-total-dv").innerText();
    const outboundTime = await page
      .getByTestId("planetary-outbound-time")
      .innerText();
    await expect(page.getByTestId("planetary-return-time")).toHaveText(
      outboundTime,
    );
    await expect(page.getByTestId("planetary-outbound-departure")).toHaveText(
      departure,
    );
    await expect(page.getByTestId("planetary-return-arrival")).toHaveText(
      departure,
    );
    await expect(page.getByTestId("planetary-return-departure")).toHaveText(
      arrival,
    );
    await expect(page.getByTestId("planetary-return-total")).toHaveText(total);
    await expect(page.getByTestId("planetary-difference-total")).toHaveText(
      "0 km/s",
    );
    expect(
      await comparison.locator(".katex-mathml").count(),
    ).toBeGreaterThanOrEqual(3);
    await comparison
      .getByRole("button", { name: "復路を表示", exact: true })
      .click();
    await expect(page.locator("#solar-origin")).toHaveValue(id);
    await expect(page.locator("#solar-destination")).toHaveValue("earth");
    await expect(page.getByTestId("route-flight-time")).toHaveText(time);
    await expect(page.getByTestId("route-departure-dv")).toHaveText(arrival);
    await expect(page.getByTestId("route-arrival-dv")).toHaveText(departure);
    await expect(page.getByTestId("route-total-dv")).toHaveText(total);
    await expect(page.getByTestId("route-arrival-miss")).toHaveText("0 km");
    await expect(page.getByTestId("route-capture-status")).toContainText(
      "目標円軌道",
    );
    await expect(page.getByTestId("route-diagram")).toHaveAttribute(
      "aria-label",
      new RegExp(name + "から地球"),
    );
    await expect(page.locator(".katex-error")).toHaveCount(0);
    await comparison
      .getByRole("button", { name: "往路を表示", exact: true })
      .click();
    await expect(page.locator("#solar-origin")).toHaveValue("earth");
  }
});

test("Mars comparison preserves custom body altitudes and separates reference conditions", async ({
  page,
}) => {
  const comparison = page.getByTestId("planetary-comparison");
  await expect(page.getByTestId("route-flight-time")).toContainText("258.87");
  await expect(page.getByTestId("planetary-outbound-departure")).toHaveText(
    "3.611 km/s",
  );
  await expect(page.getByTestId("planetary-outbound-arrival")).toHaveText(
    "2.091 km/s",
  );
  const initialEquations = await comparison
    .locator("annotation")
    .allTextContents();
  await setNumber(page, "departureAltitude", "1000");
  await setNumber(page, "arrivalAltitude", "500");
  const time = await page.getByTestId("route-flight-time").innerText();
  const departure = await page.getByTestId("route-departure-dv").innerText();
  const arrival = await page.getByTestId("route-arrival-dv").innerText();
  const total = await page.getByTestId("route-total-dv").innerText();
  expect(await comparison.locator("annotation").allTextContents()).not.toEqual(
    initialEquations,
  );
  await setNumber(page, "phaseOffset", "20");
  await setNumber(page, "waitDays", "10");
  await setNumber(page, "captureFraction", "0.5");
  await expect(page.getByTestId("planetary-outbound-departure")).toHaveText(
    departure,
  );
  await expect(page.getByTestId("planetary-outbound-arrival")).toHaveText(
    arrival,
  );
  await expect(page.getByTestId("planetary-outbound-total")).toHaveText(total);
  await comparison
    .getByRole("button", { name: "復路を表示", exact: true })
    .click();
  await expect(page.locator("#solar-departureAltitude")).toHaveValue("500");
  await expect(page.locator("#solar-arrivalAltitude")).toHaveValue("1000");
  await expect(page.locator("#solar-phaseOffset")).toHaveValue("0");
  await expect(page.locator("#solar-waitDays")).toHaveValue("0");
  await expect(page.locator("#solar-captureFraction")).toHaveValue("1");
  await expect(page.getByTestId("route-flight-time")).toHaveText(time);
  await expect(page.getByTestId("route-departure-dv")).toHaveText(arrival);
  await expect(page.getByTestId("route-arrival-dv")).toHaveText(departure);
  await setNumber(page, "arrivalAltitude", "1800");
  await comparison
    .getByRole("button", { name: "往路を表示", exact: true })
    .click();
  await expect(page.locator("#solar-departureAltitude")).toHaveValue("1800");
  await expect(page.locator("#solar-arrivalAltitude")).toHaveValue("500");
  await expect(page.getByTestId("route-flight-time")).toHaveText(time);
  await setNumber(page, "arrivalAltitude", "");
  await expect(page.locator(".solar-invalid")).toBeVisible();
  await expect(comparison).toHaveCount(0);
  await page.getByRole("button", { name: "参考に戻す", exact: true }).click();
  await expect(comparison).toBeVisible();
});

test("planetary comparisons support English, keyboard, light theme, and route scope", async ({
  page,
}) => {
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("button", { name: "Light mode", exact: true }).click();
  const comparison = page.getByTestId("planetary-comparison");
  await expect(comparison).toContainText("Earth");
  await expect(comparison).toContainText("Mars");
  await comparison
    .getByRole("button", { name: "Show return", exact: true })
    .press("Enter");
  await expect(page.locator("#solar-origin")).toHaveValue("mars");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByTestId("route-diagram")).toHaveAttribute(
    "aria-label",
    /Mars to Earth/,
  );
  await expect(page.locator(".katex-error")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Quick guide", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Compare Earth and planetary return routes",
  );
  await expect(page.getByRole("dialog")).toContainText(
    "independent legs, not a round-trip itinerary",
  );
  await page.keyboard.press("Escape");
  await page.locator("#solar-origin").selectOption("venus");
  await page.locator("#solar-destination").selectOption("mars");
  await expect(comparison).toHaveCount(0);
  await expect(page.getByTestId("lunar-comparison")).toHaveCount(0);
  await page.locator("#solar-destination").selectOption("moon");
  await expect(page.getByTestId("lunar-comparison")).toBeVisible();
  await expect(comparison).toHaveCount(0);
});
