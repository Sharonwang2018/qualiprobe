"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Orbit, ChevronDown, Globe } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Header() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="fixed top-0 left-0 right-0 h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 z-50">
      {/* 左侧：Orbit 图标和完整标题 */}
      <div className="flex items-center space-x-3">
        <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
          <Orbit className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">
            QualiProbe | AI驱动的定性研究洞察引擎
          </h1>
          <p className="text-slate-500 text-xs">
            让研究设计与访谈分析更高效、更系统
          </p>
        </div>
      </div>

      {/* 右侧：语言切换 Select 组件 */}
      <div className="relative">
        <Select value={language} onValueChange={(value: 'zh' | 'en') => setLanguage(value)}>
          <SelectTrigger className="w-32 h-8 border-slate-200 text-slate-600 hover:text-slate-800">
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4" />
              <SelectValue placeholder="选择语言" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="zh">中文</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </header>
  );
}
