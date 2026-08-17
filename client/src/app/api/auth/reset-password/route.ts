import { NextResponse } from 'next/server';
import { Env } from '@/libs/Env';

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    const backendRes = await fetch(`${Env.BACKEND_API_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data: unknown = await backendRes.json();

    if (!backendRes.ok) {
      const err = data as { error?: { message?: string } };
      return NextResponse.json(
        { error: err.error?.message ?? 'Password reset failed' },
        { status: backendRes.status },
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }
}
