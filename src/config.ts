const fallbackUrl = 'http://localhost:3000';

// In production (Vercel), set VITE_BACKEND_URL env var to your Render backend URL
// e.g., https://ai-web-builder-backend.onrender.com
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? fallbackUrl;