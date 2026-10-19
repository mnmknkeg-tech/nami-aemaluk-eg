'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[200px] flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800" dir="rtl">
          <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
          <p className="text-slate-600 dark:text-slate-400 font-semibold text-sm mb-4">حدث خطأ في تحميل هذا القسم</p>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-cyan text-brand-black rounded-lg font-bold text-sm hover:bg-brand-cyan/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            إعادة المحاولة
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function SectionErrorBoundary({ children, name = 'section' }: { children: ReactNode; name?: string }) {
  return (
    <ErrorBoundary
      onError={(err) => console.error(`[${name}] Error:`, err)}
      fallback={
        <div className="py-8 text-center">
          <p className="text-slate-400 text-sm">تعذر تحميل {name}</p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
