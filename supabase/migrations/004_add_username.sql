-- Migration 004: Add username column to users table
-- Run this in the Supabase SQL Editor

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username VARCHAR(30) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Comment: usernames are lowercase, letters/numbers/underscores only, 3–30 chars
-- Enforced at the API layer; the DB allows NULL for existing users without a username.
