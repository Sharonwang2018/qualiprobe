import Groq from "groq-sdk";

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
  systemPrompt?: string; // 新增：完整的SYSTEM_PROMPT
  outputLanguage?: string; // 新增：语言偏好
  enhancedMode?: boolean; // 新增：增强模式
}

class GroqService {
  private groq: Groq | null = null;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
    console.log('=== Groq Service Environment Variable Check ===');
    console.log('NEXT_PUBLIC_GROQ_API_KEY exists:', !!apiKey);
    console.log('NEXT_PUBLIC_GROQ_API_KEY length:', apiKey?.length || 0);
    
    if (!apiKey) {
      console.error('NEXT_PUBLIC_GROQ_API_KEY is not configured in groq.ts');
      return;
    }
    this.groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });
    console.log('✅ Groq service client initialized successfully');
  }

  async generateOutline(params: GenerateParams): Promise<OutlineData> {
    if (!this.groq) {
      console.error('Groq client not initialized');
      throw new Error('Groq API客户端未初始化，请检查API Key配置');
    }

    try {
      // 使用传入的SYSTEM_PROMPT或默认prompt
      const systemPrompt = params.systemPrompt || "你是一位资深的市场研究专家，拥有15年以上的定性研究经验。请严格按照JSON格式返回结果，不要添加任何额外的解释或格式。";
      
      const userPrompt = this.buildEnhancedPrompt(params);

      const result = await this.groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user", 
            content: userPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        top_p: 0.8,
        max_tokens: 8192,
      });

      const text = result.choices[0]?.message?.content || '';

      // Parse the JSON response
      let outlineData: OutlineData;
      try {
        outlineData = JSON.parse(text);
        console.log('✅ Successfully generated outline with Groq API');
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', parseError);
        console.error('Raw response:', text);
        throw new Error(`AI响应解析失败: ${parseError instanceof Error ? parseError.message : '未知错误'}`);
      }

      return outlineData;

    } catch (error: any) {
      console.error('Groq API error:', error);
      
      // 不再使用Mock数据fallback，直接抛出错误
      if (error.message?.includes('quota') || error.message?.includes('429') || error.message?.includes('rate limit')) {
        throw new Error('API配额已用完，请检查API Key或稍后重试');
      } else if (error.message?.includes('API Key') || error.message?.includes('unauthorized')) {
        throw new Error('API Key无效，请检查环境变量配置');
      } else if (error.message?.includes('timeout')) {
        throw new Error('API请求超时，请稍后重试');
      } else {
        throw new Error(`Groq API调用失败: ${error.message}`);
      }
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

  private generateMockOutline(params: GenerateParams): OutlineData {
    const { researchTopic, targetAudience, researchPurpose, interviewType, interviewDuration } = params;
    
    // 改进的时长分配逻辑
    let durations: number[];
    const totalDuration = parseInt(interviewDuration);
    
    if (totalDuration <= 10) {
      // 短访谈（10分钟以内）：简化分配
      durations = [
        1, // Intro & Ground Rules
        1, // Warm-up/Icebreaker  
        2, // Main Discussion - 广度感知
        totalDuration - 4, // Main Discussion - 深度探索（剩余时间）
        0, // Main Discussion - 反思与影响（跳过）
        0  // 总结与收尾（跳过）
      ];
    } else if (totalDuration <= 30) {
      // 中等访谈（10-30分钟）：标准分配
      const introDuration = Math.max(2, Math.floor(totalDuration * 0.15));
      const warmupDuration = Math.max(2, Math.floor(totalDuration * 0.10));
      const breadthDuration = Math.max(3, Math.floor(totalDuration * 0.25));
      const depthDuration = Math.max(4, Math.floor(totalDuration * 0.35));
      const reflectionDuration = Math.max(2, Math.floor(totalDuration * 0.10));
      const summaryDuration = totalDuration - introDuration - warmupDuration - breadthDuration - depthDuration - reflectionDuration;
      
      durations = [introDuration, warmupDuration, breadthDuration, depthDuration, reflectionDuration, Math.max(1, summaryDuration)];
    } else {
      // 长访谈（30分钟以上）：详细分配
      const introDuration = Math.max(3, Math.floor(totalDuration * 0.10));
      const warmupDuration = Math.max(3, Math.floor(totalDuration * 0.10));
      const breadthDuration = Math.max(5, Math.floor(totalDuration * 0.20));
      const depthDuration = Math.max(8, Math.floor(totalDuration * 0.30));
      const reflectionDuration = Math.max(4, Math.floor(totalDuration * 0.15));
      const summaryDuration = totalDuration - introDuration - warmupDuration - breadthDuration - depthDuration - reflectionDuration;
      
      durations = [introDuration, warmupDuration, breadthDuration, depthDuration, reflectionDuration, Math.max(3, summaryDuration)];
    }

    // 确保总时长匹配
    const totalAllocated = durations.reduce((sum, duration) => sum + duration, 0);
    if (totalAllocated !== totalDuration) {
      durations[durations.length - 1] += totalDuration - totalAllocated;
    }

    return {
      project_title: `${researchTopic} - 深度研究报告 (${interviewType})`,
      sections: [
        {
          id: 1,
          title: "Intro & Ground Rules",
          duration: `${durations[0]}分钟`,
          questions: [
            `欢迎参与本次${interviewType === 'IDI' ? '深度访谈' : '焦点小组讨论'}。首先请允许我说明几点：今天的讨论没有对错之分，我们希望听到真实的想法；讨论过程将被录音，仅用于研究分析；请尊重其他参与者的发言。大家同意吗？`,
            "请简单介绍一下自己，以及与这个话题相关的背景或经历。",
            `为什么愿意花时间参与今天关于${researchTopic}的讨论？`
          ],
          notes: "建立讨论规则和信任氛围，让受访者放松"
        },
        {
          id: 2,
          title: "Warm-up/Icebreaker",
          duration: `${durations[1]}分钟`,
          questions: [
            `请描述您第一次接触${researchTopic}时的情景或感受。`,
            `如果用一种颜色来形容${researchTopic}，您会选择什么？为什么？`,
            `请分享一个与${researchTopic}相关的有趣故事或经历。`
          ],
          notes: durations[1] > 0 ? "轻松的破冰话题，帮助受访者进入状态" : "时间紧张，可简化或跳过"
        },
        {
          id: 3,
          title: "Main Discussion - 广度感知",
          duration: `${durations[2]}分钟`,
          questions: [
            `提到${researchTopic}，您首先想到什么？请描述具体的画面或场景。`,
            `${researchTopic}在您的生活或工作中扮演什么角色？`,
            `请描述您使用或接触${researchTopic}的典型场景。`,
            `如果${researchTopic}突然消失，会对您产生什么影响？`
          ],
          notes: durations[2] > 0 ? "从宏观角度了解整体认知和态度" : "时间紧张，可合并到深度探索环节"
        },
        {
          id: 4,
          title: "Main Discussion - 深度探索",
          duration: `${durations[3]}分钟`,
          questions: [
            `请详细描述最近一次与${researchTopic}相关的完整经历。`,
            `哪些因素最影响您对${researchTopic}的满意度？为什么？`,
            `请回忆一个让您印象深刻的${researchTopic}相关经历。`,
            `如果让您改进${researchTopic}，您会选择什么？如何改进？`
          ],
          notes: "深入挖掘具体体验、决策逻辑和潜在需求"
        },
        {
          id: 5,
          title: "Main Discussion - 反思与影响",
          duration: `${durations[4]}分钟`,
          questions: durations[4] > 0 ? [
            `${researchTopic}如何改变了您的某些习惯或观念？`,
            `请描述${researchTopic}对您生活的具体影响。`,
            `如果时间可以倒流，您会在${researchTopic}相关的事情上做出不同选择吗？`,
            `请设想5年后，您希望${researchTopic}变成什么样子？`
          ] : [
            `简要谈谈${researchTopic}对您的影响或改变。`
          ],
          notes: durations[4] > 0 ? "引导深度反思，探讨长期影响和未来期望" : "时间紧张，简要提及即可"
        },
        {
          id: 6,
          title: "总结与收尾",
          duration: `${durations[5]}分钟`,
          questions: durations[5] > 0 ? [
            `用三个词总结您对${researchTopic}的感受。`,
            `通过今天的讨论，我们达成了什么共识？`,
            `关于${researchPurpose}，您还有什么补充建议吗？`,
            `对于研究团队，您有什么建议或期望？`
          ] : [
            `请简单总结一下今天的讨论。`
          ],
          notes: durations[5] > 0 ? "总结关键洞察，确认重要发现，感谢参与者" : "快速总结，感谢参与"
        }
      ].filter(section => parseInt(section.duration) > 0) // 过滤掉时长为0的环节
    };
  }
}

// Export singleton instance
export const groqService = new GroqService();

// Export the function for backward compatibility
export const generateOutline = (params: GenerateParams) => groqService.generateOutline(params);
