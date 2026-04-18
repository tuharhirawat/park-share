-- Add extension tracking columns to bookings
-- ✅ STEP 1: Add new columns (TIMESTAMP for correctness)
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS original_start_time TIMESTAMP WITHOUT TIME ZONE,
ADD COLUMN IF NOT EXISTS original_end_time TIMESTAMP WITHOUT TIME ZONE,
ADD COLUMN IF NOT EXISTS original_duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS has_used_free_extension BOOLEAN DEFAULT FALSE;

---

-- ✅ STEP 2: Backfill existing records (FIXED: TIME → TIMESTAMP conversion)

UPDATE public.bookings
SET
-- Convert TIME → TIMESTAMP using CURRENT_DATE
original_start_time = CURRENT_DATE + start_time,
original_end_time =
CASE
-- Handle crossing midnight (end < start)
WHEN end_time < start_time THEN (CURRENT_DATE + end_time + INTERVAL '1 day')
ELSE (CURRENT_DATE + end_time)
END,

-- Duration calculation (midnight safe)
original_duration_minutes = CASE
WHEN end_time IS NOT NULL AND start_time IS NOT NULL THEN
FLOOR(
EXTRACT(EPOCH FROM
CASE
WHEN end_time < start_time
THEN (end_time + INTERVAL '24 hours') - start_time
ELSE end_time - start_time
END
) / 60
)
ELSE
COALESCE(hours, 0) * 60
END,

has_used_free_extension = COALESCE(has_used_free_extension, FALSE)

WHERE original_start_time IS NULL;

---

-- ✅ STEP 3: Add constraints (data safety)

ALTER TABLE public.bookings
ALTER COLUMN original_duration_minutes SET NOT NULL;

ALTER TABLE public.bookings
ALTER COLUMN has_used_free_extension SET NOT NULL;

---

-- ✅ STEP 4: Index (performance)
CREATE INDEX IF NOT EXISTS idx_bookings_original_time
ON public.bookings (original_start_time, original_end_time);

---

-- ✅ STEP 5: Documentation (future-proofing)

COMMENT ON COLUMN public.bookings.original_start_time IS
'Initial booking start timestamp. Never update after creation.';

COMMENT ON COLUMN public.bookings.original_end_time IS
'Initial booking end timestamp. Never update after creation.';

COMMENT ON COLUMN public.bookings.original_duration_minutes IS
'Original duration in minutes (used for delta pricing).';

COMMENT ON COLUMN public.bookings.has_used_free_extension IS
'Indicates if one-time free grace extension is used.';
