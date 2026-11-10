# GO / NO-GO

## Verdict

**GO conditionnel pour PR.**

Les critères logiciels et PostgreSQL pertinents sont satisfaits. Les preuves sont liées aux versions exactes, les approbations périmées et permissions implicites sont refusées, le multitenant et la révocation sont préservés, et le worker sécurisé reste inchangé.

Conditions non substituables avant diffusion : approbation humaine explicite et recette physique. Le pilote reste `PENDING_REVIEW`. Le test OCR général dépendant de `pdftoppm` est `BLOCKED` sur Windows, sans régression DISPLAY observée.

**NO-GO pour production ou diffusion à ce stade.**
