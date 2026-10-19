'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Info, X, ArrowRight, Lightbulb } from 'lucide-react';

export interface HelpSection {
  title: string;
  content: string;
  icon?: React.ReactNode;
}

export interface PageHelpConfig {
  title: string;
  description: string;
  whenToUse: string[];
  businessExample: string;
  tips?: string[];
  relatedPages?: Array<{ title: string; href: string }>;
}

interface InfoButtonProps {
  config: PageHelpConfig;
  className?: string;
}

export default function InfoButton({ config, className = '' }: InfoButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-6 h-6 rounded-full border-2 border-slate-300 flex items-center justify-center hover:border-slate-400 hover:bg-slate-50 transition-all focus:outline-none focus:ring-2 focus:ring-slate-200 ${className}`}
        aria-label="معلومات"
        aria-expanded={isOpen}
      >
        <Info size={12} className="text-slate-400" />
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-8 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="p-5">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Info size={16} className="text-blue-600" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">{config.title}</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="إغلاق"
              >
                <X size={16} className="text-slate-400" />
              </button>
            </div>

            {/* Description */}
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              {config.description}
            </p>

            {/* When to use */}
            <div className="mb-4">
              <h4 className="font-bold text-slate-900 text-xs mb-2">متى تستخدم هذا؟</h4>
              <ul className="space-y-1">
                {config.whenToUse.map((item, index) => (
                  <li key={index} className="text-xs text-slate-600 flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Business Example */}
            <div className="bg-slate-50 rounded-xl p-3 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb size={14} className="text-amber-500" />
                <h4 className="font-bold text-slate-900 text-xs">مثال عملي</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {config.businessExample}
              </p>
            </div>

            {/* Tips */}
            {config.tips && config.tips.length > 0 && (
              <div className="mb-4">
                <h4 className="font-bold text-slate-900 text-xs mb-2">نصائح مفيدة</h4>
                <ul className="space-y-1">
                  {config.tips.map((tip, index) => (
                    <li key={index} className="text-xs text-slate-600 flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Related Pages */}
            {config.relatedPages && config.relatedPages.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <h4 className="font-bold text-slate-900 text-xs mb-2">صفحات ذات صلة</h4>
                <div className="space-y-1">
                  {config.relatedPages.map((page, index) => (
                    <a
                      key={index}
                      href={page.href}
                      className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <span>{page.title}</span>
                      <ArrowRight size={12} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}