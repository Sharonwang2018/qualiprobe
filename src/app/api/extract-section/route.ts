import { NextRequest, NextResponse } from 'next/server';
import { groqService } from '@/lib/groq';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { suggestion } = body;

    if (!suggestion?.trim()) {
      return NextResponse.json({ error: 'Suggestion text is required' }, { status: 400 });
    }

    if (!groqService.client) {
      return NextResponse.json({ error: 'Groq client not initialized' }, { status: 500 });
    }

    const result = await groqService.client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You extract a discussion guide section from suggestion text. Return ONLY valid JSON with: title (string), duration (e.g. "15分钟"), questions (array of 2-5 strings), notes (string). No extra text.`,
        },
        {
          role: 'user',
          content: `Extract a section from this suggestion and return JSON:\n\n${suggestion.slice(0, 3000)}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1024,
    });

    const text = result?.choices?.[0]?.message?.content || '';
    const parsed = JSON.parse(text);

    const section = {
      title: String(parsed.title || '新增环节').trim(),
      duration: String(parsed.duration || '15分钟').trim(),
      questions: Array.isArray(parsed.questions)
        ? parsed.questions.filter(Boolean).map(String)
        : [String(parsed.questions || '')].filter(Boolean),
      notes: String(parsed.notes || '').trim(),
    };

    if (!section.questions.length) {
      section.questions = [section.title];
    }

    return NextResponse.json(section);
  } catch (error: unknown) {
    console.error('Extract section error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Extract failed' },
      { status: 500 }
    );
  }
}
