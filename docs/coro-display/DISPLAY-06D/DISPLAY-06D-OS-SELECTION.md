# Sélection du système d’exploitation

Référence pilote : **Linux LTS minimal avec systemd, Chromium stable et TPM2/PKCS#11**. Motifs : supervision native, utilisateur dédié, permissions lisibles, confinement systemd et intégration TPM mature. Windows demeure une cible future via CNG/DPAPI et Windows Service.

Ce choix est architectural : aucun Linux kiosque physique n’a été testé pendant ce mandat. L’hôte Windows a servi aux tests Node/PostgreSQL/Chromium; l’installation Linux et TPM est `NOT_VERIFIED`.
