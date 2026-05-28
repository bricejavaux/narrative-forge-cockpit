-- 1. Enable RLS on tables currently without it
DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname='public' AND rowsecurity=false
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END$$;

-- 2. Revoke anon access on every public table; grant authenticated + service_role
DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END$$;

-- 3. Create permissive "authenticated only" policies on every public table
DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "Authenticated full access" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "Authenticated full access" ON public.%I
         FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END$$;

-- 4. Storage: restrict the 6 private buckets to authenticated users only
DO $$
DECLARE b text;
BEGIN
  FOR b IN SELECT unnest(ARRAY['source-files','audio','covers','exports','reports','snapshots'])
  LOOP
    EXECUTE format($p$DROP POLICY IF EXISTS "auth read %1$s" ON storage.objects$p$, b);
    EXECUTE format($p$DROP POLICY IF EXISTS "auth write %1$s" ON storage.objects$p$, b);
    EXECUTE format($p$DROP POLICY IF EXISTS "auth update %1$s" ON storage.objects$p$, b);
    EXECUTE format($p$DROP POLICY IF EXISTS "auth delete %1$s" ON storage.objects$p$, b);

    EXECUTE format($p$CREATE POLICY "auth read %1$s" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = %2$L)$p$, b, b);
    EXECUTE format($p$CREATE POLICY "auth write %1$s" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = %2$L)$p$, b, b);
    EXECUTE format($p$CREATE POLICY "auth update %1$s" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = %2$L) WITH CHECK (bucket_id = %2$L)$p$, b, b);
    EXECUTE format($p$CREATE POLICY "auth delete %1$s" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = %2$L)$p$, b, b);
  END LOOP;
END$$;

-- 5. Harden mutable search_path on owned function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
