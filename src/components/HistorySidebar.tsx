"use client";

import React, { useMemo, useState } from 'react';
import { 
  Clock, 
  ChevronLeft, 
  Search,
  FileText,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';

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

interface AnalysisResult {
  background: string;
  outline: string;
  coreInsights: string;
  actionItems: string;
}

interface Project {
  id: string;
  type: 'outline' | 'analysis';
  title: string;
  data: OutlineData | AnalysisResult;
  timestamp: string;
}

interface HistorySidebarProps {
  projects?: Project[];
  activeProjectId?: string | null;
  onSelectProject?: (projectId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  compact?: boolean;
}

const formatDateToYYYYMMDD = (date: Date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}/${month}/${day}`;
};

export default function HistorySidebar({
  projects = [],
  activeProjectId = null,
  onSelectProject,
  isCollapsed = false,
  onToggleCollapse,
  compact = false
}: HistorySidebarProps) {
  const { t } = useLanguage();
  // 搜索和过滤状态
  const [searchQuery, setSearchQuery] = useState('');

  // 过滤历史记录
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    
    const query = searchQuery.toLowerCase();
    return projects.filter((record) =>
      record.title.toLowerCase().includes(query) ||
      record.type.toLowerCase().includes(query) ||
      ((record.data as OutlineData).project_title || '').toLowerCase().includes(query)
    );
  }, [searchQuery, projects]);

  // 清除搜索
  const clearSearch = () => {
    setSearchQuery('');
  };

  // 收起状态
  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center py-6">
        <button
          onClick={onToggleCollapse}
          className="text-slate-400 hover:text-slate-600 p-2 mb-4"
        >
          <Clock className="w-5 h-5" />
        </button>
        <div className="text-gray-500 text-xs">{t('sidebar.memory')}</div>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-50 flex flex-col">
      {!compact && (
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-3">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-slate-800 font-medium text-sm">{t('sidebar.historyRecords')}</h3>
                <p className="text-slate-500 text-xs">{t('sidebar.projectMemory')}</p>
              </div>
            </div>
            <button
              onClick={onToggleCollapse}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      {/* 搜索框 */}
      <div className={`border-b border-slate-200 ${compact ? 'p-3' : 'p-4'}`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('agent.searchPlaceholder')}
            className="pl-10 pr-10 bg-white border-slate-300 text-slate-800 placeholder-slate-400 text-sm"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* 内容区域 */}
      <div className={`flex-1 overflow-y-auto space-y-6 ${compact ? 'p-3' : 'p-6'}`}>
        {/* 历史记录 */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-slate-800 font-medium text-sm">{t('sidebar.historyRecords')}</h4>
            <span className="text-xs text-slate-500">
              {filteredHistory.length} 项
            </span>
          </div>
          
          {filteredHistory.length > 0 ? (
            <div className="space-y-3">
              {filteredHistory.map((record) => (
                <div
                  key={record.id}
                  onClick={() => onSelectProject?.(record.id)}
                  className={`bg-white border border-slate-100 rounded-lg p-3 cursor-pointer hover:shadow-md transition-all relative ${
                    activeProjectId === record.id ? 'ring-2 ring-indigo-500/20 border-indigo-200' : ''
                  }`}
                >
                  {/* 选中提示 - 左侧蓝紫色竖条 */}
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-l"></div>
                  
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      record.type === 'outline' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {record.type === 'outline' ? t('sidebar.outline') : t('sidebar.analysis')}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDateToYYYYMMDD(new Date(record.timestamp))}
                    </span>
                  </div>
                  <h5 className="text-slate-800 text-sm font-medium truncate mt-2">{record.title}</h5>
                  
                  {/* 额外信息 */}
                  <div className="mt-2 text-xs text-slate-500">
                    {record.type === 'outline' && (
                      <span>
                        {t('agent.sectionsCount', { count: (record.data as OutlineData).sections?.length || 0 })}
                      </span>
                    )}
                    {record.type === 'analysis' && (
                      <span>
                        {(record.data as AnalysisResult).coreInsights?.slice(0, 30)}...
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">
                {searchQuery ? t('agent.noMatches') : t('sidebar.noHistory')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
