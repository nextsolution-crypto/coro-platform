import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(
  new URL("../app/components/ChatWidget.tsx", import.meta.url),
  "utf8",
);

test("contact request requires consent and sends a bounded summary, not full history", () => {
  assert.match(source, /contactConsent/);
  assert.match(source, /summary,/);
  assert.match(source, /\.slice\(0, 1_500\)/);
  assert.match(source, /consent: true/);
  assert.match(source, /requestId:/);
  assert.doesNotMatch(
    source,
    /JSON\.stringify\(\{ email: visitorEmail, history \}\)/,
  );
});

test("provider failures cannot become visible success", () => {
  assert.match(
    source,
    /!response\.ok \|\|\s*!result \|\|\s*typeof result !== ["']object["']/,
  );
  assert.match(source, /success\?: unknown \}\)\.success !== true/);
  assert.match(source, /setContactError/);
  assert.doesNotMatch(source, /catch \{\s*setEmailSent\(true\)/);
});

test("concurrent contact submissions are disabled", () => {
  assert.match(source, /contactSending/);
  assert.match(
    source,
    /disabled=\{\s*!visitorEmail\.trim\(\) \|\|\s*!contactConsent \|\|\s*contactSending\s*\}/,
  );
});

test("chat input and legacy outbound history respect backend limits", () => {
  assert.match(source, /maxLength=\{2_000\}/);
  assert.match(source, /messages\s*\.slice\(-10\)/);
  assert.match(source, /content\.slice\(0, 2_000\)/);
});

test("intelligent assistant sends only bounded current input and public page context", () => {
  assert.match(source, /NEXT_PUBLIC_WEB_AI_INTELLIGENT_ASSISTANT_ENABLED/);
  assert.match(source, /chat\/v1\/public-assistant/);
  assert.match(source, /pageContext:\s*\{\s*pathname: window\.location\.pathname/);
  assert.doesNotMatch(source, /pageContext: window\.location\.href/);
  const intelligentBranch = source.slice(
    source.indexOf("if (INTELLIGENT_ASSISTANT_ENABLED)"),
    source.indexOf('publicApiUrl("chat/vitrine")'),
  );
  assert.match(intelligentBranch, /message: text/);
  assert.match(intelligentBranch, /language/);
  assert.match(intelligentBranch, /sessionId/);
  assert.doesNotMatch(intelligentBranch, /history,/);
});

test("assistant state is ephemeral and exposes no browser persistence or analytics", () => {
  assert.doesNotMatch(source, /localStorage|sessionStorage|document\.cookie/);
  assert.doesNotMatch(source, /gtag\(|analytics|dataLayer/);
  assert.match(source, /setSessionId\(undefined\)/);
});

test("grounding claim is shown only when the intelligent assistant is active", () => {
  assert.match(
    source,
    /INTELLIGENT_ASSISTANT_ENABLED \? copy\.grounded : copy\.legacy/,
  );
  assert.match(source, /citations\.map/);
  assert.match(source, /suggestedLinks/);
  assert.match(source, /message\.links\?\.length/);
  assert.match(source, /citation\.excerpt/);
});

test("documentary failure remains useful without inventing an answer", () => {
  assert.match(source, /content:\s*copy\.unavailable/);
  assert.match(source, /url:\s*language === "fr-CA" \? "\/contact"/);
  assert.match(source, /url:\s*language === "fr-CA" \? "\/"/);
  assert.match(source, /questions:\s*\[\.\.\.copy\.suggestions\]/);
});
