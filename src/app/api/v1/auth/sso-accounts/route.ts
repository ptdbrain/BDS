import { NextResponse } from 'next/server';
import { SSO_ACCOUNTS } from '@/lib/authConfig';

export async function GET() {
  return NextResponse.json({
    data: SSO_ACCOUNTS
  });
}
