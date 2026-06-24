-- Add context_sentence column to cards table
ALTER TABLE cards ADD COLUMN IF NOT EXISTS context_sentence text NOT NULL DEFAULT '';
