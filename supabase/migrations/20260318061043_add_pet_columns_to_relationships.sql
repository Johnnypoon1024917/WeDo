-- Add pet columns to the relationships table for the Relationship Pet feature.
-- Each relationship gets a virtual pet with health, XP, name, and last-fed timestamp.

ALTER TABLE relationships
  ADD COLUMN pet_name TEXT DEFAULT 'Buddy',
  ADD COLUMN pet_health INTEGER DEFAULT 100 CHECK (pet_health >= 0 AND pet_health <= 100),
  ADD COLUMN pet_total_xp INTEGER DEFAULT 0 CHECK (pet_total_xp >= 0),
  ADD COLUMN pet_last_fed_at TIMESTAMPTZ DEFAULT NOW();
