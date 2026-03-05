import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    const name = file.name.toLowerCase();
    const buf = Buffer.from(await file.arrayBuffer());
    let text = '';
    if (name.endsWith('.txt')) {
      text = buf.toString('utf-8');
    } else if (name.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer: buf });
      text = result.value || '';
    } else {
      return NextResponse.json({ error: 'Unsupported format. Use .txt or .docx' }, { status: 400 });
    }
    return NextResponse.json({ text });
  } catch (error) {
    console.error('Parse file error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Parse failed' },
      { status: 500 }
    );
  }
}
