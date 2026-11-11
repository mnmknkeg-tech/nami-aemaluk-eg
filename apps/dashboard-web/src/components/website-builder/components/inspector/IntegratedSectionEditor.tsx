import React, { useState } from 'react';
import { Sparkles, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useBuilder } from '../../context/BuilderContext';
import { DEFAULT_INSPECTOR_EXPANDED_SECTIONS } from './inspectorDefaults';
import { uploadMediaFile } from '@/lib/api/upload';
import { validateImageFile } from '@/lib/image-utils';
import { ComponentNode, StyleProperties } from '../../types/builder';
import type { ThemePreset } from '../../data/themes/types';
import { themePresets } from '../../data/themes/presets';
import {
  ImagePresetsGallery,
  ContentSection,
  HeaderSettingsSection,
  MediaSection,
  ProductCardSection,
  ColorsSection,
  ActionsSection,
  SubItemsSection,
  AdvancedSection,
  FooterSection,
  FaqSection,
} from './panels';
import { BackgroundSettingsSection } from '../sidebar/settings/BackgroundSettingsSection';

export const IntegratedSectionEditor: React.FC = () => {
  const {
    website,
    currentTenant,
    selectedNodeId,
    selectNode,
    updateNodeProps,
    updateNodeStyle,
    viewport,
    applyThemePreset,
    selectionBreadcrumbs,
  } = useBuilder();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    DEFAULT_INSPECTOR_EXPANDED_SECTIONS
  );

  const [showPresetGallery, setShowPresetGallery] = useState<boolean>(false);
  const [activeGalleryTarget, setActiveGalleryTarget] = useState<string>('node');
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!selectedNodeId) return null;
  const node = website.components[selectedNodeId];
  if (!node) return null;

  // ── Helpers ──────────────────────────────────────────────────────────────

  const findParentSection = (currNode: ComponentNode): ComponentNode | null => {
    if (
      [
        'hero',
        'header',
        'footer',
        'bento-grid',
        'products',
        'testimonials',
        'cta',
        'features',
      ].includes(currNode.type)
    ) {
      return currNode;
    }
    if (
      currNode.id.startsWith('comp_') ||
      currNode.id.includes('hero') ||
      currNode.id.includes('header') ||
      currNode.id.includes('footer')
    ) {
      return currNode;
    }
    if (!currNode.parentId) return null;
    const parent = website.components[currNode.parentId];
    if (!parent) return null;
    return findParentSection(parent);
  };

  const parentSection = findParentSection(node) || node;
  const isSectionSelected = parentSection.id === node.id;

  const toggleAccordion = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePropChange = (targetNodeId: string, key: string, value: any) => {
    const flatHeroBindings: Record<string, Record<string, string>> = {
      ':hero-badge': { text: 'badge' },
      ':hero-title': { text: 'title' },
      ':hero-description': { text: 'description' },
      ':hero-primary': { text: 'primaryCtaText', url: 'primaryCtaLink', href: 'primaryCtaLink' },
      ':hero-secondary': {
        text: 'secondaryCtaText',
        url: 'secondaryCtaLink',
        href: 'secondaryCtaLink',
      },
      ':hero-image': { src: 'imageUrl', image: 'imageUrl' },
    };
    const binding = Object.entries(flatHeroBindings).find(
      ([suffix]) => targetNodeId === `${parentSection.id}${suffix}`
    );
    const flatKey = binding?.[1][key];
    if (isHero && flatKey) {
      updateNodeProps(parentSection.id, { [flatKey]: value });
      return;
    }
    updateNodeProps(targetNodeId, { [key]: value });
  };

  const handleStyleChange = (targetNodeId: string, key: keyof StyleProperties, value: any) => {
    updateNodeStyle(targetNodeId, { [key]: value }, viewport);
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    targetNodeId: string,
    isBackground = false,
    mediaKind: 'image' | 'video' = 'image'
  ) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const validation =
      mediaKind === 'video'
        ? {
            valid:
              ['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type) &&
              file.size <= 250 * 1024 * 1024,
            error: !['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)
              ? 'صيغة الفيديو غير مدعومة؛ استخدم MP4 أو WebM أو MOV.'
              : 'حجم الفيديو كبير؛ الحد الأقصى 250MB.',
          }
        : validateImageFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'نوع أو حجم الصورة غير مقبول.');
      input.value = '';
      return;
    }
    if (!currentTenant.id) {
      setUploadError('تعذر تحديد المتجر لرفع الصورة.');
      input.value = '';
      return;
    }
    setUploadError(null);
    try {
      const url = await uploadMediaFile(
        file,
        currentTenant.id,
        mediaKind === 'video' ? 'website_video' : 'website_image'
      );
      if (!url || !/^https:\/\//i.test(url) || /^blob:/i.test(url)) {
        throw new Error('لم يُرجع التخزين رابط وسائط دائمًا وآمنًا.');
      }
      if (mediaKind === 'video') {
        handlePropChange(parentSection.id, 'mediaType', 'video');
        handlePropChange(parentSection.id, 'videoUrl', url);
      } else if (isBackground) {
        handleStyleChange(targetNodeId, 'backgroundImage', `url("${url}")`);
        handleStyleChange(targetNodeId, 'backgroundSize', 'cover');
        handleStyleChange(targetNodeId, 'backgroundPosition', 'center');
        // A gradient palette baked into backgroundColor would sit under the new
        // image and silently disappear on opaque uploads — clear it so the
        // uploaded image is the single, predictable section background.
        const targetSectionStyles = website.components[targetNodeId]?.styles?.[viewport] || {};
        if (
          typeof targetSectionStyles.backgroundColor === 'string' &&
          /gradient\s*\(/i.test(targetSectionStyles.backgroundColor)
        ) {
          handleStyleChange(targetNodeId, 'backgroundColor', undefined);
        }
      } else if (isHero && targetNodeId === parentSection.id) {
        handlePropChange(parentSection.id, 'mediaType', 'image');
        handlePropChange(parentSection.id, 'imageUrl', url);
      } else if (targetNodeId === `${parentSection.id}:hero-image`) {
        handlePropChange(parentSection.id, 'imageUrl', url);
      } else {
        handlePropChange(targetNodeId, 'src', url);
        handlePropChange(targetNodeId, 'image', url);
      }
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : 'فشل رفع الصورة؛ احتفظنا بالصورة الحالية.'
      );
    } finally {
      input.value = '';
    }
  };
  const findChildByKeyword = (startNode: ComponentNode, keyword: string): ComponentNode | null => {
    if (startNode.id.includes(keyword) || startNode.name.includes(keyword)) return startNode;
    if (startNode.childrenIds) {
      for (const cId of startNode.childrenIds) {
        const cNode = website.components[cId];
        if (cNode) {
          const found = findChildByKeyword(cNode, keyword);
          if (found) return found;
        }
      }
    }
    return null;
  };

  const findDescendantsByType = (startNode: ComponentNode, type: string): ComponentNode[] => {
    let results: ComponentNode[] = [];
    if (startNode.type === type || (type === 'card' && startNode.props?.price))
      results.push(startNode);
    if (startNode.childrenIds) {
      for (const cId of startNode.childrenIds) {
        const cNode = website.components[cId];
        if (cNode) results = results.concat(findDescendantsByType(cNode, type));
      }
    }
    return results;
  };

  // ── Derived section flags ────────────────────────────────────────────────

  const sectionType = parentSection.type as string;
  const isHero = sectionType === 'hero' || parentSection.id === 'comp_hero';
  const isHeader =
    sectionType === 'header' ||
    parentSection.id === 'comp_header' ||
    node.type === 'header' ||
    node.id.includes('header') ||
    node.parentId === 'comp_header';
  const isVehicles = sectionType === 'products' || parentSection.id === 'comp_products_grid';
  const isProductOrCard =
    isVehicles ||
    sectionType === 'products' ||
    sectionType === 'grid' ||
    node.type === 'card' ||
    Boolean(node.props?.price) ||
    Boolean(node.props?.specs) ||
    Boolean(node.props?.hoverImage) ||
    node.id.includes('card') ||
    node.id.includes('product');
  const isBento = sectionType === 'bento-grid' || parentSection.id === 'comp_bento_features';
  const isCta = sectionType === 'cta' || parentSection.id === 'comp_cta_banner';
  const isTestimonials = sectionType === 'testimonials' || parentSection.id === 'comp_testimonials';
  const isFooter = sectionType === 'footer' || parentSection.id === 'comp_footer';
  const isPageRootSelected =
    isSectionSelected && parentSection.type === 'container' && !parentSection.parentId;
  const isFaq =
    sectionType === 'faq' || parentSection.id === 'comp_faq' || parentSection.id.includes('faq');

  // ── Extracted child nodes ─────────────────────────────────────────────────

  const flatHeroNode = (suffix: string, props: Record<string, any>) =>
    ({ ...parentSection, id: `${parentSection.id}${suffix}`, props }) as ComponentNode;
  const heroBadgeNode = isHero
    ? findChildByKeyword(parentSection, 'badge') ||
      (parentSection.props?.badge !== undefined
        ? flatHeroNode(':hero-badge', { text: parentSection.props.badge })
        : null)
    : null;
  const heroTitleNode = isHero
    ? findChildByKeyword(parentSection, 'title') ||
      (parentSection.props?.title !== undefined
        ? flatHeroNode(':hero-title', { text: parentSection.props.title })
        : null)
    : null;
  const heroSubtitleNode = isHero
    ? findChildByKeyword(parentSection, 'subtitle') ||
      (parentSection.props?.description !== undefined || parentSection.props?.subtitle !== undefined
        ? flatHeroNode(':hero-description', {
            text: parentSection.props.description ?? parentSection.props.subtitle,
          })
        : null)
    : null;
  const heroPrimaryBtnNode = isHero
    ? website.components['hero_btn_primary'] ||
      findChildByKeyword(parentSection, 'primary') ||
      findChildByKeyword(parentSection, 'btn') ||
      (parentSection.props?.primaryCtaText !== undefined
        ? flatHeroNode(':hero-primary', {
            text: parentSection.props.primaryCtaText,
            url: parentSection.props.primaryCtaLink,
          })
        : null)
    : null;
  const heroSecondaryBtnNode = isHero
    ? website.components['hero_btn_secondary'] ||
      findChildByKeyword(parentSection, 'secondary') ||
      (parentSection.props?.secondaryCtaText !== undefined
        ? flatHeroNode(':hero-secondary', {
            text: parentSection.props.secondaryCtaText,
            url: parentSection.props.secondaryCtaLink,
          })
        : null)
    : null;
  const heroImageNode = isHero
    ? website.components['hero_main_image'] ||
      findChildByKeyword(parentSection, 'image') ||
      flatHeroNode(':hero-image', {
        ...parentSection.props,
        src: parentSection.props?.imageUrl || '',
      })
    : null;
  const heroStatsNode = isHero
    ? website.components['hero_stats_row'] || findChildByKeyword(parentSection, 'stats')
    : null;

  const headerLogoNode = isHeader
    ? findChildByKeyword(parentSection, 'logo') ||
      findChildByKeyword(parentSection, 'brand') ||
      findChildByKeyword(parentSection, 'badge')
    : null;
  const headerNavNode = isHeader ? findChildByKeyword(parentSection, 'nav') : null;
  const headerCtaBtn = isHeader
    ? findChildByKeyword(parentSection, 'cta_btn') ||
      findChildByKeyword(parentSection, 'cta') ||
      findChildByKeyword(parentSection, 'btn') ||
      findChildByKeyword(parentSection, 'action')
    : null;

  const vehicleCards = isVehicles ? findDescendantsByType(parentSection, 'card') : [];
  const bentoCards = isBento ? findDescendantsByType(parentSection, 'card') : [];

  const currentStyles = (node.styles[viewport] || node.styles.desktop || {}) as StyleProperties;
  const sectionStyles = (parentSection.styles[viewport] ||
    parentSection.styles.desktop ||
    {}) as StyleProperties;

  // ── Shared panel props ────────────────────────────────────────────────────

  const sharedProps = {
    node,
    parentSection,
    viewport,
    currentStyles,
    sectionStyles,
    isHero,
    isHeader,
    isVehicles,
    isProductOrCard,
    isBento,
    isCta,
    isTestimonials,
    isFooter,
    heroBadgeNode,
    heroTitleNode,
    heroSubtitleNode,
    heroPrimaryBtnNode,
    heroSecondaryBtnNode,
    heroImageNode,
    heroStatsNode,
    headerLogoNode,
    headerNavNode,
    headerCtaBtn,
    vehicleCards,
    bentoCards,
    showPresetGallery,
    setShowPresetGallery,
    activeGalleryTarget,
    setActiveGalleryTarget,
    expandedSections,
    toggleAccordion,
    handlePropChange,
    handleStyleChange,
    handleFileUpload,
    selectNode,
    website,
  };

  // Group themes by category for the theme gallery panel
  const themesByCategory = Object.entries(themePresets).reduce(
    (acc: Record<string, Array<ThemePreset & { key: string }>>, [key, p]) => {
      const cat = p.category || 'general';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push({ ...p, key });
      return acc;
    },
    {}
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-white text-slate-800 select-none">
      {uploadError && (
        <div
          role="alert"
          className="mx-3 mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800"
        >
          {uploadError}
        </div>
      )}
      {/* SECTION BREADCRUMB & CONTEXT BANNER */}
      <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50/60 border-b border-blue-100/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-blue-950">{parentSection.name}</span>
              <span className="text-[9px] bg-blue-200/70 text-blue-900 font-mono px-1.5 py-0.2 rounded font-bold">
                {parentSection.type}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-blue-600/80 font-medium">
              <span>تعديل الجزء المحدد فقط</span>
              {!isSectionSelected && <span className="text-blue-400">· {node.name}</span>}
            </div>
            {selectionBreadcrumbs.length > 1 && (
              <nav
                aria-label="مسار التحديد"
                className="mt-1 flex max-w-[260px] items-center gap-1 overflow-x-auto text-[9px] text-blue-700/70"
              >
                {selectionBreadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.id}>
                    {index > 0 && <span aria-hidden="true">/</span>}
                    <button
                      type="button"
                      onClick={() => selectNode(crumb.id)}
                      className="shrink-0 rounded px-1 py-0.5 transition-colors hover:bg-blue-100 hover:text-blue-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      aria-current={index === selectionBreadcrumbs.length - 1 ? 'page' : undefined}
                    >
                      {crumb.name}
                    </button>
                  </React.Fragment>
                ))}
              </nav>
            )}
          </div>
        </div>

        {!isSectionSelected && (
          <button
            onClick={() => selectNode(parentSection.id)}
            className="px-2 py-1 bg-white hover:bg-blue-100/70 border border-blue-200 text-[10px] font-bold text-blue-700 rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
            title="تحديد كامل القسم"
          >
            <span>تحديد القسم بالكامل</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* IMAGE PRESETS GALLERY (conditional overlay) */}
      {showPresetGallery && <ImagePresetsGallery {...sharedProps} />}

      {/* ACCORDION PANELS — STRICT CONTEXT-AWARE GATING */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {isPageRootSelected && <BackgroundSettingsSection />}

        {/* 1. Header Section: Only Header Settings & Colors, hide Media/Actions/Subitems */}
        {isHeader && (
          <>
            <HeaderSettingsSection {...sharedProps} />
            <ColorsSection {...sharedProps} />
          </>
        )}

        {/* 2. Footer Section: Only Footer Controls & Colors, hide Content/Media/Actions */}
        {isFooter && (
          <>
            <FooterSection {...sharedProps} />
            <ColorsSection {...sharedProps} />
          </>
        )}

        {/* 3. FAQ Section: Only FAQ Q&A CRUD & Colors */}
        {isFaq && (
          <>
            <FaqSection {...sharedProps} />
            <ColorsSection {...sharedProps} />
          </>
        )}

        {/* 4. Products / Storefront Grid: Only Product Cards & Colors & Subitems */}
        {isProductOrCard && !isHeader && !isFooter && !isFaq && (
          <>
            <ContentSection {...sharedProps} />
            <ProductCardSection {...sharedProps} />
            <ColorsSection {...sharedProps} />
            <SubItemsSection {...sharedProps} />
          </>
        )}

        {/* 5. Hero / Banner / CTA / Testimonials / Other Standard Sections */}
        {!isHeader && !isFooter && !isFaq && !isProductOrCard && (
          <>
            <ContentSection {...sharedProps} />
            {(isHero || isCta || isTestimonials) && <MediaSection {...sharedProps} />}
            <ColorsSection {...sharedProps} />
            {(isHero || isCta) && <ActionsSection {...sharedProps} />}
            {(isVehicles || isBento || isTestimonials) && <SubItemsSection {...sharedProps} />}
          </>
        )}

        {/* Advanced spacing & visibility controls */}
        <AdvancedSection {...sharedProps} />
      </div>
    </div>
  );
};
