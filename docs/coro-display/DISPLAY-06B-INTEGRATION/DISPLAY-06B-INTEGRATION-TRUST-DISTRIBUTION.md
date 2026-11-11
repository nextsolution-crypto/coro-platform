# DISPLAY-06B-INTEGRATION — Confiance

Le bundle exige une racine Ed25519, une signature indépendante, une version strictement croissante, un signer attendu et des fenêtres de clés cohérentes. Les bundles falsifiés, anciens, futurs et signés par une autre racine sont refusés.

La version courante et la racine restent injectées par l'appelant. Leur persistance et la rotation gouvernée de racine sont des prérequis DISPLAY-06C; aucune clé privée réelle n'est présente.
