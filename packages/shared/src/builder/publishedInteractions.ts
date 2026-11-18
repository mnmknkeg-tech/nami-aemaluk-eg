import type React from 'react';
import type { BuilderPage, ComponentNode, Website } from './types';
import type { NodeViewContext } from './NodeView';
import {
  resolveWebsiteLinkDestination,
  inferWebsiteLinkDestinationFromLabel,
} from './linkDestinations';

function findPage(website: Website, matcher: (page: BuilderPage) => boolean): BuilderPage | undefined {
  return website.pages.find(matcher);
}

/**
 * Resolve a published link/button click to page navigation, anchor scrolling,
 * subscription/cart actions, or an external URL.
 */
export function handlePublishedNodeInteraction(
  e: React.MouseEvent,
  node: ComponentNode,
  ctx: NodeViewContext
) {
  function findPage(website: Website, matcher: (p: BuilderPage) => boolean): BuilderPage | undefined {
    return website.pages.find(matcher);
  }
  
  /**
   * Resolve a click on a link/button node to a page navigation, anchor scroll,
   * or external URL — same resolution order as the editor's interactive preview.
   */
  function handleInteraction(e: React.MouseEvent, node: ComponentNode, ctx: NodeViewContext) {
    const { website, activePage, onNavigatePage } = ctx;
  
    const destination =
      node.props.destination ||
      node.destination ||
      resolveWebsiteLinkDestination(website, {
        ...node.props,
        targetPageId: node.props.targetPageId,
      }) ||
      // Legacy text-only links the editor preview still navigates (only when
      // the node opts in) must not go dead after publishing.
      (node.props.allowLegacyLabelNavigation === true
        ? inferWebsiteLinkDestinationFromLabel(
            website,
            String(node.props.text || node.props.title || '')
          )
        : undefined);
    if (destination?.type === 'none') return;
    if (destination) {
      e.preventDefault();
      e.stopPropagation();
      if (destination.type === 'external' || destination.type === 'whatsapp') {
        if (!ctx.previewMode) {
          window.open(destination.url, '_blank', 'noopener,noreferrer');
        }
        return;
      }
      if (destination.type === 'order') {
        ctx.onOpenCart?.();
        return;
      }
      const targetPage = destination.pageId
        ? findPage(website, (page) => page.id === destination.pageId)
        : undefined;
      if (!targetPage) return;
      if (targetPage.id !== activePage.id) onNavigatePage(targetPage.id);
      if (destination.type === 'section' || destination.type === 'booking') {
        const scrollToSection = () => {
          if (!destination.sectionId) return;
          document
            .getElementById(destination.sectionId)
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
        if (targetPage.id === activePage.id) scrollToSection();
        else window.setTimeout(scrollToSection, 0);
      }
      return;
    }
  
    const url = (node.props.url ?? node.props.href ?? node.props.link ?? '').trim();
    const pageId = (node.props.pageId ?? node.props.targetPage ?? '').trim();
    const text = (node.props.text ?? node.props.title ?? '').trim();
  
    // Subscription modal trigger for any subscription / pricing button
    if (
      ctx.previewMode &&
      (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(url) || /whatsapp|wa\.me|checkout|subscribe/i.test(url))
    ) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  
    if (
      !ctx.previewMode &&
      ctx.onSubscribePlan &&
      (/اشتراك|باقة|اختر هذه الباقة|عضوية/.test(text) ||
        node.id.includes('tmpl_p1_btn') ||
        node.id.includes('tmpl_p2_btn') ||
        node.id.includes('tmpl_p3_btn') ||
        node.id.includes('prv_btn') ||
        url === '#subscribe' ||
        url === 'subscribe')
    ) {
      e.preventDefault();
      e.stopPropagation();
      ctx.onSubscribePlan({ title: text || 'باقة الاشتراك' });
      return;
    }
  
    const go = (page: BuilderPage) => {
      e.preventDefault();
      e.stopPropagation();
      if (page.id !== activePage.id) onNavigatePage(page.id);
    };
  
    // 1. Direct page id target
    if (pageId) {
      const match = findPage(website, (p) => p.id === pageId);
      if (match) return go(match);
    }
  
    // 2. URL / anchor / route resolution
    if (url) {
      if (url.startsWith('#')) {
        const anchorName = url.replace(/^#+/, '').trim().toLowerCase();
        const matchedPage = findPage(
          website,
          (p) =>
            p.slug.toLowerCase() === anchorName ||
            p.id.toLowerCase() === anchorName ||
            p.id.toLowerCase() === `page_${anchorName}`
        );
        if (matchedPage && matchedPage.id !== activePage.id) return go(matchedPage);
  
        e.preventDefault();
        e.stopPropagation();
        const targetElement =
          document.getElementById(anchorName) ||
          document.getElementById(`comp_${anchorName}`) ||
          document.getElementById(`tmpl_${anchorName}`) ||
          document.getElementById(node.id);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }
  
      const cleanSlug = url
        .replace(/^[#/]+/, '')
        .toLowerCase()
        .trim();
      const pageBySlug = findPage(
        website,
        (p) =>
          p.slug.toLowerCase() === cleanSlug ||
          p.id.toLowerCase() === cleanSlug ||
          p.id.toLowerCase() === `page_${cleanSlug}` ||
          p.name.trim().toLowerCase() === cleanSlug
      );
      if (pageBySlug) return go(pageBySlug);
  
      if (
        url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('tel:') ||
        url.startsWith('mailto:')
      ) {
        if (ctx.previewMode) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }
    }
  }
}
