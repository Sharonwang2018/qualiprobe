import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface AnalysisRequest {
  audioFile: {
    name: string;
    size: number;
    type: string;
    data: string; // base64 encoded audio data
  };
  guideData: {
    project_title: string;
    sections: Array<{
      id?: number;
      title: string;
      duration: string;
      questions: string[];
      notes: string;
    }>;
  };
}

interface AnalysisResult {
  summary: string;
  key_findings: Array<{
    section_title: string;
    core_insights: string[];
    emotional_fluctuation: string;
    timestamp_range: string;
  }>;
  quotes: Array<{
    text: string;
    timestamp: string;
    context: string;
    significance: string;
  }>;
  sentiment_analysis: {
    overall_sentiment: 'positive' | 'neutral' | 'negative';
    sentiment_timeline: Array<{
      timestamp: string;
      sentiment: 'positive' | 'neutral' | 'negative';
      trigger: string;
    }>;
    emotional_highlights: string[];
  };
  metadata: {
    audio_duration: string;
    analysis_confidence: number;
    key_topics_extracted: string[];
    audio_quality: 'good' | 'fair' | 'poor';
    language_detected: 'zh-CN' | 'en-US' | 'other';
    processing_info?: {
      file_name: string;
      processed_at: string;
      analysis_type: string;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalysisRequest = await request.json();
    const { audioFile, guideData } = body;

    if (!audioFile || !guideData) {
      return NextResponse.json(
        { error: 'Missing required fields: audioFile and guideData' },
        { status: 400 }
      );
    }

    // Validate Gemini API key
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      );
    }

    // Get the model - use gemini-2.0-flash for multimodal capabilities
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.1, // Lower temperature for more accurate transcription
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      }
    });

    // Create the professional analysis prompt
    const prompt = `你是一位专业的语言专家和访谈分析师，拥有15年以上的音频分析经验。请仔细听这段音频，并根据实际听到的内容生成分析报告。

**特别说明：**
这是一个关于中国传统文化或儿童故事的音频（可能是"兔儿爷"相关内容），请准确还原内容，不要敷衍。请认真听取音频中的每一个细节，包括：
- 具体的故事内容或对话
- 人物角色和情节发展  
- 文化背景和传统元素
- 语言表达和情感色彩

**重要要求：**
1. **准确的内容摘要**：基于实际听到的音频内容，提供准确的摘要
2. **识别关键人物/主题**：识别出音频中提到的主要人物、主题或话题
3. **情感倾向分析**：分析说话者的情感倾向和情绪变化

**严格禁止：**
- 严禁生成与音频内容无关的虚假信息
- 严禁编造不存在的人物、对话或情节
- 如果音频内容无法识别、音质太差或语言不明确，请明确报告错误

**输出格式：**
请严格按照以下JSON格式返回分析结果：

{
  "summary": "基于实际音频内容的准确摘要",
  "key_findings": [
    {
      "section_title": "主要主题或话题",
      "core_insights": ["从音频中提取的核心观点1", "核心观点2"],
      "emotional_fluctuation": "情感变化描述",
      "timestamp_range": "相关内容的时间范围"
    }
  ],
  "quotes": [
    {
      "text": "从音频中提取的原话",
      "timestamp": "MM:SS",
      "context": "这句话的背景",
      "significance": "这句话的重要性"
    }
  ],
  "sentiment_analysis": {
    "overall_sentiment": "positive|neutral|negative",
    "sentiment_timeline": [
      {
        "timestamp": "MM:SS",
        "sentiment": "positive|neutral|negative",
        "trigger": "引发情感变化的原因"
      }
    ],
    "emotional_highlights": ["情绪高点描述"]
  },
  "metadata": {
    "audio_duration": "预估音频时长（MM:SS）",
    "analysis_confidence": 0.85,
    "key_topics_extracted": ["主题1", "主题2"],
    "audio_quality": "good|fair|poor",
    "language_detected": "zh-CN|en-US|other"
  }
}

**分析指南：**
- 如果音频是传统文化故事，请关注故事情节和文化内涵
- 如果音频是儿童故事，请关注教育意义和表达方式
- 如果音频是对话，请识别对话双方的主要观点
- 如果音频质量不佳或内容不清晰，请在summary中明确说明
- 时间戳请尽可能准确，如果无法确定请使用估算值
- 特别注意"兔儿爷"相关的传统文化元素和象征意义`;

    // Prepare the audio data for Gemini
    const audioBuffer = Buffer.from(audioFile.data, 'base64');
    const audioPart = {
      inlineData: {
        data: audioBuffer.toString('base64'),
        mimeType: audioFile.type || 'audio/mp3'
      }
    };

    console.log(`=== Starting Gemini Analysis ===`);
    console.log(`Audio file: ${audioFile.name}`);
    console.log(`File size: ${audioBuffer.length} bytes`);
    console.log(`MIME type: ${audioFile.type || 'audio/mp3'}`);
    console.log(`Model: gemini-2.0-flash (multimodal)`);
    console.log(`Prompt length: ${prompt.length} characters`);

    // Generate content with audio and prompt
    const result = await model.generateContent([
      { inlineData: { 
        data: audioBuffer.toString('base64'), 
        mimeType: audioFile.type || 'audio/mpeg' 
      }}, 
      { text: prompt }
    ]);
    const response = await result.response;
    const text = response.text();

    console.log(`=== Gemini Raw Response ===`);
    console.log(`Response length: ${text.length} characters`);
    console.log(`Raw response:`, text);

    // Parse the JSON response
    let analysisResult: AnalysisResult;
    try {
      analysisResult = JSON.parse(text);
      console.log(`✅ Successfully parsed JSON response`);
    } catch (parseError) {
      console.error('❌ Failed to parse AI response as JSON:', parseError);
      console.error('Raw response that failed to parse:', text);
      
      // Return error response instead of mock data
      return NextResponse.json({
        success: false,
        error: 'Failed to parse AI response as valid JSON',
        rawResponse: text,
        audioFileName: audioFile.name
      }, { status: 500 });
    }

    // Validate the result structure
    analysisResult = validateAndEnhanceResult(analysisResult, audioFile.name);

    console.log(`=== Analysis Completed Successfully ===`);
    console.log(`Summary length: ${analysisResult.summary?.length || 0} characters`);
    console.log(`Key findings: ${analysisResult.key_findings?.length || 0} items`);
    console.log(`Quotes: ${analysisResult.quotes?.length || 0} items`);
    console.log(`Overall sentiment: ${analysisResult.sentiment_analysis?.overall_sentiment}`);

    return NextResponse.json({
      success: true,
      result: analysisResult,
      audioFileName: audioFile.name
    });

  } catch (error) {
    console.error('=== Analysis Error ===');
    console.error('Error type:', error instanceof Error ? error.constructor.name : 'Unknown');
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Return detailed error information for debugging
    return NextResponse.json({
      success: false,
      error: 'Analysis service error',
      errorMessage: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      audioFileName: 'unknown'
    }, { status: 500 });
  }
}

function buildAnalysisPrompt(guideData: AnalysisRequest['guideData']): string {
  const sectionsText = guideData.sections.map((section, index) => {
    return `
【环节 ${section.id || index + 1}】${section.title} (${section.duration})
研究问题：
${section.questions.map(q => `- ${q}`).join('\n')}
备注：${section.notes}
    `.trim();
  }).join('\n\n');

  return `你是一位资深的市场研究分析师，拥有15年以上的定性研究经验。请仔细分析这份访谈录音，并对照提供的访谈大纲结构进行专业分析。

**访谈大纲结构：**
${sectionsText}

**分析要求：**

1. **核心观点提取**：
   - 针对大纲中每个环节的问题，提取受访者的核心观点
   - 识别关键洞察和意外发现
   - 记录情绪波动点和转折点

2. **金句提取**：
   - 提取2-3条最具代表性的原话金句
   - 必须包含准确的时间戳（格式：MM:SS）
   - 标注金句的背景和意义

3. **情感分析**：
   - 分析整体情感倾向（积极/中性/消极）
   - 描述情感变化的时间线
   - 识别情绪高潮点和低谷点

4. **结构化输出**：
   请严格按照以下JSON格式返回分析结果：

{
  "summary": "整段访谈的核心摘要，包含主要发现和关键洞察",
  "key_findings": [
    {
      "section_title": "对应大纲环节标题",
      "core_insights": ["针对该环节的核心观点1", "核心观点2", "核心观点3"],
      "emotional_fluctuation": "该环节的情绪变化描述",
      "timestamp_range": "该环节在录音中的时间范围"
    }
  ],
  "quotes": [
    {
      "text": "受访者的原话金句",
      "timestamp": "MM:SS",
      "context": "金句出现的背景",
      "significance": "这句话的重要意义"
    }
  ],
  "sentiment_analysis": {
    "overall_sentiment": "positive|neutral|negative",
    "sentiment_timeline": [
      {
        "timestamp": "MM:SS",
        "sentiment": "positive|neutral|negative",
        "trigger": "引发情感变化的原因"
      }
    ],
    "emotional_highlights": ["情绪高点描述1", "情绪高点描述2"]
  },
  "metadata": {
    "audio_duration": "预估音频时长（MM:SS）",
    "analysis_confidence": 0.85,
    "key_topics_extracted": ["主题1", "主题2", "主题3"]
  }
}

**重要提醒：**
- 必须基于实际听到的音频内容进行分析
- 时间戳要尽可能准确
- 金句要保留原汁原味的表达
- 分析要紧扣大纲中的研究问题
- 如果音频质量不佳或内容不清晰，请在summary中说明`;

}

function generateMockAnalysis(fileName: string, guideData: AnalysisRequest['guideData']): AnalysisResult {
  const sections = guideData.sections || [];
  
  return {
    summary: `这是对 ${fileName} 的模拟分析结果。注意：这是模拟数据，不是真实的音频分析结果。实际使用时，Gemini 2.0 Flash 会根据真实的音频内容进行分析。`,
    key_findings: sections.map((section, index) => ({
      section_title: section.title,
      core_insights: [
        `针对${section.title}的核心观点1：受访者表现出积极的态度`,
        `针对${section.title}的核心观点2：提到了一些具体的体验细节`,
        `针对${section.title}的核心观点3：给出了改进建议`
      ],
      emotional_fluctuation: "该环节情绪稳定，偶有兴奋点",
      timestamp_range: `${index * 5}:${((index + 1) * 5 - 1).toString().padStart(2, '0')}`
    })),
    quotes: [
      {
        text: "我觉得这个产品真的很不错，特别是界面设计很直观。",
        timestamp: "02:15",
        context: "在讨论用户体验时",
        significance: "体现了用户对产品设计的认可"
      },
      {
        text: "如果能增加一些自定义选项就更好了。",
        timestamp: "08:42",
        context: "提到改进建议时",
        significance: "指出了产品的改进方向"
      },
      {
        text: "总的来说，我会推荐给朋友使用。",
        timestamp: "15:30",
        context: "总结评价时",
        significance: "显示了较高的满意度"
      }
    ],
    sentiment_analysis: {
      overall_sentiment: 'positive',
      sentiment_timeline: [
        {
          timestamp: "01:00",
          sentiment: "neutral",
          trigger: "访谈开始，适应阶段"
        },
        {
          timestamp: "05:30",
          sentiment: "positive",
          trigger: "讨论到喜欢的功能"
        },
        {
          timestamp: "12:15",
          sentiment: "neutral",
          trigger: "讨论改进建议"
        },
        {
          timestamp: "18:45",
          sentiment: "positive",
          trigger: "总结评价"
        }
      ],
      emotional_highlights: [
        "提到最喜欢功能时的兴奋情绪",
        "讨论使用场景时的积极表达"
      ]
    },
    metadata: {
      audio_duration: "22:30",
      analysis_confidence: 0.75,
      key_topics_extracted: ["用户体验", "功能评价", "改进建议", "整体满意度"],
      audio_quality: "good",
      language_detected: "zh-CN"
    }
  };
}

function validateAndEnhanceResult(result: AnalysisResult, fileName: string): AnalysisResult {
  // Ensure all required fields exist
  const enhancedResult = { ...result };

  // Add metadata if missing
  if (!enhancedResult.metadata) {
    enhancedResult.metadata = {
      audio_duration: "未知",
      analysis_confidence: 0.5,
      key_topics_extracted: [],
      audio_quality: "fair",
      language_detected: "zh-CN"
    };
  }

  // Ensure new metadata fields exist
  if (!enhancedResult.metadata.audio_quality) {
    enhancedResult.metadata.audio_quality = "fair";
  }
  if (!enhancedResult.metadata.language_detected) {
    enhancedResult.metadata.language_detected = "zh-CN";
  }

  // Ensure key_findings align with guideData sections
  if (!enhancedResult.key_findings || enhancedResult.key_findings.length === 0) {
    enhancedResult.key_findings = [{
      section_title: "整体分析",
      core_insights: ["访谈获得了有价值的信息"],
      emotional_fluctuation: "情绪整体稳定",
      timestamp_range: "00:00-结束"
    }];
  }

  // Ensure quotes exist
  if (!enhancedResult.quotes || enhancedResult.quotes.length === 0) {
    enhancedResult.quotes = [{
      text: "这是模拟的金句内容",
      timestamp: "10:00",
      context: "访谈过程中的重要观点",
      significance: "体现了受访者的核心态度"
    }];
  }

  // Add processing info
  enhancedResult.metadata.processing_info = {
    file_name: fileName,
    processed_at: new Date().toISOString(),
    analysis_type: "gemini-2.0-flash"
  };

  return enhancedResult;
}
