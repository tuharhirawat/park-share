-- Track exact grace minutes consumed so paid-hour billing excludes grace windows correctly.
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS free_extension_minutes_used INTEGER DEFAULT 0;

UPDATE public.bookings
SET free_extension_minutes_used = CASE
  WHEN has_used_free_extension THEN 15
  ELSE 0
END
WHERE free_extension_minutes_used IS NULL;

ALTER TABLE public.bookings
ALTER COLUMN free_extension_minutes_used SET NOT NULL;

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_free_extension_minutes_used_range
CHECK (free_extension_minutes_used >= 0 AND free_extension_minutes_used <= 15);

COMMENT ON COLUMN public.bookings.free_extension_minutes_used IS
'Number of grace-extension minutes used (0-15). Used to exclude grace time from paid-hour progression.';
