let extractor = null;

async function loadModel() {
  if (!extractor) {
    const { pipeline, env } = await import("@xenova/transformers");
    
    env.cacheDir = '/tmp/.cache';
    env.allowLocalModels = false;

    extractor = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
  }
  return extractor;
}

async function generateEmbedding(text) {
  const model = await loadModel();

  const output = await model(text, {
    pooling: "mean",
    normalize: true
  });

  return Array.from(output.data);
}

module.exports = { generateEmbedding };
