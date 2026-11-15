'use client';

import { X } from 'lucide-react';

type Props = {
  src: string;
  onClose: () => void;
};

export default function ImagePreviewModal({ src, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-slate-900">معاينة الصورة</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-lg">
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        <img src={src} alt="Preview" className="w-full rounded-lg" />
      </div>
    </div>
  );
}
