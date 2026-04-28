let extractor = null;

async function loadModel() {
  if (!extractor) {
    try {
      const { pipeline, env } = await import("@xenova/transformers");
      
      env.cacheDir = '/tmp/.cache';
      env.allowLocalModels = false;

      extractor = await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2"
      );
    } catch (error) {
      console.error("Failed to load embedding model:", error.message);
      throw new Error("Embedding model initialization failed. Please check your network connection.");
    }
  }
  return extractor;
}

async function generateEmbedding(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error("Invalid text input for embedding generation");
  }

  try {
    const model = await loadModel();
    const output = await model(text, {
      pooling: "mean",
      normalize: true
    });
    return Array.from(output.data);
  } catch (error) {
    console.error("Embedding generation failed:", error.message);
    throw new Error("Failed to generate embeddings. Please try again.");
  }
}

module.exports = { generateEmbedding };
