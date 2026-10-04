# Population Citizen Profile 01C

The authenticated citizen profile at `/population/[publicSlug]` consumes the
01B `communications` read model and its eight contact-change operations.

PHONE and EMAIL are presented separately with the backend-provided masked
destination, ownership verification, local/program availability and action
state. PHONE also presents the safe suppression state without exposing its
internal database terminology.

PHONE uses the current public program `consentVersion` and localized consent
text. The checkbox is never preselected. Missing legal text/version disables
initiation; stale consent refreshes the profile/program state and requires a
new acknowledgement.

The workflow is `input -> initiate -> OTP_REQUIRED -> verify -> profile
refresh`. Resend calls the 01B resend endpoint and rotates the authoritative
OTP. Cancel calls the 01B cancel endpoint. Terminal error codes clear stale
workflow state and refresh the profile.

Only `{ version, publicSlug, subscriberId, type, challengeToken,
maskedProposedDestination, expiresAt }` is retained under the namespaced
`sessionStorage` key `coro.population.contactChange.v1:<publicSlug>`. OTP and
raw proposed destinations are never persisted. No data is written to
`localStorage`, URLs, logs or analytics. Since 01B intentionally has no status
endpoint, refresh restores the OTP surface only until the recorded expiry;
the next verify/resend/cancel request revalidates all state server-side.

Closing the input form makes no backend request. Once a challenge exists, the
workflow remains visible until explicit cancellation or a terminal response.
Network ambiguity keeps the token and refreshes the authoritative profile; the
UI never claims APPLY, resend or cancellation without a backend response.

The UI uses native labels, buttons, focusable alert regions, `aria-live`, a
numeric one-time-code input, 44px minimum controls and safe-area padding for
mobile keyboards. FR and EN copy are co-located with the existing Population
portal convention.
