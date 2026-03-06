"use client";

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Brain, 
  ChevronLeft, 
  Loader2, 
  Search, 
  Zap,
  Copy,
  RefreshCw,
  Check
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

interface SectionInput {
  title: string;
  duration: string;
  questions: string[];
  notes: string;
}

interface AgentChatProps {
  outlineData?: OutlineData | null;
  researchTopic?: string;
  targetAudience?: string;
  researchPurpose?: string;
  activeWorkbench?: 'outline' | 'analysis';
  analysisResult?: any;
  transcriptText?: string;
  transcriptChunks?: any[];
  onScrollToEvidence?: (chunkId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onApplySuggestion?: (section: SectionInput) => void;
  compact?: boolean;
}

export default function AgentChat({ 
  outlineData, 
  researchTopic = '', 
  targetAudience = '', 
  researchPurpose = '', 
  activeWorkbench = 'outline',
  analysisResult,
  transcriptText = '',
  transcriptChunks = [],
  onScrollToEvidence,
  onToggleCollapse,
  onApplySuggestion,
  compact = false
}: AgentChatProps) {
  const { t } = useLanguage();
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
        const el = chatContainerRef.current;
        el.scrollTo({
          top: el.scrollHeight,
          behavior: 'smooth',
        });
      }
    }, 100);
  };

  const handleCopyContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const handleRegenerateFromLastUser = () => {
    const lastUserMessage = [...chatMessages].reverse().find((m) => m.type === 'user');
    if (lastUserMessage) {
      handleChat(lastUserMessage.content);
    }
  };

  const [applyingMessageId, setApplyingMessageId] = useState<string | null>(null);
  const handleApplySuggestion = async (message: ChatMessage) => {
    if (!onApplySuggestion || !outlineData) return;
    setApplyingMessageId(message.id);
    try {
      const res = await fetch('/api/extract-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestion: message.content }),
      });
      if (!res.ok) throw new Error('Extract failed');
      const section = await res.json();
      onApplySuggestion(section);
    } catch (e) {
      console.error('Apply suggestion failed:', e);
    } finally {
      setApplyingMessageId(null);
    }
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
  const handleChat = async (overrideText?: string) => {
    const messageText = (overrideText ?? currentMessage).trim();
    if (!messageText || isChatting) return;

    // 首次交互时设置hasInteracted为true
    if (!hasInteracted) {
      setHasInteracted(true);
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setChatMessages((prev: ChatMessage[]) => [...prev, userMessage]);
    // 只有从输入框发送时，才清空输入框
    if (!overrideText) setCurrentMessage('');
    setIsChatting(true);
    setIsAgentThinking(true);

    try {
      let responseContent = '';

      const hasOutlineContext = !!outlineData?.sections?.length;
      const hasResearchContext = !!researchTopic.trim() || !!researchPurpose.trim() || !!targetAudience.trim();

      // 如果缺少上下文，先追问澄清，避免"牛头不对马嘴"
      if (activeWorkbench === 'outline' && !hasOutlineContext && !hasResearchContext) {
        responseContent = `为了更精准回答，我需要一点背景信息：\n\n1) 你的研究主题是什么？\n2) 目标受众是谁？\n3) 你想解决的核心问题/研究目的是什么？`;
      } else {
        const toStr = (v: unknown): string => {
          if (v == null) return '';
          return typeof v === 'string' ? v : String(v);
        };
        const hasAnalysis = activeWorkbench === 'analysis' && analysisResult;
        const hasTranscript = !!transcriptText?.trim();
        const transcriptBlock = hasTranscript
          ? `\n【原始访谈笔录】（用户询问"原话""原文"时，从此处摘录受访者原话，用引号标注）\n${transcriptText.slice(0, 8000)}${transcriptText.length > 8000 ? '\n...(笔录较长，已截断)' : ''}\n`
          : '';
        const analysisBlock = hasAnalysis ? `
【笔录分析结果】（用户当前正在查看，回答时必须优先引用）
- 背景分析: ${toStr(analysisResult?.background)}
- 访谈大纲摘要: ${toStr(analysisResult?.outline)}
- 核心观点: ${toStr(analysisResult?.coreInsights)}
- 待办事项/优化点: ${toStr(analysisResult?.actionItems)}
${transcriptBlock}
若用户问"需要优化的点在哪里""优化点是什么"等，请直接引用【待办事项/优化点】和【核心观点】作答。若用户问"原话""原文""具体怎么说的"，请从上述【原始访谈笔录】中摘录受访者的真实原话（用引号），不要编造。若用户以确认语气提问（如"对不对""对吗"），请先自然确认（如"你说的对"）再简要补充。
` : '';
        const contextPrompt = `
【当前上下文】
- [当前页面模式]: ${activeWorkbench === 'outline' ? t('header.outlineDesign') : t('header.interviewAnalysis')}
- [研究主题]: ${researchTopic || '未填写'}
- [目标受众]: ${targetAudience || '未填写'}
- [核心目标]: ${researchPurpose || '未填写'}
- [当前大纲快照]（完整，含用户刚采纳的新环节；环节N=数组第N项）: ${outlineData?.sections?.length ? JSON.stringify(outlineData.sections) : '无大纲数据'}
${analysisBlock}
【用户问题】: ${messageText}

请基于以上上下文，以资深定性研究专家的身份回答。若处于笔录分析模式且用户询问优化点，必须引用分析结果中的待办事项和核心观点。
`;
      
        // 调用真实的聊天 API
        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              context: contextPrompt,
              message: messageText,
              mode: 'expert'
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (!data.error) {
              responseContent = data.answer;
            } else {
              throw new Error(data.error);
            }
          } else {
            throw new Error(`API request failed: ${response.status}`);
          }
        } catch (error) {
          console.error('Chat API error:', error);
          // 降级到本地启发式回复
          const message = messageText.toLowerCase();
          const outlineHint = outlineData?.sections?.length
            ? `\n\n（我当前看到的大纲前两段是：${outlineData.sections
                .slice(0, 2)
                .map((s) => s.title)
                .join(' / ')}）`
            : '';

          if (message.includes('怎么问') || message.includes('提问') || message.includes('问题') || message.includes('追问')) {
            responseContent = `我建议你把问题写成"具体经历复盘 + 追问梯子"的结构：\n\n1) 先让对方回忆最近一次：\n- "你上一次……当时发生了什么？"\n2) 再问决策依据：\n- "你当时为什么这样选？"\n3) 再挖感受与细节：\n- "哪一步让你觉得顺/不顺？能举个细节吗？"\n4) 再做对比与例外：\n- "如果换一种情况（赶时间/排队/夜间），你会怎么做？"\n\n你把你想优化的那一条问题贴出来，我可以直接给你 3-5 个更好的版本。${outlineHint}`;
          } else if (message.includes('大纲') || message.includes('结构') || message.includes('逻辑')) {
            responseContent = `我建议你检查大纲是否具备：\n\n1) **开场**：背景+破冰（让受访者进入状态）\n2) **核心链路**：按时间线/任务/阶段推进（每段都有行为-决策-情绪-触点-例外）\n3) **取舍**：与替代方案/竞品的对比（为什么选/为什么不选）\n4) **收尾**：总结验证（最重要的1-2点）+补充\n\n如果你告诉我你选的研究类型（旅程/竞品/体验诊断等）和你最关心的输出，我可以帮你把段落顺序和每段时长重新分配。${outlineHint}`;
          } else if (message.includes('受众') || message.includes('用户') || message.includes('样本') || message.includes('招募')) {
            responseContent = `你现在的目标受众是：${targetAudience || '（未填写）'}\n\n为了让样本更"对"，我建议按下面3个维度描述清楚：\n1) **行为门槛**：最近一次/频率（如过去2周内做过、每月2次以上）\n2) **经验层级**：新手 vs 老手（是否会显著影响体验与决策）\n3) **关键差异**：场景差异（通勤/长途/夜间/带娃/公司车队等）\n\n你想要的是更偏"代表性"还是更偏"极端案例/问题诊断"？我可以按你的目标给一版招募条件。${outlineHint}`;
          } else {
            responseContent = `我可以围绕你当前项目（${researchTopic || '未填写研究主题'}）帮你做三件事：\n\n1) 优化大纲结构和每段时长\n2) 把某一段的问题改得更口语、更可回答，并补足追问\n3) 帮你定义更准确的目标受众与招募条件\n\n你现在最想我先帮哪一个？把你的问题再具体一点（例如"想优化第2环节的问题"）。${outlineHint}`;
          }
        }
      }
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: responseContent,
        timestamp: new Date()
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
      {!compact && (
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
          <div className="flex items-center">
            <Brain className="w-5 h-5 text-blue-600 mr-2" />
            <span className="font-bold text-slate-700 text-sm">{t('agent.title')}</span>
          </div>
          {onToggleCollapse && (
            <button onClick={onToggleCollapse} className="text-slate-400 hover:text-slate-600 p-1">
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
      {/* 聊天区域 */}
      <div className="flex-1 overflow-y-auto relative">
        <div className="p-4" ref={chatContainerRef}>
          {/* 对话消息列表 */}
          <div className="space-y-3">
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-3`}
              >
                {message.type === 'user' ? (
                  <div className="text-right max-w-[80%]">
                    <p className="font-medium text-white text-sm inline-block bg-slate-800 px-4 py-2 rounded-2xl rounded-br-none shadow-sm">
                      {message.content}
                    </p>
                  </div>
                ) : (
                  <div className="max-w-[80%]">
                    <div className="flex items-start group relative">
                      <Brain className="w-4 h-4 text-slate-500 mr-2 mt-0.5 flex-shrink-0" />
                      <div className="text-slate-700 text-sm leading-relaxed bg-slate-50/50 border border-slate-100 shadow-sm px-4 py-3 rounded-2xl rounded-bl-none w-full">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h2: ({ children }) => (
                              <h2 className="mt-2 mb-3 text-sm font-semibold text-slate-900">
                                {children}
                              </h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="mt-3 mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                {children}
                              </h3>
                            ),
                            p: ({ children }) => (
                              <p className="mb-4 last:mb-0 text-sm leading-relaxed text-slate-700">
                                {children}
                              </p>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold text-slate-900">
                                {children}
                              </strong>
                            ),
                            ul: ({ children }) => (
                              <ul className="mt-1 space-y-1.5">
                                {children}
                              </ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="mt-1 space-y-1.5">
                                {children}
                              </ol>
                            ),
                            li: ({ children, ordered, index }: any) => {
                              const isOrdered = !!ordered;
                              return (
                                <li className="flex items-start py-1.5">
                                  {isOrdered ? (
                                    <span className="mr-2 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">
                                      {typeof index === 'number' ? index + 1 : ''}
                                    </span>
                                  ) : (
                                    <span className="mr-2 mt-0.5 text-[13px] leading-none text-indigo-500 flex-shrink-0">
                                      →
                                    </span>
                                  )}
                                  <span className="flex-1 text-sm leading-relaxed text-slate-700">
                                    {children}
                                  </span>
                                </li>
                              );
                            },
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>

                        {/* 引用联动 - 可点击的原文 */}
                        {message.evidence && onScrollToEvidence && (
                          <button
                            onClick={() => onScrollToEvidence(message.evidence!.chunkId)}
                            className="mt-2 text-blue-600 hover:text-blue-500 underline text-xs flex items-center"
                          >
                            <Search className="w-3 h-3 mr-1" />
                            查看原文
                          </button>
                        )}

                        {/* 应用到大纲：大纲模式下始终显示，便于用户一键采纳 AI 建议 */}
                        {activeWorkbench === 'outline' && onApplySuggestion && outlineData?.sections && (
                          <div className="mt-3 flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleApplySuggestion(message)}
                              disabled={!!applyingMessageId}
                              className="border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400"
                            >
                              {applyingMessageId === message.id ? (
                                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                              ) : (
                                <Check className="w-3 h-3 mr-2" />
                              )}
                              {t('agent.applySuggestion')}
                            </Button>
                            <button type="button" onClick={() => handleCopyContent(message.content)} className="text-slate-400 hover:text-slate-600 p-1" aria-label="Copy"><Copy className="w-3 h-3" /></button>
                            <button type="button" onClick={handleRegenerateFromLastUser} className="text-slate-400 hover:text-slate-600 p-1" aria-label="Regenerate"><RefreshCw className="w-3 h-3" /></button>
                          </div>
                        )}
                        {/* 非大纲模式或短消息：仅显示复制/重生成（悬浮） */}
                        {(!onApplySuggestion || !outlineData?.sections || activeWorkbench !== 'outline') && message.content.length > 120 && (
                          <div className="absolute -bottom-1 right-2 translate-y-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1.5 text-slate-400">
                            <button type="button" onClick={() => handleCopyContent(message.content)} className="p-1 rounded-full hover:bg-slate-100 hover:text-slate-700" aria-label="Copy"><Copy className="w-3 h-3" /></button>
                            <button type="button" onClick={handleRegenerateFromLastUser} className="p-1 rounded-full hover:bg-slate-100 hover:text-slate-700" aria-label="Regenerate"><RefreshCw className="w-3 h-3" /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Agent 思考状态 */}
          {isAgentThinking && (
            <div className="mt-3 flex justify-start">
              <div className="flex items-start">
                <Brain className="w-4 h-4 text-slate-400 mr-2 mt-0.5 flex-shrink-0" />
                <div className="relative overflow-hidden rounded-2xl rounded-bl-none bg-gradient-to-r from-slate-50 via-indigo-50/70 to-slate-50 px-4 py-3 border border-slate-100 shadow-sm w-full max-w-[80%]">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_1.8s_infinite]" />
                  <div className="relative space-y-2">
                    <div className="h-3 w-40 bg-slate-200/70 rounded-full" />
                    <div className="h-3 w-56 bg-slate-200/60 rounded-full" />
                    <div className="h-3 w-32 bg-slate-200/50 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* 输入框 - sticky固定在容器底部 */}
      <div className="sticky bottom-0 m-4 p-4 bg-white/80 backdrop-blur-md border border-slate-100 rounded-2xl shadow-[0_-8px_24px_rgba(0,0,0,0.06)] flex-shrink-0">
        {!currentMessage.trim() && (
          <div className="mb-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleChat(t('agent.optimizeQuestion'))}
              className="text-[12px] text-slate-400 border border-slate-200/70 bg-transparent hover:text-slate-600 hover:border-slate-300 transition-colors px-2 py-0.5 rounded-full"
            >
              {t('agent.optimizeQuestion')}
            </button>
            <button
              type="button"
              onClick={() => handleChat(t('agent.addDetails'))}
              className="text-[12px] text-slate-400 border border-slate-200/70 bg-transparent hover:text-slate-600 hover:border-slate-300 transition-colors px-2 py-0.5 rounded-full"
            >
              {t('agent.addDetails')}
            </button>
          </div>
        )}
        <div className="flex items-center space-x-3">
          <Input
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            placeholder={t('agent.placeholder')}
            className="bg-transparent border-0 text-slate-800 placeholder:text-slate-400/50 text-sm flex-1 focus:ring-0 focus:border-0 px-0"
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleChat()}
          />
          <Button
            onClick={() => handleChat()}
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
