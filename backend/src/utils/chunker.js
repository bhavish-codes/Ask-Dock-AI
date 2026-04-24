function chunkText(text, chunkSize = 150, overlap = 50) {
  if (!text) return [];

  const words = text.split(/\s+/);
  const chunks = [];
  
  for (let i = 0; i < words.length; i += (chunkSize - overlap)) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    if (chunk.length > 50) {
      chunks.push(chunk);
    }
  }
  
  return chunks;
}

module.exports = { chunkText };
