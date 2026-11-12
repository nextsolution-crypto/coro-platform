# Confirmation de synchronisation

La confirmation signée inclut sync, affectation, séquence, publication, version, SHA-256 et instant d'activation. Le serveur revalide l'affectation et la publication courantes puis avance la séquence avec une condition stricte.

Le scénario de preuve a persisté un `DisplayDeviceSync` `CONFIRMED`. Une confirmation tardive ou rejouée ne peut pas diminuer la séquence et n'est jamais présentée comme preuve physique.
