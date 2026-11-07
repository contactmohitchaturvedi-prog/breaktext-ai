import fs from 'fs';

let code = fs.readFileSync('server/index.js', 'utf8');

const freeEngine = `
// Built-in free humanizer fallback (No API credits required)
function freeHumanize(text, mode = 'Academic') {
  const transitions = {
    'furthermore': 'also', 'moreover': 'in addition', 'consequently': 'as a result',
    'utilize': 'use', 'leverage': 'take advantage of', 'delve into': 'explore',
    'it is important to note that': 'notably,', 'in order to': 'to'
  };

  let sentences = text.split(/(?<=[.?!])\s+/);
  let humanized = sentences.map((sentence, idx) => {
    let s = sentence.trim();
    for (const [aiWord, humanWord] of Object.entries(transitions)) {
      const regex = new RegExp('\\b' + aiWord + '\\b', 'gi');
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
`;

if (!code.includes('freeHumanize')) {
  // Inject the free humanizer function
  code = freeEngine + '\n' + code;

  // Catch OpenAI failures or placeholder keys and return the free humanized text
  code = code.replace(
    /catch\s*\((err|error)\)\s*\{/g,
    `catch ($1) {
    if (req.body && req.body.text) {
      const fallbackText = freeHumanize(req.body.text, req.body.mode);
      return res.json({ humanizedText: fallbackText, originalCount: req.body.text.split(/\\s+/).length, humanizedCount: fallbackText.split(/\\s+/).length });
    }`
  );

  fs.writeFileSync('server/index.js', code, 'utf8');
  console.log('✓ Successfully enabled Free Offline Humanizer Mode in server/index.js');
} else {
  console.log('Free humanizer mode already present.');
}
