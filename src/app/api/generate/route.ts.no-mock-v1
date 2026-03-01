import { NextRequest, NextResponse } from 'next/server';
import { groqService } from '@/lib/groq';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Request body:', body);
    
    const { 
      topic, 
      audience, 
      goal, 
      template, 
      interviewType, 
      totalDuration,
      systemPrompt, // 新增：完整的SYSTEM_PROMPT
      outputLanguage, // 新增：语言偏好
      enhancedMode // 新增：增强模式
    } = body;

    if (!topic || !audience || !goal) {
      return NextResponse.json(
        { error: '缺少必要参数：topic, audience, goal' },
        { status: 400 }
      );
    }

    // 使用 Groq 服务 - 传递完整参数
    const outlineData = await groqService.generateOutline({
      researchTopic: topic,
      targetAudience: audience,
      researchPurpose: goal,
      interviewType: interviewType || 'IDI',
      interviewDuration: totalDuration || '30',
      selectedTemplate: template || 'basic',
      systemPrompt: systemPrompt, // 传递SYSTEM_PROMPT
      outputLanguage: outputLanguage, // 传递语言偏好
      enhancedMode: enhancedMode || false // 传递增强模式
    });

    console.log('Generated outline:', outlineData);

    return NextResponse.json(outlineData);

  } catch (error: any) {
    console.error('Generate outline error:', error);
    
    // 详细的错误信息
    let errorMessage = '生成大纲失败';
    let statusCode = 500;
    
    if (error.message?.includes('quota') || error.message?.includes('429')) {
      errorMessage = 'API配额已用完，请检查API Key配置';
      statusCode = 429;
    } else if (error.message?.includes('API Key') || error.message?.includes('unauthorized')) {
      errorMessage = 'API Key无效，请检查环境变量配置';
      statusCode = 401;
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'API请求超时，请稍后重试';
      statusCode = 408;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        message: error.message,
        type: error.constructor.name
      },
      { status: statusCode }
    );
  }
}
