# Identité navigateur

Le navigateur génère une paire WebCrypto P-256 et ne transmet que la clé publique JWK. Le profil est explicitement `WEB_VIEW_ONLY`; une session navigateur standard n'est ni une identité matérielle ni `WEB_EMERGENCY_ELIGIBLE`. La preuve de possession par requête reste une amélioration requise avant un profil de kiosque géré.
