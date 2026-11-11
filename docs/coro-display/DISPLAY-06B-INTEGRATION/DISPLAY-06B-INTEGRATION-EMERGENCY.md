# DISPLAY-06B-INTEGRATION — Urgence

L'état HMAC est atomique, versionné et validé. Les priorités sont `REAL > EXERCISE > PERMANENT > NORMAL`; toute baisse exige un clear gouverné explicite et aucun timer ne termine une urgence.

Les commandes concurrentes sont sérialisées et la corruption échoue de façon conservatrice. L'autorité du clear, le journal append-only et le keystore OS restent à fournir par le Gateway.
