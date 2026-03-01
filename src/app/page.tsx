"use client";

import React, { useState } from 'react';
import Header from '@/components/Header';
import HistorySidebar from '@/components/HistorySidebar';
import MainWorkspace from '@/components/MainWorkspace';
import AgentChat from '@/components/AgentChat';
import { LanguageProvider } from '@/contexts/LanguageContext';

export default function QualiProbe() {
  const [leftWidth, setLeftWidth] = useState(20);
  const [rightWidth, setRightWidth] = useState(30);
  const [isDragging, setIsDragging] = useState<'left' | 'right' | null>(null);

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
      const newWidth = Math.max(20, Math.min(45, 100 - percentage));
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
    <LanguageProvider>
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
            <HistorySidebar />
          </div>
          
          {/* 左侧拖拽手柄 */}
          <div 
            className="w-0.5 bg-slate-100 hover:bg-blue-500 cursor-col-resize transition-all duration-200 hover:scale-x-150 flex-shrink-0"
            onMouseDown={() => handleMouseDown('left')}
          />
          
          {/* 中间面板 - 主工作区 */}
          <div className="flex-1 bg-white overflow-hidden">
            <MainWorkspace />
          </div>
          
          {/* 右侧拖拽手柄 */}
          <div 
            className="w-0.5 bg-slate-100 hover:bg-blue-500 cursor-col-resize transition-all duration-200 hover:scale-x-150 flex-shrink-0"
            onMouseDown={() => handleMouseDown('right')}
          />
          
          {/* 右侧面板 - AI Agent */}
          <div 
            className="bg-white border-l border-slate-200 flex-shrink-0"
            style={{ width: `${rightWidth}%` }}
          >
            <AgentChat />
          </div>
        </div>
      </div>
    </LanguageProvider>
  );
}
