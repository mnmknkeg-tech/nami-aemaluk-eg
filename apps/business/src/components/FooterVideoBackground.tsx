'use client';

import React from 'react';

/**
 * سابقًا كان يعرض فيديوهات خلفية.
 * الآن — خلفية غامقة ثابتة بألوان البراند.
 */
interface Props {
  overlayClassName?: string;
  className?: string;
  children?: React.ReactNode;
}

export default function FooterVideoBackground({
  overlayClassName,
  className = '',
  children,
}: Props) {
  return (
    <div className={`relative w-full overflow-hidden bg-gradient-to-b from-[#0F172A] via-[#0F172A] to-[#1E293B] text-white ${className}`}>
      {/* توهج خفيف بألوان البراند فوق الخلفية الغامقة */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-[760px] h-72 rounded-full bg-cyan-500/10 blur-[130px]" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-purple-600/10 blur-[130px]" />
      </div>
      {children && <div className={`relative ${overlayClassName ? 'z-10' : 'z-0'} w-full`}>{children}</div>}
    </div>
  );
}

