# Cause racine

Cause démontrée : le certificat sélectionné par l'origine pour SNI `display.getcoro.io` ne contient ni ce SAN ni un wildcard compatible. Le routage HTTP sous le même Host réussit, ce qui sépare le défaut TLS du Player.

La cause de configuration sous-jacente (vhost absent, certificat par défaut ou certificat non étendu) reste conditionnée à l'identification du terminateur. Aucune conclusion plus précise n'est revendiquée avant la preuve runtime.
