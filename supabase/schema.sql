-- Superpower Marketing Library Database Schema
-- Run this in your Supabase SQL Editor

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Users (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assets
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- File info
  filename TEXT NOT NULL,           -- Editable display name
  original_filename TEXT NOT NULL,  -- Original upload name
  file_type TEXT NOT NULL,          -- 'image' | 'pdf'
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,        -- bytes, up to 3GB

  -- Storage paths
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,

  -- AI-generated
  ai_summary TEXT,
  ai_tags TEXT[] DEFAULT '{}',
  extracted_text TEXT,
  embedding vector(1536),

  -- User-generated
  user_tags TEXT[] DEFAULT '{}',

  -- Metadata
  processing_status TEXT DEFAULT 'pending',  -- 'pending' | 'complete' | 'failed'
  download_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_file_type CHECK (file_type IN ('image', 'pdf')),
  CONSTRAINT valid_status CHECK (processing_status IN ('pending', 'complete', 'failed'))
);

-- Downloads (for tracking who downloaded what)
CREATE TABLE IF NOT EXISTS downloads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  downloaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invite links
CREATE TABLE IF NOT EXISTS invite_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by UUID NOT NULL REFERENCES profiles(id),
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assets_uploaded_by ON assets(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_file_type ON assets(file_type);
CREATE INDEX IF NOT EXISTS idx_assets_ai_tags ON assets USING GIN(ai_tags);
CREATE INDEX IF NOT EXISTS idx_assets_user_tags ON assets USING GIN(user_tags);
CREATE INDEX IF NOT EXISTS idx_assets_embedding ON assets USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_downloads_asset ON downloads(asset_id);
CREATE INDEX IF NOT EXISTS idx_downloads_user ON downloads(downloaded_by);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;

-- Policies: All authenticated users can read/write all assets (single workspace)
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON profiles;
CREATE POLICY "Authenticated users can read profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Authenticated users can CRUD assets" ON assets;
CREATE POLICY "Authenticated users can CRUD assets" ON assets
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can CRUD downloads" ON downloads;
CREATE POLICY "Authenticated users can CRUD downloads" ON downloads
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can read invite links" ON invite_links;
CREATE POLICY "Authenticated users can read invite links" ON invite_links
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can create invite links" ON invite_links;
CREATE POLICY "Authenticated users can create invite links" ON invite_links
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for assets updated_at
DROP TRIGGER IF EXISTS update_assets_updated_at ON assets;
CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger to auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Storage bucket policies (run in Storage > Policies in Supabase dashboard)
-- Or use the following SQL to create policies programmatically:

-- Note: Storage policies are typically managed via Supabase dashboard
-- But here are the SQL versions for reference:

-- CREATE POLICY "Authenticated users can upload assets" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'assets' AND
--     auth.role() = 'authenticated'
--   );

-- CREATE POLICY "Authenticated users can read assets" ON storage.objects
--   FOR SELECT USING (
--     bucket_id = 'assets' AND
--     auth.role() = 'authenticated'
--   );

-- CREATE POLICY "Users can delete their own assets" ON storage.objects
--   FOR DELETE USING (
--     bucket_id = 'assets' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );
