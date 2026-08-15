import { NextResponse } from 'next/server';
import { deleteSession } from '@/libs/Auth';

export async function POST() {
  await deleteSession();
  return NextResponse.json({ success: true });
}
