-- Competency-Based Assessment System Migration
-- This migration adds competency tracking functionality to the MAP assessment system

-- 1. Create competencies table
CREATE TABLE IF NOT EXISTS `competencies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL COMMENT 'Unique competency code (e.g., ENG001, LOG002)',
  `name` varchar(100) NOT NULL COMMENT 'Competency name (e.g., Engagement in Class, Logical Reasoning)',
  `description` text COMMENT 'General description of the competency',
  `strong_description` text NOT NULL COMMENT 'Feedback for students performing well (70+ score)',
  `neutral_description` text NOT NULL COMMENT 'Feedback for students performing average (50-70 score)',
  `growth_description` text NOT NULL COMMENT 'Feedback for students needing improvement (<50 score)',
  `strong_threshold` int NOT NULL DEFAULT 70 COMMENT 'Minimum score for strong performance',
  `neutral_threshold` int NOT NULL DEFAULT 50 COMMENT 'Minimum score for neutral performance',
  `is_active` tinyint(1) DEFAULT 1 COMMENT 'Whether this competency is active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `competency_code_unique` (`code`),
  UNIQUE KEY `competency_name_unique` (`name`),
  KEY `idx_competencies_active` (`is_active`),
  KEY `idx_competencies_code` (`code`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. Create questions_competencies table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS `questions_competencies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `question_id` int NOT NULL,
  `competency_id` int NOT NULL,
  `weight` decimal(3,2) DEFAULT 1.00 COMMENT 'Weight of this competency for this question (default 1.0)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `question_competency_unique` (`question_id`, `competency_id`),
  KEY `idx_questions_competencies_question` (`question_id`),
  KEY `idx_questions_competencies_competency` (`competency_id`),
  KEY `idx_questions_competencies_weight` (`weight`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3. Create student_competency_scores table to track individual competency performance
CREATE TABLE IF NOT EXISTS `student_competency_scores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `competency_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `assessment_id` int DEFAULT NULL COMMENT 'Specific assessment that contributed to this score',
  `questions_attempted` int NOT NULL DEFAULT 0 COMMENT 'Number of questions attempted for this competency',
  `questions_correct` int NOT NULL DEFAULT 0 COMMENT 'Number of questions answered correctly for this competency',
  `raw_score` decimal(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Raw score (correct/attempted)',
  `weighted_score` decimal(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Weighted score considering question weights',
  `final_score` decimal(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Final competency score (0-100)',
  `feedback_type` enum('strong', 'neutral', 'growth') DEFAULT NULL COMMENT 'Type of feedback based on score',
  `feedback_text` text COMMENT 'Generated feedback text based on performance',
  `date_calculated` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_competency_subject_unique` (`student_id`, `competency_id`, `subject_id`),
  KEY `idx_student_competency_scores_student` (`student_id`),
  KEY `idx_student_competency_scores_competency` (`competency_id`),
  KEY `idx_student_competency_scores_subject` (`subject_id`),
  KEY `idx_student_competency_scores_assessment` (`assessment_id`),
  KEY `idx_student_competency_scores_final_score` (`final_score`),
  KEY `idx_student_competency_scores_feedback_type` (`feedback_type`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4. Create assessment_competency_breakdown table for detailed tracking
CREATE TABLE IF NOT EXISTS `assessment_competency_breakdown` (
  `id` int NOT NULL AUTO_INCREMENT,
  `assessment_id` int NOT NULL,
  `competency_id` int NOT NULL,
  `questions_attempted` int NOT NULL DEFAULT 0,
  `questions_correct` int NOT NULL DEFAULT 0,
  `total_weight` decimal(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Sum of weights for attempted questions',
  `weighted_correct` decimal(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Sum of weights for correct answers',
  `competency_score` decimal(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Competency score for this assessment',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `assessment_competency_unique` (`assessment_id`, `competency_id`),
  KEY `idx_assessment_competency_breakdown_assessment` (`assessment_id`),
  KEY `idx_assessment_competency_breakdown_competency` (`competency_id`),
  KEY `idx_assessment_competency_breakdown_score` (`competency_score`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 5. Insert sample competencies
INSERT INTO `competencies` (`code`, `name`, `description`, `strong_description`, `neutral_description`, `growth_description`, `strong_threshold`, `neutral_threshold`) VALUES
('LOG001', 'Logical Reasoning', 'Ability to analyze problems and apply logical thinking to find solutions', 'Excellent logical reasoning skills! You demonstrate strong analytical thinking and can systematically approach complex problems. Your ability to break down problems into manageable parts and apply logical principles is outstanding.', 'Good logical reasoning skills with room for improvement. You show solid analytical thinking but could benefit from more practice with complex problem-solving scenarios. Focus on identifying patterns and applying systematic approaches.', 'Logical reasoning needs development. Practice breaking down problems into smaller parts and identifying patterns. Work on applying systematic thinking approaches to improve your analytical skills.', 70, 50),
('CRT001', 'Critical Thinking', 'Ability to evaluate information, arguments, and situations critically', 'Outstanding critical thinking abilities! You excel at evaluating information from multiple perspectives, identifying biases, and making well-reasoned judgments. Your analytical skills are exceptional.', 'Solid critical thinking skills with potential for growth. You demonstrate good evaluation abilities but could enhance your skills in identifying assumptions and considering alternative viewpoints.', 'Critical thinking skills need development. Focus on questioning assumptions, considering multiple perspectives, and evaluating evidence more thoroughly to improve your analytical judgment.', 70, 50),
('ENG001', 'Engagement in Class', 'Active participation and engagement with learning materials', 'Exceptional engagement and participation! You actively contribute to discussions, ask thoughtful questions, and demonstrate genuine interest in learning. Your enthusiasm for the subject is inspiring.', 'Good engagement with room for improvement. You participate regularly but could enhance your involvement by asking more questions and contributing more actively to discussions.', 'Engagement needs improvement. Try to participate more actively in discussions, ask questions when you need clarification, and show more interest in the learning process.', 70, 50),
('PRO001', 'Problem Solving', 'Ability to identify, analyze, and solve complex problems', 'Excellent problem-solving skills! You approach challenges systematically, consider multiple solutions, and implement effective strategies. Your ability to tackle complex problems is impressive.', 'Good problem-solving abilities with room for growth. You handle problems well but could improve by considering more alternative solutions and refining your approach strategies.', 'Problem-solving skills need development. Practice breaking down complex problems, considering multiple approaches, and developing systematic solution strategies.', 70, 50),
('COM001', 'Communication Skills', 'Ability to express ideas clearly and effectively', 'Outstanding communication skills! You express ideas clearly, use appropriate terminology, and communicate complex concepts effectively. Your ability to convey information is excellent.', 'Good communication skills with potential for enhancement. You communicate clearly but could improve by using more precise language and organizing your thoughts more systematically.', 'Communication skills need improvement. Focus on organizing your thoughts, using clear language, and practicing expressing complex ideas in simple terms.', 70, 50),
('TEC001', 'Technical Proficiency', 'Mastery of technical concepts and practical application', 'Exceptional technical proficiency! You demonstrate deep understanding of technical concepts and can apply them effectively in various contexts. Your technical skills are outstanding.', 'Solid technical skills with room for advancement. You understand technical concepts well but could enhance your practical application and problem-solving abilities.', 'Technical proficiency needs development. Focus on understanding fundamental concepts and practice applying technical knowledge in practical scenarios.', 70, 50);

-- 6. Add competency-related columns to existing questions table (if needed for backward compatibility)
ALTER TABLE `questions` 
ADD COLUMN `primary_competency_id` int DEFAULT NULL COMMENT 'Primary competency for this question (for backward compatibility)',
ADD KEY `idx_questions_primary_competency` (`primary_competency_id`);

-- 7. Add competency summary to assessments table
ALTER TABLE `assessments` 
ADD COLUMN `competency_summary` json DEFAULT NULL COMMENT 'JSON summary of competency scores for this assessment';

-- 8. Create view for competency performance overview
CREATE OR REPLACE VIEW `competency_performance_overview` AS
SELECT 
  s.id as student_id,
  u.first_name,
  u.last_name,
  u.username,
  c.id as competency_id,
  c.code as competency_code,
  c.name as competency_name,
  scs.final_score,
  scs.feedback_type,
  scs.feedback_text,
  scs.questions_attempted,
  scs.questions_correct,
  scs.raw_score,
  scs.date_calculated,
  sub.name as subject_name,
  sub.id as subject_id
FROM student_competency_scores scs
JOIN users u ON scs.student_id = u.id
JOIN competencies c ON scs.competency_id = c.id
JOIN subjects sub ON scs.subject_id = sub.id
WHERE u.role = 'student'
ORDER BY u.first_name, c.name, scs.final_score DESC;

-- 9. Create view for assessment competency breakdown
CREATE OR REPLACE VIEW `assessment_competency_details` AS
SELECT 
  a.id as assessment_id,
  a.student_id,
  u.first_name,
  u.last_name,
  u.username,
  s.name as subject_name,
  a.assessment_period,
  a.year,
  a.date_taken,
  c.code as competency_code,
  c.name as competency_name,
  acb.questions_attempted,
  acb.questions_correct,
  acb.competency_score,
  acb.total_weight,
  acb.weighted_correct,
  CASE 
    WHEN acb.competency_score >= c.strong_threshold THEN 'strong'
    WHEN acb.competency_score >= c.neutral_threshold THEN 'neutral'
    ELSE 'growth'
  END as performance_level
FROM assessment_competency_breakdown acb
JOIN assessments a ON acb.assessment_id = a.id
JOIN users u ON a.student_id = u.id
JOIN subjects s ON a.subject_id = s.id
JOIN competencies c ON acb.competency_id = c.id
ORDER BY a.date_taken DESC, c.name;

-- 10. Create indexes for better performance
CREATE INDEX `idx_competencies_search` ON `competencies` (`is_active`, `code`, `name`);
CREATE INDEX `idx_student_competency_performance` ON `student_competency_scores` (`student_id`, `subject_id`, `final_score`);
CREATE INDEX `idx_assessment_competency_performance` ON `assessment_competency_breakdown` (`assessment_id`, `competency_score`);

-- 11. Insert sample question-competency relationships (for existing questions)
-- Note: This is a sample - you'll need to manually link competencies to questions based on your content
INSERT INTO `questions_competencies` (`question_id`, `competency_id`, `weight`) VALUES
-- Computer Science questions linked to relevant competencies
(12, 6, 1.00), -- CPU question -> Technical Proficiency
(13, 6, 1.00), -- RAM question -> Technical Proficiency
(14, 2, 1.00), -- OS question -> Critical Thinking
(17, 2, 1.00), -- JavaScript question -> Critical Thinking
(24, 1, 1.00), -- Binary question -> Logical Reasoning
(30, 2, 1.00), -- SQL question -> Critical Thinking
(31, 2, 1.00), -- Firewall question -> Critical Thinking
(34, 1, 1.00), -- Version control question -> Logical Reasoning
(36, 1, 1.00), -- Stack question -> Logical Reasoning
(39, 2, 1.00), -- Router question -> Critical Thinking
(41, 2, 1.00), -- SaaS question -> Critical Thinking
(42, 6, 1.00), -- CPU components question -> Technical Proficiency
(47, 6, 1.00), -- OSI model question -> Technical Proficiency
(48, 2, 1.00), -- Database index question -> Critical Thinking
(53, 1, 1.00), -- OOP question -> Logical Reasoning
(61, 1, 1.00), -- Recursion question -> Logical Reasoning
(65, 2, 1.00), -- JavaScript comparison question -> Critical Thinking
(74, 2, 1.00), -- Class vs Object question -> Critical Thinking
(84, 1, 1.00), -- Recursion question -> Logical Reasoning
(92, 6, 1.00), -- Constructor question -> Technical Proficiency
(103, 2, 1.00), -- JavaScript 'this' question -> Critical Thinking
(116, 2, 1.00); -- JavaScript null vs undefined question -> Critical Thinking

-- 12. Create stored procedure for calculating competency scores
DELIMITER //
CREATE PROCEDURE CalculateCompetencyScores(IN assessment_id_param INT)
BEGIN
  DECLARE student_id_var INT;
  DECLARE subject_id_var INT;
  
  -- Get assessment details
  SELECT a.student_id, a.subject_id 
  INTO student_id_var, subject_id_var
  FROM assessments a 
  WHERE a.id = assessment_id_param;
  
  -- Calculate competency scores for all competencies in this assessment
  INSERT INTO assessment_competency_breakdown 
    (assessment_id, competency_id, questions_attempted, questions_correct, 
     total_weight, weighted_correct, competency_score)
  SELECT 
    assessment_id_param,
    c.id as competency_id,
    COUNT(*) as questions_attempted,
    SUM(CASE WHEN ar.is_correct = 1 THEN 1 ELSE 0 END) as questions_correct,
    SUM(qc.weight) as total_weight,
    SUM(CASE WHEN ar.is_correct = 1 THEN qc.weight ELSE 0 END) as weighted_correct,
    CASE 
      WHEN SUM(qc.weight) > 0 THEN (SUM(CASE WHEN ar.is_correct = 1 THEN qc.weight ELSE 0 END) / SUM(qc.weight)) * 100
      ELSE 0 
    END as competency_score
  FROM competencies c
  JOIN questions_competencies qc ON c.id = qc.competency_id
  JOIN assessment_responses ar ON qc.question_id = ar.question_id
  WHERE ar.assessment_id = assessment_id_param
  GROUP BY c.id
  ON DUPLICATE KEY UPDATE
    questions_attempted = VALUES(questions_attempted),
    questions_correct = VALUES(questions_correct),
    total_weight = VALUES(total_weight),
    weighted_correct = VALUES(weighted_correct),
    competency_score = VALUES(competency_score);
  
  -- Update student competency scores with feedback
  INSERT INTO student_competency_scores 
    (student_id, competency_id, subject_id, assessment_id, questions_attempted,
     questions_correct, raw_score, weighted_score, final_score, feedback_type, feedback_text)
  SELECT 
    student_id_var,
    acb.competency_id,
    subject_id_var,
    assessment_id_param,
    acb.questions_attempted,
    acb.questions_correct,
    CASE WHEN acb.questions_attempted > 0 THEN (acb.questions_correct / acb.questions_attempted) * 100 ELSE 0 END as raw_score,
    CASE WHEN acb.total_weight > 0 THEN (acb.weighted_correct / acb.total_weight) * 100 ELSE 0 END as weighted_score,
    acb.competency_score as final_score,
    CASE 
      WHEN acb.competency_score >= c.strong_threshold THEN 'strong'
      WHEN acb.competency_score >= c.neutral_threshold THEN 'neutral'
      ELSE 'growth'
    END as feedback_type,
    CASE 
      WHEN acb.competency_score >= c.strong_threshold THEN c.strong_description
      WHEN acb.competency_score >= c.neutral_threshold THEN c.neutral_description
      ELSE c.growth_description
    END as feedback_text
  FROM assessment_competency_breakdown acb
  JOIN competencies c ON acb.competency_id = c.id
  WHERE acb.assessment_id = assessment_id_param
  ON DUPLICATE KEY UPDATE
    questions_attempted = VALUES(questions_attempted),
    questions_correct = VALUES(questions_correct),
    raw_score = VALUES(raw_score),
    weighted_score = VALUES(weighted_score),
    final_score = VALUES(final_score),
    feedback_type = VALUES(feedback_type),
    feedback_text = VALUES(feedback_text),
    date_calculated = CURRENT_TIMESTAMP;
  
  -- Update assessment competency summary
  UPDATE assessments 
  SET competency_summary = (
    SELECT JSON_OBJECT(
      'total_competencies', COUNT(*),
      'average_score', AVG(competency_score),
      'strong_performance', SUM(CASE WHEN competency_score >= 70 THEN 1 ELSE 0 END),
      'neutral_performance', SUM(CASE WHEN competency_score >= 50 AND competency_score < 70 THEN 1 ELSE 0 END),
      'growth_needed', SUM(CASE WHEN competency_score < 50 THEN 1 ELSE 0 END)
    )
    FROM assessment_competency_breakdown 
    WHERE assessment_id = assessment_id_param
  )
  WHERE id = assessment_id_param;
  
END //
DELIMITER ;
