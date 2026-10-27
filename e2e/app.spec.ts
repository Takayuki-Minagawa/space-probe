import { expect, test, type Page } from "@playwright/test";

const browserErrors = new WeakMap<Page, string[]>();

async function openLab(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).click();
  await expect(
    page.getByRole("img", { name: /物理計算に基づく軌道図/ }),
  ).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  await expect(page).toHaveTitle(/惑星航路ラボ/);
  await page.getByRole("button", { name: "03 火星へ向かう", exact: true }).click();
});

test.afterEach(async ({ page }) => {
  expect(
    browserErrors.get(page) ?? [],
    "Browser console and unhandled errors",
  ).toEqual([]);
});

test("Japanese default, bilingual manual, theme and locale persist", async ({
  page,
}) => {
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await page.getByRole("button", { name: "ライトモード", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page
    .getByRole("button", { name: "簡易マニュアル", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "惑星航路ラボの使い方" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("button", { name: "03 Journey to Mars", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page
    .getByRole("button", {
      name: /Quick guide|Quick manual|Guide|Manual/,
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Planetary Route Lab guide" }),
  ).toBeVisible();
});

test("all five laboratories render and react to physical inputs without errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openLab(page, "01 軌道の基本");
  await page
    .getByRole("spinbutton", { name: "接線方向の噴射", exact: true })
    .fill("-0.2");
  await page
    .getByRole("spinbutton", { name: "接線方向の噴射", exact: true })
    .blur();
  await expect(page.locator(".predicted-path")).toHaveAttribute("d", /^M/);
  await openLab(page, "02 地球から出発");
  await page
    .getByRole("spinbutton", { name: "待機軌道高度", exact: true })
    .fill("1000");
  await page
    .getByRole("spinbutton", { name: "待機軌道高度", exact: true })
    .blur();
  await expect(page.locator(".predicted-path")).toHaveAttribute("d", /^M/);
  await openLab(page, "03 火星へ向かう");
  const correctPath = await page.locator(".predicted-path").getAttribute("d");
  await page
    .getByRole("spinbutton", { name: "出発までの待ち時間", exact: true })
    .fill("100");
  await page
    .getByRole("spinbutton", { name: "出発までの待ち時間", exact: true })
    .blur();
  await expect(page.locator(".predicted-path")).not.toHaveAttribute(
    "d",
    correctPath!,
  );
  await openLab(page, "04 火星で止まる");
  const circularPath = await page.locator(".predicted-path").getAttribute("d");
  await page.getByRole("spinbutton", { name: "減速Δv", exact: true }).fill("0");
  await page.getByRole("spinbutton", { name: "減速Δv", exact: true }).blur();
  await expect(page.locator(".predicted-path")).not.toHaveAttribute(
    "d",
    circularPath!,
  );
  await openLab(page, "05 スウィングバイ");
  await page
    .getByRole("spinbutton", { name: "近点高度", exact: true })
    .fill("2000");
  await page.getByRole("spinbutton", { name: "近点高度", exact: true }).blur();
  await expect(page.locator(".predicted-path")).toHaveAttribute("d", /^M/);
  expect(errors).toEqual([]);
});

test("play, pause, reset and bidirectional seek are deterministic", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openLab(page, "03 火星へ向かう");
  const timeline = page.getByRole("slider", { name: "仮想時刻", exact: true });
  const initial = await timeline.inputValue();
  await page.getByRole("button", { name: "1ステップ", exact: true }).click();
  await expect(timeline).not.toHaveValue(initial);
  const stepped = await timeline.inputValue();
  await page.getByRole("button", { name: "最初から", exact: true }).click();
  await expect(timeline).toHaveValue(initial);
  await page.getByRole("button", { name: "1ステップ", exact: true }).click();
  await expect(timeline).toHaveValue(stepped);
  await page.getByRole("button", { name: "再生", exact: true }).click();
  await expect(timeline).not.toHaveValue(stepped);
  await page.getByRole("button", { name: "一時停止", exact: true }).click();
  const paused = await timeline.inputValue();
  await page.waitForTimeout(150);
  await expect(timeline).toHaveValue(paused);
  await timeline.focus();
  await page.keyboard.press("End");
  const finalPath = await page.locator(".trail-path").getAttribute("d");
  await page.keyboard.press("Home");
  await expect(timeline).toHaveValue(initial);
  await page.keyboard.press("End");
  await expect(page.locator(".trail-path")).toHaveAttribute("d", finalPath!);
});

test("phase error changes encounter assessment and restore repairs it", async ({
  page,
}) => {
  await openLab(page, "03 火星へ向かう");
  const phase = page.getByRole("spinbutton", { name: "位相角", exact: true });
  const referencePhase = await phase.inputValue();
  await phase.fill("80");
  await phase.blur();
  await expect(phase).toHaveValue("80");
  await expect(
    page.getByText(/火星は別の場所|遭遇しません|遭遇できません|非遭遇/).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "参考設定へ戻す", exact: true })
    .click();
  await expect(phase).toHaveValue(referencePhase);
});

test("the first experiment compares arrivals and explains the unchanged flight time", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "参考設定の到着を見る", exact: true })
    .click();
  await expect(page.locator(".outcome strong")).toHaveText(
    "到着予測：遭遇条件内",
  );
  const atArrival = await page
    .getByRole("slider", { name: "仮想時刻", exact: true })
    .inputValue();
  const steps = page.locator(".calculation-step");
  await expect(steps).toHaveCount(3);
  await expect(steps.nth(2).locator(".calculation-result")).toHaveText("0 km");
  await page
    .getByRole("button", { name: "先行角を10°変えて比べる", exact: true })
    .click();
  await expect(page.locator(".outcome strong")).toHaveText(
    "到着予測：火星とすれ違い",
  );
  await expect(
    page.getByRole("slider", { name: "仮想時刻", exact: true }),
  ).toHaveValue(atArrival);
  await expect(steps.nth(2).locator(".calculation-result")).not.toHaveText(
    "0 km",
  );
  await expect(steps.first().locator(".calculation-result")).toHaveText(
    "258.87 日",
  );
  await expect(page.locator(".reference-path")).toBeVisible();
  const shiftedPhase = await steps
    .nth(1)
    .locator(".calculation-result")
    .textContent();
  await page
    .getByRole("button", { name: "参考の角度で30日待つ", exact: true })
    .click();
  await expect(
    page.getByRole("spinbutton", { name: "出発までの待ち時間", exact: true }),
  ).toHaveValue("30");
  await expect(steps.nth(1).locator(".calculation-result")).not.toHaveText(
    shiftedPhase!,
  );
  await expect(steps.first().locator(".calculation-result")).toHaveText(
    "258.87 日",
  );
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Follow the calculation", exact: true }),
  ).toBeVisible();
  await expect(steps.first().locator(".calculation-result")).toHaveText(
    "258.87 days",
  );
});

test("calculation examples recover invalid inputs and show the physical consequences", async ({
  page,
}) => {
  await openLab(page, "02 地球から出発");
  const steps = page.locator(".calculation-step");
  const referenceBurn = await steps
    .last()
    .locator(".calculation-result")
    .textContent();
  await page
    .getByRole("button", { name: "1,000 kmから出発", exact: true })
    .click();
  await expect(steps.last().locator(".calculation-result")).not.toHaveText(
    referenceBurn!,
  );
  await openLab(page, "04 火星で止まる");
  await page
    .getByRole("button", { name: "300 kmで減速しない", exact: true })
    .click();
  await expect(steps.last().locator(".calculation-result")).toContainText(
    "フライバイ",
  );
  await page.getByRole("spinbutton", { name: "減速Δv", exact: true }).fill("");
  await expect(page.locator(".calculation-steps")).toHaveCount(0);
  await page
    .getByRole("button", { name: "300 kmの円軌道に合わせる", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(steps.last().locator(".calculation-result")).toHaveText(
    "目標円軌道を達成",
  );
  await openLab(page, "01 軌道の基本");
  await page
    .getByRole("button", { name: "800 kmで噴射なし", exact: true })
    .click();
  await expect(steps.last().locator(".calculation-result")).toHaveText(
    "遠点高度 800 km",
  );
  await openLab(page, "05 スウィングバイ");
  await expect(steps.last().locator(".calculation-result")).toHaveText(/^\+/);
  await page
    .getByRole("button", { name: "時計回りに通過", exact: true })
    .click();
  await expect(steps.last().locator(".calculation-result")).toHaveText(/^-/);
  await page
    .getByRole("button", { name: /惑星から十分遠い入出の相対速度の大きさ/ })
    .click();
  await page
    .getByRole("button", { name: "結果を確かめる", exact: true })
    .click();
  await expect(
    page.getByText("実験の到達条件も達成しました。", { exact: true }),
  ).toBeVisible();
});

test("empty/out-of-range input is explained and cannot silently become a valid result", async ({
  page,
}) => {
  await openLab(page, "03 火星へ向かう");
  const phase = page.getByRole("spinbutton", { name: "位相角", exact: true });
  await phase.fill("");
  await phase.blur();
  await expect(page.getByRole("alert")).toBeVisible();
  await phase.fill("9999");
  await phase.blur();
  await expect(page.getByRole("alert")).toBeVisible();
  await phase.fill("44.3442");
  await phase.blur();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator(".predicted-path")).toHaveAttribute("d", /^M/);
});

test("every chapter is usable by keyboard with reduced motion and no horizontal overflow", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const name of [
    "01 軌道の基本",
    "02 地球から出発",
    "03 火星へ向かう",
    "04 火星で止まる",
    "05 スウィングバイ",
  ]) {
    const button = page.getByRole("button", { name, exact: true });
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("button", { name: "1ステップ", exact: true }),
    ).toBeVisible();
    const timeline = page.getByRole("slider", {
      name: "仮想時刻",
      exact: true,
    });
    const before = await timeline.inputValue();
    await page.waitForTimeout(80);
    await expect(timeline).toHaveValue(before);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
  }
});

test("all five learning challenges can be completed with correct predictions and settings", async ({
  page,
}) => {
  const tasks = [
    ["01 軌道の基本", "噴射した場所の反対側"],
    ["02 地球から出発", "この条件では小さくなる"],
    ["03 火星へ向かう", "到着する時刻の火星"],
    ["04 火星で止まる", "この二体モデルでは飛び去る"],
    ["05 スウィングバイ", "惑星から十分遠い入出の相対速度の大きさ"],
  ];
  for (const [chapter, prediction] of tasks) {
    await openLab(page, chapter);
    if (chapter.startsWith("02")) {
      await page
        .getByRole("spinbutton", { name: "待機軌道高度", exact: true })
        .fill("1000");
    }
    if (chapter.startsWith("05")) {
      await page.getByRole("button", { name: "時計回り", exact: true }).click();
    }
    await page.getByRole("button", { name: new RegExp(prediction) }).click();
    await page
      .getByRole("button", { name: "結果を確かめる", exact: true })
      .click();
    await expect(
      page.getByText("予想の考え方は合っています。", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("実験の到達条件も達成しました。", { exact: true }),
    ).toBeVisible();
  }
  await expect(page.locator(".progress-label strong")).toContainText("05");
});

test("favicon and production assets load from the application directory", async ({
  page,
  request,
}) => {
  const icon = await page.locator('link[rel="icon"]').getAttribute("href");
  expect(icon).toBeTruthy();
  const response = await request.get(new URL(icon!, page.url()).toString());
  expect(response.ok()).toBe(true);
  expect(await response.text()).toContain("<svg");
  const resourcePaths = await page
    .locator('script[src], link[rel="stylesheet"]')
    .evaluateAll((nodes) =>
      nodes.map(
        (node) => node.getAttribute("src") ?? node.getAttribute("href"),
      ),
    );
  expect(resourcePaths.length).toBeGreaterThan(0);
  for (const path of resourcePaths) {
    expect(path).toMatch(/^\.\//);
    expect(
      (await request.get(new URL(path!, page.url()).toString())).ok(),
    ).toBe(true);
  }
});

test("TeX equations render in every lab with local fonts and accessible MathML", async ({
  page,
  request,
}) => {
  for (const lab of [
    "01 軌道の基本",
    "02 地球から出発",
    "03 火星へ向かう",
    "04 火星で止まる",
    "05 スウィングバイ",
  ]) {
    await openLab(page, lab);
    await expect(
      page.locator(".calculation-equation .katex-mathml"),
    ).toHaveCount(3);
    await page
      .getByText("詳細：式・単位・モデルの仮定", { exact: true })
      .click();
    await expect(page.locator(".details-formula .katex")).toBeVisible();
    await expect(page.locator(".details-formula math")).toHaveCount(1);
    await expect(page.locator(".katex-error")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
    await page
      .getByText("詳細：式・単位・モデルの仮定", { exact: true })
      .click();
  }
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("button", { name: "Light mode", exact: true }).click();
  await page.getByRole("button", { name: "Sun", exact: true }).click();
  await expect(page.locator(".orbit-svg foreignObject .katex")).toBeVisible();
  await expect(page.locator(".orbit-svg foreignObject math")).toHaveCount(1);
  await expect(page.locator(".calculation-equation .katex-mathml")).toHaveCount(
    3,
  );
  await expect(page.locator(".katex-error")).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  const fontUrls = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((url) => /KaTeX_.*\.(woff2?|ttf)/.test(url)),
  );
  expect(fontUrls.length).toBeGreaterThan(0);
  for (const fontUrl of fontUrls)
    expect(new URL(fontUrl).origin).toBe(new URL(page.url()).origin);
  expect((await request.get(fontUrls[0])).ok()).toBe(true);
});

test("the exact escape boundary is unbound and never a successful elliptical-orbit task", async ({
  page,
}) => {
  await openLab(page, "01 軌道の基本");
  await page
    .getByRole("spinbutton", { name: "待機軌道高度", exact: true })
    .fill("150");
  await page
    .getByRole("spinbutton", { name: "接線方向の噴射", exact: true })
    .fill("3.2366710929717932");
  await expect(page.locator(".outcome strong")).toHaveText("脱出軌道");
  await expect(page.locator(".outcome")).toHaveClass(/notice/);
  await page.getByRole("button", { name: /噴射した場所の反対側/ }).click();
  await page
    .getByRole("button", { name: "結果を確かめる", exact: true })
    .click();
  await expect(
    page.getByText("実験の到達条件も達成しました。", { exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".progress-label strong")).toContainText("00");
});

test("typing a decimal preserves the draft through the parent update", async ({
  page,
}) => {
  await openLab(page, "01 軌道の基本");
  const burn = page.getByRole("spinbutton", {
    name: "接線方向の噴射",
    exact: true,
  });
  await burn.fill("");
  await expect(page.getByRole("alert")).toBeVisible();
  await burn.pressSequentially("0.", { delay: 70 });
  await burn.pressSequentially("125", { delay: 70 });
  await expect(burn).toHaveValue("0.125");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator(".predicted-path")).toHaveAttribute("d", /^M/);
});

test("the capture preset clears an invalid burn draft and restores the target orbit", async ({
  page,
}) => {
  await openLab(page, "04 火星で止まる");
  const burn = page.getByRole("spinbutton", { name: "減速Δv", exact: true });
  await burn.fill("");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator(".predicted-path")).toHaveCount(0);
  await page
    .getByRole("button", { name: "円軌道化に必要なΔvを設定", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(burn).not.toHaveValue("");
  await expect(page.locator(".outcome strong")).toHaveText(
    "安全な目標円軌道を達成",
  );
  await expect(page.locator(".predicted-path")).toHaveAttribute("d", /^M/);
});
