const crypto = require('crypto');

/**
 * Generates a deterministic pseudo-embedding vector for a given error string.
 * In a production system this would call an LLM embedding model.
 * Here we simulate with a fixed-size array derived from a hash.
 */
function embedError(rawError) {
  const hash = crypto.createHash('sha256').update(rawError).digest('hex');
  // Create a 16‑dimensional vector from hash chunks
  const vector = [];
  for (let i = 0; i < 32; i += 2) {
    const byte = parseInt(hash.substr(i, 2), 16);
    // Normalize to [0,1]
    vector.push(byte / 255);
  }
  return vector;
}

module.exports = { embedError };
