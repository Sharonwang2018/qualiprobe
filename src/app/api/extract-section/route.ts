import { NextRequest, NextResponse } from 'next/server';
import { groqService } from '@/lib/groq';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { suggestion, sectionCount = 0 } = body;

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
          content: `You extract a discussion guide section from suggestion text.

CRITICAL: Detect if the suggestion targets an EXISTING section (e.g. "在环节2中", "修改环节1", "section 2", "环节3的提问").
- If the suggestion explicitly targets a section (环节1/2/3, section 1/2/3, 第1/2/3个环节), set targetSectionIndex to the 0-based index (环节1=0, 环节2=1, 环节3=2).
- If adding a NEW section or no target mentioned, set targetSectionIndex to null.

Return ONLY valid JSON: { "targetSectionIndex": number | null, "title": string, "duration": string, "questions": string[], "notes": string }
- targetSectionIndex: 0-based index of section to UPDATE (0=环节1), or null to ADD a new section
- title: section name (when adding new; when updating, can be empty)
- duration: e.g. "15分钟" (when adding new; when updating, can be empty)
- questions: specific interview questions as strings (these will be merged into target or form new section)
- notes: research purpose, observation points

If the suggestion lists numbered/bullet items, convert each to a question. No extra text.`,
        },
        {
          role: 'user',
          content: `Extract from this suggestion. Current outline has ${sectionCount} sections (环节1=index 0, 环节2=index 1, ...). Return JSON with targetSectionIndex, title, duration, questions, notes:\n\n${suggestion.slice(0, 4000)}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1024,
    });

    const text = result?.choices?.[0]?.message?.content || '';
    const parsed = JSON.parse(text);

    let targetSectionIndex: number | null = null;
    if (typeof parsed.targetSectionIndex === 'number' && parsed.targetSectionIndex >= 0 && parsed.targetSectionIndex < sectionCount) {
      targetSectionIndex = parsed.targetSectionIndex;
    }
    // Fallback: regex parse from suggestion
    if (targetSectionIndex == null && sectionCount > 0) {
      const patterns = [
        /环节\s*(\d+)/,
        /第\s*(\d+)\s*个?环节/,
        /section\s*(\d+)/i,
        /(?:在|针对|修改|更新)\s*环节\s*(\d+)/,
      ];
      for (const re of patterns) {
        const m = suggestion.match(re);
        if (m) {
          const num = parseInt(m[1], 10);
          if (num >= 1 && num <= sectionCount) {
            targetSectionIndex = num - 1;
            break;
          }
        }
      }
    }

    const section = {
      targetSectionIndex,
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
