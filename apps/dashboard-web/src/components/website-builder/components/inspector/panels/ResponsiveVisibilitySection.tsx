import React from 'react';
import { useBuilder } from '../../../context/BuilderContext';

export const ResponsiveVisibilitySection: React.FC = () => {
  const { selectedNode, updateNodeProps, viewport } = useBuilder();
  if (!selectedNode) return null;

  const isHiddenOnMobile = selectedNode.props.mobileHidden === true;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span>
          <span className="block text-[10px] font-bold text-slate-700">استجابة العنصر</span>
          <span className="text-[10px] text-slate-500">إخفاء هذا العنصر على الموبايل فقط</span>
        </span>
        <input
          type="checkbox"
          checked={isHiddenOnMobile}
          onChange={(event) =>
            updateNodeProps(selectedNode.id, { mobileHidden: event.target.checked })
          }
          aria-label="إخفاء العنصر على الموبايل"
          className="size-4 accent-blue-600"
        />
      </label>
      {viewport === 'mobile' && isHiddenOnMobile && (
        <p className="mt-1 text-[10px] font-medium text-amber-700">
          العنصر مخفي في معاينة الموبايل الحالية.
        </p>
      )}
    </div>
  );
};
