import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'অপ্রত্যাশিত ত্রুটি ঘটেছে।',
    };
  }

  render() {
    if (this.state.hasError) {
      let friendlyMessage = 'সিস্টেমে একটি সমস্যা দেখা দিয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।';
      if (this.state.message.includes('Missing or insufficient permissions')) {
        friendlyMessage = 'ডাটাবেস অনুমতি পাওয়া যায়নি। আপনার অ্যাকাউন্ট দিয়ে পুনরায় লগইন করুন।';
      }
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">সংযোগে সমস্যা হয়েছে</h2>
            <p className="text-sm text-slate-600">{friendlyMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition inline-flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> পেজ রিলোড করুন
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
