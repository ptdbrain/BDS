'use client';

import React, { useState } from 'react';
import { ShieldCheck, Search, FileCode, RefreshCw } from 'lucide-react';

interface AuditTrailProps {
  logs: any[];
  onRefresh: () => void;
}

export function AuditTrail({ logs, onRefresh }: AuditTrailProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const filteredLogs = logs.filter(l => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.actorName.toLowerCase().includes(q) ||
      l.entityType.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Nhật Ký Kiểm Toán & Tuân Thủ (Audit Trail)</h2>
              <p className="text-xs text-slate-400">Ghi lại toàn bộ hành vết biến động dữ liệu, truy cập PII & thao tác giao dịch</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onRefresh}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Làm Mới Audit</span>
          </button>
        </div>
      </div>

      {/* Audit Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-white">Nhật Ký Thao Tác Hệ Thống</h3>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Lọc hành động hoặc người dùng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs text-white pl-9 pr-4 py-1.5 rounded-xl outline-none w-56"
            />
          </div>
        </div>

        <table className="w-full text-xs text-left">
          <thead className="bg-slate-900 text-slate-400 font-bold uppercase border-b border-slate-800">
            <tr>
              <th className="p-3.5">Thời Gian</th>
              <th className="p-3.5">Người Thao Tác</th>
              <th className="p-3.5">Hành Động (Action)</th>
              <th className="p-3.5">Thực Thể (Entity)</th>
              <th className="p-3.5">Địa Chỉ IP</th>
              <th className="p-3.5 text-right">Chi Tiết Diff</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-800/40 transition">
                <td className="p-3.5 text-slate-400 font-mono">{new Date(log.createdAt).toLocaleString('vi-VN')}</td>
                <td className="p-3.5 font-bold text-white">{log.actorName}</td>
                <td className="p-3.5">
                  <span className="px-2.5 py-1 rounded-md bg-brand-500/20 text-brand-300 border border-brand-500/30 text-[11px] font-mono font-bold">
                    {log.action}
                  </span>
                </td>
                <td className="p-3.5 text-slate-300">{log.entityType} ({log.entityId.slice(0, 8)}...)</td>
                <td className="p-3.5 font-mono text-slate-500">{log.ip || '127.0.0.1'}</td>
                <td className="p-3.5 text-right">
                  <button
                    onClick={() => setSelectedLog(log)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-[11px] font-semibold"
                  >
                    Xem JSON Diff
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* JSON Diff Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <FileCode className="w-5 h-5 text-indigo-400" />
                <span>Chi Tiết Biến Động Audit Entry</span>
              </h3>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <span className="text-[11px] text-slate-400 font-bold block mb-1">Dữ liệu sau thay đổi (After State):</span>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 overflow-x-auto">
                  {selectedLog.afterJson ? JSON.stringify(JSON.parse(selectedLog.afterJson), null, 2) : 'N/A'}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
