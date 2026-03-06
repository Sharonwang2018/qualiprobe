import Groq from "groq-sdk";

// FGD 互动任务类型（用于 UI 图标）
export type FGDInteractionType = 'draw' | 'debate' | 'vote' | 'experiment' | 'values' | 'mapping' | 'conflict' | 'discuss';

// 大纲数据接口
export interface OutlineData {
  project_title: string;
  sections: Array<{
    id?: number;
    title: string;
    duration: string;
    questions: string[];
    notes: string;
    interactionType?: FGDInteractionType;
    discussionTask?: string; // [讨论任务] 任务驱动式环节
    consensusChallengeTask?: string; // [共识挑战] FGD 环节2 强制：集体否定方案并给出杀伤力理由
    probingQuestion?: string; // [深度追问] 场景+情感+认知失调
    behavioralEvidenceTask?: string; // [证物展示] Show & Tell 行为证据校验
    isCore?: boolean;
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
  studyType?: StudyType; // 新增：研究类型（可选，默认 auto）
}

export type StudyType =
  | 'auto'
  | 'journey'
  | 'competitive'
  | 'experience'
  | 'persona'
  | 'concept'
  | 'pricing'
  | 'brand'
  | 'ux';

class GroqService {
  private groq: Groq | null = null;
  private static readonly OUTPUT_LANGUAGE = {
    ZH: "zh",
    EN: "en",
    JA: "ja",
    BILINGUAL: "bilingual",
  } as const;

  constructor() {
    this.initializeClient();
  }

  get client() {
    return this.groq;
  }

  private initializeClient() {
    const apiKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY;
    console.log('=== Groq Service Environment Variable Check ===');
    console.log('GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY);
    console.log('NEXT_PUBLIC_GROQ_API_KEY exists:', !!process.env.NEXT_PUBLIC_GROQ_API_KEY);
    console.log('apiKey length:', apiKey?.length || 0);

    if (!apiKey) {
      console.error('GROQ_API_KEY or NEXT_PUBLIC_GROQ_API_KEY is not configured');
      return;
    }
    this.groq = new Groq({ apiKey, dangerouslyAllowBrowser: !!process.env.NEXT_PUBLIC_GROQ_API_KEY });
    console.log('✅ Groq service client initialized successfully');
  }

  private normalizeOutputLanguage(outputLanguage?: string): "zh" | "en" | "ja" | "bilingual" {
    const value = (outputLanguage || "").trim().toLowerCase();
    if (["英文", "english", "en", "en-us", "en_us"].includes(value)) {
      return GroqService.OUTPUT_LANGUAGE.EN;
    }
    if (["日文", "日语", "japanese", "ja", "jp", "ja-jp", "ja_jp"].includes(value)) {
      return GroqService.OUTPUT_LANGUAGE.JA;
    }
    if (["双语对照", "bilingual", "bi", "zh-en", "zh_en"].includes(value)) {
      return GroqService.OUTPUT_LANGUAGE.BILINGUAL;
    }
    return GroqService.OUTPUT_LANGUAGE.ZH;
  }

  private buildLanguageConstraint(mode: "zh" | "en" | "ja" | "bilingual"): string {
    if (mode === GroqService.OUTPUT_LANGUAGE.EN) {
      return "CRITICAL: Output language is English only. All JSON values must be in English. Do not include any Chinese or Japanese characters.";
    }
    if (mode === GroqService.OUTPUT_LANGUAGE.JA) {
      return "CRITICAL: 出力言語は日本語のみ。すべての JSON 値を日本語で記述し、中国語は含めないでください。";
    }
    if (mode === GroqService.OUTPUT_LANGUAGE.BILINGUAL) {
      return "CRITICAL: 双语对照输出。所有 title/questions/notes 等字段都必须采用“中文 / English”同一行对照格式。";
    }
    return "CRITICAL: 输出语言为中文。所有 JSON 值必须使用中文。";
  }

  private outlineContainsCjk(outline: OutlineData): boolean {
    const hasCjk = (value: string) => /[\u4e00-\u9fff]/.test(value);
    if (hasCjk(outline.project_title || "")) return true;
    for (const section of outline.sections || []) {
      if (hasCjk(section.title || "")) return true;
      if (hasCjk(section.duration || "")) return true;
      if (hasCjk(section.notes || "")) return true;
      if (hasCjk(section.probingQuestion || "")) return true;
      if (hasCjk(section.discussionTask || "")) return true;
      if (hasCjk(section.consensusChallengeTask || "")) return true;
      if (hasCjk(section.behavioralEvidenceTask || "")) return true;
      if ((section.questions || []).some((q) => hasCjk(q || ""))) return true;
    }
    return false;
  }

  private async rewriteOutlineToEnglish(outline: OutlineData): Promise<OutlineData> {
    if (!this.groq) return outline;
    const rewritePrompt = `
Rewrite the following interview outline JSON into English-only JSON.

Rules:
- Keep the exact same schema and keys.
- Preserve section count and IDs.
- Do not drop fields.
- Translate all values to natural professional English.
- Duration should use "min" format (e.g. "15 min").
- Return JSON only.

Input JSON:
${JSON.stringify(outline)}
`;
    const rewritten = await this.groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You are a strict JSON rewriting assistant." },
        { role: "user", content: rewritePrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 8192,
    });
    const text = rewritten.choices[0]?.message?.content || "";
    try {
      return JSON.parse(text);
    } catch {
      return outline;
    }
  }

  private async rewriteOutlineToJapanese(outline: OutlineData): Promise<OutlineData> {
    if (!this.groq) return outline;
    const rewritePrompt = `
以下のインタビューアウトライン JSON を、日本語のみの JSON に書き換えてください。

ルール:
- スキーマとキー名は完全に維持すること
- セクション数と ID を維持すること
- フィールドを削除しないこと
- すべての値を自然で専門的な日本語に翻訳すること
- duration は「XX分」形式にすること（例: "15分"）
- JSON だけを返すこと

入力 JSON:
${JSON.stringify(outline)}
`;
    const rewritten = await this.groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "あなたは厳密な JSON 書き換えアシスタントです。" },
        { role: "user", content: rewritePrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 8192,
    });
    const text = rewritten.choices[0]?.message?.content || "";
    try {
      return JSON.parse(text);
    } catch {
      return outline;
    }
  }

  async generateOutline(params: GenerateParams): Promise<OutlineData> {
    if (!this.groq) {
      console.error('Groq client not initialized');
      throw new Error('Groq API客户端未初始化，请检查API Key配置');
    }

    try {
      const languageMode = this.normalizeOutputLanguage(params.outputLanguage);
      const systemPromptBase = params.systemPrompt || "你是一位资深的市场研究专家，拥有15年以上的定性研究经验。请严格按照JSON格式返回结果，不要添加任何额外的解释或格式。";
      const systemPrompt = `${systemPromptBase}\n\n${this.buildLanguageConstraint(languageMode)}`;
      
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

      if (languageMode === GroqService.OUTPUT_LANGUAGE.EN && this.outlineContainsCjk(outlineData)) {
        outlineData = await this.rewriteOutlineToEnglish(outlineData);
      }
      if (languageMode === GroqService.OUTPUT_LANGUAGE.JA) {
        outlineData = await this.rewriteOutlineToJapanese(outlineData);
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

  private detectStudyType(researchTopic: string, researchPurpose: string): Exclude<StudyType, 'auto'> {
    const text = `${researchTopic} ${researchPurpose}`.toLowerCase();

    const hasAny = (keywords: string[]) => keywords.some((k) => text.includes(k));

    const journeyKeywords = [
      'journey',
      'customer journey',
      'user journey',
      'end-to-end',
      'end to end',
      'touchpoint',
      'experience',
      'service flow',
      'path to purchase',
      'purchase journey',
      '转化路径',
      '用户旅程',
      '客户旅程',
      '服务流程',
      '体验流程',
      '触点',
      '到店',
      '进站',
      '离站'
    ];

    const competitiveKeywords = [
      'competitor',
      'competitive',
      'comparison',
      'compare',
      'vs',
      'switch',
      'switching',
      'alternative',
      'choice',
      'tradeoff',
      '竞品',
      '对比',
      '比较',
      '替代',
      '切换',
      '为什么选',
      '为什么不选'
    ];

    const experienceKeywords = [
      'satisfaction',
      'dissatisfaction',
      'complaint',
      'service quality',
      'experience diagnosis',
      'csat',
      'nps',
      '满意',
      '不满',
      '抱怨',
      '投诉',
      '体验诊断',
      '服务质量'
    ];

    const personaKeywords = [
      'persona',
      'segmentation',
      'segment',
      'archetype',
      'typology',
      'user profile',
      '画像',
      '用户画像',
      '人群',
      '细分',
      '分群',
      '人群差异'
    ];

    const conceptKeywords = [
      'concept',
      'proposition',
      'value proposition',
      'concept test',
      'idea test',
      'message test',
      'concept testing',
      '概念',
      '概念测试',
      '方案',
      '主张',
      '卖点',
      '宣传语'
    ];

    const pricingKeywords = [
      'pricing',
      'price',
      'willingness to pay',
      'wtp',
      'value',
      'package',
      'subscription',
      '付费',
      '价格',
      '定价',
      '套餐',
      '会员',
      '值不值',
      '贵',
      '便宜'
    ];

    const brandKeywords = [
      'brand',
      'branding',
      'brand equity',
      'positioning',
      'communication',
      'advertising',
      'ad',
      'campaign',
      '品牌',
      '心智',
      '传播',
      '广告',
      '定位',
      '认知'
    ];

    const uxKeywords = [
      'ux',
      'usability',
      'user experience',
      'ui',
      'interaction',
      'onboarding',
      'signup',
      'checkout',
      'task',
      '可用性',
      '易用性',
      '交互',
      '新手引导',
      '注册',
      '登录',
      '下单',
      '支付'
    ];

    if (hasAny(journeyKeywords)) return 'journey';
    if (hasAny(uxKeywords)) return 'ux';
    if (hasAny(pricingKeywords)) return 'pricing';
    if (hasAny(conceptKeywords)) return 'concept';
    if (hasAny(competitiveKeywords)) return 'competitive';
    if (hasAny(experienceKeywords)) return 'experience';
    if (hasAny(personaKeywords)) return 'persona';
    if (hasAny(brandKeywords)) return 'brand';

    return 'experience';
  }

  private buildSystemGuide(studyType: Exclude<StudyType, 'auto'>): string {
    const common = `
你是一名战略咨询级别的定性研究总监（如 Ipsos、Kantar、麦肯锡、BCG 定性团队），拥有 15 年以上定性研究及深度分析经验。你擅长设计能挖到「真实动机、行为证据与认知失调」的 Discussion Guide，产出具备战略洞察价值的大纲。

### 角色与标准 (ROLE)
- 产出的大纲必须达到可交付客户/项目组的水准：可直接用于培训主持人、执行现场、支撑报告洞察。
- 每个环节须明确：研究目的、观察点、追问梯子、主持人注意事项。
- 严禁产出泛泛的、新手级的问题列表。

### 拒绝平庸问法 (FORBIDDEN)
- 严禁：“你觉得如何”“优缺点是什么”“满意吗”“有什么建议”等宽泛、闭合式问法。
- 每个环节必须以**具体任务**、**场景投射**或**时间线复盘**驱动，而非泛泛征询意见。
- **未来/未上市产品话术**：当研究对象为未来款、未发布产品或假设性概念时，严禁直接问“大家觉得 X 的主要卖点是什么”“你认为 X 怎么样”等以 X 为已知事实的问法。必须改用**假设性条件句**，如“如果有一款手机，便宜 1000 元但去掉了 AI 功能，或者贵 1000 元但续航翻倍，你那一刻的「肉疼感」在哪里？”“假设下一代产品增加了 XX 功能，你会如何权衡？”等。

### 追问逻辑算法 (Probing Algorithm) — Action → Feeling → Motivation
- **严禁笼统评价类问题**：如“你觉得如何”“满意度如何”“有什么看法”等。
- **probingQuestion 必须与研究类型严格匹配**：定价用定价追问、体验用体验追问、品牌用品牌追问；严禁套用通用模板（「那10秒钟」「被打扰/被忽视」仅适用于体验/触点类，定价研究禁用）。
- **递进序列**（具体话术须随研究类型调整）：
  1) Level 1 (Action)：还原当时的具体情境、动作、决策过程
  2) Level 2 (Feeling)：挖出那一刻的真实感受、情绪触发点
  3) Level 3 (Motivation)：追问后续行为、取舍逻辑、临界点
- **isCore: true 的环节**：probingQuestion 不少于 **3 组**（每组含 Action + Feeling + Motivation），且必须包含具体的**互动任务（Task）**（如 discussionTask、behavioralEvidenceTask、consensusChallengeTask 等）。
- **notes** 须包含：① 研究目的 ② 观察点 ③ 追问话术。

### 行为证据校验 (Behavioral Evidence)
- 至少一个核心环节须包含 **behavioralEvidenceTask**（证物展示 / Show & Tell）：
- 示例：“请大家打开手机相册或 App 历史记录，找出一个最能代表你‘焦虑’或‘爽快’时刻的截图/照片，并分享那个瞬间。”
- 根据研究课题灵活设计：如订单截图、购物车、浏览记录、聊天记录等可验证行为的“证物”。

### 环节时长智能化
- **核心挖掘环节须占 70% 总时长**：暖场/破冰与收尾合计不超过 30%。
- 为核心环节（非暖场、非收尾）设置 \`isCore: true\`，便于导出时视觉强调。

### 绝对要求 (CRITICAL RULES)
- 围绕研究课题与真实生活场景展开；问题须口语化、可回答、基于回忆具体经历。
- 输出必须严格为 JSON（json_object），不要添加解释性文字。
`;

    if (studyType === 'journey') {
      return `${common}
### 旅程研究结构 (Customer Journey) — 定性研究钩子
- **必须包含“体感地图绘制”**：请组员在白板/纸上画出从触发到使用后的旅程图，标出关键决策点、情绪转折、触点。
- **必须包含“情绪断点挖掘”**：强制问：“在整个加油/购车/XX过程中，哪个瞬间让你产生过「干脆算了」的念头？” 落到具体触点与决策临界点。
- 以阶段组织：触发/准备（Before）→ 现场体验（During）→ 事后回想与复购（After）。
- 每个阶段覆盖：关键行为、决策点、情绪/顾虑、触点、例外场景。
- **probingQuestion 旅程专属**：
  - Action：当时你具体在哪个环节？那一刻你的手/眼睛在做什么？能按时间线还原一下那个过程吗？
  - Feeling：那个瞬间你是什么感觉？是「卡住了」还是「顺了」？哪个触点让你最不爽/最惊喜？
  - Motivation：如果再来一次，你会怎么避开/重复那个环节？是什么让你最终决定继续/放弃？
`;
    }

    if (studyType === 'competitive') {
      return `${common}
### 竞品/选择研究结构 (Competitive Choice)
- 强制围绕一次“真实选择/对比/切换”的时间线复盘。
- 必须挖掘“取舍”与“不可接受项”（deal-breaker），不要问泛泛偏好。
- **probingQuestion 竞品/选择专属**：
  - Action：当时你是在什么情境下做这个选择的？你具体比较了哪几个？能还原一下当时的对比过程吗？
  - Feeling：哪个点让你最终拍板？哪个点让你一度犹豫/直接排除？那一刻你心里在想什么？
  - Motivation：如果再来一次，什么会让你换一个选择？什么是你绝对接受不了的？
`;
    }

    if (studyType === 'experience') {
      return `${common}
### 体验诊断结构 (Experience Diagnostic) — 定性研究钩子
- **必须包含“红黑榜/找茬挑战”**：如让组员列出“最惊喜的3个瞬间”和“最想吐槽的3个瞬间”，或对触点进行“找茬”式讨论。
- **必须包含“证物展示”模块**：至少一个核心环节设 behavioralEvidenceTask（如打开手机相册/App 记录，找出最能代表「焦虑」或「爽快」时刻的截图/照片，并分享那个瞬间）。
- 以预期→实际体验→关键时刻→原因追溯组织。
- 把好/不好的感受落到具体触点与细节。
- **probingQuestion 体验诊断专属**：
  - Action：那 10 秒钟里，你的手在干什么？眼睛在看哪里？当时发生了什么？能举个具体例子/那个瞬间吗？
  - Feeling：那种感觉是「被打扰」还是「被忽视」？你当下的真实感受是什么？那一刻对你意味着什么？
  - Motivation：如果这种感觉持续发生，你会如何重新定义这个品牌？当实际与预期不符时，你如何调整了后续行为？
`;
    }

    if (studyType === 'persona') {
      return `${common}
### 画像/细分结构 (Persona) — 定性研究钩子
- **必须包含“身份贴标签”与“品牌拟人化”**：严禁问“你是什么样的人”；改为投射式问法，如“如果你是一辆车，你会是什么颜色、什么配置？为什么？”或“如果该品牌是一个人，他穿什么、什么语气、更像管家还是工人？”用拟人化拉开人群差异。
- 目标不是贴标签，而是找到“动机/场景/取舍”的分化方式。
- 必须包含：生活/工作节奏、触发情境、价值取舍、典型一次经历、语言与隐喻。
- **probingQuestion 画像/细分专属**：
  - Action：能具体描述一下你典型一天/一次使用的情境吗？当时你在干什么、和谁在一起、什么触发了这个行为？
  - Feeling：如果用三个词形容你自己在这类事上的风格，会是什么？为什么是这三个？你和身边人有什么不同？
  - Motivation：什么情况下你会选 A 不选 B？什么是你绝对不会妥协的？你的「底线」在哪里？
`;
    }

    if (studyType === 'concept') {
      return `${common}
### 概念/方案测试结构 (Concept Test)
- 先测“理解”再测“价值”再测“可信/风险”。
- 必须包含：对比现有替代方案、使用场景落地、触发与阻碍。
- **未上市概念**：若测试对象为未来款/未发布产品，一律用假设性条件句（“如果…”“假设…”），严禁直接问“你觉得 X 的卖点是什么”。
- **probingQuestion 概念/方案测试专属**：
  - Action：你第一眼/第一反应理解成什么？能用自己的话复述一下吗？听完后你脑子里浮现了什么样的使用场景？
  - Feeling：哪一点让你觉得「有意思」或「不靠谱」？和你现在的做法比，你更倾向于哪种？为什么？
  - Motivation：什么情况下你会真的用？什么会让你犹豫或放弃？你最大的顾虑是什么？
`;
    }

    if (studyType === 'pricing') {
      return `${common}
### 定价/价值感结构 (Pricing) — 定性研究钩子
- **必须包含“心理账单博弈/拍卖”**：如给定总预算，在多个维度间分配；或模拟“愿意为某功能多付多少”的博弈式讨论。
- **必须包含“价值剥离实验”**：使用假设性条件句，如“如果有一款手机，便宜 1000 元但去掉了 AI 功能，或者贵 1000 元但续航翻倍，你那一刻的「肉疼感」在哪里？”挖出真实的价值权衡与支付意愿临界点。严禁将未上市具体机型（如 iPhone 18）当作已知事实直接询问卖点。可以加入PSM的题
- 不要直接问“你愿意付多少钱”，挖价值锚点、心理账户、付费触发条件、阻碍条件。
- **probingQuestion 定价专属**（严禁用体验/品牌类追问如「那10秒钟」「被打扰/被忽视」）：
  - Action：当时你看到价格/配置选项时，第一反应是什么？那一刻你在心里怎么盘算的？能举个你最近一次「纠结要不要加钱」的具体例子吗？
  - Feeling：那种「肉疼」或「值了」的感觉，是在哪个选项出现时触发的？对你来说，多花多少钱算「过了线」？
  - Motivation：如果必须在这几个功能里取舍，你宁愿多付还是少付？什么会让你改变主意？当实际价格超出预期时，你一般会怎么调整？
`;
    }

    if (studyType === 'brand') {
      return `${common}
### 品牌/传播结构 (Brand)
- 重点是“联想/情绪/角色/可信度/语言解码”，而不是满意度。
- 必须包含：类别角色、品牌联想、品牌漏斗，信息理解偏差、与生活场景/人群的匹配。
- **probingQuestion 品牌/传播专属**：
  - Action：提到这个品牌，你脑海里最先蹦出什么画面/什么人/什么场景？能具体描述一下吗？
  - Feeling：如果这个品牌是一个人，他穿什么、什么语气、给你什么感觉？你和朋友会怎么聊这个品牌？
  - Motivation：什么信息会让你改变对它的看法？什么样的传播会让你觉得「对味」或「不对味」？
`;
    }

    if (studyType === 'ux') {
      return `${common}
### 可用性/任务结构 (UX / Usability)
- 以“任务”组织：目标任务 → 步骤复盘 → 卡点与误解 → 容错与恢复。
- 必须挖“心智模型”：你以为它会怎么工作。
- **probingQuestion 可用性/任务专属**：
  - Action：你当时想完成什么？具体点了哪里、怎么操作的？能一步步还原吗？卡在哪一步了？
  - Feeling：那一刻你以为是怎样才会work的？和实际不一样时你什么感觉？是「懵了」还是「懂了」？
  - Motivation：如果再来一次，你会怎么试？你希望它怎么设计才符合你的直觉？
`;
    }

    return `${common}`;
  }

  private buildEnhancedPrompt(params: GenerateParams): string {
    const { researchTopic, targetAudience, researchPurpose, interviewType, interviewDuration } = params;

    // 实体清洗 - 提取核心业务话题
    const coreTopic = this.extractCoreTopic(researchTopic);

    const studyType: Exclude<StudyType, 'auto'> = (params.studyType && params.studyType !== 'auto')
      ? params.studyType
      : this.detectStudyType(researchTopic, researchPurpose);
    const systemPrompt = this.buildSystemGuide(studyType);

    const studyHintsByType: Partial<Record<Exclude<StudyType, 'auto'>, string>> = {
      journey: `\n- 研究类型提示：这是一个“旅程/流程/触点”研究。请按阶段拆分，确保每段都能串成端到端经历。\n`,
      competitive: `\n- 研究类型提示：这是一个“竞品/选择/切换”研究。请围绕一次真实选择/切换复盘，输出取舍与证据。\n`,
      experience: `\n- 研究类型提示：这是一个“体验诊断”研究。请从预期到实际体验复盘关键时刻，并追溯原因到具体触点。\n`,
      persona: `\n- 研究类型提示：这是一个“画像/细分”研究。请围绕动机、场景、取舍与语言隐喻来分化人群。\n`,
      concept: `\n- 研究类型提示：这是一个“概念/方案测试”。先测理解，再测价值，再测可信与风险，必须落到具体场景。\n`,
      pricing: `\n- 研究类型提示：这是一个“定价/价值感”研究。避免直接要价格，聚焦价值锚点、付费门槛与触发条件。probingQuestion 须用定价专属追问。\n`,
      brand: `\n- 研究类型提示：这是一个“品牌/传播”研究。聚焦联想、情绪、角色与信息解码，不要用满意度术语。\n`,
      ux: `\n- 研究类型提示：这是一个“可用性/任务”研究。按任务步骤复盘，找卡点、误解与心智模型。\n`,
    };
    const studyHints = studyHintsByType[studyType] || '';

    const isFGD = interviewType === 'FGD';
    const studyTypeLabel: Record<Exclude<StudyType, 'auto'>, string> = {
      journey: '旅程/流程/触点',
      competitive: '竞品/选择/切换',
      experience: '体验诊断',
      persona: '画像/细分',
      concept: '概念/方案测试',
      pricing: '定价/价值感',
      brand: '品牌/传播',
      ux: '可用性/任务',
    };
    const currentStudyLabel = studyTypeLabel[studyType];

    const outputLanguageMode = this.normalizeOutputLanguage(params.outputLanguage);
    const outputLanguageLabel =
      outputLanguageMode === GroqService.OUTPUT_LANGUAGE.EN
        ? "英文"
        : outputLanguageMode === GroqService.OUTPUT_LANGUAGE.JA
          ? "日文"
          : outputLanguageMode === GroqService.OUTPUT_LANGUAGE.BILINGUAL
            ? "双语对照"
            : "中文";

    const fgdInteractionByStudyType: Partial<Record<Exclude<StudyType, 'auto'>, {
      taskZh: string;
      taskEn: string;
      taskJa: string;
      taskBi: string;
      type: FGDInteractionType;
    }>> = {
      journey: {
        taskZh: "体感地图绘制（白板画出旅程图，标决策点与情绪转折）",
        taskEn: "Journey mapping workshop (draw the end-to-end journey and mark decision points and emotional inflection points).",
        taskJa: "体感マップ作成（ホワイトボードにジャーニーを描き、意思決定点と感情の転換点を示す）。",
        taskBi: "体感地图绘制（白板画出旅程图，标决策点与情绪转折） / Journey mapping workshop (draw the end-to-end journey and mark decision and emotion inflection points).",
        type: "mapping",
      },
      competitive: {
        taskZh: "模拟辩论/阵营PK（分两组互驳后互换立场）",
        taskEn: "Debate and side-switching exercise (split into two camps, argue, then switch positions).",
        taskJa: "模擬ディベート/陣営対決（2グループに分かれて議論し、その後立場を入れ替える）。",
        taskBi: "模拟辩论/阵营PK（分两组互驳后互换立场） / Debate and side-switching exercise.",
        type: "conflict",
      },
      concept: {
        taskZh: "方案共创/加减法（功能卡片：保留/砍掉/新增各选3张）",
        taskEn: "Concept co-creation add/subtract exercise (feature cards: keep 3, cut 3, add 3).",
        taskJa: "案の共創/加減法（機能カードで「残す3・削る3・追加3」を選択）。",
        taskBi: "方案共创/加减法（保留3/砍掉3/新增3） / Concept co-creation add/subtract exercise (keep 3/cut 3/add 3).",
        type: "discuss",
      },
      pricing: {
        taskZh: "心理账单博弈/拍卖（多维度分配预算，讨论不可妥协前三）",
        taskEn: "Mental accounting auction (allocate budget across dimensions and debate top 3 non-negotiables).",
        taskJa: "心理会計ゲーム/オークション（予算配分を行い、譲れない上位3項目を議論）。",
        taskBi: "心理账单博弈/拍卖（多维预算分配） / Mental accounting auction (multi-dimension budget allocation).",
        type: "values",
      },
      experience: {
        taskZh: "红黑榜/找茬挑战（最惊喜3瞬 vs 最想吐槽3瞬）",
        taskEn: "Love/Hate moment challenge (top 3 delight moments vs top 3 frustration moments).",
        taskJa: "良い点/悪い点チャレンジ（最も嬉しかった3瞬間 vs 最も不満だった3瞬間）。",
        taskBi: "红黑榜/找茬挑战（最惊喜3瞬 vs 最想吐槽3瞬） / Love/Hate moment challenge (top 3 delight vs top 3 frustration moments).",
        type: "conflict",
      },
      persona: {
        taskZh: "价值观光谱/站位（务实 vs 极客两端拉线，站位后讨论）",
        taskEn: "Value spectrum positioning (pragmatic vs geek line-up, then discuss why).",
        taskJa: "価値観スペクトラム立ち位置（実用派 vs ギークの軸に立って理由を議論）。",
        taskBi: "价值观光谱/站位（务实 vs 极客） / Value spectrum positioning (pragmatic vs geek).",
        type: "values",
      },
      brand: {
        taskZh: "品牌拟人化/映射（如果品牌是人，穿什么、什么语气？）",
        taskEn: "Brand personification mapping (if the brand were a person, what style and tone would it have?).",
        taskJa: "ブランド擬人化/マッピング（ブランドが人なら、どんな服装・話し方か）。",
        taskBi: "品牌拟人化/映射（如果品牌是人） / Brand personification mapping (if the brand were a person).",
        type: "mapping",
      },
      ux: {
        taskZh: "任务走查投票（投票“最卡的一步”并讨论第一反应）",
        taskEn: "Task walkthrough voting (vote on the most blocking step and discuss first reactions).",
        taskJa: "タスク走査投票（最も詰まるステップに投票し、第一印象を議論）。",
        taskBi: "任务走查投票（最卡一步） / Task walkthrough voting (most blocking step).",
        type: "discuss",
      },
    };
    const fgdInteractionRaw = fgdInteractionByStudyType[studyType];
    const fgdInteraction = fgdInteractionRaw
      ? {
          type: fgdInteractionRaw.type,
          task:
            outputLanguageMode === GroqService.OUTPUT_LANGUAGE.EN
              ? fgdInteractionRaw.taskEn
              : outputLanguageMode === GroqService.OUTPUT_LANGUAGE.JA
                ? fgdInteractionRaw.taskJa
                : outputLanguageMode === GroqService.OUTPUT_LANGUAGE.BILINGUAL
                  ? fgdInteractionRaw.taskBi
                  : fgdInteractionRaw.taskZh,
        }
      : undefined;

    const fgdBlock = isFGD ? `

### FGD 焦点小组专属要求 (Focus Group Discussion) — 社会评价压力 + 观点博弈 + 群体共识
- **研究聚焦**：社会评价压力（当众表达、从众/异议）、观点博弈（说服与被说服）、**群体共识与差异**。
- **当前研究类型为「${currentStudyLabel}」**，大纲内容必须严格按该类型。
- **环节 2 强制包含“共识挑战任务”**：要求组员集体否定一个现有的方案/产品/功能，并给出最具杀伤力的理由。示例：“请大家一起否决当前方案，说出最能击垮它的一个理由。”
- **环节 2 同时设计“冲突点触发任务”**：价值观光谱、卡片分类、角色扮演等，提问须包含“有没有人有不同意见？”“请试图说服对方”等互动指令。
- **behavioralEvidenceTask**：至少一个核心环节须设证物展示，用「请大家」群体语气，如“请大家打开手机相册或 App 历史记录，找出一个最能代表你「焦虑」或「爽快」时刻的截图/照片，并分享那个瞬间。”
- **FGD probingQuestion 专属**（须叠加在研究类型追问之上）：追问须用**群体语气**「大家觉得」「有没有人有不同意见」「谁更靠近哪一边」；必须挖**共识与分歧**；每个核心环节须含至少 1 条**共识/差异追问**。
- **追问细度**：\`probingQuestion\` 须严格按 Action → Feeling → Motivation 递进，且**必须与研究类型匹配**，同时叠加 FGD 群体共识追问。
- **isCore 环节**：probingQuestion 不少于 **3 组**，且必须包含 discussionTask 或 consensusChallengeTask 或 behavioralEvidenceTask。
- **questions 数组要求**：每个环节的 questions 不少于 3 条，且每条主问题后可在 notes 中注明对应追问；或直接将追问拆成独立 questions 条目。
- **备注 (notes)**：须包含**主持人干预技巧**（如何处理话多/沉默者、若一边倒如何追问），以及**本环节的 2-3 条具体追问话术**，逐条写出，不要概括。
- **当前研究类型专属任务**：${fgdInteraction ? `【${fgdInteraction.task}】请在环节 2 落实，并设 \`interactionType\` 为 \`"${fgdInteraction.type}"\`。` : ''}
- **环节时长**：核心挖掘环节须占 70% 总时长，暖场+收尾合计不超过 30%。
` : `

### IDI 深度访谈专属要求 (In-Depth Interview) — 极端个案 + 心理防御拆解
- **研究聚焦**：极端个案（outlier）、**心理防御拆解**（rationalization、justification、认知偏差、合理化说辞）。
- **IDI probingQuestion 专属**（须叠加在研究类型追问之上）：
  - 追问须用**单人语气**：「你」「请你」；严禁用「大家」「我们」。
  - 必须拆**合理化说辞**：当受访者说「因为方便」「大家都这样」时，追问具体情境、那一刻的真实想法、有没有例外。
  - 每个核心环节须含至少 1 条**心理防御拆解追问**，如：“能举个具体例子吗？当时你怎么决定的？”“你说的「方便」具体指什么？有没有一次你觉得其实没那么方便？”
- **behavioralEvidenceTask**：至少一个核心环节须设证物展示，用「请你」单人语气。
- **追问细度**：\`probingQuestion\` 须严格按 Action → Feeling → Motivation 递进，且**必须与研究类型匹配**，同时叠加 IDI 心理防御拆解追问。
- **questions**：每环节不少于 3 条主问题，须口语化、基于具体经历；追问要拆解受访者的“合理化说辞”。
- **notes**：须含研究目的、观察点、追问话术（**含心理防御拆解提示**：受访者可能如何合理化、如何追问破防）。
- **核心环节占 70% 时长**：为核心环节设 isCore: true。
`;

    const outputLanguage = outputLanguageLabel;
    const languageDirective = (() => {
      if (outputLanguageMode === GroqService.OUTPUT_LANGUAGE.EN) {
        return `\n### CRITICAL: Output Language = English ONLY\n- **Every** JSON value (project_title, section title, duration, questions, notes, probingQuestion, discussionTask, consensusChallengeTask, behavioralEvidenceTask) MUST be written in English.\n- Do NOT include any Chinese or Japanese characters. Use English throughout.\n`;
      }
      if (outputLanguageMode === GroqService.OUTPUT_LANGUAGE.JA) {
        return `\n### CRITICAL: 出力言語 = 日本語のみ\n- **すべての** JSON 値（project_title、section title、duration、questions、notes、probingQuestion 等）は日本語で書いてください。\n- 中国語を含めないでください。\n`;
      }
      if (outputLanguageMode === GroqService.OUTPUT_LANGUAGE.BILINGUAL) {
        return `\n### CRITICAL: 双语对照输出\n- 每一条问题、notes、title 等均须输出为「中文 / English」同一行对照格式。\n- 例："你上一次加油时发生了什么？ / What happened the last time you refueled?"\n`;
      }
      return `\n### CRITICAL: 输出语言 = 中文\n- **所有** JSON 值（project_title、环节标题、duration、questions、notes、probingQuestion 等）必须使用中文书写。\n`;
    })();

    const durPlaceholder = outputLanguageMode === GroqService.OUTPUT_LANGUAGE.EN ? 'XX min' : outputLanguageMode === GroqService.OUTPUT_LANGUAGE.JA ? 'XX分' : 'XX分钟';
    const ex = (() => {
      if (outputLanguageMode === GroqService.OUTPUT_LANGUAGE.EN) {
        return {
          title1: 'Warm-up / Ice-breaker',
          title2: 'Section title (core)',
          q1: 'Specific question 1',
          q2: 'Specific question 2',
          q3: 'Specific question 3',
          notes: 'Research purpose, observation points.',
          notesFgd: 'Research purpose, observation points. For over-speakers, invite others; for quiet ones, invite "what do those who have not spoken think?".',
          notesCore: 'Research purpose, observation points, probing script.',
          probe: 'What were you doing in those 10 seconds? Where were you looking? What happened? Can you give a concrete example?\\nWas that feeling more like being interrupted or being ignored? What was your real feeling?\\nIf this feeling kept happening, how would you redefine this brand? How did you adjust your behavior when reality did not match expectation?',
          probe2: 'What were you doing in those 10 seconds? Where were you looking? What happened? Can you give a concrete example?\\nWas that feeling interrupted or ignored? What did it mean to you at that moment?\\nIf this feeling kept happening, how would you redefine this brand? How did you adjust your behavior when reality did not match expectation?',
          evidence: isFGD ? 'Please open your phone album or app history, find a screenshot/photo that best represents a moment of anxiety or satisfaction, and share that moment.' : 'Please open your phone album or app history, find a screenshot/photo that best represents a moment of anxiety or satisfaction, and share that moment.',
          consensus: 'Please collectively reject the current solution/product/feature and give the most damaging reason.',
        };
      }
      if (outputLanguageMode === GroqService.OUTPUT_LANGUAGE.JA) {
        return {
          title1: 'ウォーミングアップ',
          title2: 'セクションタイトル（コア）',
          q1: '具体的な質問1',
          q2: '具体的な質問2',
          q3: '具体的な質問3',
          notes: '研究目的、観察ポイント。',
          notesFgd: '研究目的、観察ポイント。発言過多者には他者を促す；沈黙者には「まだ発言していない方どう思いますか」と促す。',
          notesCore: '研究目的、観察ポイント、プロービングスクリプト。',
          probe: 'その10秒間、手は何をしていましたか？目はどこを見ていましたか？何が起きましたか？具体例を挙げられますか？\\nその感覚は「邪魔された」感じですか、それとも「無視された」感じですか？\\nその感覚が続いたら、このブランドをどう再定義しますか？',
          probe2: 'その10秒間、手は何をしていましたか？目はどこを見ていましたか？何が起きましたか？具体例を挙げられますか？\\nその感覚は「邪魔された」感じですか、それとも「無視された」感じですか？その瞬間あなたにとって何を意味しましたか？\\nその感覚が続いたら、このブランドをどう再定義しますか？',
          evidence: 'スマートフォンのアルバムまたはアプリ履歴を開き、不安や満足の瞬間を代表するスクリーンショット/写真を見つけて共有してください。',
          consensus: '現在の方案/製品/機能を collectively 否定し、最も致命的な理由を述べてください。',
        };
      }
      if (outputLanguageMode === GroqService.OUTPUT_LANGUAGE.BILINGUAL) {
        return {
          title1: '暖场/破冰 / Warm-up',
          title2: '环节标题（核心）/ Section title (core)',
          q1: '具体问题1 / Specific question 1',
          q2: '具体问题2 / Specific question 2',
          q3: '具体问题3 / Specific question 3',
          notes: '研究目的、观察点。 / Research purpose, observation points.',
          notesFgd: '研究目的、观察点。 / Research purpose, observation points. 技巧：过度发言者—点名请他人补充；沉默者—点名邀请。',
          notesCore: '研究目的、观察点、追问话术。 / Research purpose, observation points, probing script.',
          probe: '那 10 秒钟里，你的手在干什么？/ What were you doing in those 10 seconds?\\n那种感觉是「被打扰」还是「被忽视」？/ Was that feeling interrupted or ignored?\\n如果这种感觉持续发生，你会如何重新定义这个品牌？/ How would you redefine this brand?',
          probe2: '那 10 秒钟里，你的手在干什么？/ What were you doing?\\n那种感觉是「被打扰」还是「被忽视」？/ Was that feeling interrupted or ignored?\\n如果这种感觉持续发生，你会如何重新定义这个品牌？/ How would you redefine this brand?',
          evidence: isFGD ? '请大家打开 / Please open 手机相册或 App 历史记录 / your phone album or app history' : '请你打开 / Please open 手机相册或 App 历史记录 / your phone album or app history',
          consensus: '请大家一起否决当前方案 / Please collectively reject the current solution',
        };
      }
      return {
        title1: '暖场/破冰',
        title2: '环节标题（核心）',
        q1: '具体问题1',
        q2: '具体问题2',
        q3: '具体问题3',
        notes: '研究目的、观察点。',
        notesFgd: '研究目的、观察点。技巧：过度发言者—点名请他人补充；沉默者—点名邀请"刚才没发言的朋友怎么看"。追问话术须逐条写出（含 Action+Feeling+Motivation）。',
        notesCore: '研究目的、观察点、追问话术（含心理防御拆解提示）。',
        probe: '那 10 秒钟里，你的手在干什么？眼睛在看哪里？当时发生了什么？能举个具体例子吗？\\n那种感觉是「被打扰」还是「被忽视」？你当下的真实感受是什么？\\n如果这种感觉持续发生，你会如何重新定义这个品牌？当实际与预期不符时，你如何调整了后续行为？',
        probe2: '那 10 秒钟里，你的手在干什么？眼睛在看哪里？当时发生了什么？能举个具体例子/那个瞬间吗？\\n那种感觉是「被打扰」还是「被忽视」？你当下的真实感受是什么？那一刻对你意味着什么？\\n如果这种感觉持续发生，你会如何重新定义这个品牌？当实际表现与预期不符时，你如何调整了后续的操作/选择行为？',
        evidence: isFGD ? '请大家打开手机相册或 App 历史记录，找出一个最能代表你「焦虑」或「爽快」时刻的截图/照片，并分享那个瞬间。' : '请你打开手机相册或 App 历史记录，找出一个最能代表你「焦虑」或「爽快」时刻的截图/照片，并分享那个瞬间。',
        consensus: '请大家一起否决当前方案/产品/功能，说出最能击垮它的一个理由，并讨论谁的理由最具杀伤力。',
      };
    })();

    const routingNote = `\n### 强制性逻辑分支 (Universal Routing) — 拒绝通用模板
- 系统禁止使用通用模板。必须根据「研究类型：${currentStudyLabel}」与「访谈类型：${interviewType}」动态组装大纲，不得产出与类型无关的泛泛内容。\n`;

    const userPrompt = `
请生成以下访谈大纲：
${routingNote}
- 研究课题：${researchTopic}
- 核心话题：${coreTopic}
- 研究类型（与 IDI/FGD 共用）：${currentStudyLabel} — 大纲内容（环节主题、问题方向）必须严格围绕该类型及上述课题/目标，不得偏离。
- 访谈类型：${interviewType}${isFGD ? '（焦点小组：在满足上述研究类型的前提下，叠加暖场破冰、讨论触发点、共识与差异总结；问题用“大家觉得”“有没有人有不同意见”）' : ''}
- 目标人群：${targetAudience}
- 研究目标：${researchPurpose}
- 总时长：${interviewDuration} 分钟
${studyHints}
${fgdBlock}

当前选择的输出语言：${outputLanguage}

请严格按照以下JSON格式返回（示例占位符已按输出语言「${outputLanguage}」展示，你生成的全部内容也必须使用该语言）：

{
  "project_title": "${coreTopic} - Discussion Guide (${interviewType})",
  "sections": [
    {
      "id": 1,
      "title": "${ex.title1}",
      "duration": "${durPlaceholder}",
      "questions": ["${ex.q1}", "${ex.q2}"],
      "notes": "${ex.notes}",
      "probingQuestion": "${ex.probe}",
      "isCore": false
    },
    {
      "id": 2,
      "title": "${ex.title2}",
      "duration": "${durPlaceholder}",
      "questions": ["${ex.q1}", "${ex.q2}", "${ex.q3}"],
      "notes": "${isFGD ? ex.notesFgd : (ex.notesCore ?? ex.notes)}",
      "probingQuestion": "${ex.probe2}"${isFGD && fgdInteraction ? `,
      "interactionType": "${fgdInteraction.type}",
      "discussionTask": "${fgdInteraction.task}",
      "consensusChallengeTask": "${ex.consensus}"` : ''},
      "behavioralEvidenceTask": "${ex.evidence}",
      "isCore": true
    }
  ]
}

说明：probingQuestion 须严格按 Action → Feeling → Motivation 递进；须使用「${currentStudyLabel}」专属追问 + ${isFGD ? 'FGD 群体共识追问' : 'IDI 心理防御拆解追问'}（见上述结构说明）；严禁跨类型套用；至少一个核心环节设 behavioralEvidenceTask（IDI 用「请你」，FGD 用「请大家」）；isCore 环节 probingQuestion 不少于 3 组且含互动任务。${isFGD ? ' FGD 必须自动生成 consensusChallengeTask（⚡ 冲突点挑战）；环节 2 须设 interactionType、discussionTask、consensusChallengeTask。' : ''}${studyType === 'experience' ? ' Experience 类型必须自动生成 behavioralEvidenceTask（📷 证物展示）模块。' : ''}`;

    return `${systemPrompt}${languageDirective}\n\n${userPrompt}`;
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
