const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Extracts text from a file based on its mimetype/extension
 * @param {Object} file - The multer file object
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromFile(file) {
  const { path, mimetype, originalname } = file;

  try {
    if (mimetype === 'application/pdf' || originalname.endsWith('.pdf')) {
      const dataBuffer = fs.readFileSync(path);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } 
    
    if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      originalname.endsWith('.docx')
    ) {
      const result = await mammoth.extractRawText({ path: path });
      return result.value;
    }
    
    if (mimetype === 'text/plain' || originalname.endsWith('.txt')) {
      return fs.readFileSync(path, 'utf-8');
    }

    throw new Error('Unsupported file type');
  } finally {
    if (fs.existsSync(path)) {
      fs.unlinkSync(path);
    }
  }
}

module.exports = {
  extractTextFromFile
};
