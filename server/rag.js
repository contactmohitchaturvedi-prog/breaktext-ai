import 'dotenv/config';
import OpenAI from 'openai';
import db from './db.js';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || 'sk-placeholder' 
});

function createLocalEmbedding(text) {
  const vector = new Array(128).fill(0);
  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % 128;
    vector[idx] += 1;
  }
  const mag = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
  return vector.map(val => val / mag);
}

export async function createEmbedding(text) {
  try {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-placeholder') {
      console.warn('[RAG] No valid OpenAI key found; using local offline embedding engine.');
      return createLocalEmbedding(text);
    }
    const res = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.replace(/\n/g, ' ')
    });
    return res.data[0].embedding;
  } catch (err) {
    console.warn(`[RAG] OpenAI API error: ${err.message}. Using local offline fallback.`);
    return createLocalEmbedding(text);
  }
}

function cosineSimilarity(vecA, vecB) {
  let dot = 0.0, normA = 0.0, normB = 0.0;
  const len = Math.min(vecA.length, vecB.length);
  for (let i = 0; i < len; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dot / denominator;
}

export async function queryRelevantContext(userId, queryText, topK = 3) {
  const docs = db.prepare('SELECT id, name, content, embedding FROM documents WHERE user_id = ?').all(userId);
  if (!docs || docs.length === 0) return '';

  const queryVec = await createEmbedding(queryText);
  const scored = docs.map(doc => {
    try {
      const docVec = JSON.parse(doc.embedding);
      return { name: doc.name, content: doc.content, score: cosineSimilarity(queryVec, docVec) };
    } catch {
      return { name: doc.name, content: doc.content, score: 0 };
    }
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK)
    .filter(d => d.score > 0.05)
    .map(d => `\n${d.content}`)
    .join('\n\n');
}
