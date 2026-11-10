# Audit et événements

Qualification, attribution, messages, décision, correction, résolution et clôture ajoutent un événement contenant acteur, organisation, bâtiment, ancien/nouvel état, motif, requête et verrou.

Les événements existants conservent leur acteur client; les nouveaux acceptent exactement un acteur client ou professionnel. L'unicité `(organizationId, requestId)` rend les reprises idempotentes. Les messages sont eux aussi append-only et idempotents.
