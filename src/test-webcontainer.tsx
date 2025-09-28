import React, { useEffect, useState } from 'react';
import { WebContainer } from '@webcontainer/api';

export function TestWebContainer() {
  const [status, setStatus] = useState('Initializing...');
  const [url, setUrl] = useState('');

  useEffect(() => {
    testWebContainer();
  }, []);

  async function testWebContainer() {
    try {
      setStatus('Booting WebContainer...');
      const webcontainer = await WebContainer.boot();
      
      setStatus('Creating simple files...');
      
      // Create a very simple React project
      const files = {
        'package.json': {
          file: {
            contents: JSON.stringify({
              name: "test-app",
              private: true,
              scripts: {
                dev: "vite"
              },
              dependencies: {
                react: "^18.3.1",
                "react-dom": "^18.3.1"
              },
              devDependencies: {
                "@vitejs/plugin-react": "^4.3.1",
                vite: "^5.4.2"
              }
            }, null, 2)
          }
        },
        'index.html': {
          file: {
            contents: `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`
          }
        },
        'vite.config.ts': {
          file: {
            contents: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { host: true }
})`
          }
        },
        'src': {
          directory: {
            'main.tsx': {
              file: {
                contents: `import React from 'react'
import ReactDOM from 'react-dom/client'

function App() {
  return <h1>Hello World!</h1>
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)`
              }
            }
          }
        }
      };

      setStatus('Mounting files...');
      await webcontainer.mount(files);

      setStatus('Installing dependencies...');
      const installProcess = await webcontainer.spawn('npm', ['install']);
      const installCode = await installProcess.exit;
      
      if (installCode !== 0) {
        setStatus('Install failed!');
        return;
      }

      setStatus('Starting dev server...');
      const devProcess = await webcontainer.spawn('npm', ['run', 'dev']);

      webcontainer.on('server-ready', (port, url) => {
        console.log('🎉 Server ready:', url);
        setUrl(url);
        setStatus('Ready!');
      });

    } catch (error) {
      console.error('WebContainer test failed:', error);
      setStatus(`Error: ${error}`);
    }
  }

  return (
    <div className="p-8">
      <h2 className="text-xl mb-4">WebContainer Test</h2>
      <p className="mb-4">Status: {status}</p>
      {url && (
        <div>
          <p className="mb-2">Preview URL: {url}</p>
          <iframe src={url} className="w-full h-96 border" />
        </div>
      )}
    </div>
  );
}
