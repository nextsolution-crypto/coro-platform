# MFA capture

The backend keeps its canonical generation, expiry, attempt and verification logic. QA delivery writes only to the restricted capture directory. `mfa-capture-adapter.mjs` exposes a loopback-only, bearer-protected channel, accepts only synthetic recipients, consumes a challenge once, removes the source capture and sets `Cache-Control: no-store`.

The adapter fails closed when its token, directory or challenge is unavailable. It never contacts Brevo or Twilio and never prints the code. Wrong-code and expired-code acceptance must be exercised against the real backend; the adapter does not alter those decisions.
