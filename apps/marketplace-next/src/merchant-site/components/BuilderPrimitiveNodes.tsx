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

export function PublishedParagraphNode({
  id,
  text,
  props,
  destination,
  style,
  onFollowLink,
}: {
  id: string;
  text: string;
  props: Record<string, any>;
  destination?: Record<string, any>;
  style: React.CSSProperties;
  onFollowLink: (source: Record<string, any>, opts?: { inferFromLabel?: boolean }) => boolean;
}) {
  const navItems = Array.isArray(props.navigationItems)
    ? (props.navigationItems as Array<Record<string, any>>).filter(
        (item) => item?.label && !item.hidden
      )
    : null;

  if (navItems && navItems.length > 0) {
    return (
      <div id={id} style={style} className="flex flex-wrap items-center gap-2">
        {navItems.map((item, index) => (
          <span
            key={`${item.label}-${index}`}
            onClick={() => onFollowLink(item, { inferFromLabel: true })}
            className="cursor-pointer transition-colors hover:opacity-80"
          >
            {item.label}
          </span>
        ))}
      </div>
    );
  }

  if (typeof text === 'string' && (text.includes(' • ') || text.includes(' | '))) {
    const delimiter = text.includes(' • ') ? ' • ' : ' | ';
    const items = text.split(delimiter).map((item) => item.trim());
    return (
      <p id={id} style={style} className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const navigationItem = (props.navigationItems || []).find(
            (candidate: { label?: string }) => candidate.label?.trim() === item
          );
          return (
            <React.Fragment key={index}>
              <span
                onClick={() =>
                  onFollowLink(
                    { ...props, destination: navigationItem?.destination },
                    { inferFromLabel: true }
                  )
                }
                className="cursor-pointer transition-colors hover:opacity-80"
              >
                {item}
              </span>
              {index < items.length - 1 && <span className="opacity-40 select-none">•</span>}
            </React.Fragment>
          );
        })}
      </p>
    );
  }

  const isLinkLike = Boolean(
    destination ||
      props.destination ||
      props.pageId ||
      props.targetPageId ||
      String(props.url || props.href || props.link || '').trim() ||
      props.allowLegacyLabelNavigation === true
  );

  if (isLinkLike && String(text).trim()) {
    return (
      <p
        id={id}
        style={style}
        onClick={() => onFollowLink({ ...props, destination }, { inferFromLabel: true })}
        className="cursor-pointer transition-opacity hover:opacity-80"
      >
        {text}
      </p>
    );
  }

  return (
    <p id={id} style={style}>
      {text}
    </p>
  );
}
