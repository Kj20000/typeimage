-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create words table for storing word-image pairs
CREATE TABLE public.words (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, word)
);

-- Enable RLS on words
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;

-- Words policies - users can view their own words and default words
CREATE POLICY "Users can view their own words and defaults"
  ON public.words FOR SELECT
  USING (auth.uid() = user_id OR is_default = true);

CREATE POLICY "Users can insert their own words"
  ON public.words FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_default = false);

CREATE POLICY "Users can update their own words"
  ON public.words FOR UPDATE
  USING (auth.uid() = user_id AND is_default = false);

CREATE POLICY "Users can delete their own words"
  ON public.words FOR DELETE
  USING (auth.uid() = user_id AND is_default = false);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_words_updated_at
  BEFORE UPDATE ON public.words
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default words (user_id is NULL for system defaults)
INSERT INTO public.words (user_id, word, image_url, is_default) VALUES
  (NULL, 'apple', 'https://i.postimg.cc/FHcZYrgf/IMG-9625.jpg', true),
  (NULL, 'dog', 'https://i.postimg.cc/438WpDbR/Dog.jpg', true),
  (NULL, 'cat', 'https://i.postimg.cc/151rVgMp/IMG-9627.jpg', true),
  (NULL, 'car', 'https://i.postimg.cc/4xd7YsC6/IMG-9628.jpg', true),
  (NULL, 'ball', 'https://i.postimg.cc/8c4cCntX/IMG-9629.jpg', true),
  (NULL, 'fish', 'https://i.postimg.cc/jq1ThhNV/Fish.jpg', true),
  (NULL, 'hen', 'https://i.postimg.cc/85PGZKtG/Hen.jpg', true),
  (NULL, 'icecream', 'https://i.postimg.cc/bJChWxBt/Icecream.jpg', true),
  (NULL, 'mango', 'https://i.postimg.cc/Hs9kZcC4/Mango.jpg', true),
  (NULL, 'banana', 'https://i.postimg.cc/s2pcP7np/Banana.jpg', true),
  (NULL, 'lion', 'https://i.postimg.cc/CLPCPGnb/Lion.jpg', true),
  (NULL, 'elephant', 'https://i.postimg.cc/wjd1q3N7/Elephant.jpg', true),
  (NULL, 'zebra', 'https://i.postimg.cc/KzSD7mkV/Zebra.png', true);