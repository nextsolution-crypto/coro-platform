# Enrôlement Web

Un administrateur affecté au bâtiment crée un code à six chiffres, valable 60 à 900 secondes. Un seul code actif subsiste. Le code est stocké haché, borné à cinq essais, consommé une fois et remplacé par une session aléatoire de 256 bits. Les révocations sont immédiates côté serveur.
