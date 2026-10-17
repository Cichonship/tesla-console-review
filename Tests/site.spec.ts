import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("renders the actual model, layout fits, and core page passes accessibility checks", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await expect(page.getByTestId("viewer-status")).toHaveText("Model ready");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await expect(page.locator("canvas")).toBeVisible();
  const a = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(a.violations).toEqual([]);
  await page.screenshot({
    path: info.outputPath("Assembly.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("all model modes, standard views, exploding and sectioning remain interactive", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await expect(page.getByTestId("viewer-status")).toHaveText("Model ready");
  await page.getByRole("button", { name: "Explode", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Explode", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  for (const name of [
    "Tray",
    "Bin",
    "Lid envelope",
    "In the console",
    "Assembly",
  ]) {
    await page.getByRole("tab", { name: new RegExp(name) }).click();
    await expect(
      page.getByRole("tab", { name: new RegExp(name) }),
    ).toHaveAttribute("aria-selected", "true");
  }
  for (const value of [
    "top",
    "front",
    "rear",
    "left",
    "right",
    "bottom",
    "iso",
  ])
    await page.getByLabel("Camera view", { exact: true }).selectOption(value);
  await page.getByRole("button", { name: "Section", exact: true }).click();
  await expect(
    page.getByText("Cut edges highlighted", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset camera", exact: true }).click();
  expect(errors).toEqual([]);
});
test("lid requirement uses the flange datum, never an upward-opening lid", async ({
  page,
}, info) => {
  await page.goto("./");
  await page.getByRole("tab", { name: /Lid envelope/ }).click();
  await expect(page.locator(".lid-callout")).toContainText("Z +6.5");
  await expect(page.locator(".lid-callout")).toContainText(
    "Opens downward into the bin",
  );
  await expect(page.getByLabel("Inspect another detail")).toHaveValue(
    "lid-headroom",
  );
  await page.screenshot({
    path: info.outputPath("Lid Envelope.png"),
    fullPage: false,
  });
});
test("dimension selection, filtering, empty search and illustrative slide work", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByLabel("Inspect another detail").selectOption("rear-angle");
  await expect(page.locator(".selected-dimension")).toContainText("18");
  await page
    .getByRole("group", { name: "Filter dimensions" })
    .getByRole("button", { name: "Lid", exact: true })
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(8);
  await page
    .getByRole("searchbox", { name: "Search dimensions" })
    .fill("not-a-dimension");
  await expect(
    page.getByText("No dimensions match.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("tab", { name: /In the console/ }).click();
  await page.getByLabel("Illustrative slide", { exact: false }).fill("77");
  await expect(page.locator(".travel-control")).toContainText("77 / 77 mm");
  await expect(page.locator(".context-warning")).toContainText("5.105 mm");
});
test("share and review preserve revision, selected item and camera across reload", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.getByTestId("viewer-status")).toHaveText("Model ready");
  await page.getByLabel("Inspect another detail").selectOption("opening-width");
  await page.getByRole("button", { name: "Discuss this detail" }).click();
  const url = new URL(page.url());
  expect(url.searchParams.get("rev")).toBe("1.3.0");
  expect(url.searchParams.get("item")).toBe("opening-width");
  expect(url.searchParams.get("camera")).toBeTruthy();
  const key = url.searchParams.get("reviewKey");
  expect(key).toBeTruthy();
  await page.getByRole("button", { name: "Discuss this detail" }).click();
  expect(new URL(page.url()).searchParams.get("reviewKey")).toBe(key);
  expect(new URL(page.url()).hash).toBe("#review");
  await page.reload();
  await expect(page.getByLabel("Inspect another detail")).toHaveValue(
    "opening-width",
  );
  await expect(page.locator(".review-context h3")).toHaveText(
    "Nominal opening width",
  );
  await page
    .getByRole("button", { name: "Load comments", exact: true })
    .click();
  await expect(page.locator(".utterances-frame")).toBeAttached();
  const frameURL = new URL(
    (await page.locator(".utterances-frame").getAttribute("src")) as string,
  );
  expect(frameURL.searchParams.get("issue-term")).toBe(
    `console-v1.3.0:opening-width:${key}`,
  );
  expect(frameURL.searchParams.get("url")).toContain("camera=");
  expect(frameURL.searchParams.get("repo")).toBe(
    "Cichonship/tesla-console-review",
  );
});
test("static fallback retains specs and all downloadable files are present", async ({
  page,
  request,
}) => {
  await page.goto("./?static=1");
  await expect(
    page.getByAltText("Validated Fusion model reference"),
  ).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(43);
  for (const file of [
    "assembly-v1.3.0.step",
    "tray-v1.3.0.step",
    "bin-v1.3.0.step",
    "assembly-v1.3.0.f3d",
    "dimension-sheet-v1.3.0.pdf",
    "designer-handoff-v1.3.0.zip",
  ]) {
    const r = await request.get("Downloads/" + file);
    expect(r.status()).toBe(200);
    expect((await r.body()).length).toBeGreaterThan(1000);
  }
});
test("invalid shared state falls back safely and keyboard tabs work", async ({
  page,
}) => {
  await page.goto(
    "./?mode=bogus&view=nope&item=script&slide=NaN&camera=garbage",
  );
  await expect(page.getByRole("tab", { name: /Assembly/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  const tab = page.getByRole("tab", { name: /Assembly/ });
  await tab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: /Tray/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.keyboard.press("End");
  await expect(
    page.getByRole("tab", { name: /In the console/ }),
  ).toHaveAttribute("aria-selected", "true");
});
