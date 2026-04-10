
-- Create parking_spaces table
CREATE TABLE public.parking_spaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  price_per_hour NUMERIC NOT NULL,
  price_per_day NUMERIC,
  vehicle_types TEXT[] NOT NULL DEFAULT '{}',
  features TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  rating NUMERIC NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.parking_spaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view parking spaces"
ON public.parking_spaces FOR SELECT
USING (true);

CREATE POLICY "Users can create their own listings"
ON public.parking_spaces FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own listings"
ON public.parking_spaces FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own listings"
ON public.parking_spaces FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_parking_spaces_updated_at
BEFORE UPDATE ON public.parking_spaces
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for parking images
INSERT INTO storage.buckets (id, name, public) VALUES ('parking-images', 'parking-images', true);

CREATE POLICY "Anyone can view parking images"
ON storage.objects FOR SELECT
USING (bucket_id = 'parking-images');

CREATE POLICY "Authenticated users can upload parking images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'parking-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own parking images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'parking-images' AND auth.uid()::text = (storage.foldername(name))[1]);
