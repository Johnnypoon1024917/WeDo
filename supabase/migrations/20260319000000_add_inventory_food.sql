ALTER TABLE relationships
ADD COLUMN inventory_food integer NOT NULL DEFAULT 0
CHECK (inventory_food >= 0);
