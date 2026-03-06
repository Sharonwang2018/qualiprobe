import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

interface AnalyzeTranscriptRequest {
  transcript: string;
  researchTopic?: string;
  researchPurpose?: string;
  targetAudience?: string;
}

interface AnalyzeTranscriptResult {
  background: string;
  outline: string;
  coreInsights: string;
  actionItems: string;
}

const SYSTEM_PROMPT = `You are a senior qualitative research analyst (15+ years) from top consulting firms (Ipsos, Kantar). Analyze interview transcripts and output structured insights.

Return ONLY valid JSON. Each value MUST be a plain string (not an object or array):
- background: string
- outline: string  
- coreInsights: string
- actionItems: string

Example: {"background":"...","outline":"...","coreInsights":"...","actionItems":"..."}`;

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeTranscriptRequest = await request.json();
    const { transcript, researchTopic, researchPurpose, targetAudience } = body;

    if (!transcript?.trim()) {
      return NextResponse.json(
        { error: 'Transcript content is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Groq API key not configured' },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey });

    const userPrompt = `Analyze the following interview transcript and provide structured insights.

**Transcript:**
${transcript.slice(0, 12000)}

${researchTopic ? `**Research topic:** ${researchTopic}` : ''}
${targetAudience ? `**Target audience:** ${targetAudience}` : ''}
${researchPurpose ? `**Research purpose:** ${researchPurpose}` : ''}

Return JSON with string values only (no nested objects/arrays):
- background: Brief context of the interviewee and interview focus (plain text string)
- outline: Structured summary aligned with discussion topics (plain text string)
- coreInsights: Key findings, motivations, pain points, and surprises (plain text string)
- actionItems: Concrete next steps and recommendations (plain text string)

Use the same language as the transcript (e.g. Chinese if transcript is in Chinese).`;

    const result = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
      max_tokens: 4096,
    });

    const text = result.choices[0]?.message?.content || '';
    const parsed = JSON.parse(text);

    const toText = (v: unknown): string => {
      if (v == null) return '';
      if (typeof v === 'string') return v.trim();
      if (Array.isArray(v)) return v.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join('\n');
      return JSON.stringify(v, null, 2);
    };

    const analysisResult: AnalyzeTranscriptResult = {
      background: toText(parsed.background),
      outline: toText(parsed.outline),
      coreInsights: toText(parsed.coreInsights),
      actionItems: toText(parsed.actionItems),
    };

    return NextResponse.json(analysisResult);
  } catch (error) {
    console.error('Analyze transcript error:', error);
    return NextResponse.json(
      {
        error: 'Analysis failed',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
