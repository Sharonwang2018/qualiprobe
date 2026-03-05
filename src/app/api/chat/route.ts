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
    const { context, message, mode } = body;

    if (!groqService.client) {
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

    // 构建系统提示词：从“闲聊”转向“简报式决策支持”
    const systemPrompt = `你是一名来自顶尖市场研究咨询公司（如 Ipsos, Kantar）的定性研究总监。

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

### 🧩 回答形态：从“对话”到“简报”
- 所有正式回答（不是单纯澄清问题）必须采用**三段式简报结构**，使用 Markdown 三级标题分块：
  1) \`### 背景核查\`：用 2-4 行快速复述你理解到的研究对象、时间范围（例如“小米汽车 SU7 首批上市 2024.3”）和关键前提，必要时提出 1-2 条澄清问题。
  2) \`### 核心建议\`：用条理清晰的要点说明你对研究设计/大纲/样本定义的判断，每一点都尽量落在“定性方法论”的语言上（行为、场景、链路、触点、动机、例外等）。
  3) \`### 行动步骤\`：用 3-6 条步骤化建议，指导用户“下一步可以具体怎么改/怎么做”，每条都以动词开头（例如“先…”，“然后…”，“最后…”）。
- 列表中的每条要点要尽量一句话讲清一个动作或一个判断，避免在同一行里塞入 3-4 个观点。

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
- 最后提供可执行的行动方案`;

    const userPrompt = `【当前上下文】
${enhancedContext}

【用户问题】
${message}

请基于以上信息，以资深定性研究专家的身份回答。`;

    const result = await groqService.client.chat.completions.create({
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

    const text = result?.choices?.[0]?.message?.content || '';

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
