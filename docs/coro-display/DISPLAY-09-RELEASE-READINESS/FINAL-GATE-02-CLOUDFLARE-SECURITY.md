# Gate 2 — sécurité Cloudflare

| Contrôle | État |
|---|---|
| Proxy Edge et certificat wildcard | Confirmé fournisseur |
| Bot Fight Mode | Activé; ne pas désactiver globalement |
| Rate limiting auth | Présent |
| WAF personnalisé | Aucun |
| Cache Rule personnalisée | Aucune |
| Redirect Rule simple | Aucune |
| TLS minimal | 1.0 — recommandation séparée vers 1.2 après étude de compatibilité |
| Always Use HTTPS | Désactivé — ne pas modifier globalement sans analyse de boucle |
| HSTS | NOT_VERIFIED |
| Origin Rules / Transform Rules | NOT_VERIFIED |

Pour Display, conserver les réponses privées dynamiques hors cache, ne jamais journaliser les jetons d'activation/session, ne pas créer d'exception Bot Fight permissive sans reproduction, et borner activation/synchronisation/révocation. Les contrôles applicatifs CSP, anti-framing et no-store sont présents dans le candidat.

**Verdict : GO CONDITIONNEL — contrôles applicatifs prêts, propriétés d'origine et règles fournisseur complètes à confirmer.**
