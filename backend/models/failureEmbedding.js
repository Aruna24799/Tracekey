const mongoose = require('mongoose');

const FailureEmbeddingSchema = new mongoose.Schema({
  rawError: { type: String, required: true },
  embedding: { type: [Number], required: true }, // placeholder vector
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FailureEmbedding', FailureEmbeddingSchema);
