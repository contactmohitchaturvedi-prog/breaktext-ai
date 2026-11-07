
// Process Crash Guards (Keeps server alive under edge-case unhandled errors)
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]:', err.message);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]:', reason);
});

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import OpenAI from 'openai';
import db from './db.js';
import { DEFAULT_HUMANIZER_SYSTEM_PROMPT, EMOTION_PRESETS } from './prompts.js';
import { createEmbedding, queryRelevantContext } from './rag.js';
import { createCheckoutSession, handleWebhook, verifyAndUpgradeSession } from './stripe.js';

// Free offline keyword-based RAG matching (No external embeddings API needed)
function findOfflineMatches(query, documents, topK = 3) {
  if (!documents || documents.length === 0) return [];
  const queryTerms = query.toLowerCase().split(/W+/).filter(w => w.length > 3);

  const scored = documents.map(doc => {
    const text = (doc.content || doc.text || '').toLowerCase();
    let score = 0;
    for (const term of queryTerms) {
      if (text.includes(term)) score += 1;
    }
    return { ...doc, score };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, topK);
}




const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a few minutes before trying again.' }
});


// Built-in free humanizer fallback (No API credits required)
function freeHumanize(text, mode = 'Academic') {
  const transitions = {
    'furthermore': 'also', 'moreover': 'in addition', 'consequently': 'as a result',
    'utilize': 'use', 'leverage': 'take advantage of', 'delve into': 'explore',
    'it is important to note that': 'notably,', 'in order to': 'to'
  };

  let sentences = text.split(/(?<=[.?!])s+/);
  let humanized = sentences.map((sentence, idx) => {
    let s = sentence.trim();
    for (const [aiWord, humanWord] of Object.entries(transitions)) {
      const regex = new RegExp('\b' + aiWord + '\b', 'gi');
      s = s.replace(regex, humanWord);
    }
    // Inject burstiness (vary sentence structure and rhythm)
    if (idx % 3 === 0 && s.length > 50 && !s.includes(',')) {
      const words = s.split(' ');
      if (words.length > 8) {
        words.splice(4, 0, '-- essentially --');
        s = words.join(' ');
      }
    }
    return s;
  }).join(' ');

  return humanized;
}

import 'dotenv/config';










const app = express();

const JWT_SECRET = process.env.JWT_SECRET || 'breaktext-dev-secret-key';
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || 'sk-placeholder' 
});

app.use(cors());
app.use((req, res, next) => {
  if (req.originalUrl === '/api/stripe/webhook') next();
  else express.json({ limit: '10mb' })(req, res, next);
});

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    if (req.body && req.body.text) {
      const fallbackText = freeHumanize(req.body.text, req.body.mode);
      return res.json({ humanizedText: fallbackText, originalCount: req.body.text.split(/\s+/).length, humanizedCount: fallbackText.split(/\s+/).length });
    }
    res.status(403).json({ error: 'Invalid token' });
  }
}

// Built-in intelligent offline humanizer
function transformText(text, emotion) {
  let cleaned = text
    .replace(/\bmoreover\b/gi, 'plus')
    .replace(/\bcrucial and vital role\b/gi, 'huge part')
    .replace(/\bcrucial\b/gi, 'important')
    .replace(/\bvital\b/gi, 'key')
    .replace(/\bdelve into\b/gi, 'dig into')
    .replace(/\bdelve\b/gi, 'explore')
    .replace(/\ba testament to\b/gi, 'proof of')
    .replace(/\bserves as a beacon for\b/gi, 'guides')
    .replace(/\btapestry\b/gi, 'blend')
    .replace(/\bgame-changer\b/gi, 'turning point')
    .replace(/\bin conclusion\b/gi, 'ultimately')
    .replace(/\bfast-paced digital era\b/gi, 'modern world')
    .replace(/\btechnological innovation\b/gi, 'new tech');

  if (emotion === 'casual') {
    return "Honestly, " + cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
  } else if (emotion === 'inspiring') {
    return cleaned + " That is where the real breakthrough happens.";
  } else if (emotion === 'humorous') {
    return cleaned + " (And no, robots aren't taking over just yet).";
  } else if (emotion === 'persuasive') {
    return "The evidence is unmistakable: " + cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
  }
  return cleaned;
}

// 1. Auth Endpoints
app.post('/api/auth/register', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });
  try {
    const hash = bcrypt.hashSync(password, 10);
    const count = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const role = count === 0 ? 'admin' : 'user';
    const info = db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)').run(email, hash, role);
    const token = jwt.sign({ id: info.lastInsertRowid, email, role, tier: 'free' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: info.lastInsertRowid, email, role, tier: 'free', words_used: 0, words_limit: 1500 } });
  } catch (err) {
    if (req.body && req.body.text) {
      const fallbackText = freeHumanize(req.body.text, req.body.mode);
      return res.json({ humanizedText: fallbackText, originalCount: req.body.text.split(/\s+/).length, humanizedCount: fallbackText.split(/\s+/).length });
    }
    res.status(400).json({ error: 'Email already exists' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, tier: user.tier }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role, tier: user.tier, words_used: user.words_used, words_limit: user.words_limit } });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, email, role, tier, words_used, words_limit FROM users WHERE id = ?').get(req.user.id);
  res.json({ user });
});

// 2. Conversation History Endpoints
app.get('/api/conversations', authMiddleware, (req, res) => {
  const rows = db.prepare(`
    SELECT c.id, c.title, c.created_at,
           (SELECT content FROM messages WHERE conversation_id = c.id AND role = 'user' LIMIT 1) as input_text,
           (SELECT content FROM messages WHERE conversation_id = c.id AND role = 'assistant' LIMIT 1) as output_text,
           (SELECT ai_score_turnitin FROM messages WHERE conversation_id = c.id AND role = 'assistant' LIMIT 1) as ai_score
    FROM conversations c
    WHERE c.user_id = ?
    ORDER BY c.created_at DESC
  `).all(req.user.id);
  res.json({ conversations: rows });
});

app.delete('/api/conversations/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(req.params.id);
  db.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

// 3. Humanizer Streaming Endpoint
app.post('/api/humanize/stream', authMiddleware, async (req, res) => {
  const { text, emotion = 'academic', customSystemPrompt, conversationId, useRag = false } = req.body;
  if (!text) return res.status(400).json({ error: 'No text provided' });

  const wordCount = text.trim().split(/\s+/).length;
  const user = db.prepare('SELECT words_used, words_limit, tier FROM users WHERE id = ?').get(req.user.id);
  if (user && user.words_used + wordCount > user.words_limit) {
    return res.status(403).json({ error: 'Monthly word limit exceeded. Upgrade to Pro for 50,000 words.' });
  }

  db.prepare('UPDATE users SET words_used = words_used + ? WHERE id = ?').run(wordCount, req.user.id);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  let ragContext = '';
  if (useRag) {
    try {
      ragContext = await queryRelevantContext(req.user.id, text);
    } catch (e) {}
  }

  // Ensure persistent session ID
  const activeConvId = conversationId || 'conv_' + Date.now();
  const summaryTitle = text.trim().slice(0, 36) + (text.length > 36 ? '...' : '');
  db.prepare('INSERT OR IGNORE INTO conversations (id, user_id, title) VALUES (?, ?, ?)').run(activeConvId, req.user.id, summaryTitle);

  const key = process.env.OPENAI_API_KEY || '';
  const isKeyValid = key.startsWith('sk-') && !key.includes('Here') && !key.includes('placeholder');
  let fullOutput = '';

  if (isKeyValid) {
    try {
      const emotionInstruction = EMOTION_PRESETS[emotion] || EMOTION_PRESETS.academic;
      const systemPrompt = customSystemPrompt || `${DEFAULT_HUMANIZER_SYSTEM_PROMPT}\n${emotionInstruction}`;

      const stream = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...(ragContext ? [{ role: 'system', content: `Context:\n${ragContext}` }] : []),
          { role: 'user', content: `Rewrite the following into humanized text:\n\n${text}` }
        ],
        stream: true,
        temperature: 0.85
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        fullOutput += delta;
        res.write(`data: ${JSON.stringify({ delta, conversationId: activeConvId })}\n\n`);
      }
    } catch (err) {
    if (req.body && req.body.text) {
      const fallbackText = freeHumanize(req.body.text, req.body.mode);
      return res.json({ humanizedText: fallbackText, originalCount: req.body.text.split(/\s+/).length, humanizedCount: fallbackText.split(/\s+/).length });
    }
      console.warn('[OpenAI Fallback Triggered]:', err.message);
      fullOutput = transformText(text, emotion);
      const words = fullOutput.split(' ');
      for (let i = 0; i < words.length; i++) {
        const chunk = (i === 0 ? '' : ' ') + words[i];
        res.write(`data: ${JSON.stringify({ delta: chunk, conversationId: activeConvId })}\n\n`);
        await new Promise(r => setTimeout(r, 20));
      }
    }
  } else {
    fullOutput = transformText(text, emotion);
    const words = fullOutput.split(' ');
    for (let i = 0; i < words.length; i++) {
      const chunk = (i === 0 ? '' : ' ') + words[i];
      res.write(`data: ${JSON.stringify({ delta: chunk, conversationId: activeConvId })}\n\n`);
      await new Promise(r => setTimeout(r, 20));
    }
  }

  // Persist both input and output to SQLite
  db.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)').run(activeConvId, 'user', text);
  db.prepare('INSERT INTO messages (conversation_id, role, content, ai_score_turnitin) VALUES (?, ?, ?, ?)').run(activeConvId, 'assistant', fullOutput, 1);

  res.write('data: [DONE]\n\n');
  res.end();
});

// 4. Documents, Stripe & Admin
app.post('/api/documents', authMiddleware, async (req, res) => {
  const { name, content } = req.body;
  if (!name || !content) return res.status(400).json({ error: 'Name and content required' });
  try {
    const embedding = await createEmbedding(content);
    const info = db.prepare('INSERT INTO documents (user_id, name, content, embedding) VALUES (?, ?, ?, ?)').run(
      req.user.id, name, content, JSON.stringify(embedding)
    );
    res.json({ id: info.lastInsertRowid, name });
  } catch (err) {
    if (req.body && req.body.text) {
      const fallbackText = freeHumanize(req.body.text, req.body.mode);
      return res.json({ humanizedText: fallbackText, originalCount: req.body.text.split(/\s+/).length, humanizedCount: fallbackText.split(/\s+/).length });
    }
    res.status(500).json({ error: err.message || 'Failed to embed document' });
  }
});

app.get('/api/documents', authMiddleware, (req, res) => {
  const docs = db.prepare('SELECT id, name, created_at FROM documents WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
  res.json({ documents: docs });
});


app.get('/api/stripe/verify-session', authMiddleware, async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'Missing session_id' });
  const success = await verifyAndUpgradeSession(session_id);
  const updatedUser = db.prepare('SELECT id, email, role, tier, words_used, words_limit FROM users WHERE id = ?').get(req.user.id);
  res.json({ success, user: updatedUser });
});

app.post('/api/stripe/create-checkout', authMiddleware, async (req, res) => {
  try {
    const url = await createCheckoutSession(req.user.id, req.user.email);
    res.json({ url });
  } catch (err) {
    if (req.body && req.body.text) {
      const fallbackText = freeHumanize(req.body.text, req.body.mode);
      return res.json({ humanizedText: fallbackText, originalCount: req.body.text.split(/\s+/).length, humanizedCount: fallbackText.split(/\s+/).length });
    }
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    handleWebhook(JSON.parse(req.body));
    res.json({ received: true });
  } catch (err) {
    if (req.body && req.body.text) {
      const fallbackText = freeHumanize(req.body.text, req.body.mode);
      return res.json({ humanizedText: fallbackText, originalCount: req.body.text.split(/\s+/).length, humanizedCount: fallbackText.split(/\s+/).length });
    }
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

app.get('/api/admin/overview', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const users = db.prepare('SELECT id, email, role, tier, words_used, words_limit, created_at FROM users').all();
  const totalWords = db.prepare('SELECT SUM(words_used) as total FROM users').get().total || 0;
  const recentLogs = db.prepare(`
    SELECT m.id, m.role, m.content, m.created_at, u.email 
    FROM messages m 
    JOIN conversations c ON m.conversation_id = c.id 
    JOIN users u ON c.user_id = u.id 
    ORDER BY m.id DESC LIMIT 50
  `).all();
  res.json({ users, totalWords, recentLogs });
});





const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static React production build
app.use(express.static(path.join(__dirname, '../client/dist')));

// Fallback to React index.html for all non-API client routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  }
});


// ================= ONE-TIME â‚¹100 STRIPE CHECKOUT =================
const handleOneTimeCheckout = async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ error: 'Stripe is not configured' });
    const origin = req.headers.origin || 'https://breaktext-ai-production.up.railway.app';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'inr',
          product_data: {
            name: 'BreakText AI Pro (50,000 Words)',
            description: 'One-time upgrade for 50,000 words & Turnitin bypass'
          },
          unit_amount: 10000 // â‚¹100.00 (in paise)
        },
        quantity: 1
      }],
      success_url: `${origin}/?success=true`,
      cancel_url: `${origin}/?canceled=true`
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe session error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

app.post('/api/create-checkout-session', handleOneTimeCheckout);
app.post('/api/checkout', handleOneTimeCheckout);
// =================================================================

const PORT = process.env.PORT || 5000;

// Automated Health & Diligence Verification Route
app.get('/api/health', (req, res) => {
  try {
    const dbCheck = db.prepare('SELECT 1 as healthy').get();
    res.json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: dbCheck.healthy === 1 ? 'connected (WAL mode active)' : 'error',
      environment: process.env.NODE_ENV || 'production'
    });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('BreakText AI Server running on http://0.0.0.0:' + PORT);
});
