"use client";

import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  ChevronLeft, 
  Search,
  FileText,
  Plus,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

interface HistoryRecord {
  id: string;
  type: 'outline' | 'analysis';
  title: string;
  data: OutlineData | AnalysisResult;
  timestamp: Date;
}

interface TranscriptChunk {
  id: string;
  content: string;
  speaker?: string;
  startIndex: number;
  endIndex: number;
}

interface HistorySidebarProps {
  outlineData?: OutlineData | null;
  analysisResult?: AnalysisResult | null;
  transcriptChunks?: TranscriptChunk[];
  onLoadFromHistory?: (record: HistoryRecord) => void;
  onSetActiveWorkbench?: (workbench: 'outline' | 'analysis') => void;
  onSetOutlineData?: (data: OutlineData) => void;
  onSetAnalysisResult?: (result: AnalysisResult) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const formatDateToYYYYMMDD = (date: Date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}/${month}/${day}`;
};

export default function HistorySidebar({
  outlineData,
  analysisResult,
  transcriptChunks = [],
  onLoadFromHistory,
  onSetActiveWorkbench,
  onSetOutlineData,
  onSetAnalysisResult,
  isCollapsed = false,
  onToggleCollapse
}: HistorySidebarProps) {
  // 搜索和过滤状态
  const [searchQuery, setSearchQuery] = useState('');
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);

  // 模拟历史数据（实际应用中应该从localStorage或API获取）
  const mockHistoryRecords: HistoryRecord[] = [
    {
      id: '1',
      type: 'outline',
      title: '智能家居用户研究 - 访谈大纲',
      data: {
        project_title: '智能家居用户研究',
        sections: [
          {
            id: 1,
            title: '开场破冰',
            duration: '10分钟',
            questions: ['请简单介绍一下您家里的智能设备使用情况'],
            notes: '建立轻松的对话氛围'
          }
        ]
      },
      timestamp: new Date('2024-01-15')
    },
    {
      id: '2',
      type: 'analysis',
      title: '移动支付体验 - 分析报告',
      data: {
        background: '受访者对移动支付的接受度较高...',
        outline: '建议从安全性、便捷性、功能性三个维度分析',
        coreInsights: '用户最关注的是支付安全性和操作便捷性',
        actionItems: '建议加强安全验证，简化操作流程'
      },
      timestamp: new Date('2024-01-10')
    },
    {
      id: '3',
      type: 'outline',
      title: '电商平台用户访谈大纲',
      data: {
        project_title: '电商平台用户研究',
        sections: [
          {
            id: 1,
            title: '购物习惯',
            duration: '15分钟',
            questions: ['您通常在什么时间网购？', '购物时最看重哪些因素？'],
            notes: '了解用户的购物决策过程'
          }
        ]
      },
      timestamp: new Date('2024-01-05')
    }
  ];

  // 过滤历史记录
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return mockHistoryRecords;
    
    const query = searchQuery.toLowerCase();
    return mockHistoryRecords.filter((record: HistoryRecord) => 
      record.title.toLowerCase().includes(query) ||
      record.type.toLowerCase().includes(query) ||
      (record.data as OutlineData).project_title?.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // 从历史记录加载
  const handleLoadFromHistory = (record: HistoryRecord) => {
    if (onLoadFromHistory) {
      onLoadFromHistory(record);
      return;
    }

    // 默认处理逻辑
    if (record.type === 'outline') {
      if (onSetOutlineData) {
        onSetOutlineData(record.data as OutlineData);
      }
      if (onSetActiveWorkbench) {
        onSetActiveWorkbench('outline');
      }
    } else {
      if (onSetAnalysisResult) {
        onSetAnalysisResult(record.data as AnalysisResult);
      }
      if (onSetActiveWorkbench) {
        onSetActiveWorkbench('analysis');
      }
    }
  };

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
        <div className="text-gray-500 text-xs">历史</div>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-50 flex flex-col">
      {/* 头部 */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-3">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-slate-800 font-medium text-sm">历史记录</h3>
              <p className="text-slate-500 text-xs">项目历史</p>
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
      
      {/* 搜索框 */}
      <div className="p-4 border-b border-slate-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索历史记录..."
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
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* 当前会话 */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <h4 className="text-slate-800 font-medium mb-3 text-sm">当前会话</h4>
          <div className="space-y-3">
            {outlineData && (
              <div className="bg-white border border-slate-100 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">
                    大纲
                  </span>
                  <span className="text-xs text-slate-500">
                      {formatDateToYYYYMMDD(new Date())}
                    </span>
                </div>
                <h5 className="text-slate-800 text-sm font-medium truncate mt-2">{outlineData.project_title}</h5>
              </div>
            )}
            
            {transcriptChunks.length > 0 && (
              <div className="bg-white border border-slate-100 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 font-medium">
                    分析
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatDateToYYYYMMDD(new Date())}
                  </span>
                </div>
                <h5 className="text-slate-800 text-sm font-medium truncate mt-2">笔录分析</h5>
              </div>
            )}
          </div>
        </div>
        
        {/* 历史记录 */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-slate-800 font-medium text-sm">历史记录</h4>
            <span className="text-xs text-slate-500">
              {filteredHistory.length} 项
            </span>
          </div>
          
          {filteredHistory.length > 0 ? (
            <div className="space-y-3">
              {filteredHistory.map((record) => (
                <div
                  key={record.id}
                  onClick={() => handleLoadFromHistory(record)}
                  className="bg-white border border-slate-100 rounded-lg p-3 cursor-pointer hover:shadow-md transition-all relative"
                >
                  {/* 选中提示 - 左侧蓝紫色竖条 */}
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-l"></div>
                  
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      record.type === 'outline' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {record.type === 'outline' ? '大纲' : '分析'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDateToYYYYMMDD(record.timestamp)}
                    </span>
                  </div>
                  <h5 className="text-slate-800 text-sm font-medium truncate mt-2">{record.title}</h5>
                  
                  {/* 额外信息 */}
                  <div className="mt-2 text-xs text-slate-500">
                    {record.type === 'outline' && (
                      <span>
                        {(record.data as OutlineData).sections?.length || 0} 个环节
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
                {searchQuery ? '未找到匹配的记录' : '暂无历史记录'}
              </p>
            </div>
          )}
        </div>
        
        {/* 笔录信息 */}
        {transcriptChunks.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <h4 className="text-slate-800 font-medium mb-3 text-sm">笔录信息</h4>
            <div className="text-slate-600 text-sm space-y-1">
              <div>切片数量: {transcriptChunks.length}</div>
              <div>平均长度: {Math.round(transcriptChunks.reduce((acc, chunk) => acc + chunk.content.length, 0) / transcriptChunks.length)} 字</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
