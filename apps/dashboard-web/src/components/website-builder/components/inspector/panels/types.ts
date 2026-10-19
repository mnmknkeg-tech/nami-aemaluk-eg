import type { ComponentNode, StyleProperties } from '../../../types/builder';

export interface InspectorPanelProps {
  node: ComponentNode;
  parentSection: ComponentNode;
  viewport: 'desktop' | 'tablet' | 'mobile';
  currentStyles: StyleProperties;
  sectionStyles: StyleProperties;
  // Derived booleans
  isHero: boolean;
  isHeader: boolean;
  isVehicles: boolean;
  isProductOrCard: boolean;
  isBento: boolean;
  isCta: boolean;
  isTestimonials: boolean;
  isFooter: boolean;
  // Extracted child nodes (only non-null when in hero mode, etc.)
  heroBadgeNode: ComponentNode | null;
  heroTitleNode: ComponentNode | null;
  heroSubtitleNode: ComponentNode | null;
  heroPrimaryBtnNode: ComponentNode | null;
  heroSecondaryBtnNode: ComponentNode | null;
  heroImageNode: ComponentNode | null;
  heroStatsNode: ComponentNode | null;
  headerLogoNode: ComponentNode | null;
  headerNavNode: ComponentNode | null;
  headerCtaBtn: ComponentNode | null;
  vehicleCards: ComponentNode[];
  bentoCards: ComponentNode[];
  // Gallery state
  showPresetGallery: boolean;
  setShowPresetGallery: (v: boolean) => void;
  activeGalleryTarget: string;
  setActiveGalleryTarget: (v: string) => void;
  // Accordion state
  expandedSections: Record<string, boolean>;
  toggleAccordion: (key: string) => void;
  // Action callbacks
  handlePropChange: (targetNodeId: string, key: string, value: any) => void;
  handleStyleChange: (targetNodeId: string, key: keyof StyleProperties, value: any) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, targetNodeId: string, isBackground?: boolean) => void;
  selectNode: (id: string) => void;
  website: { components: Record<string, ComponentNode> };
}
