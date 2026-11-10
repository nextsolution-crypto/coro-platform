# DISPLAY-06A-REVIEW — Clés de confiance

Le validateur exige un `keyId` déjà présent localement, une date d'activation antérieure à l'émission et refuse les clés révoquées ou expirées. Une clé incluse seulement par un manifeste n'est jamais acceptée.

DISPLAY-06B devra livrer un registre persistant, signé par une racine distincte, avec rotation chevauchante, rollback protégé et récupération hors ligne. La clé privée ne doit jamais atteindre le Player.
