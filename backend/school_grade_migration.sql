-- School and Grade Migration for MAP Assessment System
-- This migration adds support for schools, grades, and grade-specific questions

-- =====================================================
-- 1. CREATE SCHOOLS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS `schools` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `address` text,
  `contact_email` varchar(255),
  `contact_phone` varchar(50),
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `school_name_unique` (`name`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =====================================================
-- 2. CREATE GRADES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS `grades` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `display_name` varchar(100) NOT NULL,
  `grade_level` int NOT NULL,
  `description` text,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `grade_name_unique` (`name`),
  UNIQUE KEY `grade_level_unique` (`grade_level`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =====================================================
-- 3. ALTER USERS TABLE - Add school and grade associations
-- =====================================================
ALTER TABLE `users` 
ADD COLUMN `school_id` int DEFAULT NULL AFTER `last_name`,
ADD COLUMN `grade_id` int DEFAULT NULL AFTER `school_id`,
ADD INDEX `idx_users_school` (`school_id`),
ADD INDEX `idx_users_grade` (`grade_id`),
ADD INDEX `idx_users_school_grade` (`school_id`, `grade_id`);

-- Add foreign key constraints (if using InnoDB)
-- ALTER TABLE `users` 
-- ADD CONSTRAINT `fk_users_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE SET NULL,
-- ADD CONSTRAINT `fk_users_grade` FOREIGN KEY (`grade_id`) REFERENCES `grades` (`id`) ON DELETE SET NULL;

-- =====================================================
-- 4. ALTER QUESTIONS TABLE - Add grade association
-- =====================================================
ALTER TABLE `questions` 
ADD COLUMN `grade_id` int DEFAULT NULL AFTER `subject_id`,
ADD INDEX `idx_questions_grade` (`grade_id`),
ADD INDEX `idx_questions_subject_grade` (`subject_id`, `grade_id`),
ADD INDEX `idx_questions_grade_difficulty` (`grade_id`, `difficulty_level`);

-- Add foreign key constraint (if using InnoDB)
-- ALTER TABLE `questions` 
-- ADD CONSTRAINT `fk_questions_grade` FOREIGN KEY (`grade_id`) REFERENCES `grades` (`id`) ON DELETE SET NULL;

-- =====================================================
-- 5. ALTER ASSESSMENTS TABLE - Add grade association
-- =====================================================
ALTER TABLE `assessments` 
ADD COLUMN `grade_id` int DEFAULT NULL AFTER `subject_id`,
ADD INDEX `idx_assessments_grade` (`grade_id`),
ADD INDEX `idx_assessments_student_subject_grade` (`student_id`, `subject_id`, `grade_id`),
ADD INDEX `idx_assessments_grade_year` (`grade_id`, `year`);

-- Add foreign key constraint (if using InnoDB)
-- ALTER TABLE `assessments` 
-- ADD CONSTRAINT `fk_assessments_grade` FOREIGN KEY (`grade_id`) REFERENCES `grades` (`id`) ON DELETE SET NULL;

-- =====================================================
-- 6. INSERT DEFAULT GRADES
-- =====================================================
INSERT INTO `grades` (`name`, `display_name`, `grade_level`, `description`) VALUES
('grade-1', 'Grade 1', 1, 'First grade - Elementary school'),
('grade-2', 'Grade 2', 2, 'Second grade - Elementary school'),
('grade-3', 'Grade 3', 3, 'Third grade - Elementary school'),
('grade-4', 'Grade 4', 4, 'Fourth grade - Elementary school'),
('grade-5', 'Grade 5', 5, 'Fifth grade - Elementary school'),
('grade-6', 'Grade 6', 6, 'Sixth grade - Middle school'),
('grade-7', 'Grade 7', 7, 'Seventh grade - Middle school'),
('grade-8', 'Grade 8', 8, 'Eighth grade - Middle school'),
('grade-9', 'Grade 9', 9, 'Ninth grade - High school'),
('grade-10', 'Grade 10', 10, 'Tenth grade - High school'),
('grade-11', 'Grade 11', 11, 'Eleventh grade - High school'),
('grade-12', 'Grade 12', 12, 'Twelfth grade - High school');

-- =====================================================
-- 7. INSERT SAMPLE SCHOOLS
-- =====================================================
INSERT INTO `schools` (`name`, `address`, `contact_email`, `contact_phone`) VALUES
('Lincoln Elementary School', '123 Main Street, City, State 12345', 'info@lincolnelementary.edu', '(555) 123-4567'),
('Washington Middle School', '456 Oak Avenue, City, State 12345', 'info@washingtonmiddle.edu', '(555) 234-5678'),
('Jefferson High School', '789 Pine Road, City, State 12345', 'info@jeffersonhigh.edu', '(555) 345-6789'),
('Franklin Academy', '321 Elm Street, City, State 12345', 'info@franklinacademy.edu', '(555) 456-7890');

-- =====================================================
-- 8. UPDATE EXISTING USERS WITH DEFAULT SCHOOL AND GRADE
-- =====================================================
-- Assign all existing students to the first school and appropriate grades
UPDATE `users` 
SET `school_id` = 1, `grade_id` = 1
WHERE `role` = 'student' AND `id` IN (2, 3, 4, 5, 6, 7, 8);

-- =====================================================
-- 9. UPDATE EXISTING QUESTIONS WITH DEFAULT GRADE
-- =====================================================
-- Assign all existing questions to Grade 6 (middle school level)
UPDATE `questions` 
SET `grade_id` = 1
WHERE `grade_id` IS NULL;

-- =====================================================
-- 10. UPDATE EXISTING ASSESSMENTS WITH DEFAULT GRADE
-- =====================================================
-- Assign all existing assessments to Grade 6
UPDATE `assessments` 
SET `grade_id` = 1
WHERE `grade_id` IS NULL;

-- =====================================================
-- 11. CREATE SCHOOL_ADMINISTRATORS TABLE (Optional)
-- =====================================================
CREATE TABLE IF NOT EXISTS `school_administrators` (
  `id` int NOT NULL AUTO_INCREMENT,
  `school_id` int NOT NULL,
  `user_id` int NOT NULL,
  `role` enum('principal','vice_principal','coordinator','teacher') NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `school_user_unique` (`school_id`, `user_id`),
  INDEX `idx_school_admin_school` (`school_id`),
  INDEX `idx_school_admin_user` (`user_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =====================================================
-- 12. CREATE GRADE_SUBJECTS TABLE (Optional - for grade-specific subjects)
-- =====================================================
CREATE TABLE IF NOT EXISTS `grade_subjects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `grade_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `is_required` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `grade_subject_unique` (`grade_id`, `subject_id`),
  INDEX `idx_grade_subjects_grade` (`grade_id`),
  INDEX `idx_grade_subjects_subject` (`subject_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Insert default grade-subject associations
INSERT INTO `grade_subjects` (`grade_id`, `subject_id`, `is_required`) VALUES
-- Grade 1-5: All subjects
(1, 3, 1), (1, 4, 1), (1, 6, 1),
(2, 3, 1), (2, 4, 1), (2, 6, 1),
(3, 3, 1), (3, 4, 1), (3, 6, 1),
(4, 3, 1), (4, 4, 1), (4, 6, 1),
(5, 3, 1), (5, 4, 1), (5, 6, 1),
-- Grade 6-8: All subjects
(6, 3, 1), (6, 4, 1), (6, 6, 1),
(7, 3, 1), (7, 4, 1), (7, 6, 1),
(8, 3, 1), (8, 4, 1), (8, 6, 1),
-- Grade 9-12: All subjects
(9, 3, 1), (9, 4, 1), (9, 6, 1),
(10, 3, 1), (10, 4, 1), (10, 6, 1),
(11, 3, 1), (11, 4, 1), (11, 6, 1),
(12, 3, 1), (12, 4, 1), (12, 6, 1);

-- =====================================================
-- 13. CREATE VIEWS FOR EASIER QUERIES
-- =====================================================

-- View for student information with school and grade
CREATE OR REPLACE VIEW `student_info` AS
SELECT 
  u.id,
  u.username,
  u.first_name,
  u.last_name,
  u.role,
  s.name as school_name,
  s.id as school_id,
  g.name as grade_name,
  g.display_name as grade_display_name,
  g.grade_level,
  u.created_at
FROM users u
LEFT JOIN schools s ON u.school_id = s.id
LEFT JOIN grades g ON u.grade_id = g.id
WHERE u.role = 'student';

-- View for question information with subject and grade
CREATE OR REPLACE VIEW `question_info` AS
SELECT 
  q.id,
  q.question_text,
  q.options,
  q.correct_option_index,
  q.difficulty_level,
  q.subject_id,
  sub.name as subject_name,
  q.grade_id,
  g.name as grade_name,
  g.display_name as grade_display_name,
  g.grade_level,
  q.created_by,
  q.created_at
FROM questions q
LEFT JOIN subjects sub ON q.subject_id = sub.id
LEFT JOIN grades g ON q.grade_id = g.id;

-- View for assessment results with student, subject, and grade info
CREATE OR REPLACE VIEW `assessment_results` AS
SELECT 
  a.id,
  a.student_id,
  u.first_name,
  u.last_name,
  u.username,
  s.name as school_name,
  g.display_name as grade_name,
  a.subject_id,
  sub.name as subject_name,
  a.assessment_period,
  a.rit_score,
  a.correct_answers,
  a.total_questions,
  a.date_taken,
  a.duration_minutes,
  a.year
FROM assessments a
LEFT JOIN users u ON a.student_id = u.id
LEFT JOIN schools s ON u.school_id = s.id
LEFT JOIN grades g ON a.grade_id = g.id
LEFT JOIN subjects sub ON a.subject_id = sub.id
WHERE a.rit_score IS NOT NULL;

-- =====================================================
-- 14. UPDATE INDEXES FOR BETTER PERFORMANCE
-- =====================================================

-- Add composite indexes for better query performance
ALTER TABLE `assessments` 
ADD INDEX `idx_assessments_comprehensive` (`student_id`, `subject_id`, `grade_id`, `year`, `assessment_period`);

ALTER TABLE `questions` 
ADD INDEX `idx_questions_comprehensive` (`subject_id`, `grade_id`, `difficulty_level`);

ALTER TABLE `users` 
ADD INDEX `idx_users_comprehensive` (`role`, `school_id`, `grade_id`);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Summary of changes:
-- 1. ✅ Created schools table
-- 2. ✅ Created grades table (Grade 1-12)
-- 3. ✅ Added school_id and grade_id to users table
-- 4. ✅ Added grade_id to questions table
-- 5. ✅ Added grade_id to assessments table
-- 6. ✅ Inserted default grades (1-12)
-- 7. ✅ Inserted sample schools
-- 8. ✅ Updated existing data with default values
-- 9. ✅ Created optional school_administrators table
-- 10. ✅ Created optional grade_subjects table
-- 11. ✅ Created helpful views for queries
-- 12. ✅ Added performance indexes

-- Next steps:
-- 1. Update backend controllers to handle school/grade logic
-- 2. Update frontend to show school/grade selection
-- 3. Modify question selection logic to be grade-specific
-- 4. Update assessment logic to consider grade-specific RIT ranges
