'use client';

import React from 'react';
import { Mail, MapPin, Phone, Sparkles } from 'lucide-react';
import { resolvePublishedLinkDestination } from '@ray-eg/shared/builder';

interface PublishedFooterSectionProps {
  node: any;
  style: React.CSSProperties;
  ctxShop: any;
  website: any;
  followLink: (source: Record<string, any>) => boolean;
  renderChildren: () => React.ReactNode;
}

export function PublishedFooterSection({
  node,
  style,
  ctxShop,
  website,
  followLink,
  renderChildren,
}: PublishedFooterSectionProps) {
  const brandName = node.props.brandName || ctxShop?.name || 'المتجر الإلكتروني';
  const description =
    node.props.description || 'منصة متكاملة للتجارة والخدمات بأعلى معايير الجودة.';
  const isDarkText = node.props.textColorMode === 'dark_text';
  const headingClass = isDarkText ? 'text-slate-900' : 'text-white';
  const subheadClass = isDarkText ? 'text-slate-800' : 'text-slate-300';
  const bodyTextClass = isDarkText ? 'text-slate-600' : 'text-slate-400';
  const borderDivider = isDarkText ? 'border-slate-300/80' : 'border-slate-800';
  const bottomBorder = isDarkText ? 'border-slate-300/60' : 'border-slate-800/60';
  const linkHover = isDarkText
    ? 'text-slate-700 hover:text-slate-950'
    : 'text-slate-300 hover:text-white';
  const badgeStyle = isDarkText
    ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
    : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/60 text-slate-300 hover:text-white';

  const phone = node.props.phone || ctxShop?.phone || ctxShop?.whatsapp;
  const email = node.props.email || ctxShop?.email;
  const address = node.props.address || ctxShop?.address;
  const links = Array.isArray(node.props.links) ? node.props.links : [];

  return (
    <footer id={node.id} style={computed} className="transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-12 text-right">
        <div
          className={`grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 pb-8 border-b ${borderDivider}`}
        >
          {/* Brand Col */}
          <div className="space-y-2.5">
            <h3 className={`text-base sm:text-lg font-black ${headingClass} break-words`}>
              {brandName}
            </h3>
            <p className={`text-xs ${bodyTextClass} leading-relaxed max-w-sm break-words`}>
              {description}
            </p>
          </div>
          {/* Contact Col */}
          {(!node.props.hideContactInfo || phone || email || address) && (
            <div className="space-y-2">
              <h4 className={`text-xs font-bold ${subheadClass} uppercase tracking-wider`}>
                {node.props.contactTitle || 'معلومات التواصل'}
              </h4>
              <div className={`space-y-1.5 text-xs ${bodyTextClass}`}>
                {phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span dir="ltr">{phone}</span>
                  </div>
                )}
                {email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>{email}</span>
                  </div>
                )}
                {address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>{address}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Trust Col */}
          {!node.props.hideTrustCol && (
            <div className="space-y-2">
              <h4 className={`text-xs font-bold ${subheadClass} uppercase tracking-wider`}>
                {node.props.trustTitle || 'ضمان واعتماد'}
              </h4>
              <p className={`text-xs ${bodyTextClass} leading-relaxed`}>
                {node.props.trustDescription ||
                  'جميع المعاملات والخدمات مشمولة بضمان معتمد وفريق دعم فني متواجد على مدار الساعة.'}
              </p>
            </div>
          )}
        </div>

        {links.length > 0 && (
          <nav aria-label="روابط الموقع" className="flex flex-wrap gap-x-4 gap-y-2 py-5 text-xs">
            {links.map((item: any, index: number) => {
              const label = typeof item === 'string' ? item : item.label || item.title || '';
              if (!label) return null;
              // Editor parity: resolve object links AND plain labels to
              // real pages/sections instead of hard-coded '#'.
              const destination = resolvePublishedLinkDestination(
                website as any,
                typeof item === 'object' ? item : { text: label },
                { inferFromLabel: true, label }
              );
              const rawUrl = typeof item === 'object' ? String(item.url || item.href || '') : '';
              if (destination) {
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => followLink(typeof item === 'object' ? item : { text: label })}
                    className={`${linkHover} transition-colors cursor-pointer text-right`}
                  >
                    {label}
                  </button>
                );
              }
              if (rawUrl && !rawUrl.startsWith('#')) {
                return (
                  <a
                    key={index}
                    href={rawUrl}
                    target={/^https?:/i.test(rawUrl) ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className={`${linkHover} transition-colors`}
                  >
                    {label}
                  </a>
                );
              }
              return (
                <a key={index} href={rawUrl || '#'} className={`${linkHover} transition-colors`}>
                  {label}
                </a>
              );
            })}
          </nav>
        )}

        {/* Copyright row */}
        <div
          className={`pt-6 pb-2 text-center flex flex-col sm:flex-row items-center justify-center gap-2 text-xs ${bodyTextClass} select-none border-t ${bottomBorder} mt-6`}
        >
          <span>
            {node.props.copyright ||
              `جميع الحقوق محفوظة © ${new Date().getFullYear()} ${brandName}`}
          </span>
          <span className="hidden sm:inline opacity-30">•</span>
          <a
            href="https://mnmknk.com"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${badgeStyle} border transition-all text-[11px] font-medium shadow-xs`}
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
}
