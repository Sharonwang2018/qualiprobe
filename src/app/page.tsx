"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import HistorySidebar from '@/components/HistorySidebar';
import MainWorkspace from '@/components/MainWorkspace';
import AgentChat from '@/components/AgentChat';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';

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

function QualiProbe() {
  const { language } = useLanguage();
  const [leftWidth, setLeftWidth] = useState(20);
  const [rightWidth, setRightWidth] = useState(30);
  const [isDragging, setIsDragging] = useState<'left' | 'right' | null>(null);
  const [outlineData, setOutlineData] = useState<OutlineData | null>(null);
  const [isAgentCollapsed, setIsAgentCollapsed] = useState(false);

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

  const handleApplySuggestion = (section: { title: string; duration: string; questions: string[]; notes: string }) => {
    if (!outlineData?.sections || !activeProjectId) return;
    const newSection = {
      ...section,
      id: outlineData.sections.length + 1,
    };
    const newOutline = {
      ...outlineData,
      sections: [...outlineData.sections, newSection],
    };
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

  return (
      <div className="h-screen w-full overflow-hidden bg-white flex flex-col">
        {/* Header 顶部导航栏 - 固定定位 */}
        <Header />
        
        {/* 三栏容器 - 为Header留出空间 */}
        <div className="flex-1 flex overflow-hidden pt-16">
          {/* 左侧面板 - 项目记忆 */}
          <div 
            className="bg-slate-50 border-r border-slate-200 flex-shrink-0"
            style={{ width: `${leftWidth}%` }}
          >
            <HistorySidebar
              projects={projects}
              activeProjectId={activeProjectId}
              onSelectProject={handleSelectProject}
            />
          </div>
          
          {/* 左侧拖拽手柄 */}
          <div 
            className="w-0.5 bg-transparent border-r border-slate-200 hover:bg-indigo-500/50 cursor-col-resize transition-all duration-300 flex-shrink-0"
            onMouseDown={() => handleMouseDown('left')}
          />
          
          {/* 中间面板 - 主工作区 */}
          <div className="flex-1 bg-white overflow-hidden">
            <MainWorkspace
              outlineData={outlineData}
              setOutlineData={setOutlineData}
              onOutlineGenerated={handleOutlineGenerated}
            />
          </div>
          
          {/* 右侧拖拽手柄 */}
          <div 
            className="w-0.5 bg-transparent border-r border-slate-200 hover:bg-indigo-500/50 cursor-col-resize transition-all duration-300 flex-shrink-0"
            onMouseDown={() => handleMouseDown('right')}
          />
          
          {/* 右侧面板 - AI Agent */}
          {!isAgentCollapsed && (
            <div 
              className="bg-transparent border-l border-slate-100 flex-shrink-0 min-w-[240px]"
              style={{ width: `${Math.min(45, rightWidth)}%` }}
            >
              <AgentChat 
                outlineData={outlineData}
                isCollapsed={isAgentCollapsed}
                onToggleCollapse={() => setIsAgentCollapsed(true)}
                onApplySuggestion={handleApplySuggestion}
              />
            </div>
          )}

          {isAgentCollapsed && (
            <div className="bg-transparent border-l border-slate-100 flex-shrink-0 w-12">
              <div className="h-full flex flex-col items-center justify-start pt-6">
                <button
                  onClick={() => setIsAgentCollapsed(false)}
                  className="text-slate-400 hover:text-slate-600 p-2"
                  aria-label="展开 AI 助手"
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
