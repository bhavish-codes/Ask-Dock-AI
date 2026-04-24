const pdf = require('pdf-parse');

/**
 * Extracts text from a PDF buffer
 * @param {Buffer} buffer - The PDF file buffer
 * @returns {Promise<string>} The extracted text
 */
async function extractTextFromPdf(buffer) {
  try {
    console.log("pdf is of type:", typeof pdf, "and value:", pdf);
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw error;
  }
}

module.exports = { extractTextFromPdf };
