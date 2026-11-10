# DISPLAY-04A — Sécurité PDF

Limites : 25 Mio, 100 pages, page explicite, 72–300 DPI, 100 mégapixels, 30 secondes de rendu. V1 refuse chiffrement/mot de passe, JavaScript, actions Launch, pièces jointes, Filespec, RichMedia et XFA.

La signature `%PDF-` et la structure sont vérifiées par deux niveaux : enveloppe CORO puis parseur `pdfinfo`. Le nom et le Content-Type client ne sont jamais autorités. La sortie est un PNG reconstruit, rehaché et stocké en privé; l'overlay DISPLAY-03 est ensuite généré séparément.

Les erreurs et journaux ne contiennent ni contenu documentaire ni URL permanente. Un scanner antimalware préalable demeure recommandé avant production.
