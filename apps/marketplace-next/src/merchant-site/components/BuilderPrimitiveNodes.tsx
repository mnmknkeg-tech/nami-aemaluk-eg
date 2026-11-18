import React from 'react';

interface PublishedNodeStyleProps {
  id: string;
  style: React.CSSProperties;
}

export function PublishedHeadingNode({
  id, tag, text, badgeText, storeLogo, shopName, primaryColor, style,
}: PublishedNodeStyleProps & {
  tag: string;
  text: string;
  badgeText?: string;
  storeLogo?: string;
  shopName?: string;
  primaryColor: string;
}) {
  const content = (
    <>
      {storeLogo && <img src={storeLogo} alt={shopName || 'شعار المتجر'} className="inline-block max-h-12 max-w-[200px] object-contain align-middle ml-2" />}
      {text}
      {badgeText && (
        <span style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }} className="mr-2 text-xs font-bold px-2 py-0.5 rounded-full inline-block align-middle">
          {badgeText}
        </span>
      )}
    </>
  );
  switch (tag) {
    case 'h1': return <h1 id={id} style={style}>{content}</h1>;
    case 'h3': return <h3 id={id} style={style}>{content}</h3>;
    case 'h4': return <h4 id={id} style={style}>{content}</h4>;
    default: return <h2 id={id} style={style}>{content}</h2>;
  }
}

export function PublishedBadgeNode({ id, text, style }: PublishedNodeStyleProps & { text: string }) {
  return <div id={id} style={style} className="inline-flex items-center">{text}</div>;
}

export function PublishedImageNode({ id, src, alt, style }: PublishedNodeStyleProps & { src: string; alt: string }) {
  return (
    <div id={id} style={style} className="overflow-hidden">
      <img src={src} alt={alt} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
    </div>
  );
}
