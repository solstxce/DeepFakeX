const express = require('express');
const {
  saveAnalysis,
  getAnalysisHistory,
  getAnalysis,
  deleteAnalysis,
  downloadReport
} = require('../controllers/analysisController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Routes
router.route('/')
  .post(saveAnalysis);

router.route('/history')
  .get(getAnalysisHistory);

router.route('/:id')
  .get(getAnalysis)
  .delete(deleteAnalysis);

router.route('/:id/download')
  .get(downloadReport);

module.exports = router; 