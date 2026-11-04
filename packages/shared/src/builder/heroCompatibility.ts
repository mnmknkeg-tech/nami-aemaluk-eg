import type { ComponentNode } from './types';

export interface HeroContentValues {
  badge?: string;
  title?: string;
  highlightTitle?: string;
  description?: string;
  primaryCtaText?: string;
  primaryCtaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  imageUrl?: string;
  stats: Array<{ label?: string; value?: string }>;
  childContent: {
    badge: boolean;
    title: boolean;
    description: boolean;
    primaryCta: boolean;
    secondaryCta: boolean;
    image: boolean;
    stats: boolean;
  };
}

const textValue = (props: Record<string, any> | undefined) =>
  [props?.text, props?.title, props?.label, props?.value].find(
    (value) => typeof value === 'string' && value.length > 0
  );

function descendants(
  node: ComponentNode,
  components: Record<string, ComponentNode>
): ComponentNode[] {
  const result: ComponentNode[] = [];
  const seen = new Set<string>();
  const visit = (parent: ComponentNode) => {
    for (const id of parent.childrenIds || []) {
      if (seen.has(id)) continue;
      seen.add(id);
      const child = components[id];
      if (!child) continue;
      result.push(child);
      visit(child);
    }
  };
  visit(node);
  return result;
}

/** Read both legacy flat Hero props and child-based Hero content without rewriting saved data. */
export function resolveHeroContent(
  node: ComponentNode,
  components: Record<string, ComponentNode> = {}
): HeroContentValues {
  const children = descendants(node, components);
  const named = (pattern: RegExp) =>
    children.find((child) => pattern.test(`${child.id} ${child.name}`.toLowerCase()));
  const heading =
    named(/title|heading|عنوان/) || children.find((child) => child.type === 'heading');
  const description =
    named(/subtitle|description|desc|وصف/) || children.find((child) => child.type === 'paragraph');
  const buttons = children.filter(
    (child) => child.type === 'button' || child.category === 'action'
  );
  const primaryButton = named(/primary|main|الرئيسي|أساسي/) || buttons[0];
  const secondaryButton =
    named(/secondary|second|الثانوي|ثانوي/) ||
    buttons.find((button) => button.id !== primaryButton?.id);
  const image =
    named(/hero.*image|main.*image|صورة/) || children.find((child) => child.type === 'image');
  const badge = named(/badge|badge_text|شارة/);
  const url = (button?: ComponentNode) =>
    button?.props?.url || button?.props?.href || button?.props?.link || undefined;
  const props = node.props || {};

  return {
    badge: badge ? textValue(badge.props) : props.badge,
    title: heading ? textValue(heading.props) : props.title,
    highlightTitle: props.highlightTitle,
    description: description ? textValue(description.props) : (props.description ?? props.subtitle),
    primaryCtaText: primaryButton ? textValue(primaryButton.props) : props.primaryCtaText,
    primaryCtaLink: primaryButton ? url(primaryButton) : props.primaryCtaLink,
    secondaryCtaText: secondaryButton ? textValue(secondaryButton.props) : props.secondaryCtaText,
    secondaryCtaLink: secondaryButton ? url(secondaryButton) : props.secondaryCtaLink,
    imageUrl: image
      ? (image.props?.src ?? image.props?.image ?? image.props?.imageUrl)
      : props.imageUrl,
    stats: Array.isArray(props.stats) ? props.stats : [],
    childContent: {
      badge: Boolean(badge),
      title: Boolean(heading),
      description: Boolean(description),
      primaryCta: Boolean(primaryButton),
      secondaryCta: Boolean(secondaryButton),
      image: Boolean(image),
      stats: Boolean(named(/stats|statistics|إحصاء/)),
    },
  };
}
