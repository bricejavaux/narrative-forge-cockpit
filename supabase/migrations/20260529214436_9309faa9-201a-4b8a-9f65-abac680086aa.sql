-- Fix Data API permissions for chapters and beats (root cause of "permission denied for table chapters")
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chapters TO authenticated;
GRANT SELECT ON public.chapters TO anon;
GRANT ALL ON public.chapters TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.beats TO authenticated;
GRANT SELECT ON public.beats TO anon;
GRANT ALL ON public.beats TO service_role;

-- Ensure RLS is enabled and anon read policies exist for Production Test
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "production_test_read_chapters" ON public.chapters;
CREATE POLICY "production_test_read_chapters"
ON public.chapters
FOR SELECT
TO anon, authenticated
USING (true);

ALTER TABLE public.beats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "production_test_read_beats" ON public.beats;
CREATE POLICY "production_test_read_beats"
ON public.beats
FOR SELECT
TO anon, authenticated
USING (true);