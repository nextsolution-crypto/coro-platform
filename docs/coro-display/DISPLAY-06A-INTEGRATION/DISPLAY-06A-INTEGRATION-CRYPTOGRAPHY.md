# DISPLAY-06A-INTEGRATION — Cryptographie

Ed25519 authentifie le payload canonique complet; SHA-256 lie le rendu exact au manifeste sans être présenté comme signature. La canonicalisation refuse les valeurs ambiguës et stabilise l'ordre des propriétés.

L'enveloppe, le payload et la politique ont des clés exactes. Identifiants, portée, profil, ratio, dimensions, référence privée, dates, séquence et politique 40/10/10 sont validés avant l'empreinte du document. Toute mutation critique testée entraîne un refus.
