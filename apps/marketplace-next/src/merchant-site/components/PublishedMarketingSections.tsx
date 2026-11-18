import React from 'react';
import { CheckCircle, CreditCard, ShieldCheck, Star, Truck } from 'lucide-react';

type MarketingNode = {
  id: string;
  props: Record<string, any>;
};

type MarketingTheme = {
  colors: { primary: string };
};

function SectionHeading({ node, primaryColor }: { node: MarketingNode; primaryColor: string }) {
  if (!node.props.title && !node.props.badge) return null;
  return (
    <div className="text-center mb-10 space-y-2 max-w-2xl mx-auto">
      {node.props.badge && (
        <span
          style={{ backgroundColor: `${primaryColor}18`, color: primaryColor }}
          className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block"
        >
          {node.props.badge}
        </span>
      )}
      {node.props.title && (
        <h2 className="text-3xl font-extrabold text-slate-900">{node.props.title}</h2>
      )}
      {node.props.subtitle && <p className="text-sm text-slate-600">{node.props.subtitle}</p>}
    </div>
  );
}

export function PublishedTestimonialsSection({
  node,
  style,
  theme,
  renderChildren,
}: {
  node: MarketingNode;
  style: React.CSSProperties;
  theme: MarketingTheme;
  renderChildren: () => React.ReactNode;
}) {
  const reviews: any[] = node.props.testimonials || node.props.reviews || [];
  return (
    <section id={node.id} style={style} data-section="testimonials">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <SectionHeading node={node} primaryColor={theme.colors.primary} />
        {reviews.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map((review: any, index: number) => (
              <div
                key={review.id || index}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex gap-1 text-amber-400">
                    {Array.from({ length: review.rating || 5 }).map((_, starIndex) => (
                      <Star key={starIndex} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed italic">
                    "{review.text || review.quote}"
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-900">{review.name || review.author}</h4>
                  {(review.role || review.position) && (
                    <span className="text-[11px] text-slate-500">{review.role || review.position}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {renderChildren()}
      </div>
    </section>
  );
}

export function PublishedFeaturesSection({
  node,
  style,
  theme,
  renderChildren,
}: {
  node: MarketingNode;
  style: React.CSSProperties;
  theme: MarketingTheme;
  renderChildren: () => React.ReactNode;
}) {
  const features: any[] = node.props.features || [];
  return (
    <section id={node.id} style={style}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <SectionHeading node={node} primaryColor={theme.colors.primary} />
        {features.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature: any, index: number) => (
              <div
                key={feature.id || index}
                className="p-6 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 space-y-3"
              >
                <div
                  style={{ backgroundColor: `${theme.colors.primary}15`, color: theme.colors.primary }}
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                >
                  {feature.icon === 'ShieldCheck' ? (
                    <ShieldCheck className="w-6 h-6" />
                  ) : feature.icon === 'Truck' ? (
                    <Truck className="w-6 h-6" />
                  ) : feature.icon === 'CreditCard' ? (
                    <CreditCard className="w-6 h-6" />
                  ) : (
                    <CheckCircle className="w-6 h-6" />
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900">{feature.title}</h3>
                {feature.description && (
                  <p className="text-xs text-slate-500 leading-relaxed">{feature.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
        {renderChildren()}
      </div>
    </section>
  );
}
