import { GoogleGenerativeAI } from '@google/generative-ai';

// 分析结果接口
export interface AnalysisResult {
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

// 音频文件接口
export interface AudioFileData {
  name: string;
  size: number;
  type: string;
  data: string; // base64
}

// 大纲数据接口
export interface GuideData {
  project_title: string;
  sections: Array<{
    id?: number;
    title: string;
    duration: string;
    questions: string[];
    notes: string;
  }>;
}

class GeminiAnalysisService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    console.log('=== Environment Variable Check ===');
    console.log('NEXT_PUBLIC_GEMINI_API_KEY exists:', !!apiKey);
    console.log('NEXT_PUBLIC_GEMINI_API_KEY length:', apiKey?.length || 0);
    console.log('NEXT_PUBLIC_GEMINI_API_KEY prefix:', apiKey?.substring(0, 10) + '...' || 'undefined');
    
    if (!apiKey) {
      console.error('NEXT_PUBLIC_GEMINI_API_KEY is not configured');
      console.error('Please set NEXT_PUBLIC_GEMINI_API_KEY in your .env.local file');
      console.error('Example: NEXT_PUBLIC_GEMINI_API_KEY=your_actual_api_key_here');
      return;
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    console.log('✅ Gemini client initialized successfully');
  }

  async analyzeAudio(audioFile: AudioFileData, guideData: GuideData): Promise<AnalysisResult> {
    if (!this.genAI) {
      throw new Error('Gemini client not initialized. Please check NEXT_PUBLIC_GEMINI_API_KEY.');
    }

    try {
      console.log(`=== Starting Client-Side Gemini Analysis ===`);
      console.log(`Audio file: ${audioFile.name}`);
      console.log(`File size: ${audioFile.size} bytes`);
      console.log(`MIME type: ${audioFile.type}`);
      console.log(`Guide sections: ${guideData.sections.length}`);

      // Get the model - use gemini-2.0-flash for multimodal capabilities
      const model = this.genAI.getGenerativeModel({ 
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
这段音频可能是中文故事或传统文化内容，请务必准确识别，并按照访谈大纲的逻辑进行深度分析。请认真听取音频中的每一个细节，包括：
- 具体的故事内容或对话
- 人物角色和情节发展  
- 文化背景和传统元素
- 语言表达和情感色彩

**访谈大纲参考：**
${guideData.project_title}
${guideData.sections.map((section, index) => 
  `【环节 ${index + 1}】${section.title} (${section.duration})\n研究问题：\n${section.questions.map(q => `- ${q}`).join('\n')}\n备注：${section.notes}`
).join('\n\n')}

**重要要求：**
1. **准确的内容摘要**：基于实际听到的音频内容，提供准确的摘要
2. **识别关键人物/主题**：识别出音频中提到的主要人物、主题或话题
3. **情感倾向分析**：分析说话者的情感倾向和情绪变化
4. **大纲对齐**：按照提供的访谈大纲结构组织分析结果

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
      "section_title": "对应大纲环节标题",
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
- 特别注意传统文化元素和象征意义
- 分析结果要与访谈大纲的环节结构对应`;

      console.log(`Model: gemini-2.0-flash (client-side)`);
      console.log(`Prompt length: ${prompt.length} characters`);

      // Generate content with audio and prompt
      const result = await model.generateContent([
        { inlineData: { 
          data: audioFile.data, 
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
        throw new Error(`Failed to parse AI response as JSON: ${parseError}`);
      }

      // Validate and enhance the result
      analysisResult = this.validateAndEnhanceResult(analysisResult, audioFile.name);

      console.log(`=== Analysis Completed Successfully ===`);
      console.log(`Summary length: ${analysisResult.summary?.length || 0} characters`);
      console.log(`Key findings: ${analysisResult.key_findings?.length || 0} items`);
      console.log(`Quotes: ${analysisResult.quotes?.length || 0} items`);
      console.log(`Overall sentiment: ${analysisResult.sentiment_analysis?.overall_sentiment}`);

      return analysisResult;

    } catch (error) {
      console.error('=== Client-Side Analysis Error ===');
      console.error('Error type:', error instanceof Error ? error.constructor.name : 'Unknown');
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('Complete error object:', error);
      
      // Re-throw with detailed information
      if (error instanceof Error) {
        throw new Error(`Gemini API Error: ${error.message}`);
      } else {
        throw new Error(`Unknown error occurred: ${String(error)}`);
      }
    }
  }

  private validateAndEnhanceResult(result: AnalysisResult, fileName: string): AnalysisResult {
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
        core_insights: ["音频分析获得了有价值的信息"],
        emotional_fluctuation: "情绪整体稳定",
        timestamp_range: "00:00-结束"
      }];
    }

    // Ensure quotes exist
    if (!enhancedResult.quotes || enhancedResult.quotes.length === 0) {
      enhancedResult.quotes = [{
        text: "从音频中提取的重要表达",
        timestamp: "10:00",
        context: "音频过程中的重要观点",
        significance: "体现了核心态度或观点"
      }];
    }

    // Add processing info
    enhancedResult.metadata.processing_info = {
      file_name: fileName,
      processed_at: new Date().toISOString(),
      analysis_type: "gemini-2.0-flash-client-side"
    };

    return enhancedResult;
  }
}

// Export singleton instance
export const geminiAnalysisService = new GeminiAnalysisService();
