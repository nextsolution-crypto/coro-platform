-- Forward-only checkpoint. The already applied 20261109020000 migration
-- must retain its name and checksum. Advance beyond the released 20261127 head
-- only after validating the Sentinelle schema; never rewrite business rows.
BEGIN;
DO $$
BEGIN
  IF (SELECT count(*) FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'BuildingEmployee'
        AND column_name IN ('pinEmailStatus', 'pinEmailMessageId', 'pinEmailAttemptedAt', 'pinEmailDeliveredAt')) <> 4 THEN
    RAISE EXCEPTION 'SENTINELLE_PIN_DELIVERY_SCHEMA_MISSING';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'OccupancyRecord'
        AND column_name = 'checkoutSource') THEN
    RAISE EXCEPTION 'SENTINELLE_CHECKOUT_SOURCE_MISSING';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_index i
      JOIN pg_class idx ON idx.oid = i.indexrelid
      JOIN pg_class tbl ON tbl.oid = i.indrelid
      JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
      WHERE ns.nspname = current_schema() AND tbl.relname = 'BuildingEmployee'
        AND idx.relname = 'BuildingEmployee_one_active_pin_idx'
        AND i.indisunique AND i.indisvalid) THEN
    RAISE EXCEPTION 'SENTINELLE_ACTIVE_PIN_UNIQUENESS_MISSING';
  END IF;
END $$;
COMMIT;
