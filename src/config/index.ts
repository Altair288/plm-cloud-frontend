export const APP_NAME = 'PLM Cloud Platform';
export const APP_VERSION = '0.0.1';

const rawApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? '';

// Use empty string as default so client-side requests stay same-origin and go
// through the Next server proxy under /api and /auth. If you want requests to
// go directly to a backend, set NEXT_PUBLIC_API_BASE_URL.
export const API_BASE_URL = rawApiBaseUrl === '/' ? '' : rawApiBaseUrl;
