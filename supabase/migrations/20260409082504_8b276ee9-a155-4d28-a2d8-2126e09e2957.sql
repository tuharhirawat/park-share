
ALTER TABLE public.bookings
  ADD COLUMN booking_date date,
  ADD COLUMN start_time time,
  ADD COLUMN payment_id text;

-- Allow users to delete (cancel) their own bookings
CREATE POLICY "Users can delete their own bookings"
ON public.bookings
FOR DELETE
USING (auth.uid() = user_id);
