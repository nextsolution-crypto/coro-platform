# Validation de chaîne

Le contrôle précédent validait date et SAN, pas la chaîne. La nouvelle inspection utilise `-verify_return_error` et `-verify_hostname`; un certificat non expiré ne suffit pas. Tant que le run protégé n'est pas exécuté : chaîne origine **NOT_VERIFIED**.
