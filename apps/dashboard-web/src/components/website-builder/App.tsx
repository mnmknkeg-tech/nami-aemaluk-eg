import React from 'react';
import { BuilderProvider, useBuilder } from './context/BuilderContext';
import { HIDE_UNPUBLISHED } from '@/config/sidebar';
import { TopBar } from './components/header/TopBar';
import { EditingModeSelector } from './components/header/EditingModeSelector';
import { PublishModal } from './components/header/PublishModal';
import { LeftSidebar } from './components/sidebar/LeftSidebar';
import { CanvasArea } from './components/canvas/CanvasArea';
import { RightInspector } from './components/inspector/RightInspector';
import { CodeWorkspace } from './components/code/CodeWorkspace';
import { AiAssistantModal } from './components/ai/AiAssistantModal';
import { SecurePreview } from './components/preview/SecurePreview';
import { DeveloperModeDrawer } from './components/dev/DeveloperModeDrawer';
import { MobileBuilderTabBar } from './components/mobile/MobileBuilderTabBar';

const BuilderWorkspace: React.FC<{ fullScreen?: boolean }> = ({ fullScreen = false }) => {
  return (
    <div className={`flex flex-col ${fullScreen ? 'h-screen' : 'h-[calc(100vh-4rem)]'} w-full bg-slate-100 overflow-hidden font-sans antialiased text-slate-900 pb-16 lg:pb-0`}>
      {/* Top Navigation Header */}
      <TopBar />

      {/* Editing mode selector bar */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 py-2 flex items-center gap-4">
        <EditingModeSelector />
      </div>

      {/* Main Studio 3-Column Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar: Pages, Layers, Section Library, Design System, Assets, Data, SEO */}
        <LeftSidebar />

        {/* Center Visual Canvas Area */}
        <CanvasArea />

        {/* Right Inspector Panel: Design, Content Props, Responsive Overrides */}
        <RightInspector />
      </div>

      {/* Bottom Scoped Code Workspace Dock */}
      <CodeWorkspace />

      {/* Modals, Drawers & Overlays */}
      <PublishModal />
      {/* Market-launch switch: the AI assistant is local-only for now. */}
      {!HIDE_UNPUBLISHED && <AiAssistantModal />}
      <SecurePreview />
      <DeveloperModeDrawer />

      {/* Mobile bottom tab bar — only visible on small screens (hidden on lg+) */}
      <MobileBuilderTabBar />
    </div>
  );
};

export default function App({
  fullScreen = false,
  onExit,
}: {
  fullScreen?: boolean;
  onExit?: () => void;
}) {
  return (
    <BuilderProvider onExit={onExit}>
      <BuilderWorkspace fullScreen={fullScreen} />
    </BuilderProvider>
  );
}
