export const APP_NAME = 'PLM Cloud Platform';
export const APP_VERSION = '0.0.1';

// Use empty string as default so client-side requests go to Next dev server
// (which will apply rewrites for /api to your backend). If you want
// requests to go directly to a backend, set `NEXT_PUBLIC_API_BASE_URL`.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
