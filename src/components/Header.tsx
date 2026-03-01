"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Brain, ChevronDown, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Header() {
  const { language, setLanguage, t } = useLanguage();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleLanguageChange = (lang: 'zh' | 'en') => {
    setLanguage(lang);
    setShowDropdown(false);
  };

  return (
    <header className="w-full h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6">
      {/* 左侧：Logo 和标题 */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800 tracking-wide">
            QualiProbe | AI驱动的定性研究洞察引擎
          </h1>
          <p className="text-slate-500 text-xs">
            让研究设计与访谈分析更高效、更系统
          </p>
        </div>
      </div>

      {/* 右侧：语言切换下拉菜单 */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={toggleDropdown}
          className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 hover:bg-slate-50 px-3 py-2 rounded-md transition-colors"
        >
          <Globe className="w-4 h-4" />
          <span className="text-sm font-medium">
            {language === 'zh' ? '中文' : 'English'}
          </span>
          <ChevronDown 
            className={`w-4 h-4 transition-transform duration-200 ${
              showDropdown ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* 下拉菜单 */}
        {showDropdown && (
          <div className="absolute right-0 mt-2 w-32 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
            <button
              onClick={() => handleLanguageChange('zh')}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center justify-between ${
                language === 'zh' ? 'bg-blue-50 text-blue-600' : 'text-slate-700'
              }`}
            >
              <span>中文</span>
              {language === 'zh' && (
                <span className="text-blue-600">✓</span>
              )}
            </button>
            <button
              onClick={() => handleLanguageChange('en')}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center justify-between ${
                language === 'en' ? 'bg-blue-50 text-blue-600' : 'text-slate-700'
              }`}
            >
              <span>English</span>
              {language === 'en' && (
                <span className="text-blue-600">✓</span>
              )}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
