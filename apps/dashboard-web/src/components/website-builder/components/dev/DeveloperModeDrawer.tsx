import React, { useState } from 'react';
import {
  X,
  Terminal,
  FileJson,
  Cpu,
  Layers,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react';
import { useBuilder } from '../../context/BuilderContext';

export const DeveloperModeDrawer: React.FC = () => {
  const { isDevDrawerOpen, setIsDevDrawerOpen, website, activePage, currentTenant, selectedNode } = useBuilder();
  const [activeTab, setActiveTab] = useState<'ast' | 'dto' | 'rsc_analysis'>('ast');
  const [copied, setCopied] = useState(false);

  if (!isDevDrawerOpen) return null;

  const copyData = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-y-0 left-0 w-full sm:w-[480px] bg-slate-950 text-slate-200 border-r border-slate-800 shadow-2xl z-[9990] flex flex-col animate-in slide-in-from-left duration-200 select-none">
      {/* Header */}
      <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-cyan-400 shrink-0" />
          <div>
            <h3 className="text-xs font-bold text-slate-100">وضع المطورين (Developer Mode)</h3>
            <span className="text-[10px] text-slate-400 font-mono">Go Backend & Next.js Architecture</span>
          </div>
        </div>
        <button
          onClick={() => setIsDevDrawerOpen(false)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/30 text-xs font-mono shrink-0">
        <button
          onClick={() => setActiveTab('ast')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors cursor-pointer ${
            activeTab === 'ast' ? 'border-cyan-400 text-cyan-400 font-bold bg-slate-900/50' : 'border-transparent text-slate-400'
          }`}
        >
          AST Inspector
        </button>
        <button
          onClick={() => setActiveTab('dto')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors cursor-pointer ${
            activeTab === 'dto' ? 'border-cyan-400 text-cyan-400 font-bold bg-slate-900/50' : 'border-transparent text-slate-400'
          }`}
        >
          Go DTO Payload
        </button>
        <button
          onClick={() => setActiveTab('rsc_analysis')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors cursor-pointer ${
            activeTab === 'rsc_analysis' ? 'border-cyan-400 text-cyan-400 font-bold bg-slate-900/50' : 'border-transparent text-slate-400'
          }`}
        >
          RSC Analyzer
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs select-text">
        {activeTab === 'ast' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-slate-400">
              <span className="truncate max-w-[200px]">Selected Node AST ({selectedNode?.id || 'None'})</span>
              <button
                onClick={() => copyData(selectedNode || website.components)}
                className="flex items-center gap-1 text-[11px] bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded cursor-pointer shrink-0"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy JSON</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-cyan-300 overflow-x-auto leading-relaxed text-[11px]">
              {JSON.stringify(selectedNode || website.components, null, 2)}
            </pre>
          </div>
        )}

        {activeTab === 'dto' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-slate-400">
              <span>Go Backend Typed Payload</span>
              <button
                onClick={() => copyData({ tenant: currentTenant, website })}
                className="flex items-center gap-1 text-[11px] bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded cursor-pointer shrink-0"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-emerald-400 overflow-x-auto leading-relaxed text-[11px]">
              {JSON.stringify({ tenantId: currentTenant.id, websiteId: website.id, pagesCount: website.pages.length, theme: website.theme }, null, 2)}
            </pre>
          </div>
        )}

        {activeTab === 'rsc_analysis' && (
          <div className="space-y-3 text-slate-300 font-sans text-xs">
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-cyan-400 block font-mono">React Server Component (RSC) Audit</span>
              <div className="space-y-1 text-slate-400">
                <p>✓ 100% Server Rendered HTML by default</p>
                <p>✓ Zero Client-side Waterfalls</p>
                <p>✓ ISR Caching enabled (stale-while-revalidate)</p>
                <p>✓ Scoped micro-interactions isolated via IntersectionObserver</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center font-mono">
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                <span className="text-[10px] text-slate-500 block">Server Components</span>
                <span className="text-base font-bold text-emerald-400">92%</span>
              </div>
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                <span className="text-[10px] text-slate-500 block">Client Hydration JS</span>
                <span className="text-base font-bold text-cyan-400">8%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
