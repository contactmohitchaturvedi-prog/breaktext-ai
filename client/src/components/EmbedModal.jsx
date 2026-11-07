import React, { useState } from 'react';
import { Copy, CheckCircle, X } from 'lucide-react';

export default function EmbedModal({ onClose }) {
  const [copied, setCopied] = useState(false);
  const snippet = `<iframe \n  src="${window.location.origin}/embed" \n  width="100%" \n  height="680px" \n  style="border:none; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);"\n></iframe>`;

  const copySnippet = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900">Embed BreakText Widget</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Add this embed code to any website or intranet. Users can humanize content directly from your site.
        </p>
        <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto relative mb-4">
          <pre>{snippet}</pre>
        </div>
        <button
          onClick={copySnippet}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
        >
          {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied to Clipboard' : 'Copy Embed Code'}
        </button>
      </div>
    </div>
  );
}