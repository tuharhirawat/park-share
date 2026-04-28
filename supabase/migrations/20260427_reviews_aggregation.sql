-- =========================================
-- PHASE 1 REVIEW SYSTEM FOUNDATION
-- Park Mitra
-- =========================================


-- =========================================
-- 1) ENFORCE ONE REVIEW PER BOOKING
-- =========================================

ALTER TABLE public.reviews
ADD CONSTRAINT reviews_booking_unique
UNIQUE (booking_id);



-- =========================================
-- 2) PERFORMANCE INDEXES
-- =========================================

CREATE INDEX IF NOT EXISTS idx_reviews_space_created
ON public.reviews(space_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_user_id
ON public.reviews(user_id);

CREATE INDEX IF NOT EXISTS idx_reviews_booking_id
ON public.reviews(booking_id);



-- =========================================
-- 3) AGGREGATE COLUMNS ON PARKING SPACES
-- (Skip if columns already existed)
-- =========================================

ALTER TABLE public.parking_spaces
ADD COLUMN IF NOT EXISTS rating numeric(2,1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0;



-- =========================================
-- 4) AUTO UPDATE AGGREGATE RATINGS
-- =========================================

CREATE OR REPLACE FUNCTION public.update_parking_space_rating()
RETURNS TRIGGER AS $$
BEGIN

  UPDATE public.parking_spaces
  SET
    rating = COALESCE(
      (
        SELECT ROUND(AVG(rating)::numeric,1)
        FROM public.reviews
        WHERE space_id = COALESCE(NEW.space_id, OLD.space_id)
      ),
      0
    ),

    review_count = (
      SELECT COUNT(*)
      FROM public.reviews
      WHERE space_id = COALESCE(NEW.space_id, OLD.space_id)
    )

  WHERE id = COALESCE(NEW.space_id, OLD.space_id);

  RETURN NULL;

END;
$$ LANGUAGE plpgsql;



-- =========================================
-- 5) TRIGGER
-- =========================================

DROP TRIGGER IF EXISTS trg_update_parking_space_rating
ON public.reviews;

CREATE TRIGGER trg_update_parking_space_rating
AFTER INSERT OR UPDATE OR DELETE
ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_parking_space_rating();



-- =========================================
-- 6) RLS ENABLE
-- =========================================

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;



-- =========================================
-- 7) CLEAN EXISTING REVIEW POLICIES
-- (Safe reset before recreating final policies)
-- =========================================

DROP POLICY IF EXISTS "Anyone can view reviews"
ON public.reviews;

DROP POLICY IF EXISTS "Hosts can view reviews on their spaces"
ON public.reviews;

DROP POLICY IF EXISTS "Users can create their own reviews"
ON public.reviews;

DROP POLICY IF EXISTS "Users insert own reviews"
ON public.reviews;

DROP POLICY IF EXISTS "Users can update their own reviews"
ON public.reviews;

DROP POLICY IF EXISTS "Users update own reviews"
ON public.reviews;

DROP POLICY IF EXISTS "Users can delete their own reviews"
ON public.reviews;

DROP POLICY IF EXISTS "Public can read reviews"
ON public.reviews;



-- =========================================
-- 8) FINAL RLS POLICIES
-- =========================================

CREATE POLICY "Public can read reviews"
ON public.reviews
FOR SELECT
USING (true);


CREATE POLICY "Users insert own reviews"
ON public.reviews
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);


CREATE POLICY "Users update own reviews"
ON public.reviews
FOR UPDATE
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);


CREATE POLICY "Users can delete their own reviews"
ON public.reviews
FOR DELETE
USING (
  auth.uid() = user_id
);



-- =========================================
-- OPTIONAL:
-- Initial backfill if reviews already exist
-- (Skip if empty table)
-- =========================================

-- UPDATE public.parking_spaces ps
-- SET
-- rating = COALESCE(sub.avg_rating,0),
-- review_count = COALESCE(sub.review_count,0)
-- FROM (
--   SELECT
--     space_id,
--     ROUND(AVG(rating)::numeric,1) AS avg_rating,
--     COUNT(*) AS review_count
--   FROM public.reviews
--   GROUP BY space_id
-- ) sub
-- WHERE ps.id = sub.space_id;



-- =========================================
-- VERIFICATION QUERIES (optional)
-- =========================================

-- SELECT policyname, cmd
-- FROM pg_policies
-- WHERE tablename='reviews';

-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid='reviews'::regclass;

-- SELECT indexname
-- FROM pg_indexes
-- WHERE tablename='reviews';