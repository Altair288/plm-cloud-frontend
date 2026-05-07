import { NextRequest } from 'next/server';

import { proxyInternalApiRequest } from '@/utils/server/internalApiProxy';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ path?: string[] }> | { path?: string[] };
};

async function handle(request: NextRequest, context: RouteContext) {
  const { path } = await Promise.resolve(context.params);
  return proxyInternalApiRequest(request, 'auth', path);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
export const HEAD = handle;