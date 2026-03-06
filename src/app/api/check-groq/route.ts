import { NextResponse } from 'next/server';
import { groqService } from '@/lib/groq';

export async function GET() {
  const ready = !!groqService.client;
  return NextResponse.json({ groqReady: ready });
}
