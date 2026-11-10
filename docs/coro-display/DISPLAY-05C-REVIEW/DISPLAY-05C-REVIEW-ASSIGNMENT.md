# Assignation

L’assignation exige `DISPLAY_OBSERVATION_ASSIGN`, une version attendue et un utilisateur appartenant à l’organisation. Un utilisateur externe est refusé. La concurrence optimiste s’appuie sur `lockVersion`; une mise à jour concurrente ne peut pas écraser silencieusement l’autre.

Le scénario PostgreSQL prouve l’assignation valide, le refus interorganisation et la conservation de l’historique append-only.
