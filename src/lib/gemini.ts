import { GoogleGenerativeAI } from '@google/generative-ai';

// 大纲数据接口
export interface OutlineData {
  project_title: string;
  sections: Array<{
    id?: number;
    title: string;
    duration: string;
    questions: string[];
    notes: string;
  }>;
}

// 生成参数接口
export interface GenerateParams {
  researchTopic: string;
  targetAudience: string;
  researchPurpose: string;
  interviewType: 'IDI' | 'FGD';
  interviewDuration: string;
  selectedTemplate: 'basic' | 'comprehensive';
}

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    console.log('=== Gemini Service Environment Variable Check ===');
    console.log('NEXT_PUBLIC_GEMINI_API_KEY exists:', !!apiKey);
    console.log('NEXT_PUBLIC_GEMINI_API_KEY length:', apiKey?.length || 0);
    
    if (!apiKey) {
      console.error('NEXT_PUBLIC_GEMINI_API_KEY is not configured in gemini.ts');
      return;
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    console.log('✅ Gemini service client initialized successfully');
  }

  async generateOutline(params: GenerateParams): Promise<OutlineData> {
    if (!this.genAI) {
      console.log('Gemini client not initialized, using mock data');
      return this.generateMockOutline(params);
    }

    try {
      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash',
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192,
        }
      });

      const prompt = this.buildEnhancedPrompt(params);

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse the JSON response
      let outlineData: OutlineData;
      try {
        outlineData = JSON.parse(text);
        console.log('✅ Successfully generated outline with Gemini API');
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON, using mock data:', parseError);
        outlineData = this.generateMockOutline(params);
      }

      return outlineData;

    } catch (error: any) {
      console.error('Gemini API error:', error);
      
      // Check if it's a quota exceeded error
      if (error.message?.includes('quota') || error.message?.includes('429')) {
        console.log('🔄 API quota exceeded, gracefully falling back to mock data');
      } else {
        console.log('🔄 API error, falling back to mock data');
      }
      
      return this.generateMockOutline(params);
    }
  }

  private buildEnhancedPrompt(params: GenerateParams): string {
    const { researchTopic, targetAudience, researchPurpose, interviewType, interviewDuration } = params;

    // 实体清洗 - 提取核心业务话题
    const coreTopic = this.extractCoreTopic(researchTopic);

    const systemPrompt = `
你是一名来自顶尖市场研究咨询公司（如 Ipsos, Kantar）的定性研究总监。你的任务是根据给定的【研究课题】，设计一份专业的讨论大纲（Discussion Guide）。

### ⚠️ 绝对禁令 (CRITICAL RULES) ⚠️
- **禁止直译课题**：如果课题是"德芙巧克力用户画像"，严禁询问"您对画像有什么看法"或"您如何使用画像"。
- **禁止使用学术术语**：严禁出现"画像"、"维度"、"痛点"、"满意度"、"功能"、"改进"。
- **禁止询问未来**：普通用户无法预测未来，严禁询问"未来12个月你的需求"。

### 🔍 定性研究漏斗模型 (Logic Pipeline)
1. **[导入期] 生活全景 (Warm-up)**: 
   - 目标：了解"人"。
   - 问题示例：聊聊您平时的休闲生活？压力大时怎么调节？
2. **[进入期] 品类心智 (Category Exploration)**:
   - 目标：了解对巧克力的普遍看法。
   - 问题示例：什么时刻会想吃点甜的？谁会分享这些甜点？
3. **[深挖期] 品牌投影 (Projective Techniques)**:
   - 目标：通过隐喻挖掘画像和品牌资产。
   - 工具：
     - **拟人化**: "如果德芙是一个人，Ta会穿什么样的衣服？性格如何？"
     - **星球法**: "想象德芙是一个星球，上面住着什么样的人？"
4. **[收尾期] 关键洞察**: 
   - 目标：验证核心假设。
   - 问题示例：如果要推荐给一个好朋友，你会怎么描述德芙？

### 🔧 输出格式
- [环节名称 & 建议时长]
- [核心问题列表 (必须是自然、感性、口语化的谈话语调)]
- [追问 Probing 指南]: 提示主持人观察受访者的语气和表情。
- [Insight Note]: 解释这个环节是为了捕捉画像中的哪个维度（如：生活方式、情感连接）。`;

    const userPrompt = `
请生成以下访谈大纲：
- 研究课题：${researchTopic}
- 核心话题：${coreTopic}
- 访谈类型：${interviewType}（注意：如果是FGD，请增加互动讨论环节）
- 目标人群：${targetAudience}
- 研究目标：${researchPurpose}
- 总时长：${interviewDuration} 分钟

请严格按照以下JSON格式返回：

{
  "project_title": "${coreTopic} - 深度研究报告 (${interviewType})",
  "sections": [
    {
      "id": 1,
      "title": "环节标题",
      "duration": "XX分钟",
      "questions": [
        "具体问题1",
        "具体问题2",
        "具体问题3"
      ],
      "notes": "该环节的研究目的和注意事项"
    }
  ]
}`;

    return `${systemPrompt}

${userPrompt}`;
  }

  private extractCoreTopic(researchTopic: string): string {
    // 提取核心业务话题，移除研究方法相关后缀
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
    
    let cleanedTopic = researchTopic.trim();
    
    // 移除所有后缀
    for (const suffix of suffixesToRemove) {
      if (cleanedTopic.endsWith(suffix)) {
        cleanedTopic = cleanedTopic.slice(0, -suffix.length).trim();
        break; // 只移除一个后缀
      }
    }
    
    return cleanedTopic || researchTopic;
  }

  // 关键词黑名单 - 严禁出现在面向受访者的问题里
  private readonly forbiddenKeywords = [
    '画像',
    '需求', 
    '功能',
    '改进',
    '未来需求',
    '产品对比',
    '维度',
    '痛点',
    '满意度'
  ];

  private sanitizeQuestion(question: string): string {
    // 检查并替换黑名单关键词
    let sanitized = question;
    
    for (const keyword of this.forbiddenKeywords) {
      if (sanitized.includes(keyword)) {
        // 根据上下文替换为更自然的表达
        if (keyword === '画像') {
          sanitized = sanitized.replace(/画像/g, '生活方式');
        } else if (keyword === '需求') {
          sanitized = sanitized.replace(/需求/g, '想要的东西');
        } else if (keyword === '功能') {
          sanitized = sanitized.replace(/功能/g, '特点');
        } else if (keyword === '改进') {
          sanitized = sanitized.replace(/改进/g, '希望的地方');
        } else if (keyword === '未来需求') {
          sanitized = sanitized.replace(/未来需求/g, '以后想要什么');
        } else if (keyword === '产品对比') {
          sanitized = sanitized.replace(/产品对比/g, '不同选择');
        } else if (keyword === '维度') {
          sanitized = sanitized.replace(/维度/g, '方面');
        } else if (keyword === '痛点') {
          sanitized = sanitized.replace(/痛点/g, '不满意的地方');
        } else if (keyword === '满意度') {
          sanitized = sanitized.replace(/满意度/g, '喜欢的程度');
        }
      }
    }
    
    return sanitized;
  }

  private generateMockOutline(params: GenerateParams): OutlineData {
    const { researchTopic, targetAudience, researchPurpose, interviewType, interviewDuration } = params;
    
    // 实体清洗 - 提取核心业务话题
    const coreTopic = this.extractCoreTopic(researchTopic);
    
    // 改进的时长分配逻辑
    let durations: number[];
    const totalDuration = parseInt(interviewDuration);
    
    if (totalDuration <= 10) {
      // 短访谈（10分钟以内）：简化分配
      durations = [
        1, // 破冰/热身
        1, // 行为/习惯  
        totalDuration - 2, // 品牌认知/感受 + 深层挖掘（合并）
        0, // 互动设计（仅FGD）
        0  // 总结与收尾
      ];
    } else if (totalDuration <= 30) {
      // 中等访谈（10-30分钟）：标准分配
      const warmupDuration = Math.max(2, Math.floor(totalDuration * 0.15));
      const behaviorDuration = Math.max(3, Math.floor(totalDuration * 0.25));
      const brandDuration = Math.max(4, Math.floor(totalDuration * 0.30));
      const deepDuration = Math.max(3, Math.floor(totalDuration * 0.20));
      const interactionDuration = interviewType === 'FGD' ? Math.max(2, Math.floor(totalDuration * 0.10)) : 0;
      const summaryDuration = totalDuration - warmupDuration - behaviorDuration - brandDuration - deepDuration - interactionDuration;
      
      durations = [warmupDuration, behaviorDuration, brandDuration, deepDuration, interactionDuration, Math.max(1, summaryDuration)];
    } else {
      // 长访谈（30分钟以上）：详细分配
      const warmupDuration = Math.max(3, Math.floor(totalDuration * 0.10));
      const behaviorDuration = Math.max(5, Math.floor(totalDuration * 0.20));
      const brandDuration = Math.max(8, Math.floor(totalDuration * 0.25));
      const deepDuration = Math.max(6, Math.floor(totalDuration * 0.20));
      const interactionDuration = interviewType === 'FGD' ? Math.max(4, Math.floor(totalDuration * 0.15)) : 0;
      const summaryDuration = totalDuration - warmupDuration - behaviorDuration - brandDuration - deepDuration - interactionDuration;
      
      durations = [warmupDuration, behaviorDuration, brandDuration, deepDuration, interactionDuration, Math.max(3, summaryDuration)];
    }

    // 确保总时长匹配
    const totalAllocated = durations.reduce((sum, duration) => sum + duration, 0);
    if (totalAllocated !== totalDuration) {
      durations[durations.length - 1] += totalDuration - totalAllocated;
    }

    // 根据访谈类型生成不同的问题 - 认知围栏版本
    const generateQuestions = (sectionType: string, duration: number) => {
      const baseQuestions = {
        warmup: [
          "聊聊您平时的休闲生活？压力大时怎么调节？",
          "能跟我描述一下，在您平常的生活中，什么样的情况下会特别想吃巧克力？那个时刻您的心情是怎样的？",
          "请简单介绍一下您的工作和日常生活节奏。"
        ],
        category: [
          "什么时刻会想吃点甜的？",
          "谁会分享这些甜点？",
          `能描述一下您最近一次购买巧克力的经历吗？当时是什么情况？`
        ],
        brand: [
          `如果${coreTopic}这个品牌现在要搬家离开，你会怀念它的什么？什么东西是别的品牌给不了你的？`,
          `想象一下${coreTopic}是一个星球，上面住着什么样的人？`,
          `提到${coreTopic}，您首先想到什么画面或感觉？`
        ],
        deep: [
          `请回忆一个让您印象深刻的${coreTopic}相关经历，当时发生了什么？`,
          "能跟我描述一下，您是什么样的人？您的典型一天是怎么过的？",
          `您会把${coreTopic}送给谁？为什么？`
        ],
        interaction: interviewType === 'FGD' ? [
          `现在请大家讨论一下：如果${coreTopic}是一个人，Ta会在什么样的社交圈里？`,
          `有没有人有不同的看法？关于${coreTopic}的星球居民，大家觉得他们会有什么不同的特点？`,
          `请大家分享一下：什么情况下会想到${coreTopic}？`
        ] : [
          `如果让您用三个词来形容${coreTopic}，会是哪三个词？`,
          `在您看来，${coreTopic}和其他同类产品最大的不同是什么？`
        ],
        summary: [
          `今天聊下来，有没有什么让您重新思考的地方？`,
          `关于${researchPurpose}，您还有什么补充建议吗？`,
          `如果要向朋友推荐${coreTopic}，您会怎么说？`
        ]
      };

      // 应用关键词黑名单清理
      const sanitizedQuestions = baseQuestions[sectionType as keyof typeof baseQuestions].map(question => 
        this.sanitizeQuestion(question)
      );

      return sanitizedQuestions;
    };

    return {
      project_title: `${coreTopic} - 深度研究报告 (${interviewType})`,
      sections: [
        {
          id: 1,
          title: "破冰/热身",
          duration: `${durations[0]}分钟`,
          questions: generateQuestions('warmup', durations[0]),
          notes: "建立安全感，了解背景。观察受访者的放松程度和开放性。"
        },
        {
          id: 2,
          title: "行为/习惯",
          duration: `${durations[1]}分钟`,
          questions: generateQuestions('behavior', durations[1]),
          notes: "具体的购买/使用事实（还原现场）。注意追问具体的时间、地点、人物、动作。"
        },
        {
          id: 3,
          title: "品牌认知/感受",
          duration: `${durations[2]}分钟`,
          questions: generateQuestions('brand', durations[2]),
          notes: "投影技巧应用。观察受访者的表情变化和情感投入程度。"
        },
        {
          id: 4,
          title: "深层挖掘/痛点",
          duration: `${durations[3]}分钟`,
          questions: generateQuestions('deep', durations[3]),
          notes: "未满足的需求、情感补偿。重点关注语调变化和停顿，这些可能隐藏深层情感。"
        },
        {
          id: 5,
          title: interviewType === 'FGD' ? "互动设计/讨论" : "深度反思",
          duration: `${durations[4]}分钟`,
          questions: generateQuestions('interaction', durations[4]),
          notes: interviewType === 'FGD' 
            ? "引导组员之间产生对话而非仅与主持人对话。观察群体动态和意见领袖。"
            : "引导深度反思，探讨长期影响和未来期望。"
        },
        {
          id: 6,
          title: "总结与收尾",
          duration: `${durations[5]}分钟`,
          questions: generateQuestions('summary', durations[5]),
          notes: "确认关键发现，感谢参与。确保受访者感到被重视和理解。"
        }
      ].filter(section => parseInt(section.duration) > 0) // 过滤掉时长为0的环节
    };
  }
}

// Export singleton instance
export const geminiService = new GeminiService();

// Export the function for backward compatibility
export const generateOutline = (params: GenerateParams) => geminiService.generateOutline(params);
