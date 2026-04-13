
-- =============================================
-- 1. PROFILES TABLE
-- =============================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  mobile_number text,
  is_host boolean NOT NULL DEFAULT false,
  is_phone_verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique mobile number (only non-null values)
CREATE UNIQUE INDEX idx_profiles_mobile_unique ON public.profiles (mobile_number) WHERE mobile_number IS NOT NULL AND mobile_number != '';

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles"
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger for profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 2. VEHICLES TABLE
-- =============================================
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('car', 'bike')),
  brand_model text NOT NULL DEFAULT '',
  registration_number text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_vehicles_reg_unique ON public.vehicles (LOWER(registration_number));

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vehicles"
ON public.vehicles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own vehicles"
ON public.vehicles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vehicles"
ON public.vehicles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vehicles"
ON public.vehicles FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_vehicles_updated_at
BEFORE UPDATE ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 3. PARKING SLOTS TABLE
-- =============================================
CREATE TABLE public.parking_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.parking_spaces(id) ON DELETE CASCADE,
  label text NOT NULL,
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('car', 'bike')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (space_id, label)
);

ALTER TABLE public.parking_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view parking slots"
ON public.parking_slots FOR SELECT USING (true);

CREATE POLICY "Hosts can create slots on own spaces"
ON public.parking_slots FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.parking_spaces ps
    WHERE ps.id = parking_slots.space_id AND ps.user_id = auth.uid()
  )
);

CREATE POLICY "Hosts can update slots on own spaces"
ON public.parking_slots FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.parking_spaces ps
    WHERE ps.id = parking_slots.space_id AND ps.user_id = auth.uid()
  )
);

CREATE POLICY "Hosts can delete slots on own spaces"
ON public.parking_slots FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.parking_spaces ps
    WHERE ps.id = parking_slots.space_id AND ps.user_id = auth.uid()
  )
);

CREATE TRIGGER update_parking_slots_updated_at
BEFORE UPDATE ON public.parking_slots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 4. ADD vehicle_id AND slot_id TO BOOKINGS
-- =============================================
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS slot_id uuid REFERENCES public.parking_slots(id) ON DELETE SET NULL;
