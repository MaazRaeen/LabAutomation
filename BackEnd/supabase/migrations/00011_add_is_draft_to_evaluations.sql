-- Migration: Add is_draft column to evaluations table
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false;
