-- Add last_notification_viewed_at column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_notification_viewed_at timestamptz;

-- Enable Realtime for the notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
