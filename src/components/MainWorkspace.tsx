"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Brain, 
  Edit3, 
  Download, 
  Upload, 
  FileText, 
  Clock, 
  Plus, 
  X, 
  Search, 
  MessageSquare, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  Loader2, 
  Sparkles, 
  HelpCircle,
  Settings,
  Globe,
  Check,
  Zap,
  Cpu,
  Bot,
  Orbit,
  Users
} from 'lucide-react';
import { exportToWord } from '../lib/exportDocx';

type FGDInteractionType = 'draw' | 'debate' | 'vote' | 'experiment' | 'values' | 'mapping' | 'conflict' | 'discuss';

const FGD_TASK_ICON: Record<FGDInteractionType, string> = {
  draw: '🎨', debate: '⚔️', vote: '🗳️', experiment: '🧪',
  values: '⚖️', mapping: '🎭', conflict: '⚡', discuss: '🗳️',
};

interface Section {
  id?: number;
  title: string;
  duration: string;
  questions: string[];
  notes: string;
  interactionType?: FGDInteractionType;
  discussionTask?: string;
  consensusChallengeTask?: string;
  behavioralEvidenceTask?: string;
  probingQuestion?: string;
  isCore?: boolean;
}

interface OutlineData {
  project_title: string;
  sections: Section[];
}

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

interface FineTuneRequest {
  section: keyof AnalysisResult;
  instruction: string;
}

interface AgentContext {
  activeWorkbench: 'outline' | 'analysis';
  analysisResult: AnalysisResult | null;
  transcriptText: string;
  researchTopic: string;
  targetAudience: string;
  researchPurpose: string;
}

interface MainWorkspaceProps {
  outlineData?: OutlineData | null;
  setOutlineData?: (data: OutlineData | null) => void;
  onOutlineGenerated?: (data: OutlineData) => void;
  onContextSync?: (ctx: AgentContext) => void;
}

// 语义切片接口
interface TranscriptChunk {
  id: string;
  content: string;
  speaker?: string;
  startIndex: number;
  endIndex: number;
}

// 语义预处理函数
const extractCoreEntity = (topic: string): string => {
  // 实体清洗 - 剔除所有后缀
  const suffixesToRemove = [
    '用户画像',
    '用户细分', 
    '访谈大纲',
    '深度访谈',
    '消费者研究',
    '市场调研',
    '体验研究',
    '用户研究',
    '产品研究',
    '品牌研究',
    '购买行为研究',
    '消费动机研究'
  ];
  
  let cleanedTopic = topic.trim();
  
  // 移除所有后缀
  for (const suffix of suffixesToRemove) {
    if (cleanedTopic.endsWith(suffix)) {
      cleanedTopic = cleanedTopic.slice(0, -suffix.length).trim();
      break; // 只移除一个后缀
    }
  }
  
  return cleanedTopic || topic;
};

const detectIndustryType = (topic: string): 'fmcg' | 'tech' | 'service' | 'other' => {
  const fmcgKeywords = ['巧克力', '咖啡', '饮料', '食品', '零食', '美妆', '护肤', '德芙', '费列罗'];
  const techKeywords = ['特斯拉', 'cybertruck', '汽车', '手机', '电脑', '软件', 'app', '苹果', '华为'];
  const serviceKeywords = ['银行', '保险', '教育', '医疗', '咨询', '餐厅', '酒店'];
  
  const lowerTopic = topic.toLowerCase();
  
  if (fmcgKeywords.some(keyword => lowerTopic.includes(keyword))) {
    return 'fmcg';
  }
  if (techKeywords.some(keyword => lowerTopic.includes(keyword))) {
    return 'tech';
  }
  if (serviceKeywords.some(keyword => lowerTopic.includes(keyword))) {
    return 'service';
  }
  
  return 'other';
};

// System Prompt for 实体感知型专家
const SYSTEM_PROMPT = `你是一位拥有15年经验的"资深定性研究专家 & 用户研究顾问"，具备实体感知能力。

【实体感知逻辑】
你不再使用任何固定的提问模板，而是根据清洗后的核心实体重新构思访谈逻辑。

【禁止性指令】
严禁询问以下问题：
- 对主题的"熟悉程度"
- 对访谈的"期待"  
- 对消费品的"功能改进"或"未来12个月需求变化"（这些是问软件产品的）
- "您对XX熟悉吗？"
- "请简单介绍一下您的背景"

【专家提问法 - 体验导向】
**快消品（如德芙巧克力）**：
- 购买时的瞬时动机
- 情绪补偿感
- 品牌联想
- 消费场景的心理暗示
- 包装设计对购买决策的影响

**高价值/科技品（如特斯拉）**：
- 身份认同的构建过程
- 技术门槛的心理障碍
- 社交货币价值
- 颠覆性体验的心理冲击

【行业敏感度】
**动态角色演化**：
- **快消品**：视角是"感官体验与成瘾经济"，关注情绪慰藉、生活仪式感、风味追溯
- **科技品**：视角是"工业设计与社会心理学"，关注身份认同、颠覆感、社交压力

【深度挖掘算法】
强制AI在回答大纲问题时，必须包含以下三个维度的评估：
1. **逻辑漏洞检查**（问题之间是否有断层？）
2. **追问技巧升级**（把"为什么"改为更具引导性的场景追问）
3. **受访者心理预判**（预判可能的防御心理）

【回答风格】
- 语气专业且老辣
- 拒绝说"这是一个好的开始"
- 直接给干货、给漏洞、给优化方案
- 结构化输出：尽可能使用Markdown的加粗、列表或表格来增强专业感

【核心原则】
1. 当用户询问"原话"、"证据"、"原文"、"谁说的"等要求时，你必须进入【精准原文溯源模式】
2. 严禁任何形式的概括、总结或改写
3. 必须从原始笔录切片中提取100%还原的句子
4. 使用格式：『原文内容』
5. 如果找不到，诚实回答："在该段落中未发现具体原话"

【原文溯源模式】
- 扫描所有语义切片
- 匹配最相关的原始片段
- 完整保留标点符号和语气
- 不添加任何解释或分析

【正常对话模式】
- 提供专业的研究建议
- 协助优化访谈设计
- 分析用户需求并提供解决方案`;

export default function MainWorkspace({ outlineData: propOutlineData, setOutlineData: propSetOutlineData, onOutlineGenerated, onContextSync }: MainWorkspaceProps = {}) {
  const { t } = useLanguage();
  // 基础状态
  const [apiKeyStatus, setApiKeyStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [showHelp, setShowHelp] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // 工作台状态
  const [activeWorkbench, setActiveWorkbench] = useState<'outline' | 'analysis'>('outline');
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);

  // 表单状态
  const [researchTopic, setResearchTopic] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [researchPurpose, setResearchPurpose] = useState('');
  const [studyType, setStudyType] = useState<'auto' | 'journey' | 'competitive' | 'experience' | 'persona' | 'concept' | 'pricing' | 'brand' | 'ux'>('auto');
  const [interviewType, setInterviewType] = useState<'IDI' | 'FGD'>('IDI');
  const [interviewDuration, setInterviewDuration] = useState('60');
  const [outputLanguage, setOutputLanguage] = useState<'中文' | '英文' | '日文' | '双语对照'>('中文');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<'basic' | 'custom'>('basic');

  // 大纲相关状态
  const [outlineData, setOutlineData] = useState<OutlineData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingOutline, setEditingOutline] = useState<OutlineData | null>(null);

  useEffect(() => {
    if (propOutlineData) {
      setOutlineData(propOutlineData);
    }
  }, [propOutlineData]);

  // 笔录和分析状态
  const [transcriptText, setTranscriptText] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [thinkingStep, setThinkingStep] = useState('');

  useEffect(() => {
    onContextSync?.({
      activeWorkbench,
      analysisResult,
      transcriptText,
      researchTopic,
      targetAudience,
      researchPurpose,
    });
  }, [onContextSync, activeWorkbench, analysisResult, transcriptText, researchTopic, targetAudience, researchPurpose]);

  // 错误Toast状态
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 引用联动状态
  const transcriptRef = useRef<HTMLDivElement>(null);

  // 错误处理函数
  const showError = (message: string) => {
    setErrorMessage(message);
    setShowErrorToast(true);
    setTimeout(() => setShowErrorToast(false), 5000);
  };

  // 模板上传处理
  const handleTemplateUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let template;
      
      if (file.name.endsWith('.json')) {
        template = JSON.parse(text);
      } else if (file.name.endsWith('.txt')) {
        // 简单的TXT格式解析
        template = {
          project_title: file.name.replace('.txt', ''),
          sections: [
            {
              id: 1,
              title: "自定义模板",
              duration: "60分钟",
              questions: text.split('\n').filter(line => line.trim()),
              notes: "从TXT文件导入的自定义模板"
            }
          ]
        };
      }
      
      setOutlineData(template);
      setSelectedTemplate('custom');
      alert(t('errors.templateUploadSuccess'));
    } catch (error) {
      console.error('模板上传失败:', error);
      showError(t('errors.templateUploadFailed'));
    }
  };

  const handleTranscriptFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const name = file.name.toLowerCase();
      if (name.endsWith('.txt')) {
        const text = await file.text();
        setTranscriptText(text);
      } else if (name.endsWith('.docx')) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/parse-file', { method: 'POST', body: fd });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Parse failed');
        const { text } = await res.json();
        setTranscriptText(text || '');
      } else {
        showError(t('analysis.supportedFormats') || 'Supported: .txt, .docx');
        return;
      }
    } catch (err) {
      console.error('Transcript file read error:', err);
      showError(err instanceof Error ? err.message : (t('errors.templateUploadFailed') || 'Failed to read file'));
    }
    event.target.value = '';
  };

  const handleAnalyze = async () => {
    if (!transcriptText.trim()) {
      showError(t('analysis.waitingForTranscript') || 'Please upload or paste transcript first');
      return;
    }
    setIsAnalyzing(true);
    setThinkingStep(t('analysis.analyzing') || 'Analyzing...');
    try {
      const res = await fetch('/api/analyze-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcriptText,
          researchTopic,
          researchPurpose,
          targetAudience,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || `HTTP ${res.status}`);
      }
      const result = await res.json();
      setAnalysisResult(result);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
      setThinkingStep('');
    }
  };

  // 生成大纲 - 去Mock化重构，强制API调用
  const handleGenerate = async () => {
    if (!researchTopic.trim() || !targetAudience.trim() || !researchPurpose.trim()) {
      showError(t('errors.fillRequiredFields'));
      return;
    }

    setIsGenerating(true);
    setThinkingStep('🧠 正在基于漏斗模型构建提问路径...');
    
    // 动态思考步骤
    const thinkingSteps = [
      '🧠 正在基于漏斗模型构建提问路径...',
      '🔍 正在分析核心实体和用户画像...',
      '📊 正在设计递进式问题结构...',
      '🎯 正在优化问题深度和广度...',
      '✨ 正在生成专业访谈大纲...'
    ];
    
    let stepIndex = 0;
    const thinkingInterval = setInterval(() => {
      if (stepIndex < thinkingSteps.length) {
        setThinkingStep(thinkingSteps[stepIndex]);
        stepIndex++;
      }
    }, 1500);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: researchTopic,
          audience: targetAudience,
          goal: researchPurpose,
          interviewType: interviewType || 'IDI',
          totalDuration: interviewDuration || '60',
          template: selectedTemplate,
          systemPrompt: SYSTEM_PROMPT, // 注入完整的SYSTEM_PROMPT
          outputLanguage: outputLanguage, // 传递语言偏好
          enhancedMode: true, // 启用增强模式
          studyType
        }),
      });

      clearInterval(thinkingInterval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      // API成功：直接更新outlineData
      setOutlineData(result);
      if (propSetOutlineData) {
        propSetOutlineData(result);
      }
      setThinkingStep('✅ 大纲生成完成！');

      if (onOutlineGenerated) {
        onOutlineGenerated(result);
      }
      
      setTimeout(() => {
        setThinkingStep('');
      }, 2000);

    } catch (error) {
      clearInterval(thinkingInterval);
      
      console.error('API调用失败:', error);
      
      // API失败：禁止展示Mock数据，显示专业错误提示
      let errorMessage = '生成大纲失败';
      
      if (error instanceof Error) {
        if (error.message.includes('quota') || error.message.includes('429')) {
          errorMessage = 'API配额已用完，请检查API Key或稍后重试';
        } else if (error.message.includes('timeout') || error.message.includes('network')) {
          errorMessage = '网络连接超时，请检查网络后重试';
        } else if (error.message.includes('API Key') || error.message.includes('unauthorized')) {
          errorMessage = 'API Key无效，请检查配置';
        } else {
          errorMessage = `生成失败: ${error.message}`;
        }
      }
      
      showError(errorMessage);
      setThinkingStep('');
      
      // 保留用户输入，不清空表单
    } finally {
      setIsGenerating(false);
    }
  };

  // 编辑功能
  const handleEdit = () => {
    setEditingOutline(outlineData ? { ...outlineData } : null);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editingOutline) {
      setOutlineData(editingOutline);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingOutline(null);
  };

  const handleSectionEdit = (index: number, field: keyof Section, value: any) => {
    if (!editingOutline) return;
    
    const updatedSections = [...editingOutline.sections];
    updatedSections[index] = {
      ...updatedSections[index],
      [field]: value
    };
    
    setEditingOutline({
      ...editingOutline,
      sections: updatedSections
    });
  };

  const addSection = () => {
    if (!editingOutline) return;
    
    const newSection: Section = {
      id: editingOutline.sections.length + 1,
      title: t('workspace.addSection'),
      duration: '15分钟',
      questions: [t('workspace.questions')],
      notes: t('workspace.researchPurposePlaceholder')
    };
    
    setEditingOutline({
      ...editingOutline,
      sections: [...editingOutline.sections, newSection]
    });
  };

  const removeSection = (index: number) => {
    if (!editingOutline) return;
    
    const updatedSections = editingOutline.sections.filter((_, i) => i !== index);
    setEditingOutline({
      ...editingOutline,
      sections: updatedSections
    });
  };

  // 导出功能
  const handleExport = () => {
    if (!outlineData) {
      alert(t('workspace.noOutline'));
      return;
    }
    exportToWord(outlineData, {
      targetAudience,
      researchPurpose,
      interviewType,
      totalDuration: interviewDuration,
    });
  };

  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const res = await fetch('/api/check-groq');
        const data = await res.json();
        setApiKeyStatus(data.groqReady ? 'ready' : 'error');
      } catch {
        setApiKeyStatus('error');
      }
    };

    checkApiKey();
  }, []);

  return (
    <div className="h-full bg-[#F8FAFC] overflow-y-auto">
      <div className="w-full px-4 md:px-10 py-4 md:py-8">
        {/* 工作台切换标签 */}
        <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:space-x-2 bg-slate-100 p-1 rounded-lg mb-4 md:mb-8">
          <button
            onClick={() => setActiveWorkbench('outline')}
            className={`flex-1 sm:flex-none px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-all ${
              activeWorkbench === 'outline' 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <Edit3 className="w-4 h-4 inline mr-1.5 md:mr-2" />
            {t('header.outlineDesign')}
          </button>
          <button
            onClick={() => setActiveWorkbench('analysis')}
            className={`flex-1 sm:flex-none px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-all ${
              activeWorkbench === 'analysis' 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <Search className="w-4 h-4 inline mr-1.5 md:mr-2" />
            {t('header.interviewAnalysis')}
          </button>
        </div>

        {activeWorkbench === 'outline' && (
          <>
            {/* 参数设置区 */}
            <div className="max-w-4xl mx-auto bg-white border border-slate-50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl md:rounded-[32px] p-4 md:p-6 mb-4 md:mb-8">
              <div className="space-y-8">
                {/* 研究主题 - 大字号无边框风格 */}
                <div>
                  <Label className="text-slate-600 text-sm mb-3 block">{t('workspace.researchTopic')}</Label>
                  <Input
                    value={researchTopic}
                    onChange={(e) => setResearchTopic(e.target.value)}
                    className="text-xl font-semibold text-slate-800 border-0 border-b border-slate-200 rounded-none bg-slate-50/50 px-3 py-3 placeholder:text-sm placeholder:text-slate-400 focus-visible:ring-0 focus-visible:border-slate-800"
                    placeholder={t('workspace.researchTopicPlaceholder')}
                  />
                </div>
                
                {/* 目标受众 */}
                <div>
                  <Label className="text-slate-600 text-sm mb-1.5 block">{t('workspace.targetAudience')}</Label>
                  <Input
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="text-lg bg-slate-50/50 border border-transparent rounded-lg px-4 py-3 placeholder-slate-400 focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/15 transition-colors"
                    placeholder={t('workspace.targetAudiencePlaceholder')}
                  />
                </div>
                
                {/* 研究目的 */}
                <div>
                  <Label className="text-slate-600 text-sm mb-1.5 block">{t('workspace.researchPurpose')}</Label>
                  <Textarea
                    value={researchPurpose}
                    onChange={(e) => setResearchPurpose(e.target.value)}
                    className="text-lg bg-slate-50/50 border border-transparent rounded-lg px-4 py-3 placeholder-slate-400 focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/15 resize-none transition-colors"
                    placeholder={t('workspace.researchPurposePlaceholder')}
                    rows={3}
                  />
                </div>
              </div>

              {/* 高级选项 */}
              <div className="mt-8 pt-8 border-t border-slate-200">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-slate-600 text-sm mb-1.5 block">{t('studyType.label')}</Label>
                    <Select value={studyType} onValueChange={(value: any) => setStudyType(value)}>
                      <SelectTrigger className="h-12 border-slate-200 bg-white/50 backdrop-blur">
                        <SelectValue placeholder={t('studyType.placeholder')} />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value="auto" className="text-slate-800">{t('studyType.auto')}</SelectItem>
                        <SelectItem value="journey" className="text-slate-800">{t('studyType.journey')}</SelectItem>
                        <SelectItem value="competitive" className="text-slate-800">{t('studyType.competitive')}</SelectItem>
                        <SelectItem value="experience" className="text-slate-800">{t('studyType.experience')}</SelectItem>
                        <SelectItem value="persona" className="text-slate-800">{t('studyType.persona')}</SelectItem>
                        <SelectItem value="concept" className="text-slate-800">{t('studyType.concept')}</SelectItem>
                        <SelectItem value="pricing" className="text-slate-800">{t('studyType.pricing')}</SelectItem>
                        <SelectItem value="brand" className="text-slate-800">{t('studyType.brand')}</SelectItem>
                        <SelectItem value="ux" className="text-slate-800">{t('studyType.ux')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-slate-400 text-xs mt-2">{t('studyType.helper')}</p>
                  </div>

                  <div>
                    <Label className="text-slate-600 text-sm mb-1.5 block">{t('workspace.interviewType')}</Label>
                    <Select value={interviewType} onValueChange={(value: 'IDI' | 'FGD') => setInterviewType(value)}>
                      <SelectTrigger className="h-12 border-slate-200 bg-white/50 backdrop-blur">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value="IDI" className="text-slate-800">{t('interviewTypes.idi')}</SelectItem>
                        <SelectItem value="FGD" className="text-slate-800">{t('interviewTypes.fgd')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-slate-600 text-sm mb-1.5 block">{t('workspace.interviewDuration')}</Label>
                    <Select value={interviewDuration} onValueChange={setInterviewDuration}>
                      <SelectTrigger className="h-12 border-slate-200 bg-white/50 backdrop-blur">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value="30" className="text-slate-800">{t('durations.30')}</SelectItem>
                        <SelectItem value="45" className="text-slate-800">{t('durations.45')}</SelectItem>
                        <SelectItem value="60" className="text-slate-800">{t('durations.60')}</SelectItem>
                        <SelectItem value="90" className="text-slate-800">{t('durations.90')}</SelectItem>
                        <SelectItem value="120" className="text-slate-800">{t('durations.120')}</SelectItem>
                      </SelectContent>
                    </Select>
                    {interviewType === 'FGD' && (
                      <p className="text-indigo-600 text-xs mt-2">
                        FGD 建议 90–120 分钟，环节时长将按比例分配
                      </p>
                    )}
                  </div>
                </div>

                {/* 输出语言和模板上传 */}
                <div className="mt-6 grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-slate-600 text-sm mb-3 block flex items-center">
                      <span className="mr-2">🌐</span>
                      {t('workspace.outputLanguage')}
                    </Label>
                    <div className="relative">
                      <button
                        onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                        className="w-full bg-white/50 backdrop-blur border border-slate-200 text-slate-800 rounded-lg px-3 py-2.5 text-left flex items-center justify-between hover:bg-white/70 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      >
                        <span className="flex items-center">
                          {outputLanguage === '中文' && t('languages.chinese')}
                          {outputLanguage === '英文' && t('languages.english')}
                          {outputLanguage === '日文' && t('languages.japanese')}
                          {outputLanguage === '双语对照' && t('languages.bilingual')}
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showLanguageDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {showLanguageDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-2xl z-50">
                          <div className="py-1">
                            {[
                              { value: '中文', label: t('languages.chinese') },
                              { value: '英文', label: t('languages.english') },
                              { value: '日文', label: t('languages.japanese') },
                              { value: '双语对照', label: t('languages.bilingual') }
                            ].map((option) => (
                              <button
                                key={option.value}
                                onClick={() => {
                                  setOutputLanguage(option.value as '中文' | '英文' | '日文' | '双语对照');
                                  setShowLanguageDropdown(false);
                                }}
                                className={`w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors duration-150 flex items-center ${
                                  outputLanguage === option.value ? 'bg-blue-50 text-blue-600' : 'text-slate-800'
                                }`}
                              >
                                {option.label}
                                {outputLanguage === option.value && (
                                  <Check className="w-4 h-4 ml-auto" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-slate-600 text-sm mb-3 block flex items-center">
                      <span className="mr-2">📋</span>
                      {t('workspace.templateUpload')}
                    </Label>
                    <div className="flex space-x-2">
                      <input
                        type="file"
                        accept=".json,.txt"
                        onChange={handleTemplateUpload}
                        className="hidden"
                        id="template-upload"
                      />
                      <Button
                        onClick={() => document.getElementById('template-upload')?.click()}
                        variant="outline"
                        className="flex-1 border-slate-200 bg-white/50 backdrop-blur text-slate-600 hover:text-slate-800 hover:bg-white/70"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {t('outline.uploadTemplate')}
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedTemplate('basic');
                          alert(t('outline.defaultTemplateSelected'));
                        }}
                        variant="outline"
                        className="flex-1 border-slate-200 bg-white/50 backdrop-blur text-slate-600 hover:text-slate-800 hover:bg-white/70"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        {t('outline.useDefaultTemplate')}
                      </Button>
                    </div>
                    <p className="text-slate-400 text-xs mt-2">{t('outline.templateSupport')}</p>
                  </div>
                </div>
              </div>

              {/* 生成按钮 */}
              <div className="flex justify-center mt-8">
                <Button 
                  onClick={handleGenerate}
                  disabled={isGenerating || !researchTopic.trim() || !targetAudience.trim() || !researchPurpose.trim()}
                  className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-xl"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('workspace.generating')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {t('workspace.generate')}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* 骨架屏 - 生成中显示 */}
            {isGenerating && (
              <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-lg">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-bold text-slate-800">正在生成专业大纲...</h2>
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse delay-75"></div>
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse delay-150"></div>
                  </div>
                </div>
                
                {/* 专家思考日志 */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center mb-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                    <span className="text-sm font-medium text-slate-700">专家思考日志</span>
                  </div>
                  <div className="text-sm text-slate-600 bg-white p-3 rounded border border-slate-100">
                    {thinkingStep}
                  </div>
                </div>
                
                {/* 骨架屏内容 */}
                <div className="space-y-6">
                  {[1, 2, 3, 4].map((section) => (
                    <div key={section} className="border-l-4 border-slate-300 pl-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-6 bg-slate-200 rounded w-48 animate-pulse"></div>
                        <div className="h-4 bg-slate-200 rounded w-20 animate-pulse"></div>
                      </div>
                      <div className="space-y-3">
                        {[1, 2, 3].map((question) => (
                          <div key={question} className="bg-slate-50 rounded-lg p-4">
                            <div className="h-4 bg-slate-200 rounded w-full mb-2 animate-pulse"></div>
                            <div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 大纲展示区 */}
            {outlineData && !isEditing && (
              <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden flex flex-col">
                {/* 顶部操作栏：不遮挡内容 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80 shrink-0">
                  <Button 
                    onClick={handleEdit} 
                    variant="outline"
                    size="sm"
                    className="border-slate-300 text-slate-600 hover:text-slate-800 hover:bg-white"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    {t('workspace.edit')}
                  </Button>
                  <Button 
                    onClick={handleExport} 
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {t('workspace.export')}
                  </Button>
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-blue-600 mb-3">{outlineData.project_title}</h3>
                  <p className="text-slate-500">{t('workspace.professionalOutline')}</p>
                </div>

                {/* 项目基本信息 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                  <h4 className="text-lg font-bold text-blue-700 mb-4 flex items-center">
                    <span className="mr-2">📋</span>
                    {t('outline.projectInfo')}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start">
                      <span className="font-semibold text-blue-600 mr-2">{t('outline.researchTopic')}：</span>
                      <span className="text-slate-700">{researchTopic || t('outline.notSpecified')}</span>
                    </div>
                    <div className="flex items-start">
                      <span className="font-semibold text-blue-600 mr-2">{t('outline.targetAudience')}：</span>
                      <span className="text-slate-700">{targetAudience || t('outline.notSpecified')}</span>
                    </div>
                    <div className="flex items-start">
                      <span className="font-semibold text-blue-600 mr-2">{t('outline.researchPurpose')}：</span>
                      <span className="text-slate-700">{researchPurpose || t('outline.notSpecified')}</span>
                    </div>
                    <div className="flex items-start">
                      <span className="font-semibold text-blue-600 mr-2">{t('outline.interviewType')}：</span>
                      <span className="text-slate-700">{interviewType === 'IDI' ? t('interviewTypes.idi') : t('interviewTypes.fgd')}</span>
                    </div>
                    <div className="flex items-start">
                      <span className="font-semibold text-blue-600 mr-2">{t('outline.interviewDuration')}：</span>
                      <span className="text-slate-700">{t(`durations.${interviewDuration}`)}</span>
                    </div>
                  </div>
                </div>

                {/* 免责声明 */}
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-8">
                  <h4 className="text-lg font-bold text-yellow-700 mb-3 flex items-center">
                    <span className="mr-2">⚠️</span>
                    {t('outline.disclaimer')}
                  </h4>
                  <p className="text-yellow-800 italic text-sm leading-relaxed">
                    {t('outline.disclaimerText')}
                  </p>
                </div>

                {/* 暖场话术 */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
                  <h4 className="text-lg font-bold text-green-700 mb-4 flex items-center">
                    <span className="mr-2">🎤</span>
                    {t('outline.warmUpScript')}
                  </h4>
                  <div className="space-y-3">
                    {[
                      t('outline.welcome'),
                      t('outline.selfIntro'),
                      t('outline.purposeExplanation'),
                      t('outline.confidentialityCommitment'),
                      t('outline.recordingNotice'),
                      t('outline.openingQuestion')
                    ].map((item, index) => (
                      <div key={index} className="flex items-start">
                        <span className="text-green-600 mr-3 font-semibold">{index + 1}.</span>
                        <span className="text-slate-700 text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 详细访谈大纲 */}
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 rounded-t-lg">
                    <h4 className="text-xl font-bold flex items-center">
                      <span className="mr-2">📝</span>
                      {t('outline.detailedOutline')}
                    </h4>
                  </div>
                  
                  <div className="p-6">
                    {outlineData.sections.map((section, index) => {
                      const isCore = (section as Section).isCore === true;
                      return (
                      <div key={section.id || index} className="mb-8 last:mb-0">
                        {/* 环节标题 */}
                        <div className={`p-4 rounded-r-lg mb-4 border-l-4 ${isCore ? 'bg-blue-100/80 border-blue-600 font-semibold' : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-500'}`}>
                          <div className="flex items-center justify-between">
                            <h5 className="text-lg font-bold text-blue-700 flex items-center">
                              {interviewType === 'FGD' && (section as Section).interactionType && FGD_TASK_ICON[(section as Section).interactionType!] ? (
                                <span className="mr-2 text-base" aria-hidden>{FGD_TASK_ICON[(section as Section).interactionType!]}</span>
                              ) : interviewType === 'FGD' ? (
                                <Users className="w-4 h-4 mr-2 text-indigo-500 flex-shrink-0" aria-hidden />
                              ) : (
                                <span className="mr-2">■</span>
                              )}
                              {isCore && <span className="mr-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">核心</span>}
                              {t('outline.sectionTitle', { number: section.id || index + 1, title: section.title })}
                            </h5>
                            <span className="text-sm font-semibold text-slate-600 bg-white px-3 py-1 rounded-full shadow-sm">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {section.duration}
                            </span>
                          </div>
                        </div>

                        {/* 研究问题 */}
                        <div className="mb-4 border-l-4 border-blue-200 bg-blue-50/40 rounded-r-lg py-3 pl-4 pr-3">
                          <h6 className="font-semibold text-blue-700 mb-2 flex items-center">
                            <span className="mr-2">❓</span>
                            {t('outline.researchQuestions')}
                          </h6>
                          <div className="space-y-2 ml-2">
                            {section.questions.map((question, qIndex) => {
                              const isProbing = question.includes("为什么") || question.includes("如何") || 
                                               question.includes("请描述") || question.includes("具体") ||
                                               question.includes("如果") || question.includes("设想");
                              
                              return (
                                <div key={qIndex} className="flex items-start">
                                  <span className="mr-3 text-lg">
                                    {isProbing ? "💡" : "•"}
                                  </span>
                                  <span
                                    className={`text-sm leading-relaxed ${
                                      isProbing ? 'text-blue-700 italic font-medium' : 'text-slate-700'
                                    }`}
                                  >
                                    {question}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* 讨论任务 - 任务驱动式 */}
                        {(section as Section).discussionTask && (
                          <div className="mb-4 border-l-4 border-amber-300 bg-amber-50/50 rounded-r-lg py-3 pl-4 pr-3">
                            <h6 className="font-semibold text-amber-800 mb-2 flex items-center">
                              <span className="mr-2">🗳️</span>
                              讨论任务
                            </h6>
                            <p className="text-slate-700 text-sm leading-relaxed ml-2">
                              {(section as Section).discussionTask}
                            </p>
                          </div>
                        )}

                        {/* 共识挑战任务 - FGD 专属 */}
                        {(section as Section).consensusChallengeTask && (
                          <div className="mb-4 border-l-4 border-red-300 bg-red-50/50 rounded-r-lg py-3 pl-4 pr-3">
                            <h6 className="font-semibold text-red-800 mb-2 flex items-center">
                              <span className="mr-2">⚡</span>
                              共识挑战任务
                            </h6>
                            <p className="text-slate-700 text-sm leading-relaxed ml-2">
                              {(section as Section).consensusChallengeTask}
                            </p>
                          </div>
                        )}

                        {/* 证物展示 - Show & Tell */}
                        {(section as Section).behavioralEvidenceTask && (
                          <div className="mb-4 border-l-4 border-cyan-400 bg-cyan-50/50 rounded-r-lg py-3 pl-4 pr-3">
                            <h6 className="font-semibold text-cyan-800 mb-2 flex items-center">
                              <span className="mr-2">📷</span>
                              证物展示 (Show & Tell)
                            </h6>
                            <p className="text-slate-700 text-sm leading-relaxed ml-2">
                              {(section as Section).behavioralEvidenceTask}
                            </p>
                          </div>
                        )}

                        {/* 深度追问 */}
                        {(section as Section).probingQuestion && (
                          <div className="mb-4 border-l-4 border-indigo-300 bg-indigo-50/40 rounded-r-lg py-3 pl-4 pr-3">
                            <h6 className="font-semibold text-indigo-800 mb-2 flex items-center">
                              <span className="mr-2">⚡</span>
                              深度追问
                            </h6>
                            <p className="text-slate-700 text-sm leading-relaxed ml-2 whitespace-pre-line">
                              {(section as Section).probingQuestion}
                            </p>
                          </div>
                        )}

                        {/* 备注说明 */}
                        <div className="bg-slate-50 border-l-4 border-purple-300 p-4 rounded-r-lg">
                          <h6 className="font-semibold text-purple-700 mb-2 flex items-center">
                            <span className="mr-2">📄</span>
                            {t('outline.notesExplanation')}
                          </h6>
                          <p className="text-slate-600 text-sm italic ml-6 whitespace-pre-line">
                            {section.notes}
                          </p>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                </div>

                {/* 结束语 */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6 mt-8">
                  <h4 className="text-lg font-bold text-indigo-700 mb-4 flex items-center">
                    <span className="mr-2">🎯</span>
                    {t('outline.conclusion')}
                  </h4>
                  <p className="text-indigo-800 text-sm leading-relaxed">
                    {t('outline.conclusionText')}
                  </p>
                </div>

                {/* 文档结束标识 */}
                <div className="text-center mt-12 mb-8">
                  <div className="inline-block bg-slate-100 px-6 py-2 rounded-full">
                    <span className="text-slate-500 text-sm font-mono">-- {t('outline.documentEnd')} --</span>
                  </div>
                </div>

                </div>
              </div>
            )}

            {/* 编辑界面 */}
            {outlineData && isEditing && editingOutline && (
              <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden flex flex-col">
                <div className="flex items-center justify-end px-6 py-4 border-b border-slate-200 bg-slate-50/80 shrink-0">
                  <Button onClick={handleExport} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Download className="w-4 h-4 mr-2" />
                    {t('workspace.export')}
                  </Button>
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-slate-800 text-center">{t('workspace.editOutline')}</h2>
                </div>
                
                <div className="bg-slate-50 rounded-lg p-6 mb-8 shadow-sm">
                  <Label className="text-slate-600 text-sm">{t('workspace.projectTitle')}</Label>
                  <Input
                    value={editingOutline.project_title}
                    onChange={(e) => setEditingOutline({
                      ...editingOutline,
                      project_title: e.target.value
                    })}
                    className="mt-3 bg-white border-slate-300 text-slate-800"
                  />
                </div>
                
                {editingOutline.sections.map((section, index) => (
                  <div key={section.id || index} className="bg-slate-50 rounded-lg p-6 mb-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <Input
                        value={section.title}
                        onChange={(e) => handleSectionEdit(index, 'title', e.target.value)}
                        className="bg-white border-slate-300 text-slate-800 font-medium"
                      />
                      <Button
                        onClick={() => removeSection(index)}
                        variant="outline"
                        size="sm"
                        className="text-red-500 border-red-300 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-6">
                      <div>
                        <Label className="text-slate-600 text-sm">{t('workspace.duration')}</Label>
                        <Input
                          value={section.duration}
                          onChange={(e) => handleSectionEdit(index, 'duration', e.target.value)}
                          className="mt-3 bg-white border-slate-300 text-slate-800"
                        />
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <Label className="text-slate-600 text-sm">{t('workspace.questions')}</Label>
                      <div className="space-y-3 mt-3">
                        {section.questions.map((question, qIndex) => (
                          <Input
                            key={qIndex}
                            value={question}
                            onChange={(e) => {
                              const newQuestions = [...section.questions];
                              newQuestions[qIndex] = e.target.value;
                              handleSectionEdit(index, 'questions', newQuestions);
                            }}
                            className="bg-white border-slate-300 text-slate-800"
                            placeholder={t('workspace.questions') + ` ${qIndex + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-slate-600 text-sm">{t('workspace.notes')}</Label>
                      <Textarea
                        value={section.notes}
                        onChange={(e) => handleSectionEdit(index, 'notes', e.target.value)}
                        className="mt-3 bg-white border-slate-300 text-slate-800"
                        placeholder={t('workspace.researchPurposePlaceholder')}
                        rows={3}
                      />
                    </div>
                  </div>
                ))}
                
                <div className="flex space-x-3">
                  <Button onClick={addSection} variant="outline" className="text-slate-600 border-slate-300 hover:text-slate-800">
                    <Edit3 className="w-4 h-4 mr-2" />
                    {t('workspace.addSection')}
                  </Button>
                  <Button onClick={handleSaveEdit} className="bg-green-600 hover:bg-green-700">
                    {t('workspace.saveChanges')}
                  </Button>
                  <Button onClick={handleCancelEdit} variant="outline" className="text-slate-600 border-slate-300 hover:text-slate-800">
                    {t('workspace.cancel')}
                  </Button>
                </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeWorkbench === 'analysis' && (
          <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('analysis.transcriptUpload')}</h3>
              <input
                type="file"
                id="transcript-file-upload"
                accept=".txt,.docx"
                onChange={handleTranscriptFileUpload}
                className="hidden"
              />
              <label
                htmlFor="transcript-file-upload"
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Upload className="w-4 h-4" />
                {t('analysis.selectFile')}
              </label>
              <p className="text-slate-500 text-sm mt-2">{t('analysis.supportedFormats')}</p>
              <p className="text-slate-400 text-sm mt-1">{t('analysis.pasteBelow')}</p>
              <Textarea
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
                placeholder={t('analysis.transcriptPlaceholder')}
                className="min-h-[200px] mt-4 bg-slate-50/50 border-slate-200"
                rows={10}
              />
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !transcriptText.trim()}
                className="mt-4 bg-blue-600 hover:bg-blue-700"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {thinkingStep || t('analysis.analyzing')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t('analysis.runInsightAnalysis')}
                  </>
                )}
              </Button>
            </div>

            {analysisResult && (() => {
              const toDisplay = (v: unknown): string => {
                if (v == null) return '';
                if (typeof v === 'string') return v;
                if (Array.isArray(v)) return v.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join('\n');
                return JSON.stringify(v, null, 2);
              };
              return (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <h3 className="text-lg font-semibold text-slate-800">{t('analysis.background')}</h3>
                <p className="text-slate-700 whitespace-pre-line">{toDisplay(analysisResult.background)}</p>
                <h3 className="text-lg font-semibold text-slate-800">{t('outline.generatedOutline')}</h3>
                <p className="text-slate-700 whitespace-pre-line">{toDisplay(analysisResult.outline)}</p>
                <h3 className="text-lg font-semibold text-slate-800">{t('analysis.coreInsights')}</h3>
                <p className="text-slate-700 whitespace-pre-line">{toDisplay(analysisResult.coreInsights)}</p>
                <h3 className="text-lg font-semibold text-slate-800">{t('analysis.actionItems')}</h3>
                <p className="text-slate-700 whitespace-pre-line">{toDisplay(analysisResult.actionItems)}</p>
              </div>
              );
            })()}
          </div>
        )}

        {/* 全局错误Toast */}
        {showErrorToast && (
          <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-2xl max-w-sm">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                    <X className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-red-800 font-medium text-sm">操作失败</h3>
                  <p className="text-red-600 text-sm mt-1">{errorMessage}</p>
                </div>
                <div className="ml-auto pl-3">
                  <button
                    onClick={() => setShowErrorToast(false)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
