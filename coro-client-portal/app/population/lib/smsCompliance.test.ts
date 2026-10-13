import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  SMS_CARRIER_DISCLOSURE,
  SMS_CONFIRMATION_DISCLOSURE,
  SMS_LEGAL_URLS,
} from "./smsCompliance.ts";

test("carrier disclosure is bilingual and contains every required term", () => {
  const fr = Object.values(SMS_CARRIER_DISCLOSURE.fr).join(" ");
  const en = Object.values(SMS_CARRIER_DISCLOSURE.en).join(" ");
  assert.match(fr, /fréquence des messages varie/i);
  assert.match(fr, /frais de messagerie et de données/i);
  assert.match(fr, /STOP/);
  assert.match(fr, /HELP/);
  assert.match(en, /message frequency varies/i);
  assert.match(en, /message and data rates may apply/i);
  assert.match(en, /STOP/);
  assert.match(en, /HELP/);
  assert.match(SMS_CONFIRMATION_DISCLOSURE.fr, /Sentinelle Population/);
  assert.match(SMS_CONFIRMATION_DISCLOSURE.en, /Sentinelle Population/);
});

test("carrier disclosure uses canonical legal URLs", () => {
  assert.deepEqual(SMS_LEGAL_URLS.fr, {
    terms: "https://getcoro.io/sms-terms",
    privacy: "https://getcoro.io/privacy",
  });
  assert.deepEqual(SMS_LEGAL_URLS.en, {
    terms: "https://getcoro.io/sms-terms?lang=en",
    privacy: "https://getcoro.io/privacy?lang=en",
  });
});

test("registration requires a false-by-default controlled consent and sends the explicit signal", () => {
  const registration = readFileSync(
    new URL("../components/PopulationRegistration.tsx", import.meta.url),
    "utf8",
  );
  assert.match(registration, /useState\(false\)/);
  assert.match(registration, /checked=\{consented\}/);
  assert.match(registration, /&&\s*consented\s*&&/);
  assert.match(registration, /smsConsent:\s*consented/);
  assert.match(registration, /SMS_LEGAL_URLS/);
});

test("PHONE contact change renders the same carrier disclosure and direct legal links", () => {
  const profile = readFileSync(
    new URL("../components/PopulationContactProfile.tsx", import.meta.url),
    "utf8",
  );
  assert.match(profile, /SMS_CARRIER_DISCLOSURE/);
  assert.match(profile, /SMS_LEGAL_URLS/);
  assert.match(profile, /sms-contact-change-carrier-disclosure/);
  assert.match(profile, /program\.privacyTextEN \|\| program\.privacyTextFR/);
  assert.match(profile, /checked=\{consent\}/);
});

test("SMS confirmation renders the compliance disclosure", () => {
  const verification = readFileSync(
    new URL("../components/PopulationVerification.tsx", import.meta.url),
    "utf8",
  );
  assert.match(verification, /workflow\.smsSubscribed/);
  assert.match(verification, /SMS_CONFIRMATION_DISCLOSURE/);
});
