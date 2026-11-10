# DISPLAY-04B-PILOT — Building linkage

## Demonstration scope

The intended private hierarchy is:

`Demonstration organization → Groupe Vision — DEMO → Ground floor → Compliance documents → Evacuation plans → pilot PDF`.

The real building name and address visible in the supplied document are contextual metadata only. No real customer account was created.

## Verified governance

The disposable PostgreSQL test creates synthetic organization, client, building, foreign building, floor, display location, and distinct test actors through Prisma/service code. It verifies that the exact approved source can be assigned only to the governed location, that cross-building access is refused, and that revocation is immediate.

No fixture was retained after the disposable database validation. No shared migration or database was changed.
