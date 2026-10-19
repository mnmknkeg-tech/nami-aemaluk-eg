import React from 'react';
import { useBuilder } from '../../context/BuilderContext';
import { Layers, ChevronRight } from 'lucide-react';

export const SelectionOverlay: React.FC = () => {
  const { selectedNode, selectionBreadcrumbs, selectNode } = useBuilder();

  if (!selectedNode) return null;

  return (
    <div className="absolute bottom-4 left-4 z-40 bg-white/95 backdrop-blur-md border border-slate-200 shadow-lg rounded-xl px-3 py-1.5 flex items-center gap-1.5 text-xs text-slate-700 select-none pointer-events-auto">
      <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
      <span className="text-[11px] text-slate-400 font-semibold">المسار الهيكلي:</span>

      <div className="flex items-center gap-1 overflow-x-auto max-w-[400px]">
        {selectionBreadcrumbs.map((crumb, idx) => (
          <React.Fragment key={crumb.id}>
            {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />}
            <button
              onClick={() => selectNode(crumb.id)}
              className={`px-1.5 py-0.5 rounded transition-colors whitespace-nowrap text-xs ${
                crumb.id === selectedNode.id
                  ? 'bg-blue-100 text-blue-800 font-bold'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              {crumb.name}
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
