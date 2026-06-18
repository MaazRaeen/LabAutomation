-- Add late submission approval columns to code_submissions
ALTER TABLE public.code_submissions ADD COLUMN IF NOT EXISTS late_reason text;
ALTER TABLE public.code_submissions ADD COLUMN IF NOT EXISTS late_status text CHECK (late_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE public.code_submissions ADD COLUMN IF NOT EXISTS late_reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.code_submissions ADD COLUMN IF NOT EXISTS late_reviewed_at timestamptz;
ALTER TABLE public.code_submissions ADD COLUMN IF NOT EXISTS late_teacher_comment text;
