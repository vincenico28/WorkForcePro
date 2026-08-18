-- Migration: Announcement DELETE RLS Policy & Supabase Realtime Publication
-- 1. Enable DELETE policy for announcements so authors and admins can delete announcements
DROP POLICY IF EXISTS "ann_delete" ON public.announcements;
CREATE POLICY "ann_delete" ON public.announcements
FOR DELETE TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    author_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.employees
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'hr_manager', 'team_supervisor')
    )
  )
);

-- 2. Add notifications and announcements to realtime publication (if not present)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END $$;
