#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const repo = path.resolve(__dirname, "..", "..", "..");
const { launch, openSession, sleep } = require(
  path.join(repo, "coro-frontend/design-system/bench/cdp.cjs"),
);
const { loginPortal } = require(
  path.join(repo, "coro-frontend/design-system/bench/real-session.cjs"),
);

const output = process.env.CORO_QA_BROWSER_OUT;
if (!output || !/^D:\\CORO-QA\\/i.test(path.resolve(output)))
  throw new Error("Portal evidence must be under D:\\CORO-QA.");
(async () => {
  const actor = await loginPortal("portal-manager-a@global-e2e.test");
  const chrome = await launch();
  let page;
  try {
    page = await openSession(chrome.port, {
      ui: "glass",
      theme: "glass-dark",
      viewport: 390,
      colorScheme: "dark",
      real: { access: actor.token, user: actor.user, portal: true },
    });
    const mode = await page.goto("/dashboard");
    await sleep(1000);
    const pathname = await page.eval("location.pathname");
    const internalToken = await page.eval("localStorage.getItem('coro_token')");
    const portalToken = await page.eval(
      "Boolean(localStorage.getItem('coro_client_token'))",
    );
    await page.screenshot(
      path.join(output, "portal-dashboard-glass-dark-390.png"),
    );
    await page.send("Page.reload", { ignoreCache: false });
    await sleep(1500);
    const reloaded = await page.eval("location.pathname");
    const result = {
      mode,
      pathname,
      reloaded,
      internalSessionAbsent: internalToken === null,
      portalSessionPresent: portalToken,
      consoleErrors: page.consoleErrors.length,
    };
    result.status =
      pathname === "/dashboard" &&
      reloaded === "/dashboard" &&
      result.internalSessionAbsent &&
      portalToken &&
      result.consoleErrors === 0
        ? "PASS"
        : "FAIL";
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(
      path.join(output, "portal-browser-smoke.json"),
      JSON.stringify(result, null, 2),
    );
    console.log(`Client Portal browser smoke: ${result.status}`);
    if (result.status !== "PASS") process.exitCode = 1;
  } finally {
    if (page) await page.close();
    await chrome.close();
  }
})().catch((error) => {
  console.error(error.message);
  process.exit(2);
});
