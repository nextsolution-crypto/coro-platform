# DISPLAY-06A — Cache et hors-ligne

Une mise à jour suit `stage → contrôle d'intégrité → commit atomique`. En cas d'échec, le stage est abandonné et la dernière copie valide reste intacte. Le cache est cloisonné par identité et emplacement; aucun secret n'y est stocké.

Hors ligne : un plan vérifié continue à être affiché. Après la date de réévaluation, il reste identifiable comme vérifié mais d'actualité non confirmée. Un plan absent, corrompu ou connu révoqué n'est jamais présenté comme approuvé. Aucune publicité ne remplace un plan.

Le stockage persistant OS, le chiffrement au repos et la simulation de saturation sont à intégrer dans DISPLAY-06B.
