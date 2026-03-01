"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Orbit
} from 'lucide-react';
import { exportToWord } from '../lib/exportDocx';

interface Section {
  id?: number;
  title: string;
  duration: string;
  questions: string[];
  notes: string;
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

export default function MainWorkspace() {
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

  // 笔录和分析状态
  const [transcriptText, setTranscriptText] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [thinkingStep, setThinkingStep] = useState('');

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
      alert('模板上传成功！');
    } catch (error) {
      console.error('模板上传失败:', error);
      showError('模板上传失败，请检查文件格式');
    }
  };

  // 生成大纲 - 去Mock化重构，强制API调用
  const handleGenerate = async () => {
    if (!researchTopic.trim() || !targetAudience.trim() || !researchPurpose.trim()) {
      showError('请填写完整的研究信息');
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
          template: 'basic',
          systemPrompt: SYSTEM_PROMPT, // 注入完整的SYSTEM_PROMPT
          outputLanguage: outputLanguage, // 传递语言偏好
          enhancedMode: true // 启用增强模式
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
      setThinkingStep('✅ 大纲生成完成！');
      
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
      title: '新环节',
      duration: '15分钟',
      questions: ['请在此添加问题'],
      notes: '该环节的研究目的和注意事项'
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
      alert('请先生成大纲');
      return;
    }
    exportToWord(outlineData);
  };

  useEffect(() => {
    // 检查API密钥状态
    const checkApiKey = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
        if (apiKey) {
          setApiKeyStatus('ready');
        } else {
          setApiKeyStatus('error');
        }
      } catch (error) {
        setApiKeyStatus('error');
      }
    };

    checkApiKey();
  }, []);

  return (
    <div className="h-full bg-white p-6 overflow-y-auto">
      <div className="w-full px-10 py-8">
        {/* 工作台切换标签 */}
        <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg mb-8">
          <button
            onClick={() => setActiveWorkbench('outline')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeWorkbench === 'outline' 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <Edit3 className="w-4 h-4 inline mr-2" />
            大纲设计
          </button>
          <button
            onClick={() => setActiveWorkbench('analysis')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeWorkbench === 'analysis' 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <Search className="w-4 h-4 inline mr-2" />
            访谈分析
          </button>
        </div>

        {activeWorkbench === 'outline' && (
          <>
            {/* 参数设置区 - 白色卡片设计 */}
            <div className="max-w-3xl mx-auto bg-white/80 backdrop-blur border border-slate-200 shadow-xl rounded-3xl p-8 mb-8">
              <div className="space-y-8">
                {/* 研究主题 - 大字号无边框风格 */}
                <div>
                  <Label className="text-slate-600 text-sm mb-3 block">研究主题</Label>
                  <Input
                    value={researchTopic}
                    onChange={(e) => setResearchTopic(e.target.value)}
                    className="text-2xl font-semibold border-0 bg-transparent px-0 py-0 placeholder-slate-300 focus:ring-0 focus:border-0 text-slate-800"
                    placeholder="输入您的研究主题..."
                  />
                  <p className="text-slate-400 text-sm mt-2">例如：智能家居对老年人生活质量的影响</p>
                </div>
                
                {/* 目标受众 */}
                <div>
                  <Label className="text-slate-600 text-sm mb-3 block">目标受众</Label>
                  <Input
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="text-lg border border-slate-200 bg-white/50 backdrop-blur rounded-lg px-4 py-3 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="例如：65岁以上、独立生活的城市老人"
                  />
                </div>
                
                {/* 研究目的 */}
                <div>
                  <Label className="text-slate-600 text-sm mb-3 block">研究目的</Label>
                  <Textarea
                    value={researchPurpose}
                    onChange={(e) => setResearchPurpose(e.target.value)}
                    className="text-lg border border-slate-200 bg-white/50 backdrop-blur rounded-lg px-4 py-3 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
                    placeholder="描述您希望通过访谈了解的内容..."
                    rows={3}
                  />
                </div>
              </div>

              {/* 高级选项 */}
              <div className="mt-8 pt-8 border-t border-slate-200">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-slate-600 text-sm mb-3 block">访谈类型</Label>
                    <Select value={interviewType} onValueChange={(value: 'IDI' | 'FGD') => setInterviewType(value)}>
                      <SelectTrigger className="border-slate-200 bg-white/50 backdrop-blur">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value="IDI" className="text-slate-800">深度访谈 (IDI)</SelectItem>
                        <SelectItem value="FGD" className="text-slate-800">焦点小组 (FGD)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-slate-600 text-sm mb-3 block">预计时长</Label>
                    <Select value={interviewDuration} onValueChange={setInterviewDuration}>
                      <SelectTrigger className="border-slate-200 bg-white/50 backdrop-blur">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value="30" className="text-slate-800">30分钟</SelectItem>
                        <SelectItem value="45" className="text-slate-800">45分钟</SelectItem>
                        <SelectItem value="60" className="text-slate-800">60分钟</SelectItem>
                        <SelectItem value="90" className="text-slate-800">90分钟</SelectItem>
                        <SelectItem value="120" className="text-slate-800">120分钟</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 输出语言和模板上传 */}
                <div className="mt-6 grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-slate-600 text-sm mb-3 block flex items-center">
                      <span className="mr-2">🌐</span>
                      输出语言
                    </Label>
                    <div className="relative">
                      <button
                        onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                        className="w-full bg-white/50 backdrop-blur border border-slate-200 text-slate-800 rounded-lg px-4 py-3 text-left flex items-center justify-between hover:bg-white/70 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      >
                        <span className="flex items-center">
                          {outputLanguage === '中文' && '🇨🇳 中文'}
                          {outputLanguage === '英文' && '🇺🇸 英文'}
                          {outputLanguage === '日文' && '🇯🇵 日文'}
                          {outputLanguage === '双语对照' && '🌐 双语对照'}
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showLanguageDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {showLanguageDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-2xl z-50">
                          <div className="py-2">
                            {[
                              { value: '中文', label: '🇨🇳 中文' },
                              { value: '英文', label: '🇺🇸 英文' },
                              { value: '日文', label: '🇯🇵 日文' },
                              { value: '双语对照', label: '🌐 双语对照' }
                            ].map((option) => (
                              <button
                                key={option.value}
                                onClick={() => {
                                  setOutputLanguage(option.value as '中文' | '英文' | '日文' | '双语对照');
                                  setShowLanguageDropdown(false);
                                }}
                                className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors duration-150 flex items-center ${
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
                      模板上传
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
                        上传模板
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedTemplate('basic');
                          alert('已切换到默认模板');
                        }}
                        variant="outline"
                        className="flex-1 border-slate-200 bg-white/50 backdrop-blur text-slate-600 hover:text-slate-800 hover:bg-white/70"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        使用默认
                      </Button>
                    </div>
                    <p className="text-slate-400 text-xs mt-2">支持 JSON 和 TXT 格式</p>
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
                      生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      生成访谈大纲
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
              <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-lg">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-bold text-slate-800">生成的大纲</h2>
                  <div className="flex space-x-3">
                    <Button onClick={handleEdit} variant="outline" className="text-slate-600 border-slate-300 hover:text-slate-800">
                      <Edit3 className="w-4 h-4 mr-2" />
                      编辑
                    </Button>
                    <Button onClick={handleExport} variant="outline" className="text-slate-600 border-slate-300 hover:text-slate-800">
                      <Download className="w-4 h-4 mr-2" />
                      导出Word
                    </Button>
                  </div>
                </div>
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-slate-800 mb-3">{outlineData.project_title}</h3>
                  <p className="text-slate-500">专业访谈大纲</p>
                </div>
                
                {outlineData.sections.map((section, index) => (
                  <div key={section.id || index} className="border-l-4 border-blue-500 pl-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-slate-800">{section.title}</h4>
                      <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded">
                        <Clock className="w-3 h-3 inline mr-2" />
                        {section.duration}
                      </span>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-medium text-slate-700 mb-3">问题列表</h5>
                        <ul className="space-y-3">
                          {section.questions.map((question, qIndex) => (
                            <li key={qIndex} className="flex items-start">
                              <span className="text-blue-500 mr-3">•</span>
                              <span className="text-slate-700">{question}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {section.notes && (
                        <div>
                          <h5 className="font-medium text-slate-700 mb-3">备注</h5>
                          <p className="text-slate-600 text-sm bg-slate-50 p-4 rounded">
                            {section.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 编辑界面 */}
            {outlineData && isEditing && editingOutline && (
              <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-lg">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-bold text-slate-800">编辑大纲</h2>
                </div>
                
                <div className="bg-slate-50 rounded-lg p-6 mb-8 shadow-sm">
                  <Label className="text-slate-600 text-sm">项目标题</Label>
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
                    
                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div>
                        <Label className="text-slate-600 text-sm">时长</Label>
                        <Input
                          value={section.duration}
                          onChange={(e) => handleSectionEdit(index, 'duration', e.target.value)}
                          className="mt-3 bg-white border-slate-300 text-slate-800"
                        />
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <Label className="text-slate-600 text-sm">问题列表</Label>
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
                            placeholder={`问题 ${qIndex + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-slate-600 text-sm">备注</Label>
                      <Textarea
                        value={section.notes}
                        onChange={(e) => handleSectionEdit(index, 'notes', e.target.value)}
                        className="mt-3 bg-white border-slate-300 text-slate-800"
                        placeholder="该环节的研究目的和注意事项"
                        rows={3}
                      />
                    </div>
                  </div>
                ))}
                
                <div className="flex space-x-3">
                  <Button onClick={addSection} variant="outline" className="text-slate-600 border-slate-300 hover:text-slate-800">
                    <Edit3 className="w-4 h-4 mr-2" />
                    添加环节
                  </Button>
                  <Button onClick={handleSaveEdit} className="bg-green-600 hover:bg-green-700">
                    保存更改
                  </Button>
                  <Button onClick={handleCancelEdit} variant="outline" className="text-slate-600 border-slate-300 hover:text-slate-800">
                    取消
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {activeWorkbench === 'analysis' && (
          /* 访谈分析工作台 */
          <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <Upload className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">请上传您的访谈笔录以开始智能分析</p>
            <p className="text-slate-400 text-sm mt-2">支持 .txt, .docx, .mp3 等格式</p>
            <button className="mt-6 bg-white border border-slate-200 px-6 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
              选择文件
            </button>
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
