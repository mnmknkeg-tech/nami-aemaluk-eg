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
  const { templateError } = useBuilder();

  return (
    <div
      className={`flex flex-col ${fullScreen ? 'h-screen' : 'h-[calc(100vh-4rem)]'} w-full bg-slate-100 overflow-hidden font-sans antialiased text-slate-900 pb-16 lg:pb-0`}
    >
      {/* Top Navigation Header */}
      <TopBar />

      {/* Editing mode selector bar — hidden in production if only visual mode remains */}
      {!HIDE_UNPUBLISHED && (
        <div className="border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 py-2 flex items-center gap-4">
          <EditingModeSelector />
        </div>
      )}

      {templateError && (
        <div
          role="alert"
          className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900"
        >
          تعذر تطبيق القالب: {templateError}
        </div>
      )}

      {/* Main Studio 3-Column Layout — dir="rtl" reverses visual order so the
          FIRST child renders RIGHT, CENTER is Canvas, THIRD child renders LEFT */}
      <div className="flex flex-1 overflow-hidden relative" dir="rtl">
        {/* FIRST CHILD → VISUAL RIGHT: Website structure, pages, sections, layers */}
        <LeftSidebar />

        {/* CENTER: Website canvas (component preview) */}
        <CanvasArea />

        {/* THIRD CHILD → VISUAL LEFT: Contextual Inspector for the selected element */}
        <RightInspector />
      </div>

      {/* Bottom Scoped Code Workspace Dock — LOCAL-ONLY */}
      {!HIDE_UNPUBLISHED && <CodeWorkspace />}

      {/* Modals, Drawers & Overlays */}
      <PublishModal />
      {/* Market-launch switch: the AI assistant is local-only for now. */}
      {!HIDE_UNPUBLISHED && <AiAssistantModal />}
      {!HIDE_UNPUBLISHED && <SecurePreview />}
      {!HIDE_UNPUBLISHED && <DeveloperModeDrawer />}

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
