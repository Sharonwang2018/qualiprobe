"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Brain, 
  ChevronLeft, 
  Loader2, 
  Search, 
  Zap
} from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  evidence?: {
    chunkId: string;
    text: string;
  };
}

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

interface AgentChatProps {
  outlineData?: OutlineData | null;
  researchTopic?: string;
  targetAudience?: string;
  researchPurpose?: string;
  activeWorkbench?: 'outline' | 'analysis';
  analysisResult?: any;
  transcriptChunks?: any[];
  onScrollToEvidence?: (chunkId: string) => void;
}

export default function AgentChat({ 
  outlineData, 
  researchTopic = '', 
  targetAudience = '', 
  researchPurpose = '', 
  activeWorkbench = 'outline',
  analysisResult,
  transcriptChunks = [],
  onScrollToEvidence
}: AgentChatProps) {
  // 对话状态
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [thinkingStep, setThinkingStep] = useState('');
  
  // 引用联动状态
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 自动滚动聊天到底部
  const scrollToChatBottom = () => {
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  // 精准原文溯源函数
  const searchOriginalText = (keyword: string): { chunkId: string; text: string } | undefined => {
    console.log(`🔍 开始精准溯源: "${keyword}"`);
    
    for (const chunk of transcriptChunks) {
      if (chunk.content.includes(keyword)) {
        // 提取包含关键词的完整句子
        const sentences = chunk.content.match(/[^。！？\n]*[。！？]/g) || [];
        const matchingSentences = sentences.filter((sentence: string) => 
          sentence.includes(keyword) && sentence.trim().length > 5
        );
        
        if (matchingSentences.length > 0) {
          console.log(`✅ 找到原文证据: ${matchingSentences[0]}`);
          return {
            chunkId: chunk.id,
            text: matchingSentences[0].trim()
          };
        }
      }
    }
    
    console.log(`❌ 未找到原文证据: "${keyword}"`);
    return undefined;
  };

  // 增强版交互式对话 - 洞察引擎智能关联
  const handleChat = async () => {
    if (!currentMessage.trim()) return;

    // 首次交互时设置hasInteracted为true
    if (!hasInteracted) {
      setHasInteracted(true);
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    setChatMessages((prev: ChatMessage[]) => [...prev, userMessage]);
    setCurrentMessage('');
    setIsChatting(true);
    setIsAgentThinking(true);

    try {
      // 模拟AI回复
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      let responseContent = '';
      let evidence: { chunkId: string; text: string } | undefined;
      
      // 上下文自动喂养 - 静默背景注入
      const contextPrompt = `
【当前上下文】
- [当前页面模式]: ${activeWorkbench === 'outline' ? '大纲设计' : '访谈分析'}
- [研究主题]: ${researchTopic || '未填写'}
- [核心目标]: ${researchPurpose || '未填写'}
- [当前大纲快照]: ${outlineData ? JSON.stringify(outlineData.sections?.slice(0, 2)) : '无大纲数据'}

【用户问题】: ${currentMessage}

请基于以上上下文，以资深定性研究专家的身份回答。
`;
      
      // 检查是否需要进入【精准原文溯源模式】
      const needsOriginalText = currentMessage.includes('原话') || 
                              currentMessage.includes('原文') || 
                              currentMessage.includes('怎么说') || 
                              currentMessage.includes('具体说了') || 
                              currentMessage.includes('查看原话') || 
                              currentMessage.includes('提供证据') || 
                              currentMessage.includes('证据') || 
                              currentMessage.includes('结论来源') || 
                              currentMessage.includes('来源') ||
                              currentMessage.includes('谁说的');
      
      if (activeWorkbench === 'analysis' && analysisResult && needsOriginalText) {
        // 进入【精准原文溯源模式】 - 仅在分析页面且有笔录时
        setThinkingStep('🔍 正在扫描笔录切片以获取证据...');
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        const keyword = currentMessage.replace(/原话|原文|怎么说|具体说了|查看原话|提供证据|证据|结论来源|来源|谁说的|关于|的|了|吗|？|。|！/g, '').trim();
        
        evidence = searchOriginalText(keyword);
        
        if (evidence) {
          // 强制引用格式 - 严禁概括
          responseContent = `『${evidence.text}』`;
        } else {
          // 诚实回答未找到
          responseContent = `在该段落中未发现关于"${keyword}"的具体原话。

建议尝试：
• 使用不同的关键词
• 检查相关段落
• 或者告诉我您想了解的具体方面`;
        }
      } else {
        // 洞察引擎智能关联模式
        const message = currentMessage.toLowerCase();
        
        // 检查是否在询问目标受众相关的问题
        if (message.includes('目标受众') || message.includes('受众') || message.includes('用户') || message.includes('选对')) {
          responseContent = `基于你当前的研究主题"${researchTopic || '未设置'}"和研究目的"${researchPurpose || '未设置'}"，我来分析一下目标受众的选择：

**当前目标受众：**${targetAudience || '未设置'}

**分析建议：**
1. 如果你的研究涉及${researchTopic || '产品'}的使用体验，${targetAudience || '目标受众'}是一个很好的起点
2. 建议进一步细分：可以考虑年龄层、使用频率、专业背景等维度
3. 如果${researchPurpose || '研究目的'}偏向深度挖掘，建议选择有3-6个月使用经验的用户

你觉得这个分析如何？需要我帮你优化受众定义吗？`;
        }
        // 检查是否在询问研究主题相关的问题
        else if (message.includes('主题') || message.includes('研究') || message.includes('方向')) {
          responseContent = `关于你的研究主题"${researchTopic || '未设置'}"，我有一些建议：

**主题分析：**
- 当前主题聚焦明确，有利于深度访谈
- 建议从以下角度深化：使用场景、痛点体验、改进期望

**优化建议：**
1. 可以考虑加入竞品对比维度
2. 如果是新产品研究，建议增加用户动机探索
3. 考虑不同用户群体的差异化需求

你想从哪个角度深入探讨？`;
        }
        // 检查是否在询问研究目的相关的问题
        else if (message.includes('目的') || message.includes('目标') || message.includes('想要')) {
          responseContent = `关于你的研究目的"${researchPurpose || '未设置'}"，我来帮你梳理：

**目的解析：**
- 目标清晰，有利于设计针对性问题
- 建议量化具体指标：如用户满意度提升X%、转化率提升Y%等

**执行建议：**
1. 可以拆分为3-4个具体的研究假设
2. 建议优先级排序：核心需求 > 次要需求 > 边缘需求
3. 考虑时间限制，聚焦最重要的2-3个目标

需要我帮你优化研究假设吗？`;
        }
        // 智能大纲优化建议
        else if (activeWorkbench === 'outline' && outlineData) {
          responseContent = `基于你当前的"${researchTopic || '研究主题'}"访谈大纲，我建议：

**大纲优化建议：**
1. **开场环节**：建议增加破冰问题，让受访者更放松
2. **主讨论环节**：可以加入具体的使用场景询问
3. **收尾环节**：建议补充"还有什么想补充的吗"

**问题质量提升：**
- 多用"能否描述一下..."替代"是否..."
- 增加"最满意/最不满意"的对比问题
- 考虑加入"如果有魔法棒，你最想改变什么"

你希望我帮你优化哪个环节？`;
        }
        // 分析工作台的专业建议
        else if (activeWorkbench === 'analysis') {
          if (analysisResult) {
            responseContent = `基于你的"${researchTopic || '研究主题'}"分析结果，我提供以下洞察：

**核心发现验证：**
- 你的研究目的"${researchPurpose || '未设置'}"在分析中得到了很好的回应
- 建议重点关注：${analysisResult.coreInsights?.slice(0, 100) || '核心洞察内容'}...

**下一步行动：**
1. 可以基于这些洞察优化产品策略
2. 建议进行更大规模的用户验证
3. 考虑制定具体的改进时间表

需要我帮你制定详细的行动计划吗？`;
          } else {
            responseContent = `作为你的洞察引擎，我已准备好分析你的访谈内容：

**当前状态：**
- 研究主题：${researchTopic || '未设置'}
- 目标受众：${targetAudience || '未设置'}
- 研究目的：${researchPurpose || '未设置'}

**分析准备：**
请上传访谈笔录，我将为你提供：
1. 深度内容分析
2. 核心洞察提取
3. 行动建议制定

你的笔录准备好了吗？`;
          }
        }
        // 默认智能回复
        else {
          responseContent = `作为QualiProbe洞察引擎，我已读取你的研究信息：

**当前项目：**
- 主题：${researchTopic || '未设置'}
- 受众：${targetAudience || '未设置'}
- 目的：${researchPurpose || '未设置'}

**我可以帮你：**
• 优化访谈大纲设计
• 深度分析访谈内容
• 提供专业研究建议
• 提取精准原文证据

请告诉我你具体需要哪方面的帮助？`;
        }
      }
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        evidence
      };

      setChatMessages((prev: ChatMessage[]) => [...prev, assistantMessage]);
      scrollToChatBottom(); // 自动滚动到底部
    } catch (error) {
      console.error('对话失败:', error);
    } finally {
      setIsChatting(false);
      setIsAgentThinking(false);
      setThinkingStep('');
      scrollToChatBottom(); // 确保滚动到底部
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 头部 */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center">
          <Brain className="w-5 h-5 text-blue-600 mr-2" />
          <span className="font-bold text-slate-700 text-sm">AI 专家助手</span>
        </div>
        <button className="text-slate-400 hover:text-slate-600 p-1">
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
      
      {/* 聊天区域 - 吃掉所有剩余空间 */}
      <div className="flex-1 overflow-y-auto relative">
        <div className="p-4">
          {/* WelcomeGuide - 只在未交互时显示 */}
          {chatMessages.length === 0 && (
            <div className="mb-4">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center mb-3">
                  <Brain className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="text-blue-800 font-medium text-sm">洞察引擎</span>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed">
                  作为你的AI研究助手，我可以帮你优化访谈大纲、分析笔录内容，并提供专业的研究建议。
                  我已经读取了你的研究信息，可以基于上下文为你提供个性化的建议。
                </p>
              </div>
            </div>
          )}
          
          {/* 对话消息列表 */}
          <div className="space-y-3">
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-3`}
              >
                {message.type === 'user' ? (
                  <div className="text-right max-w-[80%]">
                    <p className="font-medium text-white text-sm inline-block bg-blue-600 px-4 py-2 rounded-2xl rounded-tr-sm">
                      {message.content}
                    </p>
                  </div>
                ) : (
                  <div className="max-w-[80%]">
                    <div className="flex items-start">
                      <Brain className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-slate-700 text-sm leading-relaxed bg-slate-100 px-4 py-2 rounded-2xl rounded-tl-sm">
                        {message.content}
                        {/* 引用联动 - 可点击的原话 */}
                        {message.evidence && onScrollToEvidence && (
                          <button
                            onClick={() => onScrollToEvidence(message.evidence!.chunkId)}
                            className="mt-2 text-blue-600 hover:text-blue-500 underline text-xs flex items-center"
                          >
                            <Search className="w-3 h-3 mr-1" />
                            查看原文
                          </button>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Agent 思考状态 */}
          {isAgentThinking && (
            <div className="flex items-center justify-center py-3">
              <div className="flex items-center space-x-2 text-blue-600 text-sm">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>{thinkingStep || '正在分析...'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* 输入框 - 固定在容器底部 */}
      <div className="m-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <div className="flex items-center space-x-3">
          <Input
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            placeholder="询问关于研究设计、大纲优化或笔录分析的问题..."
            className="bg-transparent border-0 text-slate-800 placeholder-slate-400 text-sm flex-1 focus:ring-0 focus:border-0 px-0"
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleChat()}
          />
          <Button
            onClick={handleChat}
            disabled={!currentMessage.trim() || isChatting}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 h-8 w-8 flex items-center justify-center"
          >
            <Zap className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
