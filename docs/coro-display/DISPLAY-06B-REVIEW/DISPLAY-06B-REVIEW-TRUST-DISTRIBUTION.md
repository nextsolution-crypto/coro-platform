# DISPLAY-06B-REVIEW — Distribution de la confiance

Le bundle est signé séparément par la racine, exige une version strictement croissante, une date valide, un signer attendu optionnel, des identifiants uniques et des clés parsables avec fenêtres cohérentes. Les tests refusent bundle falsifié, ancienne version, mauvaise racine et émission future.

Correction : validation des dates et des clés du bundle, plus liaison possible à l'identifiant de racine attendu. Les contenus secondaires appliquent désormais aussi `activeFrom`, expiration et révocation de leur clé.

Limite : `currentVersion` et la racine sont injectés par l'appelant. Leur persistance protégée, la rotation gouvernée de racine et la reprise après crash appartiennent à l'adaptateur de confiance futur.
