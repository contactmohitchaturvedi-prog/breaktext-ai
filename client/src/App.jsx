import React, { useState, useEffect } from 'react';
import { Sparkles, Database, CreditCard, LogOut, Code, ArrowRight, CheckCircle2 } from 'lucide-react';
import HumanizerStudio from './components/HumanizerStudio.jsx';
import KnowledgeBase from './components/KnowledgeBase.jsx';
import AdminView from './components/AdminView.jsx';
import EmbedModal from './components/EmbedModal.jsx';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('bt_token') || '');
  const [user, setUser] = useState(null);
  const [view, setView] = useState('studio');
  const [showEmbed, setShowEmbed] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState('register');

  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (sessionId && token) {
      fetch(`/api/stripe/verify-session?session_id=${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setUser(data.user);
            alert('🎉 Payment verified! Upgraded to BreakText Pro (50,000 words/mo).');
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        });
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => {
          if (data.user) setUser(data.user);
          else handleLogout();
        })
        .catch(() => handleLogout());
    }
  }, [token]);

  const handleAuth = async (e) => {
    e.preventDefault();
    const res = await fetch(`/api/auth/${authMode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: authEmail, password: authPassword })
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('bt_token', data.token);
      setToken(data.token);
      setUser(data.user);
    } else {
      alert(data.error || 'Authentication failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('bt_token');
    setToken('');
    setUser(null);
  };

  const handleUpgrade = async () => {
    const res = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else alert('Failed to create Stripe checkout session');
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <header className="bg-white/80 backdrop-blur border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">B</div>
              <span className="text-xl font-bold tracking-tight text-slate-900">Break<span className="text-blue-600">Text</span></span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold ml-2">Turnitin 0% AI</span>
            </div>
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-sm font-semibold text-blue-600 hover:underline"
            >
              {authMode === 'login' ? 'Create an account' : 'Existing user? Log In'}
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> High-burstiness natural AI humanizer
            </div>
            <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Bypass AI detectors with <span className="text-blue-600">authentic human cadence.</span>
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed max-w-xl">
              Engineered for students and creators. Convert ChatGPT, Claude, and Gemini scripts into undetectable text that bypasses Turnitin and GPTZero while preserving your tone.
            </p>
            <div className="flex flex-wrap gap-6 pt-2 text-sm text-slate-600 font-medium">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 0% Turnitin Flag Guarantee</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Preserves Citations & Facts</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> RAG Knowledge Upload</div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-900">
              {authMode === 'login' ? 'Welcome Back' : 'Get Started Free'}
            </h2>
            <p className="text-sm text-slate-500 mt-1 mb-6">Free tier includes 1,500 words per month.</p>
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Email</label>
                <input 
                  type="email" 
                  value={authEmail} 
                  onChange={e => setAuthEmail(e.target.value)} 
                  required
                  placeholder="name@university.edu"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Password</label>
                <input 
                  type="password" 
                  value={authPassword} 
                  onChange={e => setAuthPassword(e.target.value)} 
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
              >
                {authMode === 'login' ? 'Log In to Studio' : 'Claim 1,500 Free Words'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('studio')}>
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">B</div>
            <span className="font-bold text-slate-900 tracking-tight">Break<span className="text-blue-600">Text</span></span>
          </div>
          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button 
              onClick={() => setView('studio')}
              className={`px-3 py-1.5 rounded-lg transition ${view === 'studio' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Humanizer Studio
            </button>
            <button 
              onClick={() => setView('knowledge')}
              className={`px-3 py-1.5 rounded-lg transition ${view === 'knowledge' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Knowledge Base (RAG)
            </button>
            {user?.role === 'admin' && (
              <button 
                onClick={() => setView('admin')}
                className={`px-3 py-1.5 rounded-lg transition ${view === 'admin' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Admin Metrics
              </button>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs text-slate-500 font-medium">Usage: {user?.words_used || 0} / {user?.words_limit || 1500} words</span>
            <div className="w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
              <div 
                className="bg-blue-600 h-full transition-all"
                style={{ width: `${Math.min(100, ((user?.words_used || 0) / (user?.words_limit || 1500)) * 100)}%` }}
              />
            </div>
          </div>

          {user?.tier !== 'pro' ? (
            <button 
              onClick={handleUpgrade}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 flex items-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" /> Upgrade $12/mo
            </button>
          ) : (
            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold border border-amber-300">
              PRO MEMBER
            </span>
          )}

          <button onClick={() => setShowEmbed(true)} title="Embed Widget" className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100">
            <Code className="w-4 h-4" />
          </button>
          <button onClick={handleLogout} title="Sign out" className="p-2 text-slate-500 hover:text-red-600 rounded-lg hover:bg-slate-100">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {view === 'studio' && <HumanizerStudio token={token} user={user} />}
        {view === 'knowledge' && <KnowledgeBase token={token} />}
        {view === 'admin' && <AdminView token={token} />}
      </main>

      {showEmbed && <EmbedModal onClose={() => setShowEmbed(false)} />}
    </div>
  );
}