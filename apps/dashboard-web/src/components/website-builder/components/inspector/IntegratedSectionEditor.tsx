import React, { useState } from 'react';
import { Sparkles, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useBuilder } from '../../context/BuilderContext';
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
} from './panels';

export const IntegratedSectionEditor: React.FC = () => {
  const {
    website,
    selectedNodeId,
    selectNode,
    updateNodeProps,
    updateNodeStyle,
    theme,
    viewport,
  } = useBuilder();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    content: true,
    media: true,
    headerSettings: true,
    productCard: true,
    colors: true,
    theme: true,
    actions: true,
    subitems: true,
    advanced: false,
  });

  const [showPresetGallery, setShowPresetGallery] = useState<boolean>(false);
  const [activeGalleryTarget, setActiveGalleryTarget] = useState<string>('node');

  if (!selectedNodeId) return null;
  const node = website.components[selectedNodeId];
  if (!node) return null;

  // ── Helpers ──────────────────────────────────────────────────────────────

  const findParentSection = (currNode: ComponentNode): ComponentNode | null => {
    if (['hero', 'header', 'footer', 'bento-grid', 'products', 'testimonials', 'cta', 'features'].includes(currNode.type)) {
      return currNode;
    }
    if (currNode.id.startsWith('comp_') || currNode.id.includes('hero') || currNode.id.includes('header') || currNode.id.includes('footer')) {
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
    updateNodeProps(targetNodeId, { [key]: value });
  };

  const handleStyleChange = (targetNodeId: string, key: keyof StyleProperties, value: any) => {
    updateNodeStyle(targetNodeId, { [key]: value }, viewport);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, targetNodeId: string, isBackground = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      if (isBackground) {
        handleStyleChange(targetNodeId, 'backgroundImage', `url(${url})`);
        handleStyleChange(targetNodeId, 'backgroundSize', 'cover');
        handleStyleChange(targetNodeId, 'backgroundPosition', 'center');
      } else {
        handlePropChange(targetNodeId, 'src', url);
        handlePropChange(targetNodeId, 'image', url);
      }
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
    if (startNode.type === type || (type === 'card' && startNode.props?.price)) results.push(startNode);
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
  const isHeader = sectionType === 'header' || parentSection.id === 'comp_header' || node.type === 'header' || node.id.includes('header') || node.parentId === 'comp_header';
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

  // ── Extracted child nodes ─────────────────────────────────────────────────

  const heroBadgeNode = isHero ? findChildByKeyword(parentSection, 'badge') : null;
  const heroTitleNode = isHero ? findChildByKeyword(parentSection, 'title') : null;
  const heroSubtitleNode = isHero ? findChildByKeyword(parentSection, 'subtitle') : null;
  const heroPrimaryBtnNode = isHero ? (website.components['hero_btn_primary'] || findChildByKeyword(parentSection, 'primary') || findChildByKeyword(parentSection, 'btn')) : null;
  const heroSecondaryBtnNode = isHero ? (website.components['hero_btn_secondary'] || findChildByKeyword(parentSection, 'secondary')) : null;
  const heroImageNode = isHero ? (website.components['hero_main_image'] || findChildByKeyword(parentSection, 'image')) : null;
  const heroStatsNode = isHero ? (website.components['hero_stats_row'] || findChildByKeyword(parentSection, 'stats')) : null;

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
  const sectionStyles = (parentSection.styles[viewport] || parentSection.styles.desktop || {}) as StyleProperties;

  // ── Shared panel props ────────────────────────────────────────────────────

  const sharedProps = {
    node,
    parentSection,
    viewport,
    currentStyles,
    sectionStyles,
    isHero, isHeader, isVehicles, isProductOrCard, isBento, isCta, isTestimonials, isFooter,
    heroBadgeNode, heroTitleNode, heroSubtitleNode, heroPrimaryBtnNode, heroSecondaryBtnNode, heroImageNode, heroStatsNode,
    headerLogoNode, headerNavNode, headerCtaBtn,
    vehicleCards, bentoCards,
    showPresetGallery, setShowPresetGallery,
    activeGalleryTarget, setActiveGalleryTarget,
    expandedSections, toggleAccordion,
    handlePropChange, handleStyleChange, handleFileUpload,
    selectNode,
    website,
  };

  // Group themes by category for the theme gallery panel
  const themesByCategory = Object.values(themePresets).reduce((acc: Record<string, ThemePreset[]>, p) => {
    const cat = p.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-white text-slate-800 select-none">
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
            <span className="text-[10px] text-blue-600/80 font-medium">لوحة التعديل الشاملة (All-in-One)</span>
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

      {/* ACCORDION PANELS */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        <ContentSection {...sharedProps} />
        <HeaderSettingsSection {...sharedProps} />
        <MediaSection {...sharedProps} />
        <ProductCardSection {...sharedProps} />
        <ColorsSection {...sharedProps} />
        <ActionsSection {...sharedProps} />
        <SubItemsSection {...sharedProps} />
        <AdvancedSection {...sharedProps} />

        {/* THEME GALLERY — visual theme selection using new category/descriptionAr/preview fields */}
        <div className="space-y-2 p-3">
          <button
            onClick={() => toggleAccordion('theme')}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-800 hover:text-blue-600 transition-colors py-1 cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>اختيار الثيم (Theme Gallery)</span>
            </div>
            {expandedSections.theme ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
          {expandedSections.theme && (
            <div className="space-y-3 pt-2.5">
              {Object.entries(themesByCategory).map(([category, presets]) => (
                <div key={category} className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">
                    {category}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                    {presets.map((p) => (
                      <button
                        key={p.name}
                        onClick={() => {
                          const tokens = p.tokens;
                          if (tokens.colors) {
                            handleStyleChange(
                              parentSection.id,
                              'backgroundColor',
                              tokens.colors.background ?? tokens.colors.surface ?? '#ffffff'
                            );
                            handleStyleChange(
                              parentSection.id,
                              'textColor',
                              tokens.colors.textPrimary ?? '#0f172a'
                            );
                          }
                        }}
                        className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex flex-col items-center text-right transition-colors cursor-pointer group"
                      >
                        <div
                          className="w-8 h-8 rounded-lg border border-black/10 mb-1"
                          style={{ background: p.preview?.bg || '#f1f5f9' }}
                        >
                          <div
                            className="w-4 h-4 rounded-full mt-1 mx-auto"
                            style={{ background: p.preview?.card || '#ffffff' }}
                          />
                        </div>
                        <span className="text-[9px] font-bold text-slate-700 truncate text-center leading-tight">
                          {p.nameAr}
                        </span>
                        <span className="text-[8px] text-slate-400 text-center leading-tight">
                          {p.descriptionAr}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
