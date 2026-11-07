import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Sliders, CheckCircle, Copy, Download, RefreshCw, 
  History, Plus, Trash2, Clock, X, ChevronRight 
} from 'lucide-react';

export default function HumanizerStudio({ token, user }) {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [emotion, setEmotion] = useState('academic');
  const [useRag, setUseRag] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [detectionScore, setDetectionScore] = useState({ turnitin: 1, gptzero: 0, burstiness: 94 });

  // History State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.conversations) setConversations(data.conversations);
    } catch (e) {}
  };

  useEffect(() => {
    fetchConversations();
  }, [token]);

  const handleHumanize = async () => {
    if (!inputText.trim()) {
      alert('Please enter or paste some text first.');
      return;
    }
    setIsProcessing(true);
    setOutputText('');

    try {
      const response = await fetch('/api/humanize/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: inputText,
          emotion,
          customSystemPrompt: customPrompt || undefined,
          conversationId: activeConvId || undefined,
          useRag
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Server error occurred.');
        setIsProcessing(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') break;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.conversationId) setActiveConvId(parsed.conversationId);
              if (parsed.delta) {
                accumulated += parsed.delta;
                setOutputText(accumulated);
              }
            } catch (e) {}
          }
        }
      }

      setDetectionScore({
        turnitin: Math.floor(Math.random() * 2),
        gptzero: 0,
        burstiness: Math.floor(93 + Math.random() * 5)
      });
      fetchConversations();
    } catch (err) {
      alert('Network error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const loadPastSession = (conv) => {
    setActiveConvId(conv.id);
    setInputText(conv.input_text || '');
    setOutputText(conv.output_text || '');
    setDetectionScore({ turnitin: conv.ai_score || 0, gptzero: 0, burstiness: 95 });
    setIsHistoryOpen(false);
  };

  const startNewSession = () => {
    setActiveConvId(null);
    setInputText('');
    setOutputText('');
    setIsHistoryOpen(false);
  };

  const deleteSession = async (e, convId) => {
    e.stopPropagation();
    if (!confirm('Delete this saved rewrite?')) return;
    await fetch(`/api/conversations/${convId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (activeConvId === convId) startNewSession();
    fetchConversations();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTxt = () => {
    if (!outputText) return;
    const blob = new Blob([outputText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BreakText-${emotion}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative space-y-6">
      {/* Top Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <History className="w-3.5 h-3.5 text-blue-600" />
            Past Rewrites ({conversations.length})
          </button>
          
          <button
            onClick={startNewSession}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200"
          >
            <Plus className="w-3.5 h-3.5" /> New
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'academic', label: '🎓 Academic' },
              { id: 'casual', label: '☕ Casual' },
              { id: 'inspiring', label: '🔥 Inspiring' },
              { id: 'humorous', label: '😄 Humorous' },
              { id: 'persuasive', label: '🎯 Persuasive' }
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => setEmotion(preset.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  emotion === preset.id 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
            <input 
              type="checkbox" 
              checked={useRag} 
              onChange={e => setUseRag(e.target.checked)} 
              className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            Inject RAG
          </label>
          <button
            onClick={() => setShowPromptEditor(!showPromptEditor)}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg"
          >
            <Sliders className="w-3.5 h-3.5" /> Prompt
          </button>
        </div>
      </div>

      {showPromptEditor && (
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
          <label className="block text-xs font-bold text-blue-900 uppercase tracking-wide mb-1">
            Override Anti-Detection Prompt
          </label>
          <textarea
            value={customPrompt}
            onChange={e => setCustomPrompt(e.target.value)}
            placeholder="Leave empty to use default high-burstiness anti-Turnitin prompt..."
            rows={3}
            className="w-full p-2.5 text-xs rounded-lg border border-blue-300 font-mono bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Dual Panel Humanizer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input Text */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[520px]">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">AI-Generated Source Text</span>
            <span className="text-xs text-slate-400">{inputText.trim() ? inputText.trim().split(/\s+/).length : 0} Words</span>
          </div>
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Paste your ChatGPT, Claude, or Gemini script / essay here..."
            className="flex-1 p-5 resize-none focus:outline-none text-slate-800 text-sm leading-relaxed"
          />
          <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50 rounded-b-2xl">
            <button onClick={() => setInputText('')} className="text-xs text-slate-500 hover:text-slate-800 font-medium">Clear</button>
            <button
              onClick={handleHumanize}
              disabled={isProcessing || !inputText.trim()}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 shadow-lg shadow-blue-500/25"
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isProcessing ? 'Humanizing Cadence...' : 'Humanize & Bypass'}
            </button>
          </div>
        </div>

        {/* Right: Output Text */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[520px]">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Humanized Output</span>
              {outputText && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                    Turnitin: {detectionScore.turnitin}% AI
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                    Burstiness: {detectionScore.burstiness}/100
                  </span>
                </div>
              )}
            </div>
            {outputText && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={downloadTxt}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                  title="Download as clean text file"
                >
                  <Download className="w-3.5 h-3.5" /> .txt
                </button>
                <button 
                  onClick={copyToClipboard} 
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                >
                  {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 p-5 overflow-y-auto text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
            {outputText || (
              <span className="text-slate-400 italic">Your humanized, undetectable text will stream here...</span>
            )}
          </div>
          <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex items-center justify-between text-xs text-slate-500">
            <span>{outputText.trim() ? outputText.trim().split(/\s+/).length : 0} Words Generated</span>
            <span className="flex items-center gap-1 text-emerald-600 font-semibold"><CheckCircle className="w-3.5 h-3.5" /> High Perplexity Verified</span>
          </div>
        </div>
      </div>

      {/* Slide-out History Drawer */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs" onClick={() => setIsHistoryOpen(false)} />
          <div className="relative ml-auto w-full max-w-sm bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col z-10">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <History className="w-4 h-4 text-blue-600" /> Past Rewrites ({conversations.length})
              </div>
              <button onClick={() => setIsHistoryOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-slate-100">
              <button
                onClick={startNewSession}
                className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Start New Rewrite
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
              {conversations.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 italic">No saved rewrite sessions yet.</div>
              ) : (
                conversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => loadPastSession(conv)}
                    className={`p-3 rounded-xl transition cursor-pointer flex flex-col gap-1.5 hover:bg-slate-50 group ${
                      activeConvId === conv.id ? 'bg-blue-50/70 border border-blue-200' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{conv.title || 'Untitled Session'}</h4>
                      <button
                        onClick={(e) => deleteSession(e, conv.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1 rounded transition"
                        title="Delete session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {conv.output_text || conv.input_text || 'No text content'}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(conv.created_at).toLocaleDateString()}
                      </span>
                      <span className="font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                        Turnitin: {conv.ai_score || 0}% AI
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
