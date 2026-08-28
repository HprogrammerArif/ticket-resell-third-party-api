import { NextResponse } from 'next/server';
import { deleteAdminSession } from '@/libs/AdminAuth';

export async function POST() {
  await deleteAdminSession();
  return NextResponse.json({ success: true });
}
