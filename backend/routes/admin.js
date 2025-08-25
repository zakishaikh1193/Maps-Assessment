import express from 'express';
import { 
  getAdminStats,
  createQuestion,
  createBulkQuestions,
  getQuestionsBySubject,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  debugQuestions
} from '../controllers/adminController.js';
import { authenticateToken, adminOnly } from '../middleware/auth.js';
import { validateId, validateSubjectId, validateQuestion, validateBulkQuestions } from '../middleware/validation.js';

const router = express.Router();

// All admin routes require admin role
router.use(authenticateToken);
router.use(adminOnly);

// Stats
router.get('/stats', getAdminStats);

// Debug endpoint
router.get('/debug/questions', debugQuestions);

// Questions
router.post('/questions', validateQuestion, createQuestion);
router.post('/questions/bulk', validateBulkQuestions, createBulkQuestions);
router.get('/questions/:subjectId', validateSubjectId, getQuestionsBySubject);
router.get('/question/:id', validateId, getQuestionById);
router.put('/questions/:id', validateId, validateQuestion, updateQuestion);
router.delete('/questions/:id', validateId, deleteQuestion);

export default router;
