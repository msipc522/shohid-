import React from 'react';
import { Download, X } from 'lucide-react';

interface LightboxModalProps {
  src: string | null;
  title: string;
  onClose: () => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({ src, title, onClose }) => {
  if (!src) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-950/90 z-[80] flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-w-3xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl"
      >
        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-800 text-white">
          <span className="font-bold text-sm truncate pr-3">{title}</span>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={src}
              download={`${title.replace(/\s+/g, '_')}.jpg`}
              className="min-h-[36px] px-3 py-1.5 rounded-lg bg-emerald-600 text-xs font-bold hover:bg-emerald-500 inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> ডাউনলোড
            </a>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center hover:bg-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-3 flex items-center justify-center bg-black max-h-[80vh] overflow-auto">
          <img
            src={src}
            alt={title}
            referrerPolicy="no-referrer"
            className="max-w-full max-h-[75vh] object-contain rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};
