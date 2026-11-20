import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'sidebar' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={
          variant === 'sidebar'
            ? 'w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition whitespace-nowrap shrink-0'
            : variant === 'card'
              ? 'flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white transition whitespace-nowrap shrink-0'
              : 'flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-xs font-bold text-white transition whitespace-nowrap shrink-0 min-h-[40px]'
        }
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>অ্যাপ ইনস্টল করুন</span>
      </button>
    );
  }

  if (isIOS || variant === 'card') {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className={
            variant === 'card'
              ? 'flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 transition whitespace-nowrap shrink-0'
              : 'flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-100 transition whitespace-nowrap shrink-0 min-h-[40px]'
          }
        >
          <Smartphone className="w-4 h-4 shrink-0" />
          <span>ফোন/পিসিতে অ্যাপ সেটআপ</span>
        </button>

        {showGuide && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">মোবাইল বা পিসিতে ইনস্টল গাইড</h3>
                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
                  className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {isIOS ? (
                <p className="text-sm text-slate-600 leading-relaxed">
                  ১. Safari ব্রাউজারের নিচের <strong>Share</strong> আইকনে ট্যাপ করুন।
                  <br />
                  ২. নিচে স্ক্রল করে <strong>Add to Home Screen</strong> নির্বাচন করুন।
                </p>
              ) : (
                <p className="text-sm text-slate-600 leading-relaxed">
                  ১. Android Chrome বা PC Chrome/Edge-এ উপরের ডানদিকে মেনু (⋮) বা অ্যাড্রেস বারের <strong>Install</strong> আইকনে ক্লিক করুন।
                  <br />
                  ২. <strong>Install app / Add to Home screen</strong> চাপুন।
                </p>
              )}
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                বুঝেছি
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
