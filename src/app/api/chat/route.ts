import { NextRequest, NextResponse } from 'next/server';
import { groqService } from '@/lib/groq';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  if (url.searchParams.get('debug') !== '1') {
    return NextResponse.json({ error: 'Use POST to chat' }, { status: 405 });
  }
  const tavilyKey = process.env.TAVILY_API_KEY?.trim() || process.env.TAVILY_KEY?.trim();
  return NextResponse.json({
    tavilyKeySet: !!tavilyKey,
    groqReady: !!groqService.client,
  });
}

const shouldUseWebSearch = (message: string): boolean => {
  if (!message) return false;

  const lower = message.toLowerCase();
  const keywords = [
    '年份',
    '哪一年',
    '哪年',
    '几年',
    '什么时候',
    '上市',
    '上市时间',
    '发布',
    '最新',
    '最近',
    '近期',
    '今年',
    '去年',
    '明年',
    '数据',
    '统计',
    '市场份额',
    '市占率',
    '出货量',
    '销售额',
    '定价',
    '价格',
    '涨价',
    '降价',
    'year',
    'which year',
    'what year',
    'when did',
    'release year',
    'launch year',
    'latest',
    'recent',
  ];

  return keywords.some((kw) => lower.includes(kw));
};

const runTavilySearch = async (query: string): Promise<string | null> => {
  const apiKey = (process.env.TAVILY_API_KEY || process.env.TAVILY_KEY)?.trim();
  if (!apiKey) {
    console.warn('[chat] TAVILY_API_KEY (or TAVILY_KEY) missing or empty, skip web search');
    return null;
  }

  try {
    const body = {
      query,
      search_depth: 'basic',
      max_results: 5,
      topic: 'general',
    };
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const errText = await response.text();
    if (!response.ok) {
      console.error('[chat] Tavily HTTP', response.status, errText.slice(0, 300));
      return null;
    }

    let data: any;
    try {
      data = JSON.parse(errText);
    } catch {
      console.error('[chat] Tavily response not JSON');
      return null;
    }

    const results = Array.isArray(data?.results) ? data.results : [];
    if (!results.length) {
      console.warn('[chat] Tavily returned 0 results. keys:', data ? Object.keys(data) : 'null');
      return null;
    }

    console.log('[chat] Tavily ok, results:', results.length);
    const snippets = results
      .slice(0, 3)
      .map((item: any, index: number) => {
        const title = item.title || `Result ${index + 1}`;
        const content = (item.content || '').slice(0, 400);
        const url = item.url || '';
        return `- 标题: ${title}\n  摘要: ${content}${url ? `\n  链接: ${url}` : ''}`;
      })
      .join('\n\n');

    return `【联网检索结果（仅供参考，可能存在错误或已过期）】\n${snippets}`;
  } catch (error) {
    console.error('[chat] Tavily error', error);
    return null;
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { context, message, mode, language } = body;

    const chatClient = groqService.client;
    if (!chatClient) {
      return NextResponse.json(
        { error: 'Groq client not initialized' },
        { status: 500 }
      );
    }

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    let enhancedContext = context || '无上下文';

    const useSearch = shouldUseWebSearch(message);
    if (useSearch) {
      console.log('[chat] web search triggered for message:', message.slice(0, 60));
      const searchSnippet = await runTavilySearch(message);
      if (searchSnippet) {
        enhancedContext = `${enhancedContext}\n\n${searchSnippet}`;
        console.log('[chat] search snippet length:', searchSnippet.length);
      } else {
        console.warn('[chat] no search snippet (Tavily failed or no results)');
      }
    }

    const normalizeLanguage = (input?: string): 'zh' | 'en' | 'ja' => {
      const value = (input || '').toLowerCase().trim();
      if (['en', 'english', '英文'].includes(value)) return 'en';
      if (['ja', 'jp', 'japanese', '日文', '日语'].includes(value)) return 'ja';
      return 'zh';
    };
    const preferredLanguage = normalizeLanguage(language);
    const languagePolicy =
      preferredLanguage === 'en'
        ? `\n### Language Policy\n- Reply in English only.\n- Do not output Chinese.\n`
        : preferredLanguage === 'ja'
          ? `\n### 言語ポリシー\n- 回答は日本語のみで出力してください。\n- 中国語を出力しないでください。\n`
          : `\n### 语言策略\n- 回答使用中文。\n`;

    // 构建系统提示词：从“闲聊”转向“简报式决策支持”
    const systemPromptZh = `你是一名来自顶尖市场研究咨询公司（如 Ipsos, Kantar）的定性研究总监。

今天假定日期为 2026-03-03。

### ⚠️ 核心原则
- 基于用户提供的【当前上下文】、【（可选）联网检索结果】和【用户问题】进行专业回答。
- 如果信息不足，先提出 1-3 个澄清问题再给建议。
- 回答要具体、可操作、符合定性研究专业标准。
- 避免泛泛而谈、套话、或者答非所问，禁止“这是一个很好的问题”这类空洞开场。
- 不要盲信用户前提：如果用户的问题里有明显可能不成立的前提（例如：提到一个尚未发布/明显虚构的产品型号，如“苹果18/特斯拉Z系列”等），要先礼貌指出这一点，再和用户确认真实意图。
- 当用户显式质疑前提（比如“苹果18还没出来吧？”），你必须优先承认不确定性或错误，不要硬编事实，而是改为基于“假设未来机型”的场景分析。
- 如果用户询问“怎么问/提问/问题/追问”，请给出具体的问题优化建议。
- 如果用户询问“大纲/结构/逻辑”，请给出结构优化建议。
- 如果用户询问“受众/用户/样本/招募”，请给出受众定义和招募建议。
- 如果用户询问“原话/原文/证据”，请说明当前在“大纲设计”模式，没有笔录可溯源。

### 🌐 关于联网检索结果的使用
- 如果【上下文】中包含“【联网检索结果】”段落，你可以参考其中的信息，但这些信息可能存在错误或已过期。
- 对于年份、上市时间、具体数字等事实问题，应当优先基于检索结果进行判断；如果检索结果之间互相矛盾或不够明确，要直说“不确定/可能有多个说法”，而不是自行编造一个精确数字。
- 当检索结果缺失、模糊或与你的常识冲突时，诚实说明不确定性，并给出如何自行查证的建议（例如去官网、官方公告或权威媒体）。

### 🧩 回答形态：先自然再结构
- **确认类问题优先自然回复**：当用户问"对不对""对吗""是吧""right?"等确认性问题时，先自然确认（如"你说的对""是的""基本正确"），再简要补充，不要一上来就用三段式简报。
  示例：用户问"所以需要提升的点在 APP 稳定性和减少推销，对吗？" → 回答"你说的对。根据笔录分析，需要优化的点确实包括 App 稳定性、减少便利店推销，此外还有提高员工服务质量。"
- **复杂问题才用简报结构**：只有当用户提出开放性的复杂问题（如"怎么优化大纲""受众怎么定义"）时，才采用**三段式简报**（\`### 背景核查\` \`### 核心建议\` \`### 行动步骤\`），用 Markdown 分块。
- 列表中的每条要点要尽量一句话讲清，避免在同一行里塞入 3-4 个观点。

### 🧠 方法论约束：定性研究专家而非闲聊助手
- 当问题涉及**跨年度/跨产品线**（如“小米汽车”、“苹果 18”、“新老车型对比”）时：
  - 在“背景核查”中主动区分：是讨论**首批车主口碑**（如“小米 SU7 2024.3 上市的首批用户”），还是讨论**未来款/潜在购买意向**（如“2026 年新款的潜在购买者”）。
  - 如果用户没有说清楚，就问：“您更想聚焦哪一类？例如：① 已购车用户使用体验；② 正在观望但尚未下单的人；③ 未来两年内考虑换车的人？”
- 对任何研究设计类问题，要主动提醒用户补充“场景”，优先使用类似提问：
  - “为了让大纲更精准，您能描述一个典型的访谈场景吗？比如：在什么城市、什么渠道招募、受访者处在决策链路的哪个阶段？”
  - “如果只允许你招一个小而精的样本，你更想先听到哪一类人的故事？”

### 🎯 回答策略
- 先理解用户真正想问什么
- 再结合当前项目上下文给出针对性建议
- 对于未来产品/尚未发布的机型，一律按“假设性讨论”处理，明确说明没有真实市场数据，只能基于历史机型与常识做类比
- 最后提供可执行的行动方案

### 📋 大纲快照解读
- 【当前大纲快照】为完整大纲，仅供你参考。**严禁**在回答中输出「大纲快照更新」或任何 JSON/原始数据结构；用户不需要看到 id、title、questions 等字段。用自然语言描述即可。
- 环节1=第1项，环节2=第2项，环节3=第3项，以此类推。
- 当用户说「环节3放在环节2前面」等调序请求时，必须依据快照中的**实际内容**作答，不要称「环节未知」。若快照中有环节3，则直接给出调序后的新顺序。

### 📤 回答呈现规范（严禁输出 JSON）
- **严禁**在回答中输出「大纲快照更新」、原始 JSON、或任何技术格式（如 \`{"id":2,"title":"..."}\`、\`interactionType\`、\`consensusChallengeTask\`）。用自然语言呈现建议即可。
- 涉及环节合并、调序、修改时，用**自然语言 + Markdown 列表**呈现，例如：
  - 新顺序：环节1 → 品牌漏斗环节 → 品牌拟人化/映射 → ...
  - 合并后的环节标题：XX
  - 合并后的问题：①… ②… ③…
- 若需展示结构化建议，用「标题」「问题」「备注」等中文小标题分块，不要用英文字段名。

### 📋 大纲修改类请求（加入/加入大纲/把这个加入/把 PSM 加入 等）
- 当用户明确要求将建议「加入大纲」「应用到大纲」「更改设计到大纲里」时，在\`### 核心建议\`中必须给出**可直接加入大纲的新环节**，格式清晰：
  1) **环节标题**（如 PSM分析环节、定价策略讨论）
  2) **时长**（如 15分钟、20分钟）
  3) **具体问题**（2-5 条，每条为完整可问的句子）
  4) **备注**（研究目的、观察点）
- 用户可点击「采纳建议并同步到大纲」按钮，系统会解析你的回答并同步到中间栏大纲。
- **修改指定环节时**：若建议修改环节2、环节1等已有环节，必须在回答中明确写出「在环节2中」「修改环节1的提问」等，系统会同步到对应环节；否则会追加为新环节。
${languagePolicy}`;

    const systemPromptEn = `You are a qualitative research director from a top-tier insights consultancy (e.g., Ipsos, Kantar).

Today is assumed to be 2026-03-03.

Core rules:
- Answer based on provided context, optional web-search snippets, and user question.
- Be specific and actionable. Avoid generic filler.
- If information is insufficient, ask 1-3 clarifying questions first.
- If user premise looks incorrect (e.g., unreleased or fictional model), politely flag uncertainty before proposing assumptions.
- For outline optimization requests, provide practical interview-question rewrites and clear rationale.
- Never output JSON in chat responses.
- Keep response concise and structured when needed.
- Reply in English only. Do not output Chinese.`;

    const systemPromptJa = `あなたはトップ市場調査会社（Ipsos、Kantar など）の定性調査ディレクターです。

前提日付は 2026-03-03 です。

ルール:
- 提供された文脈、必要に応じた検索結果、ユーザー質問に基づいて回答してください。
- 具体的かつ実行可能に回答し、抽象的な表現を避けてください。
- 情報が不足している場合は、先に 1〜3 個の確認質問をしてください。
- 前提が不確かな場合（未発売モデルなど）は、その不確実性を先に明示してください。
- チャット回答で JSON は出力しないでください。
- 回答は日本語のみで、中国語は出力しないでください。`;

    const systemPrompt =
      preferredLanguage === 'en'
        ? systemPromptEn
        : preferredLanguage === 'ja'
          ? systemPromptJa
          : systemPromptZh;

    const userPrompt =
      preferredLanguage === 'en'
        ? `Current Context:\n${enhancedContext}\n\nUser Question:\n${message}\n\nPlease answer as a senior qualitative research expert.`
        : preferredLanguage === 'ja'
          ? `現在の文脈:\n${enhancedContext}\n\nユーザー質問:\n${message}\n\n上記に基づいて、上級の定性調査専門家として回答してください。`
          : `【当前上下文】\n${enhancedContext}\n\n【用户问题】\n${message}\n\n请基于以上信息，以资深定性研究专家的身份回答。`;

    const result = await chatClient.chat.completions.create({
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
      temperature: 0.7,
      top_p: 0.8,
      max_tokens: 4096,
    });

    const containsCjk = (text: string): boolean => /[\u4e00-\u9fff]/.test(text || '');
    const rewriteResponseIfNeeded = async (text: string, lang: 'zh' | 'en' | 'ja'): Promise<string> => {
      if (!text) return text;
      if (lang === 'en' && containsCjk(text)) {
        const rewritten = await chatClient.chat.completions.create({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content: "Rewrite the following answer into professional English only. Keep all key meaning and structure. Do not output Chinese."
            },
            {
              role: "user",
              content: text
            }
          ],
          temperature: 0.2,
          max_tokens: 4096,
        });
        return (rewritten?.choices?.[0]?.message?.content || text).trim();
      }
      if (lang === 'ja' && containsCjk(text)) {
        const rewritten = await chatClient.chat.completions.create({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content: "以下の回答を、自然で専門的な日本語に書き換えてください。意味と構成は維持し、中国語は出力しないでください。"
            },
            {
              role: "user",
              content: text
            }
          ],
          temperature: 0.2,
          max_tokens: 4096,
        });
        return (rewritten?.choices?.[0]?.message?.content || text).trim();
      }
      return text.trim();
    };

    const rawText = result?.choices?.[0]?.message?.content || '';
    const text = await rewriteResponseIfNeeded(rawText, preferredLanguage);

    return NextResponse.json({
      answer: text.trim()
    });

  } catch (error: any) {
    console.error('Chat API error:', error);
    
    let errorMessage = 'Chat service unavailable';
    if (error.message?.includes('quota') || error.message?.includes('429')) {
      errorMessage = 'API配额已用完，请稍后重试';
    } else if (error.message?.includes('API Key') || error.message?.includes('unauthorized')) {
      errorMessage = 'API Key无效，请检查配置';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        message: error.message
      },
      { status: 500 }
    );
  }
}
