import React from 'react';
import { BaseRendererProps } from './types';
import { Phone, Mail, MapPin, Sparkles } from 'lucide-react';
import { sectionShellClass } from '@ray-eg/shared/builder';

export const FooterRenderer: React.FC<BaseRendererProps> = ({
  node,
  website,
  outlineClass,
  getComputedStyles,
  handleClick,
  handleMouseEnter,
  handleMouseLeave,
  renderChildren,
  currentViewport,
}) => {
  const brandName = node.props.brandName || website.name || 'المتجر الإلكتروني';
  const description =
    node.props.description || 'منصة متكاملة للتجارة والخدمات بأعلى معايير الجودة.';
  const isMobile = currentViewport === 'mobile';

  return (
    <footer
      id={node.id}
      style={getComputedStyles()}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`cursor-pointer transition-all ${outlineClass}`}
    >
      <div className={`${sectionShellClass} text-right`}>
        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'} gap-6 sm:gap-8 pb-8 border-b border-slate-800`}>
          {/* Brand Col */}
          <div className="space-y-2.5">
            <h3 className="text-base sm:text-lg font-black text-white break-words">{brandName}</h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm break-words">{description}</p>
          </div>

          {/* Contact Info Col */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              معلومات التواصل
            </h4>
            <div className="space-y-1.5 text-xs text-slate-400">
              {node.props.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span dir="ltr">{node.props.phone}</span>
                </div>
              )}
              {node.props.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>{node.props.email}</span>
                </div>
              )}
              {node.props.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{node.props.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Trust Col */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              ضمان واعتماد
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              جميع المعاملات والخدمات مشمولة بضمان معتمد وفريق دعم فني متواجد على مدار الساعة.
            </p>
          </div>
        </div>

        {/* Copyright & Powered by Badge */}
        <div className="pt-6 pb-2 text-center flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-slate-400 select-none border-t border-slate-800/60 mt-6">
          <span>
            {node.props.copyright ||
              `جميع الحقوق محفوظة © ${new Date().getFullYear()} ${brandName}`}
          </span>
          <span className="hidden sm:inline opacity-30">•</span>
          <a
            href="https://mnmknk.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-all text-[11px] font-medium shadow-xs"
          >
            <span>صنع بكل فخر عبر</span>
            <strong className="text-blue-400 font-extrabold flex items-center gap-1">
              <span>نمّي أعمالك</span>
              <Sparkles className="w-3 h-3 text-amber-400" />
            </strong>
          </a>
        </div>

        {renderChildren()}
      </div>
    </footer>
  );
};
