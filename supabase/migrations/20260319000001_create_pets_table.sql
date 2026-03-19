-- ============================================================
-- Linked Companions: Create pets table
-- Each user owns one independent pet within their relationship.
-- ============================================================

CREATE TABLE pets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL UNIQUE REFERENCES auth.users(id),
  relationship_id uuid NOT NULL REFERENCES relationships(id),
  name            text NOT NULL,
  archetype       text NOT NULL CHECK (archetype IN ('cat','dog','bunny','bear')),
  color_hex       text NOT NULL CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  personality     text NOT NULL CHECK (personality IN ('energetic','grumpy','sleepy','shy')),
  health          integer NOT NULL DEFAULT 100 CHECK (health >= 0 AND health <= 100),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE pets ENABLE ROW LEVEL SECURITY;

-- SELECT: both partners can read pets in their relationship
CREATE POLICY "pets_select" ON pets FOR SELECT
  USING (relationship_id = get_my_relationship_id());

-- INSERT: user can only create their own pet in their own relationship
CREATE POLICY "pets_insert" ON pets FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND relationship_id = get_my_relationship_id()
  );

-- UPDATE: user can only update their own pet
CREATE POLICY "pets_update" ON pets FOR UPDATE
  USING (user_id = auth.uid());

-- No DELETE policy — deletes are blocked by default with RLS enabled

-- ============================================================
-- Realtime publication
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE pets;
