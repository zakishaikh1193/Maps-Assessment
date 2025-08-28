-- Update grade_level column to allow NULL values
-- This migration makes the grade_level column nullable to support non-numeric grades

ALTER TABLE `grades` 
MODIFY COLUMN `grade_level` int NULL;

-- Update the unique constraint to allow multiple NULL values
-- (MySQL allows multiple NULL values in unique constraints by default)

-- Optional: Add a comment to document the change
ALTER TABLE `grades` 
MODIFY COLUMN `grade_level` int NULL COMMENT 'Grade level (1-12) or NULL for non-numeric grades like Pre-K, College, etc.';
