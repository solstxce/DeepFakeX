const express = require('express');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');
const Analysis = require('../models/Analysis');

const router = express.Router();

// Set up multer for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Flask API URL
const FLASK_API_URL = process.env.FLASK_API_URL || 'http://localhost:3000';

// Route to proxy deepfake detection requests to Flask API
router.post('/detect', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file'
      });
    }

    // Create form data to send to Flask API
    const formData = new FormData();
    const imageBuffer = fs.readFileSync(req.file.path);
    const blob = new Blob([imageBuffer]);
    formData.append('image', blob, req.file.originalname);

    // Send request to Flask API
    const response = await axios.post(FLASK_API_URL, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    if (!response.data || response.data.status === 'error') {
      throw new Error('Failed to analyze image');
    }

    // Create a new analysis record in the database
    const analysis = await Analysis.create({
      user: req.user._id,
      filename: req.file.originalname,
      originalFilePath: req.file.path,
      thumbnailPath: req.file.path, // Using the same image as thumbnail for now
      result: response.data.prediction,
      confidence: response.data.confidence,
      metadata: {
        imageSize: {
          width: 0, // Would need image processing to get actual dimensions
          height: 0
        },
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        additionalDetails: response.data
      }
    });

    // Return results
    res.status(200).json({
      success: true,
      data: {
        ...response.data,
        analysisId: analysis._id
      }
    });
  } catch (error) {
    console.error('Proxy route error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during analysis'
    });
  }
});

module.exports = router; 