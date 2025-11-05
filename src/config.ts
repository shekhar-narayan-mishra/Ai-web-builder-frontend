const fallbackUrl = 'https://ai-web-builder-backend-production.up.railway.app';

// Vite exposes environment variables via import.meta.env at runtime.
// Accessing process.env in the browser throws, which previously blanked the app.
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? fallbackUrl;