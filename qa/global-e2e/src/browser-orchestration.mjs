import { actor } from "./identity-catalogue.mjs";
import { assertLocalUrl } from "./policy.mjs";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class QaIdentityLab {
  constructor({ apiUrl, portalUrl, frontendUrl, password, mfaAdapterUrl, mfaChannelToken }) {
    this.apiUrl = assertLocalUrl(apiUrl, "CORO_QA_BACKEND_URL").href.replace(/\/$/, "");
    this.portalUrl = assertLocalUrl(portalUrl, "CORO_QA_PORTAL_URL").href.replace(/\/$/, "");
    this.frontendUrl = assertLocalUrl(frontendUrl, "CORO_QA_FRONTEND_URL").href.replace(/\/$/, "");
    this.password = password;
    this.mfaAdapterUrl = assertLocalUrl(mfaAdapterUrl, "CORO_QA_MFA_ADAPTER_URL").href.replace(/\/$/, "");
    this.mfaChannelToken = mfaChannelToken;
    this.sessions = new Map();
  }

  async call(route, { method = "GET", token, body } = {}) {
    const response = await fetch(`${this.apiUrl}${route}`, {
      method,
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: response.status, data };
  }

  async completeMfa(identity, after) {
    const url = new URL(`${this.mfaAdapterUrl}/challenge`);
    url.searchParams.set("recipient", identity.email);
    url.searchParams.set("after", String(after));
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const response = await fetch(url, { headers: { authorization: `Bearer ${this.mfaChannelToken}` } });
      if (response.status === 200) return (await response.json()).code;
      if (response.status !== 404) throw new Error(`MFA adapter rejected request: ${response.status}`);
      await delay(100);
    }
    throw new Error(`MFA challenge unavailable for ${identity.key}`);
  }

  async loginAs(key) {
    const identity = actor(key);
    if (identity.active === false) {
      const denied = await this.call(identity.kind === "portal" ? "/client-auth/login" : "/auth/login", { method: "POST", body: { email: identity.email, password: this.password } });
      if (denied.status < 400) throw new Error(`Revoked actor unexpectedly authenticated: ${key}`);
      return { denied: true, status: denied.status, actor: identity };
    }
    const route = identity.kind === "portal" ? "/client-auth" : "/auth";
    const startedAt = Date.now();
    const first = await this.call(`${route}/login`, { method: "POST", body: { email: identity.email, password: this.password } });
    if (first.status >= 300 || !first.data?.mfaRequired) throw new Error(`Password/MFA preflight failed for ${key}: ${first.status}`);
    const code = await this.completeMfa(identity, startedAt);
    const verified = await this.call(`${route}/verify-mfa`, { method: "POST", body: { email: identity.email, code } });
    if (verified.status >= 300) throw new Error(`MFA verification failed for ${key}: ${verified.status}`);
    const session = identity.kind === "portal"
      ? { actor: identity, portal: true, token: verified.data.token, user: verified.data.user }
      : { actor: identity, portal: false, token: verified.data.access_token, refresh: verified.data.refresh_token, user: verified.data.user };
    this.assertRoleAndScope(session);
    this.sessions.set(key, session);
    return session;
  }

  assertRoleAndScope(session) {
    if (session.user?.role !== session.actor.role)
      throw new Error(`Role mismatch for ${session.actor.key}: expected ${session.actor.role}`);
    if (session.user?.organizationId && session.actor.tenant === "customer-a" && !String(session.user.organizationId).includes("0002"))
      throw new Error(`Tenant mismatch for ${session.actor.key}`);
    return true;
  }

  async assertUnauthorized(key, route) {
    const session = this.sessions.get(key) || await this.loginAs(key);
    const result = await this.call(route, { token: session.token });
    if (![401, 403, 404].includes(result.status)) throw new Error(`Expected denial for ${key} on ${route}, got ${result.status}`);
    return result.status;
  }

  async createIsolatedSession(key, { browser } = {}) {
    const session = this.sessions.get(key) || await this.loginAs(key);
    let ownedBrowser = false;
    if (!browser) {
      const require = createRequire(join(resolve("coro-backend"), "package.json"));
      const puppeteer = require("puppeteer");
      browser = await puppeteer.launch({ headless: true });
      ownedBrowser = true;
    }
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    const origin = session.portal ? this.portalUrl : this.frontendUrl;
    await page.goto(origin, { waitUntil: "domcontentloaded" });
    await page.evaluate(
      ({ token, user, portal }) => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem(portal ? "coro_client_token" : "coro_token", token);
        localStorage.setItem(portal ? "coro_client_user" : "coro_user", JSON.stringify(user));
      },
      { token: session.token, user: session.user, portal: session.portal },
    );
    const isolated = { browser, context, page, ownedBrowser, session };
    this.sessions.set(`${key}:browser`, isolated);
    return isolated;
  }

  async logout(key) {
    const session = this.sessions.get(key);
    if (session && !session.portal) await this.call("/auth/logout", { method: "POST", token: session.token, body: { refresh_token: session.refresh } }).catch(() => undefined);
    this.sessions.delete(key);
    const isolated = this.sessions.get(`${key}:browser`);
    if (isolated) {
      await isolated.context.close();
      if (isolated.ownedBrowser) await isolated.browser.close();
      this.sessions.delete(`${key}:browser`);
    }
  }

  resetSession(key) { this.sessions.delete(key); }
}
