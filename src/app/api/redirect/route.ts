import { NextRequest, NextResponse } from 'next/server';
import { findRedirect } from '@/lib/actions/redirects';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const path = url.searchParams.get('path') || '/';
  
  const redirect = await findRedirect(path);
  if (redirect) {
    return NextResponse.json({ redirect });
  }
  return NextResponse.json({ redirect: null });
}
