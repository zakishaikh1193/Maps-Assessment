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

// Find closest available question to target difficulty
const findClosestQuestion = async (targetDifficulty, subjectId, assessmentId, usedQuestions = null) => {
  let questions;
  
  if (assessmentId && usedQuestions) {
    // If assessmentId exists and we have usedQuestions, exclude both database records and in-memory used questions
    const usedQuestionsArray = Array.from(usedQuestions);
    const placeholders = usedQuestionsArray.map(() => '?').join(',');
    
    questions = await executeQuery(`
      SELECT id, question_text, options, difficulty_level 
      FROM questions 
      WHERE subject_id = ? 
      AND difficulty_level BETWEEN ? AND ?
      AND id NOT IN (
        SELECT question_id FROM assessment_responses WHERE assessment_id = ?
      )
      AND id NOT IN (${placeholders || 'NULL'})
      ORDER BY ABS(difficulty_level - ?) ASC, RAND()
      LIMIT 1
    `, [
      subjectId,
      targetDifficulty - 10,
      targetDifficulty + 10,
      assessmentId,
      ...usedQuestionsArray,
      targetDifficulty
    ]);

    // If no questions in range, expand search
    if (questions.length === 0) {
      questions = await executeQuery(`
        SELECT id, question_text, options, difficulty_level 
        FROM questions 
        WHERE subject_id = ?
        AND id NOT IN (
          SELECT question_id FROM assessment_responses WHERE assessment_id = ?
        )
        AND id NOT IN (${placeholders || 'NULL'})
        ORDER BY ABS(difficulty_level - ?) ASC, RAND()
        LIMIT 1
      `, [subjectId, assessmentId, ...usedQuestionsArray, targetDifficulty]);
    }
  } else if (assessmentId) {
    // If only assessmentId exists, exclude already used questions from database
    questions = await executeQuery(`
      SELECT id, question_text, options, difficulty_level 
      FROM questions 
      WHERE subject_id = ? 
      AND difficulty_level BETWEEN ? AND ?
      AND id NOT IN (
        SELECT question_id FROM assessment_responses WHERE assessment_id = ?
      )
      ORDER BY ABS(difficulty_level - ?) ASC, RAND()
      LIMIT 1
    `, [
      subjectId,
      targetDifficulty - 10,
      targetDifficulty + 10,
      assessmentId,
      targetDifficulty
    ]);

    // If no questions in range, expand search
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
      `, [subjectId, assessmentId, targetDifficulty]);
    }
  } else {
    // If no assessmentId (first question), just get any question
    questions = await executeQuery(`
      SELECT id, question_text, options, difficulty_level 
      FROM questions 
      WHERE subject_id = ? 
      AND difficulty_level BETWEEN ? AND ?
      ORDER BY ABS(difficulty_level - ?) ASC, RAND()
      LIMIT 1
    `, [
      subjectId,
      targetDifficulty - 10,
      targetDifficulty + 10,
      targetDifficulty
    ]);

    // If no questions in range, expand search
    if (questions.length === 0) {
      questions = await executeQuery(`
        SELECT id, question_text, options, difficulty_level 
        FROM questions 
        WHERE subject_id = ?
        ORDER BY ABS(difficulty_level - ?) ASC, RAND()
        LIMIT 1
      `, [subjectId, targetDifficulty]);
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
    const firstQuestion = await findClosestQuestion(startingDifficulty, subjectId, null);

    if (!firstQuestion) {
      return res.status(404).json({
        error: 'No questions available for this subject',
        code: 'NO_QUESTIONS_AVAILABLE'
      });
    }
    
    // Create assessment record with current year
    const result = await executeQuery(
      'INSERT INTO assessments (student_id, subject_id, assessment_period, year) VALUES (?, ?, ?, ?)',
      [studentId, subjectId, period, currentYear]
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
      currentRIT: 0, // Current RIT based on last answered question
      highestCorrectDifficulty: 0, // Track final RIT score
      usedQuestions: new Set(), // Track used questions
      startTime: Date.now(),
      startingDifficulty: startingDifficulty // Store the starting difficulty for reference
    });

    res.json({
      assessmentId: result.insertId,
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
        totalQuestions: 10
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

    // Check if assessment is complete (10 questions)
    if (session.questionCount >= 10) {
      const ritScore = session.highestCorrectDifficulty;
      const duration = Math.round((Date.now() - session.startTime) / 60000); // minutes

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
        assessmentId: assessmentId,
        message: `Assessment completed! Your RIT score is ${ritScore}`
      });
    }

    // MAP Adaptive Algorithm: Get next question difficulty
    const nextDifficulty = getNextQuestionDifficulty(session.currentDifficulty, isCorrect);
    session.currentDifficulty = nextDifficulty;

    // Find next question using adaptive algorithm
    const nextQuestion = await findClosestQuestion(nextDifficulty, session.subjectId, assessmentId, session.usedQuestions);

    if (!nextQuestion) {
      return res.status(404).json({
        error: 'No more questions available',
        code: 'NO_MORE_QUESTIONS'
      });
    }

    res.json({
      completed: false,
      isCorrect,
      currentRIT: session.currentRIT,
      nextDifficulty: nextDifficulty,
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
        totalQuestions: 10
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

// Get growth over time data for a specific subject
export const getGrowthOverTime = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const studentId = req.user.id;

    // Get student's RIT scores over time for this subject
    const studentScores = await executeQuery(`
      SELECT 
        assessment_period,
        year,
        rit_score,
        date_taken
      FROM assessments 
      WHERE student_id = ? 
      AND subject_id = ? 
      AND rit_score IS NOT NULL
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
        assessment_period,
        year,
        AVG(rit_score) as average_rit_score,
        COUNT(*) as student_count
      FROM assessments 
      WHERE subject_id = ? 
      AND rit_score IS NOT NULL
      GROUP BY assessment_period, year
      ORDER BY year ASC, 
        CASE assessment_period 
          WHEN 'Fall' THEN 1 
          WHEN 'Winter' THEN 2 
          WHEN 'Spring' THEN 3 
        END ASC
    `, [subjectId]);

    // Get subject name
    const subjectData = await executeQuery(
      'SELECT name FROM subjects WHERE id = ?',
      [subjectId]
    );

    const subjectName = subjectData.length > 0 ? subjectData[0].name : 'Unknown Subject';

    // Format the data for the chart
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
        assessment_period,
        year,
        COUNT(*) as total_students,
        SUM(CASE WHEN rit_score BETWEEN 100 AND 150 THEN 1 ELSE 0 END) as red_count,
        SUM(CASE WHEN rit_score BETWEEN 151 AND 200 THEN 1 ELSE 0 END) as orange_count,
        SUM(CASE WHEN rit_score BETWEEN 201 AND 250 THEN 1 ELSE 0 END) as yellow_count,
        SUM(CASE WHEN rit_score BETWEEN 251 AND 300 THEN 1 ELSE 0 END) as green_count,
        SUM(CASE WHEN rit_score > 300 THEN 1 ELSE 0 END) as blue_count
      FROM assessments 
      WHERE subject_id = ? 
      AND rit_score IS NOT NULL
      GROUP BY assessment_period, year
      ORDER BY year ASC, 
        CASE assessment_period 
          WHEN 'Fall' THEN 1 
          WHEN 'Winter' THEN 2 
          WHEN 'Spring' THEN 3 
        END ASC
    `, [subjectId]);

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
