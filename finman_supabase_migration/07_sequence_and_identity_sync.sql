-- =====================================================================
-- FinMan Database Migration to Supabase
-- File: 07_sequence_and_identity_sync.sql
-- Description: Synchronizes all SERIAL primary key sequences with the
--              maximum ID present in each table.
--              Prevents primary key collision errors on subsequent INSERTs.
-- =====================================================================

DO $$
DECLARE
    rec RECORD;
    v_seq text;
    v_max_id bigint;
    v_sql text;
BEGIN
    FOR rec IN (
        SELECT 
            table_name, 
            column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND column_default LIKE 'nextval(%'
        ORDER BY table_name
    ) LOOP
        v_seq := pg_get_serial_sequence('public.' || quote_ident(rec.table_name), rec.column_name);
        
        IF v_seq IS NOT NULL THEN
            v_sql := format(
                'SELECT COALESCE(MAX(%I), 0) FROM public.%I', 
                rec.column_name, 
                rec.table_name
            );
            EXECUTE v_sql INTO v_max_id;
            
            IF v_max_id > 0 THEN
                PERFORM setval(v_seq, v_max_id, true);
                RAISE NOTICE 'Sequence % set to % (next: %)', v_seq, v_max_id, v_max_id + 1;
            ELSE
                PERFORM setval(v_seq, 1, false);
                RAISE NOTICE 'Sequence % set to 1 (table % is empty)', v_seq, rec.table_name;
            END IF;
        END IF;
    END LOOP;

    RAISE NOTICE '✓ All FinMan sequences successfully synchronized.';
END $$;
