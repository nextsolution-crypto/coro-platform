# DISPLAY-04A-REVIEW — Licence du moteur PDF

## Observations

L'image Debian Bookworm examinée contient `pdfinfo`/`pdftocairo` Poppler **22.12.0**. CORO exécute les outils comme processus externes; il ne lie pas les bibliothèques Poppler au code Node.

La notice Debian du paquet indique principalement `GPL-2 or GPL-3`, avec composants GPL-2, GPL-3 et Apache-2.0. La distribution d'une image contenant les exécutables déclenche néanmoins les obligations de redistribution applicables : notices, texte de licence et accès au code source correspondant exact. L'exécution externe réduit le couplage avec CORO mais n'annule pas les obligations portant sur le binaire distribué.

## Comparaison

| Moteur | Licence dominante | Conséquence pratique |
|---|---|---|
| Poppler CLI 22.12.0 | GPL-2/GPL-3 selon composants | acceptable potentiellement avec conformité de distribution; validation juridique requise |
| PDFium | BSD-3-Clause, dépendances diverses | plus permissif, mais construction, mises à jour et sandbox à maintenir |
| MuPDF | AGPL ou licence commerciale | code propriétaire/SaaS nécessite analyse AGPL ou achat d'une licence commerciale |

Sources primaires/représentatives consultées :

- PDFium : <https://pdfium.googlesource.com/pdfium/+/refs/heads/main/LICENSE>
- MuPDF : <https://mupdf.readthedocs.io/en/latest/license.html>
- MuPDF commercial : <https://mupdf.com/releases/>
- Poppler : notices Debian embarquées dans l'image et <https://gitlab.freedesktop.org/poppler/poppler>

Cette analyse n'est pas un avis juridique.

## Tests et preuves

- `pdfinfo -v` dans l'image locale : 22.12.0.
- `/usr/share/doc/poppler-utils/copyright` présent; lignes de licences inspectées.
- Mode d'intégration : `execFile`, aucune liaison native Node.

## Corrections

Aucune substitution de moteur dans ce lot. Le rapport impose un gate juridique et un SBOM/notices avant distribution.

## Risques résiduels

Poppler 22.12.0 est ancien. Évaluer PDFium si CORO veut réduire le risque de copyleft de distribution, après comparaison fonctionnelle et sécurité. MuPDF ne doit pas être adopté sans décision AGPL/licence commerciale.
