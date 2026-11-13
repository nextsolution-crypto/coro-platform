# Compatibilité Cloudflare

État : Full, DNS Display absent, Edge wildcard actif. Full ne valide pas strictement l'origine et ne ferme donc pas le défaut.

Prérequis Full (strict) : DNS proxifié, origine accessible, certificat non expiré et de confiance, SAN Display, chaîne complète, SNI Display, routage Player. Le passage global à Full (strict) n'est ni appliqué ni demandé avant validation de tous les hostnames existants.
