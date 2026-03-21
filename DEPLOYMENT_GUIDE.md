# Render Deployment & Configuration Guide

To fix the 500 error and ensure your AI Website Builder works correctly on Render, follow these steps:

## 1. Set Groq API Key on Render
Since `.env` files are not uploaded to GitHub (and shouldn't be), you must manually add the API key to your Render service:

1.  Go to your [Render Dashboard](https://dashboard.render.com/).
2.  Select your **ai-web-builder-backend** service.
3.  Click on **Environment** in the left sidebar.
4.  Click **Add Environment Variable**.
    *   **Key**: `GROQ_API_KEY`
    *   **Value**: `your_gsk_key_here`
5.  Click **Save Changes**. Render will automatically redeploy your service.

## 2. Connect Frontend to Render Backend
Your frontend needs to know where the backend is hosted. If you are using Vercel or Netlify for the frontend:

1.  Go to your frontend provider's dashboard (e.g., Vercel).
2.  Find **Environment Variables**.
3.  Add a new variable:
    *   **Key**: `VITE_BACKEND_URL`
    *   **Value**: `https://your-backend-name.onrender.com` (replace with your actual Render URL).
4.  Redeploy the frontend.

## 3. Local Testing
If you are testing locally:
1.  Make sure your `.env` file in the `Ai-web-builder-backend` folder contains:
    ```
    GROQ_API_KEY=your_gsk_key_here
    PORT=3000
    ```
2.  Restart the backend: `npm run dev`.
3.  The frontend will automatically connect to `localhost:3000` if no `VITE_BACKEND_URL` is set.

## Common Issues
*   **500 Error**: Usually means the `GROQ_API_KEY` is missing or invalid on the server side. Check the "Events" or "Logs" tab on Render to see the specific error.
*   **CORS Error**: Ensure your frontend URL is added to the allowed origins in `backend/src/index.ts`.
