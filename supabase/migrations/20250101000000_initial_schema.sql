-- ============================================================
-- WeDo: Initial Database Schema Migration
-- Tables, RLS policies, helper function, storage, and realtime
-- ============================================================

-- =========================
-- 1. Tables
-- =========================

-- users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  relationship_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- relationships
CREATE TABLE relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES users(id),
  user2_id UUID NOT NULL REFERENCES users(id),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK from users.relationship_id → relationships.id (deferred because relationships depends on users)
ALTER TABLE users
  ADD CONSTRAINT fk_users_relationship
  FOREIGN KEY (relationship_id) REFERENCES relationships(id);

-- pairing_codes
CREATE TABLE pairing_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- memories
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES relationships(id),
  created_by UUID NOT NULL REFERENCES users(id),
  photo_url TEXT NOT NULL,
  caption TEXT NOT NULL CHECK (char_length(caption) >= 1 AND char_length(caption) <= 500),
  revealed BOOLEAN NOT NULL DEFAULT false,
  audio_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- bucket_list_items
CREATE TABLE bucket_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES relationships(id),
  title TEXT NOT NULL,
  url TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- calendar_stickers
CREATE TABLE calendar_stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES relationships(id),
  sticker_id TEXT NOT NULL,
  day DATE NOT NULL,
  x_coordinate FLOAT NOT NULL,
  y_coordinate FLOAT NOT NULL,
  placed_by UUID NOT NULL REFERENCES users(id),
  is_custom BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- custom_stickers
CREATE TABLE custom_stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES relationships(id),
  image_url TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES relationships(id),
  recipient_id UUID NOT NULL REFERENCES users(id),
  sender_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- calendar_notes
CREATE TABLE calendar_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES relationships(id),
  day DATE NOT NULL,
  note_text TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- calendar_events
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES relationships(id),
  day DATE NOT NULL,
  title TEXT NOT NULL,
  time TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- 2. Helper Function
-- =========================

CREATE OR REPLACE FUNCTION get_my_relationship_id()
RETURNS UUID AS $$
  SELECT relationship_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =========================
-- 3. Enable Row-Level Security
-- =========================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE pairing_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE bucket_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- =========================
-- 4. RLS Policies
-- =========================

-- ---- users ----
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

-- ---- relationships ----
CREATE POLICY "Users can read own relationship"
  ON relationships FOR SELECT
  USING (id = get_my_relationship_id());

CREATE POLICY "Users can insert relationships"
  ON relationships FOR INSERT
  WITH CHECK (user1_id = auth.uid() OR user2_id = auth.uid());

-- ---- memories ----
CREATE POLICY "Users can read own relationship memories"
  ON memories FOR SELECT
  USING (relationship_id = get_my_relationship_id());

CREATE POLICY "Users can insert memories for own relationship"
  ON memories FOR INSERT
  WITH CHECK (
    relationship_id = get_my_relationship_id()
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update own relationship memories"
  ON memories FOR UPDATE
  USING (relationship_id = get_my_relationship_id());

-- ---- bucket_list_items ----
CREATE POLICY "Users can CRUD own relationship bucket list"
  ON bucket_list_items FOR ALL
  USING (relationship_id = get_my_relationship_id());

-- ---- calendar_stickers ----
CREATE POLICY "Users can read/write own relationship stickers"
  ON calendar_stickers FOR ALL
  USING (relationship_id = get_my_relationship_id());

-- ---- custom_stickers ----
CREATE POLICY "Users can read/write own relationship custom stickers"
  ON custom_stickers FOR ALL
  USING (relationship_id = get_my_relationship_id());

-- ---- pairing_codes ----
CREATE POLICY "Users can create pairing codes"
  ON pairing_codes FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Anyone can read unused codes by code value"
  ON pairing_codes FOR SELECT
  USING (used = false AND expires_at > now());

-- ---- notifications ----
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (
    relationship_id = get_my_relationship_id()
    AND recipient_id = auth.uid()
  );

CREATE POLICY "Users can insert notifications for own relationship"
  ON notifications FOR INSERT
  WITH CHECK (
    relationship_id = get_my_relationship_id()
    AND sender_id = auth.uid()
  );

-- ---- calendar_notes ----
CREATE POLICY "Users can read/write/delete own relationship calendar notes"
  ON calendar_notes FOR ALL
  USING (relationship_id = get_my_relationship_id());

-- ---- calendar_events ----
CREATE POLICY "Users can read/write/delete own relationship calendar events"
  ON calendar_events FOR ALL
  USING (relationship_id = get_my_relationship_id());

-- ---- memories (DELETE) ----
CREATE POLICY "Users can delete own memories"
  ON memories FOR DELETE
  USING (
    relationship_id = get_my_relationship_id()
    AND created_by = auth.uid()
  );

-- ---- calendar_stickers (DELETE) ----
CREATE POLICY "Users can delete own relationship stickers"
  ON calendar_stickers FOR DELETE
  USING (relationship_id = get_my_relationship_id());

-- =========================
-- 5. Supabase Storage Bucket
-- =========================

INSERT INTO storage.buckets (id, name, public)
VALUES ('wedo-assets', 'wedo-assets', true);

-- Storage policy: read access scoped to relationship_id path prefix
CREATE POLICY "Relationship members can read assets"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'wedo-assets'
    AND (storage.foldername(name))[1] = get_my_relationship_id()::text
  );

-- Storage policy: write access scoped to relationship_id path prefix
CREATE POLICY "Relationship members can upload assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'wedo-assets'
    AND (storage.foldername(name))[1] = get_my_relationship_id()::text
  );

-- Storage policy: update access scoped to relationship_id path prefix
CREATE POLICY "Relationship members can update assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'wedo-assets'
    AND (storage.foldername(name))[1] = get_my_relationship_id()::text
  );

-- Storage policy: delete access scoped to relationship_id path prefix
CREATE POLICY "Relationship members can delete assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'wedo-assets'
    AND (storage.foldername(name))[1] = get_my_relationship_id()::text
  );

-- =========================
-- 6. Enable Realtime
-- =========================

ALTER PUBLICATION supabase_realtime ADD TABLE memories;
ALTER PUBLICATION supabase_realtime ADD TABLE bucket_list_items;
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_stickers;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_events;
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_notes;

-- =========================
-- 7. Auth Trigger
-- =========================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at)
  VALUES (NEW.id, NEW.email, NEW.created_at)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
