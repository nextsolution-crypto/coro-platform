# Building Bridge boundary

Future flow: authenticated source → schema validation → normalization → tenant/building/zone resolution → authorization → durable event/outbox → Display command → acknowledgements/reconciliation.

The connector must default disabled, reject ambiguous mappings and distinguish exercise from real events. It may not directly call a Player or bypass DISPLAY-07 priority/governed clear.

DISPLAY-08 contains no PAI connector, credentials, network route or real Building Bridge execution.
