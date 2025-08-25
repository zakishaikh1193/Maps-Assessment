-- MAP Adaptive Testing Database Migration
-- Add RIT score support to existing database

-- Add RIT score column to assessments table
ALTER TABLE assessments 
ADD COLUMN rit_score INT DEFAULT NULL;

-- Add question difficulty tracking to assessment_responses
ALTER TABLE assessment_responses 
ADD COLUMN question_difficulty INT DEFAULT NULL;

-- Update existing assessments to have RIT scores (if any exist)
-- This will be calculated based on highest correct difficulty
UPDATE assessments a 
SET rit_score = (
  SELECT MAX(ar.question_difficulty)
  FROM assessment_responses ar
  WHERE ar.assessment_id = a.id 
  AND ar.is_correct = 1
)
WHERE a.rit_score IS NULL 
AND EXISTS (
  SELECT 1 FROM assessment_responses ar 
  WHERE ar.assessment_id = a.id 
  AND ar.is_correct = 1
);

-- Update assessment_responses to populate question_difficulty
UPDATE assessment_responses ar
JOIN questions q ON ar.question_id = q.id
SET ar.question_difficulty = q.difficulty_level
WHERE ar.question_difficulty IS NULL;

-- Add index for better performance on RIT score queries
CREATE INDEX idx_assessments_rit_score ON assessments(rit_score);

-- Add index for question difficulty queries
CREATE INDEX idx_responses_question_difficulty ON assessment_responses(question_difficulty);

-- Verify the changes
SELECT 'Migration completed successfully!' as status;
