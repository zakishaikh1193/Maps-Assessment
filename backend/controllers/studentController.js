import { executeQuery } from '../config/database.js';

// In-memory storage for active assessment sessions
const activeSessions = new Map();

// MAP Adaptive Testing Algorithm
const getNextQuestionDifficulty = (currentDifficulty, isCorrect) => {
  // MAP-style adaptive adjustment: 3-5 points based on performance
  const adjustment = Math.floor(Math.random() * 3) + 3; // 3-5 points
  
  if (isCorrect) {
    return Math.min(350, currentDifficulty + adjustment);
  } else {
    return Math.max(100, currentDifficulty - adjustment);
  }
};

// Find closest available question based on previous answer
const findClosestQuestion = async (currentDifficulty, isCorrect, subjectId, assessmentId, studentGradeId, usedQuestions = null) => {
  let questions;
  
  if (assessmentId && usedQuestions) {
    // If assessmentId exists and we have usedQuestions, exclude both database records and in-memory used questions
    const usedQuestionsArray = Array.from(usedQuestions);
    const placeholders = usedQuestionsArray.map(() => '?').join(',');
    
    if (isCorrect) {
      // If correct: find closest HARDER question
      questions = await executeQuery(`
        SELECT id, question_text, options, difficulty_level 
        FROM questions 
        WHERE subject_id = ? 
        AND (grade_id = ? OR grade_id IS NULL)
        AND difficulty_level > ?
        AND id NOT IN (
          SELECT question_id FROM assessment_responses WHERE assessment_id = ?
        )
        AND id NOT IN (${placeholders || 'NULL'})
        ORDER BY difficulty_level ASC
        LIMIT 1
      `, [subjectId, studentGradeId, currentDifficulty, assessmentId, ...usedQuestionsArray]);
    } else {
      // If incorrect: find closest EASIER question
      questions = await executeQuery(`
        SELECT id, question_text, options, difficulty_level 
        FROM questions 
        WHERE subject_id = ? 
        AND (grade_id = ? OR grade_id IS NULL)
        AND difficulty_level < ?
        AND id NOT IN (
          SELECT question_id FROM assessment_responses WHERE assessment_id = ?
        )
        AND id NOT IN (${placeholders || 'NULL'})
        ORDER BY difficulty_level DESC
        LIMIT 1
      `, [subjectId, studentGradeId, currentDifficulty, assessmentId, ...usedQuestionsArray]);
    }

    // If no questions found in the preferred direction, fall back to any available question
    if (questions.length === 0) {
      questions = await executeQuery(`
        SELECT id, question_text, options, difficulty_level 
        FROM questions 
        WHERE subject_id = ?
        AND (grade_id = ? OR grade_id IS NULL)
        AND id NOT IN (
          SELECT question_id FROM assessment_responses WHERE assessment_id = ?
        )
        AND id NOT IN (${placeholders || 'NULL'})
        ORDER BY ABS(difficulty_level - ?) ASC, RAND()
        LIMIT 1
      `, [subjectId, studentGradeId, assessmentId, ...usedQuestionsArray, currentDifficulty]);
    }
  } else if (assessmentId) {
    // If only assessmentId exists, exclude already used questions from database
    if (isCorrect) {
      // If correct: find closest HARDER question
      questions = await executeQuery(`
        SELECT id, question_text, options, difficulty_level 
        FROM questions 
        WHERE subject_id = ? 
        AND (grade_id = ? OR grade_id IS NULL)
        AND difficulty_level > ?
        AND id NOT IN (
          SELECT question_id FROM assessment_responses WHERE assessment_id = ?
        )
        ORDER BY difficulty_level ASC
        LIMIT 1
      `, [subjectId, studentGradeId, currentDifficulty, assessmentId]);
    } else {
      // If incorrect: find closest EASIER question
      questions = await executeQuery(`
        SELECT id, question_text, options, difficulty_level 
        FROM questions 
        WHERE subject_id = ? 
        AND (grade_id = ? OR grade_id IS NULL)
        AND difficulty_level < ?
        AND id NOT IN (
          SELECT question_id FROM assessment_responses WHERE assessment_id = ?
        )
        ORDER BY difficulty_level DESC
        LIMIT 1
      `, [subjectId, studentGradeId, currentDifficulty, assessmentId]);
    }

    // If no questions found in the preferred direction, fall back to any available question
    if (questions.length === 0) {
      questions = await executeQuery(`
        SELECT id, question_text, options, difficulty_level 
        FROM questions 
        WHERE subject_id = ?
        AND id NOT IN (
          SELECT question_id FROM assessment_responses WHERE assessment_id = ?
        )
        ORDER BY ABS(difficulty_level - ?) ASC, RAND()
        LIMIT 1
      `, [subjectId, assessmentId, currentDifficulty]);
    }
  } else {
    // If no assessmentId (first question), find the closest question to the starting difficulty
    // For high RIT scores, we want to start with questions at or near that level
    questions = await executeQuery(`
      SELECT id, question_text, options, difficulty_level 
      FROM questions 
      WHERE subject_id = ? 
      AND (grade_id = ? OR grade_id IS NULL)
      ORDER BY ABS(difficulty_level - ?) ASC, RAND()
      LIMIT 1
    `, [subjectId, studentGradeId, currentDifficulty]);

    // If no questions found, fall back to any available question
    if (questions.length === 0) {
      questions = await executeQuery(`
        SELECT id, question_text, options, difficulty_level 
        FROM questions 
        WHERE subject_id = ?
        AND (grade_id = ? OR grade_id IS NULL)
        ORDER BY difficulty_level DESC
        LIMIT 1
      `, [subjectId, studentGradeId]);
    }
  }

  return questions.length > 0 ? questions[0] : null;
};

// Start new assessment
export const startAssessment = async (req, res) => {
  try {
    const { subjectId, period } = req.body;
    const studentId = req.user.id;
    const currentYear = new Date().getFullYear();

    // Validation
    if (!subjectId || !period) {
      return res.status(400).json({
        error: 'Subject ID and period are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    if (!['Fall', 'Winter', 'Spring'].includes(period)) {
      return res.status(400).json({
        error: 'Period must be Fall, Winter, or Spring',
        code: 'INVALID_PERIOD'
      });
    }

    // Note: Removed validation to allow multiple assessments for demo purposes

    // Get student's grade
    const studentInfo = await executeQuery(
      'SELECT grade_id FROM users WHERE id = ?',
      [studentId]
    );

    if (studentInfo.length === 0) {
      return res.status(404).json({
        error: 'Student not found',
        code: 'STUDENT_NOT_FOUND'
      });
    }

    const studentGradeId = studentInfo[0].grade_id;

    // Get assessment configuration for this grade-subject combination
    const configResult = await executeQuery(`
      SELECT time_limit_minutes, question_count 
      FROM assessment_configurations 
      WHERE grade_id = ? AND subject_id = ? AND is_active = 1
    `, [studentGradeId, subjectId]);

    if (configResult.length === 0) {
      return res.status(404).json({
        error: 'Assessment configuration not found for this grade-subject combination',
        code: 'CONFIGURATION_NOT_FOUND'
      });
    }

    const config = configResult[0];
    const timeLimitMinutes = config.time_limit_minutes;
    const questionCount = config.question_count;

    // Check for previous RIT score to determine starting difficulty (within current year)
    const previousAssessments = await executeQuery(
      'SELECT rit_score FROM assessments WHERE student_id = ? AND subject_id = ? AND year = ? AND rit_score IS NOT NULL ORDER BY date_taken DESC LIMIT 1',
      [studentId, subjectId, currentYear]
    );

    let startingDifficulty = 225; // Default starting difficulty
    
    if (previousAssessments.length > 0) {
      const previousRIT = previousAssessments[0].rit_score;
      startingDifficulty = previousRIT; // Use previous RIT as starting point
      console.log(`Using previous RIT score ${previousRIT} as starting difficulty for student ${studentId}, subject ${subjectId}`);
    } else {
      console.log(`No previous RIT score found, using default difficulty ${startingDifficulty} for student ${studentId}, subject ${subjectId}`);
    }

    // Get first question based on adaptive starting difficulty
    console.log(`Finding first question with starting difficulty: ${startingDifficulty}`);
    const firstQuestion = await findClosestQuestion(startingDifficulty, null, subjectId, null, studentGradeId);
    console.log(`First question found with difficulty: ${firstQuestion?.difficulty_level}`);

    if (!firstQuestion) {
      return res.status(404).json({
        error: 'No questions available for this subject',
        code: 'NO_QUESTIONS_AVAILABLE'
      });
    }
    
    // Create assessment record with current year and configuration
    const result = await executeQuery(
      'INSERT INTO assessments (student_id, subject_id, grade_id, assessment_period, year, total_questions, time_limit_minutes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [studentId, subjectId, studentGradeId, period, currentYear, questionCount, timeLimitMinutes]
    );

    // Initialize session with MAP adaptive tracking
    const sessionId = `${studentId}_${subjectId}_${period}`;
    activeSessions.set(sessionId, {
      assessmentId: result.insertId,
      studentId,
      subjectId,
      period,
      currentDifficulty: firstQuestion.difficulty_level,
      questionCount: 0,
      maxQuestions: questionCount, // Use dynamic question count
      timeLimitMinutes: timeLimitMinutes, // Store time limit
      currentRIT: 0, // Current RIT based on last answered question
      highestCorrectDifficulty: 0, // Track final RIT score
      usedQuestions: new Set(), // Track used questions
      startTime: Date.now(),
      startingDifficulty: startingDifficulty // Store the starting difficulty for reference
    });

    res.json({
      assessmentId: result.insertId,
      timeLimitMinutes: timeLimitMinutes,
      question: {
        id: firstQuestion.id,
        text: firstQuestion.question_text,
        options: (() => {
          if (typeof firstQuestion.options === 'string') {
            try {
              return JSON.parse(firstQuestion.options);
            } catch (parseError) {
              console.error('Error parsing options JSON:', parseError);
              return [];
            }
          }
          return firstQuestion.options;
        })(),
        questionNumber: 1,
        totalQuestions: questionCount
      }
    });
  } catch (error) {
    console.error('Error starting assessment:', error);
    res.status(500).json({
      error: 'Failed to start assessment',
      code: 'START_ASSESSMENT_ERROR'
    });
  }
};

// Submit answer and get next question
export const submitAnswer = async (req, res) => {
  try {
    const { questionId, answerIndex, assessmentId } = req.body;
    const studentId = req.user.id;

    // Get student's grade
    const studentInfo = await executeQuery(
      'SELECT grade_id FROM users WHERE id = ?',
      [studentId]
    );

    if (studentInfo.length === 0) {
      return res.status(404).json({
        error: 'Student not found',
        code: 'STUDENT_NOT_FOUND'
      });
    }

    const studentGradeId = studentInfo[0].grade_id;

    // Find active session
    const sessionId = Object.keys(Object.fromEntries(activeSessions)).find(key => {
      const session = activeSessions.get(key);
      return session.studentId === studentId && session.assessmentId === assessmentId;
    });

    if (!sessionId) {
      return res.status(404).json({
        error: 'Assessment session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }

    const session = activeSessions.get(sessionId);

    // Get question details
    const questions = await executeQuery(
      'SELECT correct_option_index, difficulty_level FROM questions WHERE id = ?',
      [questionId]
    );

    if (questions.length === 0) {
      return res.status(404).json({
        error: 'Question not found',
        code: 'QUESTION_NOT_FOUND'
      });
    }

    const question = questions[0];
    const isCorrect = answerIndex === question.correct_option_index;

    // Save response with difficulty tracking
    await executeQuery(
      'INSERT INTO assessment_responses (assessment_id, question_id, question_order, selected_option_index, is_correct, question_difficulty) VALUES (?, ?, ?, ?, ?, ?)',
      [assessmentId, questionId, session.questionCount + 1, answerIndex, isCorrect, question.difficulty_level]
    );

    // Update session with MAP adaptive logic
    session.questionCount++;
    session.usedQuestions.add(questionId);

    // Update current RIT based on the question that was just answered
    if (isCorrect) {
      // If answered correctly, current RIT becomes the difficulty of this question
      session.currentRIT = question.difficulty_level;
    }
    // If answered incorrectly, current RIT stays the same
    
    // Also update highest correct difficulty for final RIT score calculation
    if (isCorrect && question.difficulty_level > session.highestCorrectDifficulty) {
      session.highestCorrectDifficulty = question.difficulty_level;
    }

    // Check time limit
    const elapsedMinutes = Math.round((Date.now() - session.startTime) / 60000);
    if (elapsedMinutes >= session.timeLimitMinutes) {
      const duration = elapsedMinutes;

      // Calculate average difficulty across all attempted questions in this assessment
      const avgResult = await executeQuery(
        'SELECT AVG(question_difficulty) as avg_difficulty FROM assessment_responses WHERE assessment_id = ?',
        [assessmentId]
      );
      const ritScore = Math.round(avgResult[0].avg_difficulty || question.difficulty_level);

      // Calculate correct answers count
      const correctAnswersResult = await executeQuery(
        'SELECT COUNT(*) as correct_count FROM assessment_responses WHERE assessment_id = ? AND is_correct = 1',
        [assessmentId]
      );
      const correctAnswers = correctAnswersResult[0].correct_count;

      // Update assessment with RIT score
      await executeQuery(
        'UPDATE assessments SET rit_score = ?, correct_answers = ?, duration_minutes = ? WHERE id = ?',
        [ritScore, correctAnswers, duration, assessmentId]
      );

      // Clean up session
      activeSessions.delete(sessionId);

      return res.json({
        completed: true,
        isCorrect,
        assessmentId: assessmentId,
        message: `Assessment completed! Time limit reached. Your RIT score is ${ritScore}`
      });
    }

    // Check if assessment is complete (dynamic question count)
    if (session.questionCount >= session.maxQuestions) {
      const duration = Math.round((Date.now() - session.startTime) / 60000); // minutes

      // Calculate average difficulty across all attempted questions in this assessment
      const avgResult = await executeQuery(
        'SELECT AVG(question_difficulty) as avg_difficulty FROM assessment_responses WHERE assessment_id = ?',
        [assessmentId]
      );
      const ritScore = Math.round(avgResult[0].avg_difficulty || question.difficulty_level);

      // Calculate correct answers count
      const correctAnswersResult = await executeQuery(
        'SELECT COUNT(*) as correct_count FROM assessment_responses WHERE assessment_id = ? AND is_correct = 1',
        [assessmentId]
      );
      const correctAnswers = correctAnswersResult[0].correct_count;

      // Update assessment with RIT score
      await executeQuery(
        'UPDATE assessments SET rit_score = ?, correct_answers = ?, duration_minutes = ? WHERE id = ?',
        [ritScore, correctAnswers, duration, assessmentId]
      );

      // Clean up session
      activeSessions.delete(sessionId);

      return res.json({
        completed: true,
        isCorrect,
        assessmentId: assessmentId,
        message: `Assessment completed! Your RIT score is ${ritScore}`
      });
    }

    // Find next question using adaptive algorithm based on current answer
    const nextQuestion = await findClosestQuestion(question.difficulty_level, isCorrect, session.subjectId, assessmentId, studentGradeId, session.usedQuestions);

    if (!nextQuestion) {
      // No more questions available, complete the assessment
      const duration = Math.round((Date.now() - session.startTime) / 60000);

      // Calculate average difficulty across all attempted questions in this assessment
      const avgResult = await executeQuery(
        'SELECT AVG(question_difficulty) as avg_difficulty FROM assessment_responses WHERE assessment_id = ?',
        [assessmentId]
      );
      const ritScore = Math.round(avgResult[0].avg_difficulty || question.difficulty_level);

      // Calculate correct answers count
      const correctAnswersResult = await executeQuery(
        'SELECT COUNT(*) as correct_count FROM assessment_responses WHERE assessment_id = ? AND is_correct = 1',
        [assessmentId]
      );
      const correctAnswers = correctAnswersResult[0].correct_count;

      // Update assessment with RIT score
      await executeQuery(
        'UPDATE assessments SET rit_score = ?, correct_answers = ?, duration_minutes = ? WHERE id = ?',
        [ritScore, correctAnswers, duration, assessmentId]
      );

      // Clean up session
      activeSessions.delete(sessionId);

      return res.json({
        completed: true,
        isCorrect,
        assessmentId: assessmentId,
        message: `Assessment completed! No more questions available. Your RIT score is ${ritScore}`
      });
    }

    res.json({
      completed: false,
      isCorrect,
      currentRIT: session.currentRIT,
      question: {
        id: nextQuestion.id,
        text: nextQuestion.question_text,
        options: (() => {
          if (typeof nextQuestion.options === 'string') {
            try {
              return JSON.parse(nextQuestion.options);
            } catch (parseError) {
              console.error('Error parsing options JSON:', parseError);
              return [];
            }
          }
          return nextQuestion.options;
        })(),
        questionNumber: session.questionCount + 1,
        totalQuestions: session.maxQuestions
      }
    });
  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({
      error: 'Failed to submit answer',
      code: 'SUBMIT_ANSWER_ERROR'
    });
  }
};

// Get assessment results by subject
export const getResultsBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const studentId = req.user.id;

    const results = await executeQuery(`
      SELECT 
        a.id,
        a.assessment_period,
        a.rit_score,
        a.correct_answers,
        a.total_questions,
        a.date_taken,
        a.duration_minutes,
        a.year,
        s.name as subject_name
      FROM assessments a
      JOIN subjects s ON a.subject_id = s.id
      WHERE a.student_id = ? AND a.subject_id = ? AND a.rit_score IS NOT NULL
      ORDER BY a.year DESC,
        CASE a.assessment_period 
          WHEN 'Fall' THEN 1 
          WHEN 'Winter' THEN 2 
          WHEN 'Spring' THEN 3 
        END,
        a.date_taken DESC
    `, [studentId, subjectId]);

    res.json(results);
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({
      error: 'Failed to fetch results',
      code: 'FETCH_RESULTS_ERROR'
    });
  }
};

// Get detailed assessment results
export const getAssessmentResults = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const studentId = req.user.id;

    // Get current assessment details
    const currentAssessment = await executeQuery(`
      SELECT 
        a.id,
        a.student_id,
        a.subject_id,
        a.assessment_period,
        a.rit_score,
        a.correct_answers,
        a.total_questions,
        a.date_taken,
        a.duration_minutes,
        a.year,
        s.name as subject_name
      FROM assessments a
      JOIN subjects s ON a.subject_id = s.id
      WHERE a.id = ? AND a.student_id = ? AND a.rit_score IS NOT NULL
    `, [assessmentId, studentId]);

    if (currentAssessment.length === 0) {
      return res.status(404).json({
        error: 'Assessment not found',
        code: 'ASSESSMENT_NOT_FOUND'
      });
    }

    const assessment = currentAssessment[0];

    // Get previous RIT score (most recent completed assessment for same subject and student)
    const previousAssessment = await executeQuery(`
      SELECT rit_score, date_taken, assessment_period, year
      FROM assessments 
      WHERE student_id = ? 
      AND subject_id = ? 
      AND id != ? 
      AND rit_score IS NOT NULL
      ORDER BY date_taken DESC 
      LIMIT 1
    `, [studentId, assessment.subject_id, assessmentId]);

    // Get detailed response data
    const responses = await executeQuery(`
      SELECT 
        ar.question_order,
        ar.is_correct,
        ar.question_difficulty,
        q.question_text,
        q.options,
        ar.selected_option_index,
        q.correct_option_index
      FROM assessment_responses ar
      JOIN questions q ON ar.question_id = q.id
      WHERE ar.assessment_id = ?
      ORDER BY ar.question_order
    `, [assessmentId]);

    // Calculate statistics
    const totalQuestions = assessment.total_questions;
    const correctAnswers = assessment.correct_answers;
    const incorrectAnswers = totalQuestions - correctAnswers;
    const previousRIT = previousAssessment.length > 0 ? previousAssessment[0].rit_score : null;
    const currentRIT = assessment.rit_score;

    // Format responses for frontend
    const formattedResponses = responses.map(response => ({
      questionNumber: response.question_order,
      isCorrect: response.is_correct,
      difficulty: response.question_difficulty,
      questionText: response.question_text,
      options: (() => {
        if (typeof response.options === 'string') {
          try {
            return JSON.parse(response.options);
          } catch (parseError) {
            return [];
          }
        }
        return response.options;
      })(),
      selectedAnswer: response.selected_option_index,
      correctAnswer: response.correct_option_index
    }));

    // Create difficulty progression data for the graph
    const difficultyProgression = responses.map(response => ({
      questionNumber: response.question_order,
      difficulty: response.question_difficulty,
      isCorrect: response.is_correct
    }));

    res.json({
      assessment: {
        id: assessment.id,
        subjectName: assessment.subject_name,
        period: assessment.assessment_period,
        year: assessment.year,
        dateTaken: assessment.date_taken,
        duration: assessment.duration_minutes
      },
      statistics: {
        totalQuestions,
        correctAnswers,
        incorrectAnswers,
        previousRIT,
        currentRIT,
        accuracy: Math.round((correctAnswers / totalQuestions) * 100)
      },
      responses: formattedResponses,
      difficultyProgression: difficultyProgression,
      previousAssessment: previousAssessment.length > 0 ? {
        ritScore: previousAssessment[0].rit_score,
        dateTaken: previousAssessment[0].date_taken,
        period: previousAssessment[0].assessment_period,
        year: previousAssessment[0].year
      } : null
    });

  } catch (error) {
    console.error('Error fetching assessment results:', error);
    res.status(500).json({
      error: 'Failed to fetch assessment results',
      code: 'FETCH_RESULTS_ERROR'
    });
  }
};

// Get latest assessment details for a subject
export const getLatestAssessmentDetails = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const studentId = req.user.id;

    // Get the latest completed assessment for this subject
    const latestAssessment = await executeQuery(`
      SELECT id, assessment_period, rit_score, correct_answers, total_questions,
             date_taken, duration_minutes, year
      FROM assessments 
      WHERE student_id = ? AND subject_id = ? AND rit_score IS NOT NULL
      ORDER BY id DESC 
      LIMIT 1
    `, [studentId, subjectId]);

    if (latestAssessment.length === 0) {
      return res.status(404).json({
        error: 'No completed assessments found for this subject',
        code: 'NO_ASSESSMENTS_FOUND'
      });
    }

    // Get the assessment ID and call the detailed results function
    const assessmentId = latestAssessment[0].id;
    console.log('Latest assessment found:', {
      assessmentId,
      subjectId,
      studentId,
      latestAssessment: latestAssessment[0]
    });
    
    // Get detailed assessment results using existing logic
    const currentAssessment = await executeQuery(`
      SELECT 
        a.id,
        a.student_id,
        a.subject_id,
        a.assessment_period,
        a.rit_score,
        a.correct_answers,
        a.total_questions,
        a.date_taken,
        a.duration_minutes,
        a.year,
        s.name as subject_name
      FROM assessments a
      JOIN subjects s ON a.subject_id = s.id
      WHERE a.id = ? AND a.student_id = ? AND a.rit_score IS NOT NULL
    `, [assessmentId, studentId]);

    const assessment = currentAssessment[0];

    // Get previous RIT score
    const previousAssessment = await executeQuery(`
      SELECT rit_score, date_taken, assessment_period, year
      FROM assessments 
      WHERE student_id = ? 
      AND subject_id = ? 
      AND id != ? 
      AND rit_score IS NOT NULL
      ORDER BY date_taken DESC 
      LIMIT 1
    `, [studentId, assessment.subject_id, assessmentId]);

    // Get detailed response data
    const responses = await executeQuery(`
      SELECT 
        ar.question_order,
        ar.is_correct,
        ar.question_difficulty,
        q.question_text,
        q.options,
        ar.selected_option_index,
        q.correct_option_index
      FROM assessment_responses ar
      JOIN questions q ON ar.question_id = q.id
      WHERE ar.assessment_id = ?
      ORDER BY ar.question_order
    `, [assessmentId]);

    // Calculate statistics
    const totalQuestions = assessment.total_questions;
    const correctAnswers = assessment.correct_answers;
    const incorrectAnswers = totalQuestions - correctAnswers;
    const previousRIT = previousAssessment.length > 0 ? previousAssessment[0].rit_score : null;
    const currentRIT = assessment.rit_score;

    // Format responses for frontend
    const formattedResponses = responses.map(response => ({
      questionNumber: response.question_order,
      isCorrect: response.is_correct,
      difficulty: response.question_difficulty,
      questionText: response.question_text,
      options: (() => {
        if (typeof response.options === 'string') {
          try {
            return JSON.parse(response.options);
          } catch (parseError) {
            return [];
          }
        }
        return response.options;
      })(),
      selectedAnswer: response.selected_option_index,
      correctAnswer: response.correct_option_index
    }));

    // Create difficulty progression data for the graph
    const difficultyProgression = responses.map(response => ({
      questionNumber: response.question_order,
      difficulty: response.question_difficulty,
      isCorrect: response.is_correct
    }));

    res.json({
      assessment: {
        id: assessment.id,
        subjectName: assessment.subject_name,
        period: assessment.assessment_period,
        year: assessment.year,
        dateTaken: assessment.date_taken,
        duration: assessment.duration_minutes
      },
      statistics: {
        totalQuestions,
        correctAnswers,
        incorrectAnswers,
        previousRIT,
        currentRIT,
        accuracy: Math.round((correctAnswers / totalQuestions) * 100)
      },
      responses: formattedResponses,
      difficultyProgression: difficultyProgression,
      previousAssessment: previousAssessment.length > 0 ? {
        ritScore: previousAssessment[0].rit_score,
        dateTaken: previousAssessment[0].date_taken,
        period: previousAssessment[0].assessment_period,
        year: previousAssessment[0].year
      } : null
    });

  } catch (error) {
    console.error('Error fetching latest assessment details:', error);
    res.status(500).json({
      error: 'Failed to fetch latest assessment details',
      code: 'FETCH_LATEST_ASSESSMENT_ERROR'
    });
  }
};

// Get growth over time data for a specific subject
export const getGrowthOverTime = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const studentId = req.user.id;

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
  
      // Get student's RIT scores over time for this subject
      // Use window function to get only the latest assessment for each year+season combination
      const studentScores = await executeQuery(`
        SELECT 
          assessment_period,
          year,
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

    // Get class average scores for the same subject and periods
    const classAverages = await executeQuery(`
      SELECT 
        a.assessment_period,
        a.year,
        AVG(a.rit_score) as average_rit_score,
        COUNT(DISTINCT a.student_id) as student_count
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

    // Get subject name
    const subjectData = await executeQuery(
      'SELECT name FROM subjects WHERE id = ?',
      [subjectId]
    );

    const subjectName = subjectData.length > 0 ? subjectData[0].name : 'Unknown Subject';

    const formattedStudentScores = studentScores.map(score => ({
      period: `${score.assessment_period} ${score.year}`,
      year: score.year,
      assessmentPeriod: score.assessment_period,
      ritScore: score.rit_score,
      dateTaken: score.date_taken
    }));

    const formattedClassAverages = classAverages.map(avg => ({
      period: `${avg.assessment_period} ${avg.year}`,
      year: avg.year,
      assessmentPeriod: avg.assessment_period,
      averageRITScore: Math.round(avg.average_rit_score),
      studentCount: avg.student_count
    }));

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
      studentScores: formattedStudentScores,
      classAverages: formattedClassAverages,
      periodDistributions: formattedDistributions,
      totalAssessments: studentScores.length
    });

  } catch (error) {
    console.error('Error fetching growth over time data:', error);
    res.status(500).json({
      error: 'Failed to fetch growth over time data',
      code: 'FETCH_GROWTH_DATA_ERROR'
    });
  }
};

// Get available subjects for student based on their grade
export const getAvailableSubjects = async (req, res) => {
  try {
    const studentId = req.user.id;

    // Get student's grade
    const studentGrade = await executeQuery(
      'SELECT grade_id FROM users WHERE id = ?',
      [studentId]
    );

    if (studentGrade.length === 0) {
      return res.status(404).json({
        error: 'Student not found',
        code: 'STUDENT_NOT_FOUND'
      });
    }

    const gradeId = studentGrade[0].grade_id;

    // Get subjects that have assessment configurations for this grade
    const availableSubjects = await executeQuery(`
      SELECT DISTINCT 
        s.id,
        s.name,
        s.description
      FROM subjects s
      JOIN assessment_configurations ac ON s.id = ac.subject_id
      WHERE ac.grade_id = ?
      ORDER BY s.name
    `, [gradeId]);

    res.json(availableSubjects);
  } catch (error) {
    console.error('Error fetching available subjects:', error);
    res.status(500).json({
      error: 'Failed to fetch available subjects',
      code: 'FETCH_AVAILABLE_SUBJECTS_ERROR'
    });
  }
};

// Get all assessment results for dashboard
export const getDashboardData = async (req, res) => {
  try {
    const studentId = req.user.id;

    const results = await executeQuery(`
      SELECT 
        a.id,
        a.assessment_period,
        a.rit_score,
        a.correct_answers,
        a.total_questions,
        a.date_taken,
        a.year,
        s.id as subject_id,
        s.name as subject_name
      FROM assessments a
      JOIN subjects s ON a.subject_id = s.id
      WHERE a.student_id = ? AND a.rit_score IS NOT NULL
      ORDER BY s.name, a.year DESC,
        CASE a.assessment_period 
          WHEN 'Fall' THEN 1 
          WHEN 'Winter' THEN 2 
          WHEN 'Spring' THEN 3 
        END
    `, [studentId]);

    // Group by subject
    const groupedResults = results.reduce((acc, result) => {
      if (!acc[result.subject_name]) {
        acc[result.subject_name] = {
          subjectId: result.subject_id,
          subjectName: result.subject_name,
          assessments: []
        };
      }
      acc[result.subject_name].assessments.push(result);
      return acc;
    }, {});

    res.json(Object.values(groupedResults));
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard data',
      code: 'FETCH_DASHBOARD_ERROR'
    });
  }
};

// Get competency scores for a specific assessment
export const getCompetencyScores = async (req, res) => {
  try {
    const studentId = req.user.id;
    const assessmentId = parseInt(req.params.assessmentId);

    // Verify the assessment belongs to the student
    const assessmentCheck = await executeQuery(
      'SELECT id FROM assessments WHERE id = ? AND student_id = ?',
      [assessmentId, studentId]
    );

    if (assessmentCheck.length === 0) {
      return res.status(404).json({
        error: 'Assessment not found',
        code: 'ASSESSMENT_NOT_FOUND'
      });
    }

    // Get competency scores for this assessment
    let competencyScores = await executeQuery(`
      SELECT 
        scs.id,
        scs.competency_id as competencyId,
        c.code as competencyCode,
        c.name as competencyName,
        scs.questions_attempted as questionsAttempted,
        scs.questions_correct as questionsCorrect,
        scs.raw_score as rawScore,
        scs.weighted_score as weightedScore,
        scs.final_score as finalScore,
        scs.feedback_type as feedbackType,
        scs.feedback_text as feedbackText,
        scs.date_calculated as dateCalculated
      FROM student_competency_scores scs
      JOIN competencies c ON scs.competency_id = c.id
      WHERE scs.assessment_id = ?
      ORDER BY scs.final_score DESC
    `, [assessmentId]);

    // If no data in student_competency_scores, try assessment_competency_breakdown
    if (competencyScores.length === 0) {
      console.log(`No competency scores found in student_competency_scores for assessment ${assessmentId}, checking assessment_competency_breakdown...`);
      
      const breakdownScores = await executeQuery(`
        SELECT 
          acb.id,
          acb.competency_id as competencyId,
          c.code as competencyCode,
          c.name as competencyName,
          acb.questions_attempted as questionsAttempted,
          acb.questions_correct as questionsCorrect,
          CASE WHEN acb.questions_attempted > 0 THEN (acb.questions_correct / acb.questions_attempted) * 100 ELSE 0 END as rawScore,
          CASE WHEN acb.total_weight > 0 THEN (acb.weighted_correct / acb.total_weight) * 100 ELSE 0 END as weightedScore,
          acb.competency_score as finalScore,
          CASE 
            WHEN acb.competency_score >= c.strong_threshold THEN 'strong'
            WHEN acb.competency_score >= c.neutral_threshold THEN 'neutral'
            ELSE 'growth'
          END as feedbackType,
          CASE 
            WHEN acb.competency_score >= c.strong_threshold THEN c.strong_description
            WHEN acb.competency_score >= c.neutral_threshold THEN c.neutral_description
            ELSE c.growth_description
          END as feedbackText,
          acb.created_at as dateCalculated
        FROM assessment_competency_breakdown acb
        JOIN competencies c ON acb.competency_id = c.id
        WHERE acb.assessment_id = ?
        ORDER BY acb.competency_score DESC
      `, [assessmentId]);

      console.log(`Found ${breakdownScores.length} competency scores in assessment_competency_breakdown for assessment ${assessmentId}`);
      competencyScores = breakdownScores;
    }

    res.json(competencyScores);
  } catch (error) {
    console.error('Error fetching competency scores:', error);
    res.status(500).json({
      error: 'Failed to fetch competency scores',
      code: 'FETCH_COMPETENCY_SCORES_ERROR'
    });
  }
};

// Get competency growth data for a subject
export const getCompetencyGrowth = async (req, res) => {
  try {
    const studentId = req.user.id;
    const subjectId = parseInt(req.params.subjectId);

    // Get all competency scores for this student and subject
    const competencyScores = await executeQuery(`
      SELECT 
        scs.competency_id as competencyId,
        c.code as competencyCode,
        c.name as competencyName,
        a.id as assessmentId,
        a.assessment_period as assessmentPeriod,
        a.year,
        a.date_taken as dateTaken,
        scs.final_score as finalScore,
        scs.feedback_type as feedbackType
      FROM student_competency_scores scs
      JOIN competencies c ON scs.competency_id = c.id
      JOIN assessments a ON scs.assessment_id = a.id
      WHERE scs.student_id = ? AND scs.subject_id = ?
      ORDER BY c.name, a.year, 
        CASE a.assessment_period 
          WHEN 'Fall' THEN 1 
          WHEN 'Winter' THEN 2 
          WHEN 'Spring' THEN 3 
        END
    `, [studentId, subjectId]);

    // Group by competency and calculate growth trends
    const competencyGrowth = [];
    const competencyGroups = {};

    // Group scores by competency
    competencyScores.forEach(score => {
      if (!competencyGroups[score.competencyId]) {
        competencyGroups[score.competencyId] = {
          competencyId: score.competencyId,
          competencyCode: score.competencyCode,
          competencyName: score.competencyName,
          scores: []
        };
      }
      competencyGroups[score.competencyId].scores.push({
        assessmentId: score.assessmentId,
        assessmentPeriod: score.assessmentPeriod,
        year: score.year,
        dateTaken: score.dateTaken,
        finalScore: score.finalScore,
        feedbackType: score.feedbackType
      });
    });

    // Calculate growth trends and average scores
    Object.values(competencyGroups).forEach(competency => {
      const scores = competency.scores;
      const averageScore = scores.reduce((sum, s) => sum + s.finalScore, 0) / scores.length;
      
      // Determine growth trend
      let growthTrend = 'stable';
      if (scores.length >= 2) {
        const firstScore = scores[0].finalScore;
        const lastScore = scores[scores.length - 1].finalScore;
        const difference = lastScore - firstScore;
        
        if (difference > 5) {
          growthTrend = 'improving';
        } else if (difference < -5) {
          growthTrend = 'declining';
        }
      }

      // Generate overall feedback
      let overallFeedback = '';
      if (averageScore >= 80) {
        overallFeedback = `Excellent performance in ${competency.competencyName}. You consistently demonstrate strong mastery of this skill area.`;
      } else if (averageScore >= 60) {
        overallFeedback = `Good performance in ${competency.competencyName}. You show solid understanding with room for continued growth.`;
      } else {
        overallFeedback = `Focus on improving ${competency.competencyName}. This area offers significant opportunities for development.`;
      }

      competencyGrowth.push({
        ...competency,
        averageScore: Math.round(averageScore * 10) / 10,
        growthTrend,
        overallFeedback
      });
    });

    res.json(competencyGrowth);
  } catch (error) {
    console.error('Error fetching competency growth:', error);
    res.status(500).json({
      error: 'Failed to fetch competency growth data',
      code: 'FETCH_COMPETENCY_GROWTH_ERROR'
    });
  }
};
