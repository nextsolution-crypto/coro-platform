# Keystore

## Constat
Le Player pouvait recevoir une clé privée Ed25519 exportable par l'environnement.

## Correction
`CommandDeviceKeyStore` délègue `sign` à un processus externe; le runtime ne reçoit que clé publique, keyId, capacités et commande. Aucune API d'export privé.

## Preuve et tests
Signature valide, signer absent/échoué, sortie invalide et vérification publique; scan du diff sans secret réel.

## Résultat et risque résiduel
PASS pour la séparation logicielle. TPM2/CNG/PKCS#11 Ed25519 et non-exportabilité matérielle NOT_VERIFIED.

