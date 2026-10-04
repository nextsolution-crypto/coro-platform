# Citizen Profile 01B — secure contact change

`population-contact-change/v1` lets an authenticated Population citizen add or
replace their own PHONE or EMAIL destination. It does not implement the 01C UI.

## Authority and state

Routes are scoped by `publicSlug` and `subscriberId`, then validate the existing
citizen `accessToken`. The `challengeToken` is HMAC-protected, non-PII and bound
to challenge, subscriber, program, contact type and purpose. It is not accepted
by registration, access recovery or location workflows.

States are `DELIVERY_PENDING`, `OTP_REQUIRED`, `APPLIED`, `CANCELLED`,
`EXPIRED`, `ATTEMPTS_EXHAUSTED`, `SUPERSEDED` and `DELIVERY_FAILED`. Only the
first two are operational. PostgreSQL enforces one operational challenge per
subscriber/type and terminal immutability. PHONE and EMAIL may coexist.

The canonical proposed destination is protected only through
`PopulationContactCryptoService`. Its fingerprint is equality/evidence, never
an identity or public identifier. Recoverable destination data is cleared at
every terminal state. No plaintext OTP or proposed destination is persisted.

## API contract for 01C

All routes start with
`POST /population/public/:publicSlug/subscribers/:subscriberId`:

- `/contact/phone/initiate`: `{ accessToken, phone, smsConsent, consentVersion }`
- `/contact/email/initiate`: `{ accessToken, email }`
- `/contact/{phone|email}/verify`: `{ accessToken, challengeToken, code }`
- `/contact/{phone|email}/resend`: `{ accessToken, challengeToken }`
- `/contact/{phone|email}/cancel`: `{ accessToken, challengeToken }`
- `/profile`: existing `{ accessToken }`, with additive `communications`.

Initiation returns `challengeToken`, `contactType`, server-derived `purpose`,
`status`, `maskedProposedDestination`, and `expiresAt`. The browser never
resubmits the destination. Server time is authoritative. Stable public errors
are the `CONTACT_CHANGE_*` codes in `population-contact-change.errors.ts`.

## PHONE, EMAIL and evidence

PHONE uses the canonical phone authority and requires ACTIVE lifecycle, SMS
capability, explicit current consent and a non-suppressed destination. Apply
rechecks consent, expected current contact, identity collision and suppression
under locks. Contact, SMS state, new evidence/event and APPLIED challenge commit
atomically. STOP/UNSUBSCRIBE and apply share the global phone lock.

EMAIL uses trim/lowercase canonical comparison without provider-specific
rewriting and the existing transactional email transport. Ownership is proved
at the proposed destination. `emailEnabled` remains a separate preference.

`communications.phone` exposes `exists`, `maskedDestination`, `verified`,
`localEnabled`, `programEnabled`, `suppressed`, `effectivelyAvailable` and
`actionRequired`. EMAIL exposes the same except `suppressed`. Existing
`channels` remains backward compatible. Historical contacts retain legacy
`verifiedAt` compatibility; matching APPLIED fingerprint evidence identifies a
current destination changed through 01B.

## Concurrency and retention

Apply uses advisory identity/global-phone locks, row locks, expected-current
binding and existing partial identity indexes. Concurrent verify applies once;
resend rotates OTP authority; cancel/verify serialize. Historical verification,
consent, delivery, location and remediation records are preserved.

Recoverable temporary PII is cleared immediately at terminal state. A future
job may purge non-recoverable metadata after 90 days; 01B adds no scheduler.
Key rotation/readiness remain owned by CRYPTO-01.
