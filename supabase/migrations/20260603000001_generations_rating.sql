ALTER TABLE generations
ADD COLUMN IF NOT EXISTS rating text CHECK (rating IN ('positive', 'negative')) DEFAULT NULL;
