import express from 'express';
import { 
  startAssessment,
  submitAnswer,
  getResultsBySubject,
  getDashboardData,
  getAssessmentResults,
  getGrowthOverTime
} from '../controllers/studentController.js';
import { authenticateToken, studentOnly } from '../middleware/auth.js';
import { validateId, validateAssessmentId, validateSubjectId, validateAssessmentStart, validateAnswerSubmission } from '../middleware/validation.js';

const router = express.Router();

// All student routes require student role
router.use(authenticateToken);
router.use(studentOnly);

// Assessment operations
router.post('/assessments/start', validateAssessmentStart, startAssessment);
router.post('/assessments/answer', validateAnswerSubmission, submitAnswer);

// Results
router.get('/assessments/results/:subjectId', validateId, getResultsBySubject);
router.get('/assessments/results/detailed/:assessmentId', validateAssessmentId, getAssessmentResults);
router.get('/assessments/growth/:subjectId', validateSubjectId, getGrowthOverTime);
router.get('/assessments/dashboard', getDashboardData);

export default router;
