-- Add notification preferences to users table
-- This allows users to control which types of push notifications they receive

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "messages": true,
  "prayers": true,
  "journals": true,
  "system": true
}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.users.notification_preferences IS 'User notification preferences for different notification types (messages, prayers, journals, system)';

-- Create index for efficient querying of users with specific notification preferences
CREATE INDEX IF NOT EXISTS idx_users_notification_preferences ON public.users USING GIN (notification_preferences);
