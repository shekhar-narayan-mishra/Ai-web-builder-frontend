const fallbackUrl = 'http://localhost:3000';

// IMPORTANT: When deploying to Vercel/Netlify, set VITE_BACKEND_URL to your Render URL:
// Example: https://ai-web-builder-backend.onrender.com
// Do not include the trailing slash.
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || fallbackUrl;