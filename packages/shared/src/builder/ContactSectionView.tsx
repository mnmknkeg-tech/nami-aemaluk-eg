import React from 'react';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import type { ComponentNode, SiteShopContext } from './types';
import { withAlpha } from './theme';

type ContactTheme = { colors: { primary: string } };

export function ContactSectionView({
  node,
  theme,
  shop,
  whatsappHref,
  style,
  children,
}: {
  node: ComponentNode;
  theme: ContactTheme;
  shop: SiteShopContext;
  whatsappHref?: string | null;
  style: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const phone = node.props.phone || shop.phone;
  const email = node.props.email || shop.email;
  const address = node.props.address || shop.address;

  return (
    <section id={node.id} style={style} className="transition-all">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-16">
        {(node.props.title || node.props.badge) && (
          <div className="text-center mb-8 sm:mb-10 space-y-2 max-w-2xl mx-auto">
            {node.props.badge && (
              <span
                style={{
                  backgroundColor: withAlpha(theme.colors.primary, '18'),
                  color: theme.colors.primary,
                }}
                className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block"
              >
                {node.props.badge}
              </span>
            )}
            {node.props.title && (
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 break-words">
                {node.props.title}
              </h2>
            )}
            {node.props.subtitle && (
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed break-words">
                {node.props.subtitle}
              </p>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex flex-col items-center gap-2 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all text-center group"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform"
                style={{
                  backgroundColor: withAlpha(theme.colors.primary, '15'),
                  color: theme.colors.primary,
                }}
              >
                <Phone className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-slate-700">
                {node.props.phoneLabel || 'اتصل بنا'}
              </div>
              <div className="text-sm font-extrabold text-slate-900" dir="ltr">
                {phone}
              </div>
            </a>
          )}
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-5 bg-emerald-50 rounded-2xl border border-emerald-200 shadow-sm hover:shadow-md transition-all text-center group"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform bg-emerald-100 text-emerald-600">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-emerald-700">
                {node.props.whatsappLabel || 'واتساب'}
              </div>
              <div className="text-sm font-extrabold text-emerald-900" dir="ltr">
                {phone}
              </div>
            </a>
          )}
          {(email || address) && (
            <div className="flex flex-col gap-3">
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all"
                >
                  <Mail className="w-4 h-4 shrink-0" style={{ color: theme.colors.primary }} />
                  <span className="text-xs text-slate-700 truncate">{email}</span>
                </a>
              )}
              {address && (
                <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <MapPin
                    className="w-4 h-4 shrink-0"
                    style={{ color: theme.colors.primary }}
                  />
                  <span className="text-xs text-slate-700">{address}</span>
                </div>
              )}
            </div>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}
