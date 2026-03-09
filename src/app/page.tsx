"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import HistorySidebar from '@/components/HistorySidebar';
import MainWorkspace from '@/components/MainWorkspace';
import AgentChat from '@/components/AgentChat';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Edit3, Clock, MessageSquare, X } from 'lucide-react';

interface OutlineData {
  project_title: string;
  sections: Array<{
    id?: number;
    title: string;
    duration: string;
    questions: string[];
    notes: string;
  }>;
}

interface Project {
  id: string;
  type: 'outline';
  title: string;
  data: OutlineData;
  timestamp: string;
}

type MobilePane = 'workspace' | 'history' | 'agent';

function QualiProbe() {
  const { language, t } = useLanguage();
  const isMobile = useIsMobile();
  const [mobilePane, setMobilePane] = useState<MobilePane>('workspace');
  const [leftWidth, setLeftWidth] = useState(20);
  const [rightWidth, setRightWidth] = useState(30);
  const [isDragging, setIsDragging] = useState<'left' | 'right' | null>(null);
  const [outlineData, setOutlineData] = useState<OutlineData | null>(null);
  const [isAgentCollapsed, setIsAgentCollapsed] = useState(false);
  const [agentContext, setAgentContext] = useState<{
    activeWorkbench: 'outline' | 'analysis';
    analysisResult: { background?: string; outline?: string; coreInsights?: string; actionItems?: string } | null;
    transcriptText: string;
    researchTopic: string;
    targetAudience: string;
    researchPurpose: string;
  }>({
    activeWorkbench: 'outline',
    analysisResult: null,
    transcriptText: '',
    researchTopic: '',
    targetAudience: '',
    researchPurpose: '',
  });

  const storageKey = 'qualiprobe_projects_v1';
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  // load projects from localStorage (client-side only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setProjects(parsed);
        if (parsed[0]?.id) setActiveProjectId(parsed[0].id);
      }
    } catch {
      // ignore
    }
  }, []);

  // persist projects to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(projects));
    } catch {
      // ignore
    }
  }, [projects]);

  // keep outlineData in sync with selected project
  useEffect(() => {
    if (activeProject) {
      setOutlineData(activeProject.data);
    } else {
      setOutlineData(null);
    }
  }, [activeProject]);

  const handleOutlineGenerated = (generated: OutlineData) => {
    const now = new Date();
    const newProject: Project = {
      id: now.getTime().toString(),
      type: 'outline',
      title: `${generated.project_title} - 访谈大纲`,
      data: generated,
      timestamp: now.toISOString(),
    };

    setProjects((prev) => [newProject, ...prev]);
    setActiveProjectId(newProject.id);
    setOutlineData(generated);
  };

  const handleSelectProject = (projectId: string) => {
    setActiveProjectId(projectId);
  };

  const handleApplySuggestion = (section: {
    title: string;
    duration: string;
    questions: string[];
    notes: string;
    targetSectionIndex?: number | null;
  }) => {
    if (!outlineData?.sections || !activeProjectId) return;

    const idx = section.targetSectionIndex;
    const isValidIdx = typeof idx === 'number' && idx >= 0 && idx < outlineData.sections.length;

    let newOutline: OutlineData;

    if (isValidIdx) {
      const existing = outlineData.sections[idx];
      const mergedSection = {
        ...existing,
        questions: [...(existing.questions || []), ...(section.questions || [])],
        notes: [existing.notes, section.notes].filter(Boolean).join('\n\n'),
      };
      const newSections = [...outlineData.sections];
      newSections[idx] = mergedSection;
      newOutline = { ...outlineData, sections: newSections };
    } else {
      const newSection = {
        ...section,
        id: outlineData.sections.length + 1,
      };
      newOutline = {
        ...outlineData,
        sections: [...outlineData.sections, newSection],
      };
    }

    setOutlineData(newOutline);
    setProjects((prev) =>
      prev.map((p) => (p.id === activeProjectId ? { ...p, data: newOutline } : p))
    );
  };

  const disclaimerText = useMemo(() => {
    return language === 'zh'
      ? "本页面内容由人工智能生成，仅供参考。"
      : "This content is AI-generated and may contain inaccuracies.";
  }, [language]);

  const handleMouseDown = (side: 'left' | 'right') => {
    setIsDragging(side);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const containerWidth = window.innerWidth;
    const mouseX = e.clientX;
    const percentage = (mouseX / containerWidth) * 100;
    
    if (isDragging === 'left') {
      const newWidth = Math.max(15, Math.min(40, percentage));
      setLeftWidth(newWidth);
    } else if (isDragging === 'right') {
      if (isAgentCollapsed) return;
      const newWidth = Math.max(18, Math.min(45, 100 - percentage));
      setRightWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const agentChatEl = (compact = false) => (
    <AgentChat
      outlineData={outlineData}
      researchTopic={agentContext.researchTopic}
      targetAudience={agentContext.targetAudience}
      researchPurpose={agentContext.researchPurpose}
      activeWorkbench={agentContext.activeWorkbench}
      analysisResult={agentContext.analysisResult}
      transcriptText={agentContext.transcriptText}
      isCollapsed={isAgentCollapsed}
      onToggleCollapse={() => setIsAgentCollapsed(true)}
      onApplySuggestion={handleApplySuggestion}
      compact={compact}
    />
  );

  if (isMobile) {
    return (
      <div className="h-screen w-full overflow-hidden bg-white flex flex-col safe-area-pb">
        <Header />
        <div className="flex-1 flex flex-col overflow-hidden pt-14 md:pt-16">
          {mobilePane === 'history' && (
            <div className="absolute inset-0 top-14 md:top-16 z-40 bg-white flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                <h2 className="font-semibold text-slate-800">{t('sidebar.historyRecords')}</h2>
                <button
                  onClick={() => setMobilePane('workspace')}
                  className="p-2 -mr-2 text-slate-500 hover:text-slate-700"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <HistorySidebar
                  projects={projects}
                  activeProjectId={activeProjectId}
                  onSelectProject={(id) => {
                    handleSelectProject(id);
                    setMobilePane('workspace');
                  }}
                  compact
                />
              </div>
            </div>
          )}
          {mobilePane === 'workspace' && (
            <div className="flex-1 overflow-hidden">
              <MainWorkspace
                outlineData={outlineData}
                setOutlineData={setOutlineData}
                onOutlineGenerated={handleOutlineGenerated}
                onContextSync={setAgentContext}
              />
            </div>
          )}
          {mobilePane === 'agent' && (
            <div className="absolute inset-0 top-14 md:top-16 z-40 bg-white flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                <h2 className="font-semibold text-slate-800">{t('sidebar.aiExpert')}</h2>
                <button
                  onClick={() => setMobilePane('workspace')}
                  className="p-2 -mr-2 text-slate-500 hover:text-slate-700"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden min-h-0">
                {agentChatEl(true)}
              </div>
            </div>
          )}
        </div>
        <nav className="md:hidden flex items-center justify-around py-2 px-4 border-t border-slate-200 bg-white safe-area-bottom">
          <button
            onClick={() => setMobilePane('workspace')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-0 ${
              mobilePane === 'workspace' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500'
            }`}
          >
            <Edit3 className="w-5 h-5 flex-shrink-0" />
            <span className="text-[11px] font-medium truncate">{t('mobile.workspace')}</span>
          </button>
          <button
            onClick={() => setMobilePane('history')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-0 ${
              mobilePane === 'history' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500'
            }`}
          >
            <Clock className="w-5 h-5 flex-shrink-0" />
            <span className="text-[11px] font-medium truncate">{t('mobile.history')}</span>
          </button>
          <button
            onClick={() => setMobilePane('agent')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-0 ${
              mobilePane === 'agent' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500'
            }`}
          >
            <MessageSquare className="w-5 h-5 flex-shrink-0" />
            <span className="text-[11px] font-medium truncate">{t('mobile.agent')}</span>
          </button>
        </nav>
        {disclaimerText && (
          <div className="hidden md:flex h-10 items-center justify-center border-t border-slate-100 bg-white px-4">
            <p className="text-[11px] text-slate-400">{disclaimerText}</p>
          </div>
        )}
      </div>
    );
  }

  return (
      <div className="h-screen w-full overflow-hidden bg-white flex flex-col">
        <Header />
        <div className="flex-1 flex overflow-hidden pt-16">
          <div 
            className="hidden md:block bg-slate-50 border-r border-slate-200 flex-shrink-0"
            style={{ width: `${leftWidth}%` }}
          >
            <HistorySidebar
              projects={projects}
              activeProjectId={activeProjectId}
              onSelectProject={handleSelectProject}
            />
          </div>
          <div 
            className="hidden md:block w-0.5 bg-transparent border-r border-slate-200 hover:bg-indigo-500/50 cursor-col-resize transition-all duration-300 flex-shrink-0"
            onMouseDown={() => handleMouseDown('left')}
          />
          <div className="flex-1 bg-white overflow-hidden min-w-0">
            <MainWorkspace
              outlineData={outlineData}
              setOutlineData={setOutlineData}
              onOutlineGenerated={handleOutlineGenerated}
              onContextSync={setAgentContext}
            />
          </div>
          <div 
            className="hidden md:block w-0.5 bg-transparent border-r border-slate-200 hover:bg-indigo-500/50 cursor-col-resize transition-all duration-300 flex-shrink-0"
            onMouseDown={() => handleMouseDown('right')}
          />
          {!isAgentCollapsed && (
            <div 
              className="hidden md:block bg-transparent border-l border-slate-100 flex-shrink-0 min-w-[240px]"
              style={{ width: `${Math.min(45, rightWidth)}%` }}
            >
              {agentChatEl(false)}
            </div>
          )}
          {isAgentCollapsed && (
            <div className="hidden md:flex bg-transparent border-l border-slate-100 flex-shrink-0 w-12">
              <div className="h-full flex flex-col items-center justify-start pt-6">
                <button
                  onClick={() => setIsAgentCollapsed(false)}
                  className="text-slate-400 hover:text-slate-600 p-2"
                  aria-label="Expand AI"
                >
                  <span className="text-lg">›</span>
                </button>
              </div>
            </div>
          )}
        </div>
        {disclaimerText && (
          <div className="h-10 flex items-center justify-center border-t border-slate-100 bg-white px-4">
            <p className="text-[11px] text-slate-400">{disclaimerText}</p>
          </div>
        )}
      </div>
  );
}

export default function QualiProbeWithProviders() {
  return (
    <LanguageProvider>
      <QualiProbe />
    </LanguageProvider>
  );
}
