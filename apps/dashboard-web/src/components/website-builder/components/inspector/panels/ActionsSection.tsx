import React from 'react';
import { Link, MessageCircle, Phone, ChevronDown, ChevronUp } from 'lucide-react';
import { resolveWebsiteLinkDestination, type WebsiteLinkDestination } from '@ray-eg/shared/builder';
import { useBuilder } from '../../../context/BuilderContext';
import type { InspectorPanelProps } from './types';

type ActionsSectionProps = Pick<
  InspectorPanelProps,
  | 'node'
  | 'isHero'
  | 'heroPrimaryBtnNode'
  | 'heroSecondaryBtnNode'
  | 'expandedSections'
  | 'toggleAccordion'
  | 'handlePropChange'
>;

export const ActionsSection: React.FC<ActionsSectionProps> = ({
  node,
  isHero,
  heroPrimaryBtnNode,
  heroSecondaryBtnNode,
  expandedSections,
  toggleAccordion,
  handlePropChange,
}) => (
  <ActionsSectionContent
    node={node}
    isHero={isHero}
    heroPrimaryBtnNode={heroPrimaryBtnNode}
    heroSecondaryBtnNode={heroSecondaryBtnNode}
    expandedSections={expandedSections}
    toggleAccordion={toggleAccordion}
    handlePropChange={handlePropChange}
  />
);

const ActionsSectionContent: React.FC<ActionsSectionProps> = ({
  node,
  isHero,
  heroPrimaryBtnNode,
  heroSecondaryBtnNode,
  expandedSections,
  toggleAccordion,
  handlePropChange,
}) => {
  const { website } = useBuilder();
  const targetNode = (isHero && heroPrimaryBtnNode) || node;
  const targetDestination =
    targetNode.props.destination ||
    targetNode.destination ||
    resolveWebsiteLinkDestination(website, targetNode.props);
  const secondaryDestination =
    heroSecondaryBtnNode?.props.destination ||
    heroSecondaryBtnNode?.destination ||
    (heroSecondaryBtnNode
      ? resolveWebsiteLinkDestination(website, heroSecondaryBtnNode.props)
      : undefined);
  const pages = website.pages;
  const sectionsForPage = (pageId: string) => {
    const page = pages.find((candidate) => candidate.id === pageId);
    if (!page) return [];
    const sections: Array<{ id: string; label: string }> = [];
    const visited = new Set<string>();
    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      const component = website.components[id];
      if (!component) return;
      if (id !== page.rootNodeId && component.type !== 'header' && component.type !== 'footer') {
        sections.push({ id, label: component.name || id });
      }
      component.childrenIds.forEach(visit);
    };
    visit(page.rootNodeId);
    return sections;
  };
  const setDestination = (componentId: string, destination: WebsiteLinkDestination | undefined) =>
    handlePropChange(componentId, 'destination', destination);
  const updateDestinationUrl = (
    componentId: string,
    type: 'external' | 'whatsapp',
    url: string
  ) => {
    setDestination(componentId, { type, url });
    handlePropChange(componentId, 'url', url);
    handlePropChange(componentId, 'href', url);
  };
  const changeDestinationType = (
    componentId: string,
    type: string,
    currentNode: typeof targetNode,
    currentDestination: WebsiteLinkDestination | undefined
  ) => {
    const pageId =
      currentDestination && 'pageId' in currentDestination
        ? currentDestination.pageId
        : pages[0]?.id;
    const firstSection = pageId ? sectionsForPage(pageId)[0]?.id : undefined;
    if (type === 'unassigned') {
      setDestination(componentId, { type: 'none' });
    } else if (type === 'page' && pageId) {
      setDestination(componentId, { type, pageId });
    } else if (type === 'section' && pageId && firstSection) {
      setDestination(componentId, {
        type,
        pageId,
        sectionId:
          currentDestination?.type === 'section' && currentDestination.pageId === pageId
            ? currentDestination.sectionId
            : firstSection,
      });
    } else if (type === 'booking' && pageId) {
      setDestination(
        componentId,
        currentDestination?.type === 'booking' && currentDestination.pageId === pageId
          ? currentDestination
          : { type, pageId }
      );
    } else if (type === 'order') {
      setDestination(componentId, { type });
    } else if (type === 'external' || type === 'whatsapp') {
      const currentUrl = String(
        currentNode.props.url ||
          currentNode.props.href ||
          (currentDestination &&
          (currentDestination.type === 'external' || currentDestination.type === 'whatsapp')
            ? currentDestination.url
            : '')
      );
      updateDestinationUrl(
        componentId,
        type,
        type === 'whatsapp' && /(?:wa\.me|whatsapp)/i.test(currentUrl) ? currentUrl : ''
      );
    }
  };
  const renderDestinationControls = (
    componentId: string,
    currentNode: typeof targetNode,
    destination: WebsiteLinkDestination | undefined
  ) => (
    <>
      <label className="text-[10px] font-bold text-slate-600 block">نوع الوجهة</label>
      <select
        value={destination?.type === 'none' ? 'unassigned' : destination?.type || 'unassigned'}
        onChange={(event) =>
          changeDestinationType(componentId, event.target.value, currentNode, destination)
        }
        className="w-full bg-white border border-slate-200 rounded p-1.5 text-[11px] text-slate-700"
      >
        <option value="unassigned">بدون وجهة</option>
        <option value="page">صفحة داخل الموقع</option>
        <option value="section">قسم داخل صفحة</option>
        <option value="booking">حجز / موعد</option>
        <option value="external">رابط خارجي / اتصال / بريد</option>
        <option value="whatsapp">إجراء واتساب صريح</option>
        <option value="order">طلب / سلة</option>
      </select>
      {destination &&
        'pageId' in destination &&
        (destination.type === 'page' ||
          destination.type === 'section' ||
          destination.type === 'booking') && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-600 block">الصفحة المقصودة</label>
            <select
              value={destination.pageId}
              onChange={(event) => {
                if (destination.type === 'section') {
                  const sectionId = sectionsForPage(event.target.value)[0]?.id;
                  if (sectionId) {
                    setDestination(componentId, {
                      type: 'section',
                      pageId: event.target.value,
                      sectionId,
                    });
                  }
                } else {
                  setDestination(componentId, {
                    type: destination.type,
                    pageId: event.target.value,
                  });
                }
              }}
              className="w-full bg-white border border-slate-200 rounded p-1.5 text-[11px] text-slate-700"
            >
              {pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.name}
                </option>
              ))}
            </select>
          </div>
        )}
      {destination &&
        'sectionId' in destination &&
        (destination.type === 'section' || destination.type === 'booking') && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-600 block">القسم المقصود</label>
            <select
              value={destination.sectionId}
              onChange={(event) =>
                setDestination(componentId, {
                  ...destination,
                  sectionId: event.target.value,
                })
              }
              className="w-full bg-white border border-slate-200 rounded p-1.5 text-[11px] text-slate-700"
            >
              {sectionsForPage(destination.pageId).map((section) => (
                <option key={section.id} value={section.id}>
                  {section.label}
                </option>
              ))}
            </select>
          </div>
        )}
      {(destination?.type === 'external' || destination?.type === 'whatsapp') && (
        <input
          type="text"
          value={destination.url}
          onChange={(event) =>
            updateDestinationUrl(componentId, destination.type, event.target.value)
          }
          placeholder={
            destination.type === 'whatsapp'
              ? 'https://wa.me/رقم-المتجر'
              : 'https://... أو tel: أو mailto:'
          }
          className="w-full bg-white border border-slate-200 rounded p-1.5 font-mono text-[11px] text-slate-700 outline-hidden focus:border-blue-500"
        />
      )}
    </>
  );

  return (
    <div className="p-3">
      <button
        onClick={() => toggleAccordion('actions')}
        className="w-full flex items-center justify-between text-xs font-bold text-slate-800 hover:text-blue-600 transition-colors py-1 cursor-pointer"
      >
        <div className="flex items-center gap-1.5">
          <Link className="w-3.5 h-3.5 text-blue-600" />
          <span>الروابط وأزرار الإجراءات (Actions & Links)</span>
        </div>
        {expandedSections.actions ? (
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>

      {expandedSections.actions && (
        <div className="space-y-3 pt-2.5">
          {/* PRIMARY ACTION */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-700">
                رابط الزر الرئيسي (Primary Link)
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    changeDestinationType(targetNode.id, 'whatsapp', targetNode, targetDestination);
                  }}
                  className="text-[9px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded font-bold flex items-center gap-1 cursor-pointer"
                >
                  <MessageCircle className="w-2.5 h-2.5" />
                  <span>واتساب</span>
                </button>
                <button
                  onClick={() => {
                    updateDestinationUrl(targetNode.id, 'external', 'tel:');
                  }}
                  className="text-[9px] bg-blue-100 hover:bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Phone className="w-2.5 h-2.5" />
                  <span>اتصال</span>
                </button>
              </div>
            </div>

            {renderDestinationControls(targetNode.id, targetNode, targetDestination)}
          </div>

          {/* SECONDARY ACTION */}
          {isHero && heroSecondaryBtnNode && (
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <span className="text-[10px] font-bold text-slate-700 block">رابط الزر الثانوي</span>
              {renderDestinationControls(
                heroSecondaryBtnNode.id,
                heroSecondaryBtnNode,
                secondaryDestination
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
