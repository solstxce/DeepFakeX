const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const Analysis = require('../models/Analysis');

// @desc    Save a new analysis
// @route   POST /api/analysis
// @access  Private
exports.saveAnalysis = async (req, res) => {
  try {
    const { filename, result, confidence, metadata } = req.body;
    const { originalFilePath, thumbnailPath } = req.files || {};

    // Create a new analysis record
    const analysis = await Analysis.create({
      user: req.user._id,
      filename,
      originalFilePath: originalFilePath ? originalFilePath[0].path : '',
      thumbnailPath: thumbnailPath ? thumbnailPath[0].path : '',
      result,
      confidence,
      processingTime: metadata?.processingTime || 0,
      metadata
    });

    res.status(201).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Save analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error saving analysis'
    });
  }
};

// @desc    Get user's analysis history
// @route   GET /api/analysis/history
// @access  Private
exports.getAnalysisHistory = async (req, res) => {
  try {
    const analyses = await Analysis.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('filename result confidence originalFileUrl thumbnailUrl createdAt');

    res.status(200).json({
      success: true,
      count: analyses.length,
      data: analyses
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving analysis history'
    });
  }
};

// @desc    Get a specific analysis
// @route   GET /api/analysis/:id
// @access  Private
exports.getAnalysis = async (req, res) => {
  try {
    const analysis = await Analysis.findById(req.params.id);

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found'
      });
    }

    // Check if user owns the analysis
    if (analysis.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this analysis'
      });
    }

    res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Get analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving analysis'
    });
  }
};

// @desc    Delete an analysis
// @route   DELETE /api/analysis/:id
// @access  Private
exports.deleteAnalysis = async (req, res) => {
  try {
    const analysis = await Analysis.findById(req.params.id);

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found'
      });
    }

    // Check if user owns the analysis
    if (analysis.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this analysis'
      });
    }

    // Delete associated files
    if (analysis.originalFilePath && fs.existsSync(analysis.originalFilePath)) {
      fs.unlinkSync(analysis.originalFilePath);
    }
    if (analysis.thumbnailPath && fs.existsSync(analysis.thumbnailPath)) {
      fs.unlinkSync(analysis.thumbnailPath);
    }

    await analysis.remove();

    res.status(200).json({
      success: true,
      message: 'Analysis deleted successfully'
    });
  } catch (error) {
    console.error('Delete analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting analysis'
    });
  }
};

// @desc    Download analysis report as PDF
// @route   GET /api/analysis/:id/download
// @access  Private
exports.downloadReport = async (req, res) => {
  try {
    const analysis = await Analysis.findById(req.params.id);

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found'
      });
    }

    // Check if user owns the analysis
    if (analysis.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to download this report'
      });
    }

    // Create a PDF document
    const doc = new PDFDocument();

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=deepfake-analysis-${analysis._id}.pdf`);

    // Pipe the PDF to the response
    doc.pipe(res);

    // Add content to the PDF
    doc.fontSize(25).text('DeepFakeX Analysis Report', { align: 'center' });
    doc.moveDown();
    
    // Add image if available
    if (analysis.originalFilePath && fs.existsSync(analysis.originalFilePath)) {
      doc.image(analysis.originalFilePath, {
        fit: [500, 300],
        align: 'center',
      });
      doc.moveDown();
    }

    // Add analysis details
    doc.fontSize(16).text('Analysis Details', { underline: true });
    doc.moveDown(0.5);
    
    doc.fontSize(12);
    doc.text(`Filename: ${analysis.filename}`);
    doc.text(`Result: ${analysis.result}`);
    doc.text(`Confidence: ${(analysis.confidence * 100).toFixed(2)}%`);
    doc.text(`Date: ${analysis.createdAt.toLocaleDateString()}`);
    
    if (analysis.metadata) {
      doc.moveDown();
      doc.fontSize(16).text('Image Metadata', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12);
      
      if (analysis.metadata.imageSize) {
        doc.text(`Dimensions: ${analysis.metadata.imageSize.width}x${analysis.metadata.imageSize.height}`);
      }
      
      if (analysis.metadata.fileSize) {
        doc.text(`File Size: ${(analysis.metadata.fileSize / 1024).toFixed(2)} KB`);
      }
      
      if (analysis.metadata.fileType) {
        doc.text(`File Type: ${analysis.metadata.fileType}`);
      }
    }
    
    doc.moveDown(2);
    doc.fontSize(10).text('This report was generated by DeepFakeX - AI-powered deepfake detection platform', {
      align: 'center',
      color: 'gray'
    });

    // Finalize the PDF
    doc.end();
  } catch (error) {
    console.error('Download report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating report'
    });
  }
}; 