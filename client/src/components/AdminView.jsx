import React, { useState, useEffect } from 'react';
import { Users, FileText, Shield } from 'lucide-react';

export default function AdminView({ token }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/admin/overview', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(setData)
      .catch(() => alert('Admin fetch failed'));
  }, [token]);

  if (!data) return <div className="p-8 text-center text-slate-500">Loading admin analytics...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Registered Users</span>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">{data.users.length}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Total Words Humanized</span>
            <FileText className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">{data.totalWords.toLocaleString()}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Pro Subscribers</span>
            <Shield className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {data.users.filter(u => u.tier === 'pro').length}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">User Directory & Limits</h3>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-bold text-slate-500">
              <th className="pb-3">Email</th>
              <th className="pb-3">Role</th>
              <th className="pb-3">Tier</th>
              <th className="pb-3">Words Consumed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.users.map(u => (
              <tr key={u.id} className="text-slate-700">
                <td className="py-3 font-medium">{u.email}</td>
                <td className="py-3 uppercase text-xs">{u.role}</td>
                <td className="py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${u.tier === 'pro' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                    {u.tier}
                  </span>
                </td>
                <td className="py-3">{u.words_used} / {u.words_limit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}