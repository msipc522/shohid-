import React, { useEffect, useState } from 'react';
import { getRedirectResult, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { Building2, Cloud, Laptop, ShieldCheck, Smartphone } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { PWAInstallButton } from './PWAInstallButton';

export const AuthGate: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    void getRedirectResult(auth).catch((err) => {
      const code = (err as { code?: string })?.code || '';
      if (code) {
        setErrorMsg(`লগইন সম্পন্ন হয়নি (${code})। অনুগ্রহ করে আবার চেষ্টা করুন।`);
      }
    });
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      const msg = err instanceof Error ? err.message : '';
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/operation-not-supported-in-this-environment'
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr) {
          const rCode = (redirectErr as { code?: string })?.code || '';
          setErrorMsg(`গুগল লগইন শুরু করা যায়নি (${rCode || 'redirect_error'})।`);
        }
      } else if (code === 'auth/popup-closed-by-user' || msg.includes('popup-closed-by-user')) {
        setErrorMsg('লগইন পপআপ বন্ধ করা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
      } else if (code === 'auth/unauthorized-domain') {
        setErrorMsg(
          `এই ডোমেইনটি (${window.location.hostname}) Firebase Auth-এ অনুমোদিত নয় (${code})।`
        );
      } else {
        setErrorMsg(
          `গুগল অ্যাকাউন্ট দিয়ে সাইন-ইন করতে সমস্যা হয়েছে${code ? ` (${code})` : ''}। আবার চেষ্টা করুন।`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        {/* Left Info Panel */}
        <div className="bg-slate-900 text-white p-7 sm:p-10 flex flex-col justify-between gap-8">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-balance">
                BariVara Pro
              </h1>
              <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
                ২৮টি রুম ও ২টি দোকানের সম্পূর্ণ বাড়ি ভাড়া, বিদ্যুৎ মিটার বিল এবং ভাড়াটিয়ার ডকুমেন্টস ম্যানেজার।
              </p>
            </div>
          </div>

          <div className="space-y-4 text-sm text-slate-200">
            <div className="flex items-start gap-3">
              <Cloud className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">অনলাইন ক্লাউড সিঙ্ক ও অটো ব্যাকআপ</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  সব রুমের হিসাব, ভাড়াটিয়ার ছবি ও রশিদ নিরাপদ ক্লাউড ডাটাবেসে সংরক্ষিত থাকে।
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center gap-1 text-emerald-400 shrink-0 mt-0.5">
                <Laptop className="w-4 h-4" />
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-white">PC ও Android-এ একসাথে ব্যবহার</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  একই Google অ্যাকাউন্ট দিয়ে কম্পিউটার ও অ্যান্ড্রয়েড ফোনে একসাথে রিয়েল-টাইম আপডেট পাবেন।
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">অফলাইন সাপোর্ট ও অ্যাপ ইনস্টল (PWA)</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  মোবাইল বা পিসিতে সরাসরি অ্যাপ হিসেবে ইনস্টল করে নেট ছাড়াও দেখতে পারবেন।
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Login Action Panel */}
        <div className="p-7 sm:p-10 flex flex-col justify-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">আপনার অ্যাকাউন্টে প্রবেশ করুন</h2>
            <p className="text-sm text-slate-600">
              পিসি এবং অ্যান্ড্রয়েড ফোনে একই সাথে ডাটা সিঙ্ক রাখতে আপনার Google অ্যাকাউন্ট দিয়ে সাইন-ইন করুন।
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full min-h-[48px] flex items-center justify-center gap-3 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-bold transition shadow-xs"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.91 6.16-4.91z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.52-1.14 2.82-2.4 3.68l3.71 2.88c2.17-2 3.71-4.94 3.71-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.71-2.88c-.98.66-2.23 1.06-3.57 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
            </svg>
            <span>{loading ? 'সংযোগ হচ্ছে...' : 'Google দিয়ে সাইন-ইন করুন'}</span>
          </button>

          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-slate-500">আগের HTML ব্যাকআপ (JSON) ভেতরে ইমপোর্ট করা যাবে</span>
            <PWAInstallButton variant="header" />
          </div>
        </div>
      </div>
    </div>
  );
};
