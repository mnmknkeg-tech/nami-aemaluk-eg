import React from 'react';
import {
  ComponentNode,
  ViewportBreakpoint,
  Website,
  WebsiteLinkDestination,
} from '../../../types/builder';

export interface BaseRendererProps {
  node: ComponentNode;
  website: Website;
  currentViewport: ViewportBreakpoint;
  isInteractivePreview: boolean;
  outlineClass: string;
  getComputedStyles: () => React.CSSProperties;
  handleClick: (e: React.MouseEvent) => void;
  handleMouseEnter: (e: React.MouseEvent) => void;
  handleMouseLeave: () => void;
  renderChildren: () => React.ReactNode;
  handleInteraction: (
    e: React.MouseEvent,
    overrideUrl?: string,
    overridePageId?: string,
    overrideText?: string,
    overrideDestination?: WebsiteLinkDestination
  ) => void;
  switchPage: (pageId: string) => void;
  activePageId: string;
  overrideViewport?: ViewportBreakpoint;
}
