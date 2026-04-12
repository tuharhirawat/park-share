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
CREATE OR REPLACE FUNCTION public.check_parking_capacity(
  p_space_id text,
  p_vehicle_type text,
  p_booking_date date,
  p_start_time time,
  p_end_time time
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
  -- Try to parse space_id as UUID (remove db_ prefix if present)
  v_space_uuid := CASE
    WHEN p_space_id LIKE 'db_%' THEN (substring(p_space_id from 4))::uuid
    ELSE p_space_id::uuid
  END;

  -- Get total slots for vehicle type
  IF p_vehicle_type = 'bike' THEN
    SELECT bike_slots INTO v_total_slots FROM parking_spaces WHERE id = v_space_uuid;
  ELSE
    SELECT car_slots INTO v_total_slots FROM parking_spaces WHERE id = v_space_uuid;
  END IF;

  IF v_total_slots IS NULL THEN
    RETURN jsonb_build_object('available', false, 'error', 'Space not found');
  END IF;

  -- Count overlapping bookings for same space, vehicle type, date
  SELECT COUNT(*) INTO v_current_bookings
  FROM bookings b
  WHERE b.space_id = p_space_id
    AND b.vehicle_type = p_vehicle_type
    AND b.booking_date = p_booking_date
    AND b.status != 'cancelled'
    AND b.start_time < p_end_time
    AND b.end_time > p_start_time;

  IF v_current_bookings >= v_total_slots THEN
    RETURN jsonb_build_object('available', false, 'error',
      'All parking spaces for the selected vehicle type are booked at this time. Please select a different time slot.',
      'current', v_current_bookings, 'total', v_total_slots);
  END IF;

  RETURN jsonb_build_object('available', true, 'current', v_current_bookings, 'total', v_total_slots);
END;
$$;