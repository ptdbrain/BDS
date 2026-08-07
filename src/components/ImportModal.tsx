'use client';

import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, X } from 'lucide-react';

interface ImportModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportModal({ projectId, isOpen, onClose, onSuccess }: ImportModalProps) {
  const [fileContent, setFileContent] = useState<string>('');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  if (!isOpen) return null;

  // Sample CSV template loader
  const loadSampleCSV = () => {
    const csv = `productCode,building,floor,area,direction,price,handoverPlan
A-1501,Tower A,15,85.5,Đông Nam,5550000000,Hoàn thiện cao cấp
A-1502,Tower A,15,68.0,Tây Nam,4420000000,Hoàn thiện cao cấp
B-1201,Tower B,12,105.0,Đông Bắc,6825000000,Bàn giao thô
B-1202,Tower B,12,74.5,Đông Nam,4842500000,Hoàn thiện cao cấp`;

    setFileContent(csv);

    // Parse CSV lines
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',');
    const rows = lines.slice(1).map(line => {
      const vals = line.split(',');
      return {
        productCode: vals[0],
        building: vals[1],
        floor: vals[2],
        area: vals[3],
        direction: vals[4],
        price: vals[5],
        handoverPlan: vals[6]
      };
    });

    setParsedData(rows);
  };

  const handleExecuteImport = async () => {
    if (parsedData.length === 0) return;
    setIsImporting(true);

    try {
      const res = await fetch('/api/v1/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          items: parsedData
        })
      });

      const data = await res.json();
      setImportResult(data.data);
      if (data.data?.success > 0) {
        onSuccess();
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-700 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <span>Import Quỹ Hàng Hàng Loạt Từ Excel / CSV</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-slate-300">
            Tải lên danh sách bảng hàng dự án với đầy đủ mã căn, tòa, diện tích, đơn giá và quy cách bàn giao.
          </p>

          <button
            onClick={loadSampleCSV}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Nạp Mẫu Bảng Hàng CSV Test</span>
          </button>
        </div>

        {/* Data Preview */}
        {parsedData.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase">Xem Trước Dữ Liệu ({parsedData.length} dòng)</h4>
            <div className="rounded-xl border border-slate-800 overflow-hidden max-h-48 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-slate-400 font-bold">
                  <tr>
                    <th className="p-2.5">Mã Căn</th>
                    <th className="p-2.5">Tòa</th>
                    <th className="p-2.5">Tầng</th>
                    <th className="p-2.5">Diện Tích</th>
                    <th className="p-2.5">Giá</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {parsedData.map((r, i) => (
                    <tr key={i}>
                      <td className="p-2.5 font-bold text-white">{r.productCode}</td>
                      <td className="p-2.5">{r.building}</td>
                      <td className="p-2.5">{r.floor}</td>
                      <td className="p-2.5">{r.area} m²</td>
                      <td className="p-2.5 text-brand-400">{Number(r.price).toLocaleString('vi-VN')} VND</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Import Results Feedback */}
        {importResult && (
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
            <div className="font-bold text-white flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Kết Quả Nhập Dữ Liệu:</span>
            </div>
            <p className="text-emerald-400 font-bold">Thành công: {importResult.success} / {importResult.total} sản phẩm</p>
            {importResult.errors?.length > 0 && (
              <div className="space-y-1 text-rose-400">
                <p className="font-bold">Lỗi phát sinh ({importResult.errors.length}):</p>
                {importResult.errors.map((e: any, idx: number) => (
                  <p key={idx} className="text-[11px]">Dòng {e.row}: {e.message}</p>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-3 border-t border-slate-800 pt-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
          >
            Đóng
          </button>
          <button
            onClick={handleExecuteImport}
            disabled={parsedData.length === 0 || isImporting}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg disabled:opacity-50"
          >
            {isImporting ? 'Đang Xử Lý...' : 'Xác Nhận Import Vào Quỹ Hàng'}
          </button>
        </div>
      </div>
    </div>
  );
}
