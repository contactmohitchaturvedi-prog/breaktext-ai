import React, { useState, useEffect } from 'react';
import { Database, Upload, FileText, Clock } from 'lucide-react';

export default function KnowledgeBase({ token }) {
  const [docs, setDocs] = useState([]);
  const [docName, setDocName] = useState('');
  const [docContent, setDocContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const fetchDocs = async () => {
    const res = await fetch('/api/documents', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.documents) setDocs(data.documents);
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!docName || !docContent) return;
    setIsUploading(true);

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: docName, content: docContent })
      });
      if (res.ok) {
        setDocName('');
        setDocContent('');
        fetchDocs();
      } else {
        alert('Failed to embed document');
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" /> Knowledge Base & Style Embeddings (RAG)
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          Upload reference text, writing samples, or rubrics. BreakText vectorizes and embeds them to preserve your vocabulary and voice.
        </p>

        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Document Title</label>
            <input
              type="text"
              value={docName}
              onChange={e => setDocName(e.target.value)}
              placeholder="e.g. My Writing Sample / Course Guidelines"
              className="w-full px-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Text Content</label>
            <textarea
              value={docContent}
              onChange={e => setDocContent(e.target.value)}
              placeholder="Paste raw text, syllabus guidelines, or reference essays..."
              rows={5}
              className="w-full p-4 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isUploading}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {isUploading ? 'Computing OpenAI Vector Embeddings...' : 'Save & Vectorize Document'}
          </button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Indexed Documents ({docs.length})</h3>
        {docs.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No reference documents embedded yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {docs.map(doc => (
              <div key={doc.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">{doc.name}</h4>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Indexed on {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full font-medium border border-emerald-200">
                  Ready for RAG
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}