import { NextRequest, NextResponse } from 'next/server';

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

const BROWSER_ONLY_PROXY_HEADERS = new Set([
  'access-control-request-headers',
  'access-control-request-method',
  'origin',
  'referer',
  'sec-fetch-dest',
  'sec-fetch-mode',
  'sec-fetch-site',
  'sec-fetch-user',
]);

const FORWARDED_RESPONSE_HEADERS = new Set([
  'cache-control',
  'content-disposition',
  'content-language',
  'content-type',
  'etag',
  'expires',
  'last-modified',
  'location',
  'set-cookie',
  'vary',
  'www-authenticate',
]);

function getInternalApiBaseUrl(): string | null {
  const raw = process.env.INTERNAL_API_BASE_URL?.trim() ?? process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? '';

  if (raw.length > 0) {
    return raw.replace(/\/$/, '');
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:8080';
  }

  return null;
}

function buildUpstreamUrl(prefix: string, pathSegments: string[] | undefined, request: NextRequest): string | null {
  const baseUrl = getInternalApiBaseUrl();

  if (!baseUrl) {
    return null;
  }

  const pathname = pathSegments && pathSegments.length > 0 ? `/${pathSegments.join('/')}` : '';

  return `${baseUrl}/${prefix}${pathname}${request.nextUrl.search}`;
}

function copyRequestHeaders(request: NextRequest): Headers {
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();

    if (!HOP_BY_HOP_HEADERS.has(normalizedKey) && !BROWSER_ONLY_PROXY_HEADERS.has(normalizedKey)) {
      headers.set(key, value);
    }
  });

  const forwardedHost = request.headers.get('host');

  if (forwardedHost) {
    headers.set('x-forwarded-host', forwardedHost);
  }

  return headers;
}

function copyResponseHeaders(response: Response): Headers {
  const headers = new Headers();

  response.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase()) || FORWARDED_RESPONSE_HEADERS.has(key.toLowerCase())) {
      headers.append(key, value);
    }
  });

  return headers;
}

async function createRequestBody(request: NextRequest): Promise<ArrayBuffer | undefined> {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return undefined;
  }

  return request.arrayBuffer();
}

export async function proxyInternalApiRequest(
  request: NextRequest,
  prefix: string,
  pathSegments: string[] | undefined,
): Promise<NextResponse> {
  const targetUrl = buildUpstreamUrl(prefix, pathSegments, request);

  if (!targetUrl) {
    return NextResponse.json(
      {
        code: 'INTERNAL_API_BASE_URL_MISSING',
        message: 'INTERNAL_API_BASE_URL is required in production.',
      },
      { status: 500 },
    );
  }

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers: copyRequestHeaders(request),
      body: await createRequestBody(request),
      redirect: 'manual',
      cache: 'no-store',
    });

    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: copyResponseHeaders(upstreamResponse),
    });
  } catch (error) {
    console.error(`Failed to proxy ${request.method} ${request.nextUrl.pathname} to ${targetUrl}`, error);

    return NextResponse.json(
      {
        code: 'INTERNAL_API_PROXY_FAILED',
        message: 'Failed to reach internal API upstream.',
      },
      { status: 502 },
    );
  }
}