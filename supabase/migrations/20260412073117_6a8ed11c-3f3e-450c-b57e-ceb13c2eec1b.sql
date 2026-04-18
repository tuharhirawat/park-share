-- Add vehicle capacity to parking_spaces
ALTER TABLE public.parking_spaces ADD COLUMN IF NOT EXISTS car_slots integer NOT NULL DEFAULT 5;
ALTER TABLE public.parking_spaces ADD COLUMN IF NOT EXISTS bike_slots integer NOT NULL DEFAULT 5;

-- Add vehicle_type to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS vehicle_type text NOT NULL DEFAULT 'car';

-- Unique constraint on reviews.booking_id to prevent duplicate reviews
ALTER TABLE public.reviews ADD CONSTRAINT reviews_booking_id_unique UNIQUE (booking_id);

-- RLS: Allow hosts to view bookings on their spaces
CREATE POLICY "Hosts can view bookings on their spaces"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.parking_spaces ps
    WHERE ps.id::text = bookings.space_id
    AND ps.user_id = auth.uid()
  )
);

-- RLS: Allow hosts to view reviews on their spaces
CREATE POLICY "Hosts can view reviews on their spaces"
ON public.reviews
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.parking_spaces ps
    WHERE ps.id = reviews.space_id
    AND ps.user_id = auth.uid()
  )
);

-- Function to check parking capacity before booking
DROP FUNCTION IF EXISTS public.check_parking_capacity;

CREATE OR REPLACE FUNCTION public.check_parking_capacity(
  p_space_id text, -- ✅ IMPORTANT FIX
  p_vehicle_type text,
  p_booking_date date,
  p_start_time time,
  p_end_time time,
  p_exclude_booking_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_slots integer;
  v_current_bookings integer;
  v_space_uuid uuid;
BEGIN

  -- ✅ Convert safely
  v_space_uuid := p_space_id::uuid;

  -- ✅ GET TOTAL SLOTS
  IF p_vehicle_type = 'bike' THEN
    SELECT bike_slots INTO v_total_slots
    FROM parking_spaces
    WHERE id = v_space_uuid;
  ELSE
    SELECT car_slots INTO v_total_slots
    FROM parking_spaces
    WHERE id = v_space_uuid;
  END IF;

  IF v_total_slots IS NULL THEN
    RETURN jsonb_build_object(
      'available', false,
      'error', 'Space not found'
    );
  END IF;

  -- ✅ COUNT OVERLAPPING BOOKINGS
  SELECT COUNT(*) INTO v_current_bookings
  FROM bookings b
  WHERE b.space_id = p_space_id -- ✅ FIXED (no cast)
    AND b.vehicle_type = p_vehicle_type
    AND b.booking_date = p_booking_date
    AND b.status != 'cancelled'
    AND (p_exclude_booking_id IS NULL OR b.id != p_exclude_booking_id)
    AND b.start_time < p_end_time
    AND b.end_time > p_start_time;

  -- ❌ FULL
  IF v_current_bookings >= v_total_slots THEN
    RETURN jsonb_build_object(
      'available', false,
      'error', 'No slots available for selected time',
      'current', v_current_bookings,
      'total', v_total_slots
    );
  END IF;

  -- ✅ SUCCESS
  RETURN jsonb_build_object(
    'available', true,
    'current', v_current_bookings,
    'total', v_total_slots
  );

END;
$$;

GRANT EXECUTE ON FUNCTION public.check_parking_capacity(text, text, date, time, time, text)
TO authenticated;
