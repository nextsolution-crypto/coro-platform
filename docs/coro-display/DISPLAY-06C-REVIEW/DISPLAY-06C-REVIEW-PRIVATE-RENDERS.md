# Rendus privés

## Constats et tests

L’endpoint exige une preuve M2M liée au chemin et une affectation active de même portée. La publication doit être publiée, non révoquée et son SHA-256 est revérifié après lecture privée. Les références arbitraires et portées étrangères sont refusées.

## Limites

Pas de reprise HTTP par plage ni test d’interruption réelle. Le Player connecté ne transforme pas encore `private://` en appel Gateway; aucune exposition publique n’a été créée.
