const express = require('express');
const multer = require('multer');
const { extractTextFromFile } = require('../utils/fileParser');
const router = express.Router();

const upload = multer({ dest: 'uploads/' });

// POST /api/documents/upload
router.post('/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const text = await extractTextFromFile(req.file);
    res.json({ text, filename: req.file.originalname });
  } catch (error) {
    console.error('File extraction error:', error);
    res.status(500).json({ error: 'Failed to extract text from file', details: error.message });
  }
});

module.exports = router;
