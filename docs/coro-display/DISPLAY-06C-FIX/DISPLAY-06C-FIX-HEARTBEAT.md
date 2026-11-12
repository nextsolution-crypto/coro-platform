# Heartbeat

`POST /device-gateway/heartbeat` est distinct de la télémétrie générale et exige la preuve M2M. Il conserve logiciel, mode, version documentaire, séquence, santé cache/runtime, réseau et erreurs bornées.

La migration additive indexe `lastHeartbeatAt`. Le résultat précise `physicalDisplayProof: false`. Le scénario E2E a persisté un heartbeat authentifié après la confirmation.
