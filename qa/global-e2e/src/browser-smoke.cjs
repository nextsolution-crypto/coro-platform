#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const repo = path.resolve(__dirname, "..", "..", "..");
const { launch, openSession, sleep } = require(
  path.join(repo, "coro-frontend/design-system/bench/cdp.cjs"),
);
const sessions = require(
  path.join(repo, "coro-frontend/design-system/bench/real-session.cjs"),
);

const output = process.env.CORO_QA_BROWSER_OUT;
if (!output || !/^D:\\CORO-QA\\/i.test(path.resolve(output)))
  throw new Error("Browser evidence must be under D:\\CORO-QA.");
if (
  !/^http:\/\/(127\.0\.0\.1|localhost):3154$/.test(
    process.env.BENCH_BASE_URL || "",
  )
)
  throw new Error("Local frontend URL required.");

(async () => {
  const founder = await sessions.login("founder@global-e2e.test");
  const chrome = await launch();
  const results = [];
  try {
    for (const test of [
      { theme: "classic", viewport: 1440 },
      { theme: "glass-light", viewport: 1920 },
      { theme: "glass-dark", viewport: 390, colorScheme: "dark" },
      { theme: "system", viewport: 430, colorScheme: "dark" },
    ]) {
      const page = await openSession(chrome.port, {
        ui: test.theme === "classic" ? "classic" : "glass",
        theme: test.theme,
        viewport: test.viewport,
        colorScheme: test.colorScheme,
        real: {
          access: founder.access_token || founder.token,
          user: founder.user,
        },
      });
      try {
        const mode = await page.goto("/dashboard");
        await sleep(1200);
        const pathname = await page.eval("location.pathname");
        const overflow = await page.eval(
          "document.documentElement.scrollWidth > document.documentElement.clientWidth",
        );
        const active = await page.eval(
          "document.querySelectorAll('[aria-current=page]').length",
        );
        const screenshot = path.join(
          output,
          `dashboard-${test.theme}-${test.viewport}.png`,
        );
        await page.screenshot(screenshot);
        await page.send("Page.reload", { ignoreCache: false });
        await sleep(1800);
        const persisted = await page.eval("location.pathname");
        results.push({
          ...test,
          mode,
          pathname,
          reloadPathname: persisted,
          overflow,
          active,
          consoleErrors: page.consoleErrors.length,
          status:
            pathname === "/dashboard" &&
            persisted === "/dashboard" &&
            !overflow &&
            active <= 1 &&
            page.consoleErrors.length === 0
              ? "PASS"
              : "FAIL",
        });
      } finally {
        await page.close();
      }
    }
  } finally {
    await chrome.close();
  }
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(
    path.join(output, "browser-smoke.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2),
  );
  console.log(
    `Browser smoke: ${results.filter((x) => x.status === "PASS").length}/${results.length} PASS`,
  );
  if (results.some((x) => x.status === "FAIL")) process.exitCode = 1;
})().catch((error) => {
  console.error(error.message);
  process.exit(2);
});
