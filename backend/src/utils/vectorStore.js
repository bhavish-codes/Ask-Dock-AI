const store = new Map();

function addEmbedding(documentId, text, embedding) {
  if (!store.has(documentId)) {
    store.set(documentId, []);
  }

  store.get(documentId).push({
    text,
    embedding
  });
}

function getAllEmbeddings(documentId) {
  if (!documentId) {
    return Array.from(store.values()).flat();
  }

  return store.get(documentId) || [];
}

function resetStore(documentId) {
  if (!documentId) {
    store.clear();
    return;
  }

  store.delete(documentId);
}

function hasDocument(documentId) {
  return store.has(documentId);
}

function setDocumentEmbeddings(documentId, entries) {
  store.set(documentId, entries);
}

module.exports = {
  addEmbedding,
  getAllEmbeddings,
  resetStore,
  hasDocument,
  setDocumentEmbeddings
};
