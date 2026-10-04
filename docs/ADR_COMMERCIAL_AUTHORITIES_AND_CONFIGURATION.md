# Commercial authorities and configuration lifecycle

PriceBook is the customer-facing price authority. Cost assumptions are the internal direct-cost authority; they never set customer price automatically. Valuation assumptions are methodology inputs and never set price automatically. Missing cost or value means `NOT_CONFIGURED`, not zero.

The Simulator owns scenarios and immutable calculation runs. Proposal owns the governed offer. Contract owns the accepted commercial commitment. Entitlement owns technical rights. Metering owns operational observation and does not currently determine price or billing.

PriceBook versions follow `DRAFT → ACTIVE/SCHEDULED → ARCHIVED/CANCELLED`. Published versions and children are immutable. Scheduled versions are not automatically activated. Assumption versions follow `DRAFT → PUBLISHED → ARCHIVED`; published values remain immutable and historical runs keep their version references.

Commercial quantities are declared-first. No production metered commercial rule exists. Customer-specific mandate volume, average effort and billable rate remain scenario inputs, not global valuation assumptions.

Future annual indexation must create a new draft PriceBookVersion, apply deterministic rounding and require human approval. It must never mutate historical prices, contracts, proposals, entitlements, cost assumptions or valuation assumptions.

The future Business Command Center may consume these authorities, but must not replace or duplicate them.

Package database authority remains unproven. V1 packaging policy should remain code-owned, versioned, and derived from the Commercial Family Registry, CommercialCapability, PriceBookVersion, and PriceComponent. Price remains exclusively owned by the PriceBook. A future persisted Package authority requires a demonstrated independent lifecycle.

`commercial-packaging/v1` is the code-owned composition policy for the guided Configurator. It governs eligibility and compatibility only; selected priced terms remain snapshotted by Proposal and Contract. Current included-feature keys are presentation-only and create neither a zero-price line nor an entitlement. Families without approved stable component mappings remain explicitly policy-incomplete rather than implicitly sellable.

Scenario comparison and customer review are derived read models, not new commercial authorities. Internal comparison reads only current immutable calculation runs and marks absent or stale runs explicitly. The server owns one allowlist-based customer-safe projection contract with separate adapters for the selected current run and the immutable ProposalRevision snapshot. Customer surfaces receive offered prices and explicitly approved customer inputs only; internal cost, contribution, margin, assumption provenance, override justification, raw technical identifiers/codes, packaging diagnostics and catalog prices are excluded. Proposal remains the first persisted governed customer offer, and generated offer PDFs render its immutable snapshot through the same customer-safe semantics.
