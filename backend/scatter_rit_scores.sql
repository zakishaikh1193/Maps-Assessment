-- Scatter RIT scores to make the growth chart more visually appealing
-- This script will randomly adjust RIT scores for all students except student_id 2
-- to create better visual separation and make percentile bands more visible

-- First, let's see the current distribution
SELECT 
    student_id,
    COUNT(*) as assessments,
    MIN(rit_score) as min_score,
    MAX(rit_score) as max_score,
    AVG(rit_score) as avg_score
FROM assessments 
GROUP BY student_id 
ORDER BY student_id;

-- Update RIT scores for students 3, 4, 5, 6, 7 to create more variance
-- We'll use different ranges for different students to create distinct patterns

-- Student 3: Lower performing student (150-200 range)
UPDATE assessments 
SET rit_score = 150 + FLOOR(RAND() * 51)  -- Random between 150-200
WHERE student_id = 3;

-- Student 4: Average performing student (180-230 range)  
UPDATE assessments 
SET rit_score = 180 + FLOOR(RAND() * 51)  -- Random between 180-230
WHERE student_id = 4;

-- Student 5: Below average student (140-190 range)
UPDATE assessments 
SET rit_score = 140 + FLOOR(RAND() * 51)  -- Random between 140-190
WHERE student_id = 5;

-- Student 6: High performing student (220-280 range)
UPDATE assessments 
SET rit_score = 220 + FLOOR(RAND() * 61)  -- Random between 220-280
WHERE student_id = 6;

-- Student 7: Very low performing student (120-170 range)
UPDATE assessments 
SET rit_score = 120 + FLOOR(RAND() * 51)  -- Random between 120-170
WHERE student_id = 7;

-- Add some additional random variance to make it more realistic
UPDATE assessments 
SET rit_score = GREATEST(100, LEAST(350, rit_score + (FLOOR(RAND() * 21) - 10)))  -- Add/subtract -10 to +10
WHERE student_id IN (3, 4, 5, 6, 7);

-- Verify the new distribution
SELECT 
    student_id,
    COUNT(*) as assessments,
    MIN(rit_score) as min_score,
    MAX(rit_score) as max_score,
    AVG(rit_score) as avg_score
FROM assessments 
GROUP BY student_id 
ORDER BY student_id;

-- Show the overall distribution for percentile bands
SELECT 
    'Overall Distribution' as info,
    MIN(rit_score) as min_score,
    MAX(rit_score) as max_score,
    AVG(rit_score) as avg_score,
    COUNT(*) as total_assessments
FROM assessments 
WHERE rit_score IS NOT NULL;
