const mongoose = require('mongoose');

const AnalysisSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filename: {
    type: String,
    required: true,
    trim: true
  },
  originalFilePath: {
    type: String,
    required: true
  },
  thumbnailPath: {
    type: String,
    default: ''
  },
  result: {
    type: String,
    enum: ['Real', 'Fake'],
    required: true
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  processingTime: {
    type: Number,
    default: 0
  },
  metadata: {
    imageSize: {
      width: Number,
      height: Number
    },
    fileSize: Number,
    fileType: String,
    additionalDetails: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual property to get the public URL of the original file
AnalysisSchema.virtual('originalFileUrl').get(function() {
  return this.originalFilePath ? `/uploads/${this.originalFilePath.split('/').pop()}` : '';
});

// Virtual property to get the public URL of the thumbnail
AnalysisSchema.virtual('thumbnailUrl').get(function() {
  return this.thumbnailPath ? `/uploads/${this.thumbnailPath.split('/').pop()}` : '';
});

// Set virtuals to be included when converted to JSON
AnalysisSchema.set('toJSON', { virtuals: true });
AnalysisSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Analysis', AnalysisSchema); 