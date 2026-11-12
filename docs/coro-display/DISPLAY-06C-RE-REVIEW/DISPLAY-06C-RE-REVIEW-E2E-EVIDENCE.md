# Preuves E2E

Les preuves se trouvent dans `evidence/` et proviennent du même scénario. `scenario.json` contient les identifiants appareil/affectation/publication, séquence, SHA-256, confirmation, heartbeat et indicateurs de supervision. `restart-process.json` contient le PID enfant, la séquence, l’empreinte, le mode d’urgence et la largeur naturelle chargée par Chromium.

Les PNG sont des captures réelles du rendu synthétique distribué par le Gateway. `physicalDisplayProof` reste explicitement `false`.

| Fichier | SHA-256 |
|---|---|
| `online.png` / `offline.png` / `restart.png` / `emergency.png` | `7a5175f59992a07616d58b06a310b2a3909c43df6d406a736ef54995563a09ed` |
| `restart-process.json` | `cf5215c04c2be4ace5b7852876181e0b97b1882a4e74dfe6cc9416015c60cb57` |
| `scenario.json` | `d9fb48c20ac90533303348499292db850af56c89f02e1653c68def35bbff3481` |
