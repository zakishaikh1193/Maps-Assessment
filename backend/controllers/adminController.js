import { executeQuery } from '../config/database.js';
import bcrypt from 'bcryptjs';

// Get all students
export const getStudents = async (req, res) => {
  try {
    const students = await executeQuery(`
      SELECT 
        u.id, 
        u.username, 
        u.first_name, 
        u.last_name,
        u.school_id,
        u.grade_id,
        s.name as school_name,
        g.display_name as grade_name
      FROM users u
      LEFT JOIN schools s ON u.school_id = s.id
      LEFT JOIN grades g ON u.grade_id = g.id
      WHERE u.role = 'student'
      ORDER BY u.first_name, u.last_name, u.username
    `);
    
    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      error: 'Failed to fetch students',
      code: 'FETCH_STUDENTS_ERROR'
    });
  }
};

// Get student growth data
export const getStudentGrowth = async (req, res) => {
  try {
    const { studentId, subjectId } = req.params;
    
    // Get student's school and grade information
    const studentInfo = await executeQuery(`
      SELECT u.school_id, u.grade_id, s.name as school_name, g.name as grade_name
      FROM users u
      JOIN schools s ON u.school_id = s.id
      JOIN grades g ON u.grade_id = g.id
      WHERE u.id = ?
    `, [studentId]);

    if (studentInfo.length === 0) {
      return res.status(404).json({
        error: 'Student information not found',
        code: 'STUDENT_NOT_FOUND'
      });
    }

    const { school_id, grade_id, school_name, grade_name } = studentInfo[0];
    
    // Get subject name
    const subjectResult = await executeQuery('SELECT name FROM subjects WHERE id = ?', [subjectId]);
    if (subjectResult.length === 0) {
      return res.status(404).json({
        error: 'Subject not found',
        code: 'SUBJECT_NOT_FOUND'
      });
    }
    const subjectName = subjectResult[0].name;

    // Get all assessments for this student and subject (student's RIT progression)
    // Use window function to get only the latest assessment for each year+season combination
    const studentScores = await executeQuery(`
      SELECT 
        CONCAT(assessment_period, ' ', year) as period,
        year,
        assessment_period,
        rit_score,
        date_taken
      FROM (
        SELECT 
          assessment_period,
          year,
          rit_score,
          date_taken,
          ROW_NUMBER() OVER (
            PARTITION BY year, assessment_period 
            ORDER BY date_taken DESC, id DESC
          ) as rn
        FROM assessments 
        WHERE student_id = ? 
        AND subject_id = ? 
        AND rit_score IS NOT NULL
      ) ranked
      WHERE rn = 1
      ORDER BY year ASC, 
        CASE assessment_period 
          WHEN 'Fall' THEN 1 
          WHEN 'Winter' THEN 2 
          WHEN 'Spring' THEN 3 
        END ASC
    `, [studentId, subjectId]);

    // Get class averages for each period (filtered by school and grade)
    const classAverages = await executeQuery(`
      SELECT 
        CONCAT(a.assessment_period, ' ', a.year) as period,
        a.year,
        a.assessment_period,
        AVG(a.rit_score) as averageRITScore,
        COUNT(DISTINCT a.student_id) as studentCount
      FROM assessments a
      JOIN users u ON a.student_id = u.id
      WHERE a.subject_id = ? 
      AND a.rit_score IS NOT NULL
      AND u.school_id = ?
      AND u.grade_id = ?
      GROUP BY a.assessment_period, a.year
      ORDER BY a.year ASC, 
        CASE a.assessment_period 
          WHEN 'Fall' THEN 1 
          WHEN 'Winter' THEN 2 
          WHEN 'Spring' THEN 3 
        END ASC
    `, [subjectId, school_id, grade_id]);

    // Get district averages for each period (filtered by grade only, across all schools)
    const districtAverages = await executeQuery(`
      SELECT 
        CONCAT(a.assessment_period, ' ', a.year) as period,
        a.year,
        a.assessment_period,
        AVG(a.rit_score) as averageRITScore,
        COUNT(DISTINCT a.student_id) as studentCount
      FROM assessments a
      JOIN users u ON a.student_id = u.id
      WHERE a.subject_id = ? 
      AND a.rit_score IS NOT NULL
      AND u.grade_id = ?
      GROUP BY a.assessment_period, a.year
      ORDER BY a.year ASC, 
        CASE a.assessment_period 
          WHEN 'Fall' THEN 1 
          WHEN 'Winter' THEN 2 
          WHEN 'Spring' THEN 3 
        END ASC
    `, [subjectId, grade_id]);

    // Calculate student distribution by period and RIT score ranges
    const periodDistributions = await executeQuery(`
      SELECT 
        a.assessment_period,
        a.year,
        COUNT(*) as total_students,
        SUM(CASE WHEN rit_score BETWEEN 100 AND 150 THEN 1 ELSE 0 END) as red_count,
        SUM(CASE WHEN rit_score BETWEEN 151 AND 200 THEN 1 ELSE 0 END) as orange_count,
        SUM(CASE WHEN rit_score BETWEEN 201 AND 250 THEN 1 ELSE 0 END) as yellow_count,
        SUM(CASE WHEN rit_score BETWEEN 251 AND 300 THEN 1 ELSE 0 END) as green_count,
        SUM(CASE WHEN rit_score BETWEEN 301 AND 350 THEN 1 ELSE 0 END) as blue_count
       FROM assessments a
      JOIN users u ON a.student_id = u.id
      WHERE a.subject_id = ? 
      AND a.rit_score IS NOT NULL
      AND u.school_id = ?
      AND u.grade_id = ?
      GROUP BY a.assessment_period, a.year
      ORDER BY a.year ASC, 
        CASE a.assessment_period 
          WHEN 'Fall' THEN 1 
          WHEN 'Winter' THEN 2 
          WHEN 'Spring' THEN 3 
        END ASC
    `, [subjectId, school_id, grade_id]);

    // Calculate percentages for each period
    const formattedDistributions = periodDistributions.map(period => ({
      period: `${period.assessment_period} ${period.year}`,
      year: period.year,
      assessmentPeriod: period.assessment_period,
      totalStudents: period.total_students,
      distributions: {
        red: Math.round((period.red_count / period.total_students) * 100),
        orange: Math.round((period.orange_count / period.total_students) * 100),
        yellow: Math.round((period.yellow_count / period.total_students) * 100),
        green: Math.round((period.green_count / period.total_students) * 100),
        blue: Math.round((period.blue_count / period.total_students) * 100)
      }
    }));

    res.json({
      subjectName,
      schoolName: school_name,
      gradeName: grade_name,
      studentScores: studentScores.map(score => ({
        period: score.period,
        year: score.year,
        assessmentPeriod: score.assessment_period,
        ritScore: score.rit_score,
        dateTaken: score.date_taken
      })),
      classAverages: classAverages.map(avg => ({
        period: avg.period,
        year: avg.year,
        assessmentPeriod: avg.assessment_period,
        averageRITScore: Math.round(avg.averageRITScore),
        studentCount: avg.studentCount
      })),
      districtAverages: districtAverages.map(avg => ({
        period: avg.period,
        year: avg.year,
        assessmentPeriod: avg.assessment_period,
        averageRITScore: Math.round(avg.averageRITScore),
        studentCount: avg.studentCount
      })),
      periodDistributions: formattedDistributions,
      totalAssessments: studentScores.length
    });

  } catch (error) {
    console.error('Error fetching student growth:', error);
    res.status(500).json({
      error: 'Failed to fetch student growth data',
      code: 'FETCH_GROWTH_ERROR'
    });
  }
};

// Get admin statistics
export const getAdminStats = async (req, res) => {
  try {
    // Get total questions
    const totalQuestionsResult = await executeQuery('SELECT COUNT(*) as count FROM questions');
    const totalQuestions = totalQuestionsResult[0].count;

    // Get total students
    const totalStudentsResult = await executeQuery("SELECT COUNT(*) as count FROM users WHERE role = 'student'");
    const totalStudents = totalStudentsResult[0].count;

    // Get total assessments
    const totalAssessmentsResult = await executeQuery('SELECT COUNT(*) as count FROM assessments WHERE rit_score IS NOT NULL');
    const totalAssessments = totalAssessmentsResult[0].count;

    // Get difficulty distribution
    const difficultyDistribution = await executeQuery(`
      SELECT 
        CASE 
          WHEN difficulty_level BETWEEN 100 AND 150 THEN '100-150'
          WHEN difficulty_level BETWEEN 151 AND 200 THEN '151-200'
          WHEN difficulty_level BETWEEN 201 AND 250 THEN '201-250'
          WHEN difficulty_level BETWEEN 251 AND 300 THEN '251-300'
          WHEN difficulty_level BETWEEN 301 AND 350 THEN '301-350'
        END as difficulty_range,
        COUNT(*) as count
      FROM questions 
      GROUP BY 
        CASE 
          WHEN difficulty_level BETWEEN 100 AND 150 THEN '100-150'
          WHEN difficulty_level BETWEEN 151 AND 200 THEN '151-200'
          WHEN difficulty_level BETWEEN 201 AND 250 THEN '201-250'
          WHEN difficulty_level BETWEEN 251 AND 300 THEN '251-300'
          WHEN difficulty_level BETWEEN 301 AND 350 THEN '301-350'
        END
      ORDER BY difficulty_range
    `);

    // Get subject distribution
    const subjectDistribution = await executeQuery(`
      SELECT 
        s.id,
        s.name,
        COUNT(q.id) as question_count
      FROM subjects s
      LEFT JOIN questions q ON s.id = q.subject_id
      GROUP BY s.id, s.name
      ORDER BY s.name
    `);

    res.json({
      totalQuestions,
      totalStudents,
      totalAssessments,
      difficultyDistribution,
      subjectDistribution
    });

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      error: 'Failed to fetch admin statistics',
      code: 'FETCH_STATS_ERROR'
    });
  }
};

// Create bulk questions
export const createBulkQuestions = async (req, res) => {
  try {
    const { questions } = req.body;
    const userId = req.user.id;

    const createdQuestions = [];

    for (const questionData of questions) {
      const { subjectId, questionText, options, correctOptionIndex, difficultyLevel } = questionData;

      // Convert options to array if it's a string
      let optionsArray = options;
      if (typeof options === 'string') {
        optionsArray = options.split(',').map(opt => opt.trim());
      }

      // Validate correct option index
      if (correctOptionIndex < 0 || correctOptionIndex >= optionsArray.length) {
        return res.status(400).json({
          error: `Invalid correct option index for question: ${questionText}`,
          code: 'INVALID_CORRECT_OPTION'
        });
      }

      // Check if subject exists
      const subjects = await executeQuery(
        'SELECT id FROM subjects WHERE id = ?',
        [subjectId]
      );

      if (subjects.length === 0) {
        return res.status(404).json({
          error: `Subject not found for question: ${questionText}`,
          code: 'SUBJECT_NOT_FOUND'
        });
      }

      // Insert question
      const result = await executeQuery(
        'INSERT INTO questions (subject_id, question_text, options, correct_option_index, difficulty_level, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [subjectId, questionText, JSON.stringify(optionsArray), correctOptionIndex, difficultyLevel, userId]
      );

      // Get created question
      const questions = await executeQuery(
        'SELECT id, subject_id, question_text, options, correct_option_index, difficulty_level, created_at FROM questions WHERE id = ?',
        [result.insertId]
      );

      const question = questions[0];
      if (typeof question.options === 'string') {
        try {
          question.options = JSON.parse(question.options);
        } catch (parseError) {
          console.error('Error parsing options JSON:', parseError);
          question.options = [];
        }
      }

      createdQuestions.push({
        id: question.id,
        subjectId: question.subject_id,
        questionText: question.question_text,
        options: question.options,
        correctOptionIndex: question.correct_option_index,
        difficultyLevel: question.difficulty_level,
        createdAt: question.created_at
      });
    }

    res.status(201).json({
      message: `Successfully created ${createdQuestions.length} questions`,
      questions: createdQuestions
    });

  } catch (error) {
    console.error('Error creating bulk questions:', error);
    res.status(500).json({
      error: 'Failed to create questions',
      code: 'CREATE_BULK_QUESTIONS_ERROR'
    });
  }
};

// Create new question
export const createQuestion = async (req, res) => {
  try {
    const { subjectId, gradeId, questionText, options, correctOptionIndex, difficultyLevel, competencies } = req.body;

    // Handle options format - convert string to array if needed
    let optionsArray = options;
    if (typeof options === 'string') {
      optionsArray = options.split(',').map(option => option.trim());
    } else if (!Array.isArray(options)) {
      return res.status(400).json({
        error: 'Options must be an array or comma-separated string',
        code: 'INVALID_OPTIONS_FORMAT'
      });
    }

    // Validate correct option index
    if (correctOptionIndex < 0 || correctOptionIndex >= optionsArray.length) {
      return res.status(400).json({
        error: 'Invalid correct option index',
        code: 'INVALID_OPTION_INDEX'
      });
    }

    // Validate difficulty level
    if (difficultyLevel < 100 || difficultyLevel > 350) {
      return res.status(400).json({
        error: 'Difficulty level must be between 100 and 350',
        code: 'INVALID_DIFFICULTY_LEVEL'
      });
    }

    // Check if subject exists
    const subjects = await executeQuery(
      'SELECT id FROM subjects WHERE id = ?',
      [subjectId]
    );

    if (subjects.length === 0) {
      return res.status(404).json({
        error: 'Subject not found',
        code: 'SUBJECT_NOT_FOUND'
      });
    }

    // Check if grade exists
    const grades = await executeQuery(
      'SELECT id FROM grades WHERE id = ?',
      [gradeId]
    );

    if (grades.length === 0) {
      return res.status(404).json({
        error: 'Grade not found',
        code: 'GRADE_NOT_FOUND'
      });
    }

    // Insert question
    const result = await executeQuery(
      'INSERT INTO questions (subject_id, grade_id, question_text, options, correct_option_index, difficulty_level, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [subjectId, gradeId, questionText, JSON.stringify(optionsArray), correctOptionIndex, difficultyLevel, req.user.id]
    );

    // Insert competency relationships if provided
    if (competencies && Array.isArray(competencies) && competencies.length > 0) {
      for (const comp of competencies) {
        await executeQuery(
          'INSERT INTO questions_competencies (question_id, competency_id, weight) VALUES (?, ?, ?)',
          [result.insertId, comp.id, 100]
        );
      }
    }

    // Get the created question
    const questions = await executeQuery(
      'SELECT id, subject_id, grade_id, question_text, options, correct_option_index, difficulty_level, created_at FROM questions WHERE id = ?',
      [result.insertId]
    );

    const question = questions[0];
    if (typeof question.options === 'string') {
      try {
        question.options = JSON.parse(question.options);
      } catch (parseError) {
        console.error('Error parsing options JSON:', parseError);
        question.options = [];
      }
    }

    res.status(201).json({
      message: 'Question created successfully',
      question: {
        id: question.id,
        subjectId: question.subject_id,
        gradeId: question.grade_id,
        questionText: question.question_text,
        options: question.options,
        correctOptionIndex: question.correct_option_index,
        difficultyLevel: question.difficulty_level,
        createdAt: question.created_at
      }
    });

  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({
      error: 'Failed to create question',
      code: 'CREATE_QUESTION_ERROR'
    });
  }
};

// Get single question by ID
export const getQuestionById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if question exists
    const questions = await executeQuery(`
      SELECT 
        q.id,
        q.subject_id,
        q.grade_id,
        q.question_text,
        q.options,
        q.correct_option_index,
        q.difficulty_level,
        q.created_at,
        u.username as created_by_username,
        g.display_name as grade_name
      FROM questions q
      LEFT JOIN users u ON q.created_by = u.id
      LEFT JOIN grades g ON q.grade_id = g.id
      WHERE q.id = ?
    `, [id]);

    if (questions.length === 0) {
      return res.status(404).json({
        error: 'Question not found',
        code: 'QUESTION_NOT_FOUND'
      });
    }

    const question = questions[0];
    
    // Parse options JSON
    let parsedOptions = question.options;
    if (typeof question.options === 'string') {
      try {
        parsedOptions = JSON.parse(question.options);
      } catch (parseError) {
        console.error('Error parsing options JSON:', parseError);
        parsedOptions = [];
      }
    }

    // Get competency relationships
    const competencyRelationships = await executeQuery(`
      SELECT 
        c.id,
        c.code,
        c.name,
        qc.weight
      FROM questions_competencies qc
      JOIN competencies c ON qc.competency_id = c.id
      WHERE qc.question_id = ?
      ORDER BY qc.weight DESC
    `, [id]);

    res.json({
      id: question.id,
      subjectId: question.subject_id,
      gradeId: question.grade_id,
      questionText: question.question_text,
      options: parsedOptions,
      correctOptionIndex: question.correct_option_index,
      difficultyLevel: question.difficulty_level,
      competencies: competencyRelationships,
      createdAt: question.created_at,
      createdByUsername: question.created_by_username,
      gradeName: question.grade_name
    });

  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({
      error: 'Failed to fetch question',
      code: 'FETCH_QUESTION_ERROR'
    });
  }
};

// Get questions by subject
export const getQuestionsBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;

    // Check if subject exists
    const subjects = await executeQuery(
      'SELECT id FROM subjects WHERE id = ?',
      [subjectId]
    );

    if (subjects.length === 0) {
      return res.status(404).json({
        error: 'Subject not found',
        code: 'SUBJECT_NOT_FOUND'
      });
    }

    // Get questions with creator info and grade info
    const questions = await executeQuery(`
      SELECT 
        q.id,
        q.subject_id,
        q.grade_id,
        q.question_text,
        q.options,
        q.correct_option_index,
        q.difficulty_level,
        q.created_at,
        u.username as created_by_username,
        g.display_name as grade_name
      FROM questions q
      LEFT JOIN users u ON q.created_by = u.id
      LEFT JOIN grades g ON q.grade_id = g.id
      WHERE q.subject_id = ?
      ORDER BY q.created_at DESC
    `, [subjectId]);

    console.log(`Found ${questions.length} questions for subject ${subjectId}`);
    if (questions.length > 0) {
      console.log('First question:', questions[0]);
    }

    // Parse options JSON and transform field names
    const formattedQuestions = questions.map(q => {
      let parsedOptions = q.options;
      if (typeof q.options === 'string') {
        try {
          parsedOptions = JSON.parse(q.options);
        } catch (parseError) {
          console.error('Error parsing options JSON:', parseError);
          parsedOptions = [];
        }
      }
      return {
        id: q.id,
        subjectId: q.subject_id,
        gradeId: q.grade_id,
        questionText: q.question_text,
        options: parsedOptions,
        correctOptionIndex: q.correct_option_index,
        difficultyLevel: q.difficulty_level,
        createdBy: q.created_by,
        createdAt: q.created_at,
        createdByUsername: q.created_by_username,
        gradeName: q.grade_name
      };
    });

    res.json(formattedQuestions);

  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({
      error: 'Failed to fetch questions',
      code: 'FETCH_QUESTIONS_ERROR'
    });
  }
};

// Update question
export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { subjectId, gradeId, questionText, options, correctOptionIndex, difficultyLevel, competencies } = req.body;

    // Check if question exists
    const questions = await executeQuery(
      'SELECT id FROM questions WHERE id = ?',
      [id]
    );

    if (questions.length === 0) {
      return res.status(404).json({
        error: 'Question not found',
        code: 'QUESTION_NOT_FOUND'
      });
    }

    // Check if subject exists
    const subjects = await executeQuery(
      'SELECT id FROM subjects WHERE id = ?',
      [subjectId]
    );

    if (subjects.length === 0) {
      return res.status(404).json({
        error: 'Subject not found',
        code: 'SUBJECT_NOT_FOUND'
      });
    }

    // Check if grade exists
    const grades = await executeQuery(
      'SELECT id FROM grades WHERE id = ?',
      [gradeId]
    );

    if (grades.length === 0) {
      return res.status(404).json({
        error: 'Grade not found',
        code: 'GRADE_NOT_FOUND'
      });
    }

    // Handle options format - convert string to array if needed
    let optionsArray = options;
    if (typeof options === 'string') {
      optionsArray = options.split(',').map(option => option.trim());
    } else if (!Array.isArray(options)) {
      return res.status(400).json({
        error: 'Options must be an array or comma-separated string',
        code: 'INVALID_OPTIONS_FORMAT'
      });
    }

    // Validate correct option index
    if (correctOptionIndex < 0 || correctOptionIndex >= optionsArray.length) {
      return res.status(400).json({
        error: 'Invalid correct option index',
        code: 'INVALID_OPTION_INDEX'
      });
    }

    // Validate difficulty level
    if (difficultyLevel < 100 || difficultyLevel > 350) {
      return res.status(400).json({
        error: 'Difficulty level must be between 100 and 350',
        code: 'INVALID_DIFFICULTY_LEVEL'
      });
    }

    // Update question
    await executeQuery(
      'UPDATE questions SET subject_id = ?, grade_id = ?, question_text = ?, options = ?, correct_option_index = ?, difficulty_level = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [subjectId, gradeId, questionText, JSON.stringify(optionsArray), correctOptionIndex, difficultyLevel, id]
    );

    // Update competency relationships
    // First, remove existing relationships
    await executeQuery('DELETE FROM questions_competencies WHERE question_id = ?', [id]);
    
    // Then, insert new relationships if provided
    if (competencies && Array.isArray(competencies) && competencies.length > 0) {
      for (const comp of competencies) {
        await executeQuery(
          'INSERT INTO questions_competencies (question_id, competency_id, weight) VALUES (?, ?, ?)',
          [id, comp.id, 100]
        );
      }
    }

    // Get updated question
    const updatedQuestions = await executeQuery(`
      SELECT 
        q.id,
        q.subject_id,
        q.grade_id,
        q.question_text,
        q.options,
        q.correct_option_index,
        q.difficulty_level,
        q.created_at,
        u.username as created_by_username
      FROM questions q
      LEFT JOIN users u ON q.created_by = u.id
      WHERE q.id = ?
    `, [id]);

    const question = updatedQuestions[0];
    if (typeof question.options === 'string') {
      try {
        question.options = JSON.parse(question.options);
      } catch (parseError) {
        console.error('Error parsing options JSON:', parseError);
        question.options = [];
      }
    }

    res.json({
      message: 'Question updated successfully',
      question: {
        id: question.id,
        subjectId: question.subject_id,
        gradeId: question.grade_id,
        questionText: question.question_text,
        options: question.options,
        correctOptionIndex: question.correct_option_index,
        difficultyLevel: question.difficulty_level,
        createdAt: question.created_at,
        createdByUsername: question.created_by_username
      }
    });

  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({
      error: 'Failed to update question',
      code: 'UPDATE_QUESTION_ERROR'
    });
  }
};

// Debug endpoint to check all questions
export const debugQuestions = async (req, res) => {
  try {
    const questions = await executeQuery(`
      SELECT 
        q.id,
        q.subject_id,
        q.question_text,
        q.options,
        q.correct_option_index,
        q.difficulty_level,
        s.name as subject_name
      FROM questions q
      JOIN subjects s ON q.subject_id = s.id
      ORDER BY q.subject_id, q.id
    `);

    res.json({
      totalQuestions: questions.length,
      questions: questions.map(q => ({
        ...q,
        options: (() => {
          if (typeof q.options === 'string') {
            try {
              return JSON.parse(q.options);
            } catch (parseError) {
              return [];
            }
          }
          return q.options;
        })()
      }))
    });

  } catch (error) {
    console.error('Error in debug questions:', error);
    res.status(500).json({
      error: 'Failed to fetch debug questions',
      code: 'DEBUG_QUESTIONS_ERROR'
    });
  }
};

// Delete question
export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if question exists
    const questions = await executeQuery(
      'SELECT id FROM questions WHERE id = ?',
      [id]
    );

    if (questions.length === 0) {
      return res.status(404).json({
        error: 'Question not found',
        code: 'QUESTION_NOT_FOUND'
      });
    }

    // Check if question is used in assessments
    const responses = await executeQuery(
      'SELECT id FROM assessment_responses WHERE question_id = ? LIMIT 1',
      [id]
    );

    if (responses.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete question that has been used in assessments',
        code: 'QUESTION_USED_IN_ASSESSMENTS'
      });
    }

    // Delete question
    await executeQuery('DELETE FROM questions WHERE id = ?', [id]);

    res.json({
      message: 'Question deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({
      error: 'Failed to delete question',
      code: 'DELETE_QUESTION_ERROR'
    });
  }
};

// Create new student (admin only)
export const createStudent = async (req, res) => {
  try {
    const { username, password, firstName, lastName, schoolId, gradeId } = req.body;

    // Check if username already exists
    const existingUsers = await executeQuery(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        error: 'Username already exists',
        code: 'USERNAME_EXISTS'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new student
    const result = await executeQuery(
      'INSERT INTO users (username, password, first_name, last_name, role, school_id, grade_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, firstName, lastName, 'student', schoolId, gradeId]
    );

    // Get the created student with school and grade info
    const newStudents = await executeQuery(`
      SELECT 
        u.id, u.username, u.first_name, u.last_name, u.role, u.created_at,
        s.name as school_name, s.id as school_id,
        g.display_name as grade_name, g.id as grade_id, g.grade_level
      FROM users u
      LEFT JOIN schools s ON u.school_id = s.id
      LEFT JOIN grades g ON u.grade_id = g.id
      WHERE u.id = ?
    `, [result.insertId]);

    res.status(201).json({
      message: 'Student created successfully',
      student: newStudents[0]
    });

  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({
      error: 'Failed to create student',
      code: 'CREATE_STUDENT_ERROR'
    });
  }
};

// Update student (admin only)
export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, schoolId, gradeId, password } = req.body;

    // Check if student exists
    const existingStudents = await executeQuery(
      'SELECT id FROM users WHERE id = ? AND role = "student"',
      [id]
    );

    if (existingStudents.length === 0) {
      return res.status(404).json({
        error: 'Student not found',
        code: 'STUDENT_NOT_FOUND'
      });
    }

    // Build update query
    let updateQuery = 'UPDATE users SET first_name = ?, last_name = ?, school_id = ?, grade_id = ?';
    let queryParams = [firstName, lastName, schoolId, gradeId];

    // Add password update if provided
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += ', password = ?';
      queryParams.push(hashedPassword);
    }

    updateQuery += ' WHERE id = ?';
    queryParams.push(id);

    // Update student
    await executeQuery(updateQuery, queryParams);

    // Get updated student with school and grade info
    const updatedStudents = await executeQuery(`
      SELECT 
        u.id, u.username, u.first_name, u.last_name, u.role, u.created_at,
        s.name as school_name, s.id as school_id,
        g.display_name as grade_name, g.id as grade_id, g.grade_level
      FROM users u
      LEFT JOIN schools s ON u.school_id = s.id
      LEFT JOIN grades g ON u.grade_id = g.id
      WHERE u.id = ?
    `, [id]);

    res.json({
      message: 'Student updated successfully',
      student: updatedStudents[0]
    });

  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({
      error: 'Failed to update student',
      code: 'UPDATE_STUDENT_ERROR'
    });
  }
};

// Delete student (admin only)
export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if student exists
    const existingStudents = await executeQuery(
      'SELECT id FROM users WHERE id = ? AND role = "student"',
      [id]
    );

    if (existingStudents.length === 0) {
      return res.status(404).json({
        error: 'Student not found',
        code: 'STUDENT_NOT_FOUND'
      });
    }

    // Check if student has assessments
    const assessments = await executeQuery(
      'SELECT id FROM assessments WHERE student_id = ? LIMIT 1',
      [id]
    );

    if (assessments.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete student with existing assessments',
        code: 'STUDENT_HAS_ASSESSMENTS'
      });
    }

    // Delete student
    await executeQuery('DELETE FROM users WHERE id = ?', [id]);

    res.json({
      message: 'Student deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({
      error: 'Failed to delete student',
      code: 'DELETE_STUDENT_ERROR'
    });
  }
};

// Get students by school and grade
export const getStudentsBySchoolAndGrade = async (req, res) => {
  try {
    const { schoolId, gradeId } = req.params;

    const students = await executeQuery(`
      SELECT 
        u.id, 
        u.username, 
        u.first_name, 
        u.last_name, 
        u.role, 
        u.created_at,
        s.name as school_name, 
        s.id as school_id,
        g.display_name as grade_name, 
        g.id as grade_id, 
        g.grade_level
      FROM users u
      LEFT JOIN schools s ON u.school_id = s.id
      LEFT JOIN grades g ON u.grade_id = g.id
      WHERE u.role = 'student'
      AND u.school_id = ?
      AND u.grade_id = ?
      ORDER BY u.first_name, u.last_name, u.username
    `, [schoolId, gradeId]);

    res.json(students);
  } catch (error) {
    console.error('Error fetching students by school and grade:', error);
    res.status(500).json({
      error: 'Failed to fetch students',
      code: 'FETCH_STUDENTS_ERROR'
    });
  }
};
