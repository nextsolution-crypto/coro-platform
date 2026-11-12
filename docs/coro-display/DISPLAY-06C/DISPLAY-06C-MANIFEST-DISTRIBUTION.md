# Manifestes

Seules les affectations actives vers une publication `PUBLISHED`, non révoquée et dotée d’un rendu intègre produisent un manifeste. La séquence est monotone en transaction. La signature passe par `ManifestSigner`; aucune clé privée n’est dans le dépôt.
