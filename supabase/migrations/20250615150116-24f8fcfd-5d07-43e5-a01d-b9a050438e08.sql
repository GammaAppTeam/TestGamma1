
-- Add tool_url column to the tools table if it doesn't exist
ALTER TABLE public.tools 
ADD COLUMN IF NOT EXISTS tool_url TEXT;

-- Update the existing tools that might have URLs in other fields
-- This is safe to run even if no data exists
UPDATE public.tools 
SET tool_url = tool_url 
WHERE tool_url IS NOT NULL;
