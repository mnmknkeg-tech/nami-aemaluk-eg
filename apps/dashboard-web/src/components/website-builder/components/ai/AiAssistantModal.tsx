import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Check,
  Globe,
  Wand2,
  Zap,
} from 'lucide-react';
import { useBuilder } from '../../context/BuilderContext';
import { StructuredAiPatch, PatchScope } from '../../types/ai';
import {
  generateStructuredAiPatch,
  generateCompleteAiWebsite,
} from '../../services/aiGeneratorService';
import { Website } from '../../types/builder';
import { ChatMessage } from './types';
import { getContextualPrompts, fullSiteExamples, promptMasterFormulas } from './promptData';
import { PatchModeTab } from './tabs/PatchModeTab';
import { FullSiteModeTab } from './tabs/FullSiteModeTab';
import { PromptGuideTab } from './tabs/PromptGuideTab';

export const AiAssistantModal: React.FC = () => {
  const {
    isAiModalOpen,
    setIsAiModalOpen,
    selectedNode,
    activePage,
    currentTenant,
    website,
    applyAiPatch,
    loadCustomWebsite,
  } = useBuilder();

  // Mode Selection: 'patch' (Surgical edit) | 'full_site' (Complete new site) | 'prompt_guide' (Prompting Masterclass)
  const [activeTab, setActiveTab] = useState<'patch' | 'full_site' | 'prompt_guide'>('patch');

  // Patch Mode State
  const [prompt, setPrompt] = useState('');
  const [scope, setScope] = useState<PatchScope>('element');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPatch, setGeneratedPatch] = useState<StructuredAiPatch | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [justApplied, setJustApplied] = useState(false);

  // Full Site Generator State
  const [fullSitePrompt, setFullSitePrompt] = useState('');
  const [animationStyle, setAnimationStyle] = useState<string>('modern_glass');
  const [isBuildingFullSite, setIsBuildingFullSite] = useState(false);
  const [generatedSite, setGeneratedSite] = useState<Website | null>(null);
  const [copiedFormula, setCopiedFormula] = useState<string | null>(null);

  // Sync default scope and initialize greeting when modal opens with a selected node
  useEffect(() => {
    if (isAiModalOpen) {
      setJustApplied(false);
      if (selectedNode) {
        setScope('element');
        if (chatHistory.length === 0) {
          setChatHistory([
            {
              id: 'init_msg',
              sender: 'ai',
              text: `مرحباً! لقد قمت بتحديد المكون: "${selectedNode.name}" (${selectedNode.type}). يمكنك طلب أي تعديل نصي، لوني، إضافة روابط، أو إضافة أقسام وسأقوم بتطبيقها فوراً على هذا المكون!`,
              timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }
      } else {
        setScope('section');
      }
    }
  }, [isAiModalOpen, selectedNode?.id]);

  if (!isAiModalOpen) return null;

  const contextualPrompts = getContextualPrompts(selectedNode);

  // 1. Handle Surgical AI Patch
  const handleGeneratePatch = (userPromptText?: string) => {
    const activeText = userPromptText || prompt;
    if (!activeText.trim()) return;

    const userMsgId = `user_${Date.now()}`;
    const newChat: ChatMessage[] = [
      ...chatHistory,
      {
        id: userMsgId,
        sender: 'user',
        text: activeText,
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      },
    ];
    setChatHistory(newChat);
    setIsGenerating(true);
    setJustApplied(false);

    setTimeout(() => {
      const patch = generateStructuredAiPatch(activeText, scope, {
        selectedNode,
        activePage,
        website,
        currentTenant,
      });
      setGeneratedPatch(patch);
      setIsGenerating(false);

      const aiMsgId = `ai_${Date.now()}`;
      setChatHistory([
        ...newChat,
        {
          id: aiMsgId,
          sender: 'ai',
          text: `تم تجهيز التعديلات المطلوبة بنجاح على المكون "${selectedNode?.name || 'القسم'}"! يمكنك مراجعة ملخص التغييرات بالأسفل والضغط على "تطبيق على الكانفاس" لتنفيذها فوراً.`,
          patch: patch,
          timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setPrompt('');
    }, 500);
  };

  const handleApplyPatch = (patchToApply?: StructuredAiPatch, closeModal = true) => {
    const patch = patchToApply || generatedPatch;
    if (patch) {
      applyAiPatch(patch);
      setJustApplied(true);
      setGeneratedPatch(null);
      if (closeModal) {
        setIsAiModalOpen(false);
      }
    }
  };

  // 2. Handle Full Website Generation from Prompt
  const handleGenerateFullSite = () => {
    if (!fullSitePrompt.trim()) return;
    setIsBuildingFullSite(true);

    setTimeout(() => {
      const newSite = generateCompleteAiWebsite(fullSitePrompt, animationStyle);
      setGeneratedSite(newSite);
      setIsBuildingFullSite(false);
    }, 800);
  };

  const handleApplyFullSite = () => {
    if (generatedSite) {
      loadCustomWebsite(generatedSite);
      setIsAiModalOpen(false);
      setGeneratedSite(null);
      setFullSitePrompt('');
    }
  };

  const handleCopyFormula = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFormula(id);
    setTimeout(() => setCopiedFormula(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-blue-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">
                  مساعد الذكاء الاصطناعي الذكي (AI Assistant)
                </h2>
                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                  سياق ذكي
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                تعديل ذكي موجه للعنصر المحدد أو تصميم وبناء موقع إلكتروني كامل من البرومبت
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAiModalOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 px-4 sm:px-6 pt-2 gap-2 select-none overflow-x-auto">
          <button
            onClick={() => setActiveTab('patch')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'patch'
                ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Wand2 className="w-4 h-4" />
            <span>تعديل المكون المحدد (Smart AI Patch)</span>
          </button>

          <button
            onClick={() => setActiveTab('full_site')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'full_site'
                ? 'bg-white text-blue-600 border-t-2 border-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>تصميم موقع كامل جديد (Full AI Site)</span>
          </button>

          <button
            onClick={() => setActiveTab('prompt_guide')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'prompt_guide'
                ? 'bg-white text-purple-600 border-t-2 border-purple-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>صيغ البرومبت والأنيميشن (Prompt Guide)</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'patch' && (
            <PatchModeTab
              selectedNode={selectedNode}
              activePage={activePage}
              scope={scope}
              setScope={setScope}
              prompt={prompt}
              setPrompt={setPrompt}
              isGenerating={isGenerating}
              handleGeneratePatch={handleGeneratePatch}
              contextualPrompts={contextualPrompts}
              chatHistory={chatHistory}
              generatedPatch={generatedPatch}
              handleApplyPatch={handleApplyPatch}
              justApplied={justApplied}
              onClose={() => setIsAiModalOpen(false)}
            />
          )}

          {activeTab === 'full_site' && (
            <FullSiteModeTab
              fullSitePrompt={fullSitePrompt}
              setFullSitePrompt={setFullSitePrompt}
              animationStyle={animationStyle}
              setAnimationStyle={setAnimationStyle}
              isBuildingFullSite={isBuildingFullSite}
              generatedSite={generatedSite}
              handleGenerateFullSite={handleGenerateFullSite}
              handleApplyFullSite={handleApplyFullSite}
              fullSiteExamples={fullSiteExamples}
            />
          )}

          {activeTab === 'prompt_guide' && (
            <PromptGuideTab
              promptMasterFormulas={promptMasterFormulas}
              copiedFormula={copiedFormula}
              handleCopyFormula={handleCopyFormula}
              setFullSitePrompt={setFullSitePrompt}
              setActiveTab={setActiveTab}
            />
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 text-center sm:text-right w-full sm:w-auto">
            {activeTab === 'patch'
              ? 'تعديل فوري وسلس مع حفظ تلقائي وتاريخ تراجع (Ctrl+Z)'
              : 'يتم تطبيق الموقع فوراً مع الحفاظ على سرعة الاستجابة'}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setIsAiModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            {activeTab === 'patch' && (
              <button
                onClick={() => handleApplyPatch()}
                disabled={!generatedPatch}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>تطبيق التعديلات على الكانفاس</span>
              </button>
            )}

            {activeTab === 'full_site' && (
              <button
                onClick={handleApplyFullSite}
                disabled={!generatedSite}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>تطبيق وتحميل الموقع بالكامل</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
