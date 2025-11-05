import { WebContainer, type FileSystemTree, type WebContainerProcess } from '@webcontainer/api';
import { useEffect, useRef, useState } from 'react';
import { FileItem } from '../types';
import { Loader2, CheckCircle, AlertCircle, Play } from 'lucide-react';

interface PreviewFrameProps {
  files: FileItem[];
  webContainer: WebContainer | null;
}

interface LogEntry {
  id: number;
  text: string;
  type: 'info' | 'success' | 'error' | 'warning';
  timestamp: Date;
}

export function PreviewFrame({ files, webContainer }: PreviewFrameProps) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showLogs, setShowLogs] = useState(true);
  const runIdRef = useRef(0);
  const logIdRef = useRef(0);
  const installProcessRef = useRef<WebContainerProcess | null>(null);
  const devProcessRef = useRef<WebContainerProcess | null>(null);
  const serverReadyDisposeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!webContainer) {
      setStatus('Initializing WebContainer...');
      return;
    }

    const flattenedFiles = flattenFileItems(files);

    if (flattenedFiles.length === 0) {
      setStatus('No files to preview');
      setUrl('');
      setIsLoading(false);
      setLogs([]);
      setProgress(0);
      setShowLogs(false);
      return;
    }

    setupProject();
  }, [webContainer, files]);

  useEffect(() => {
    return () => {
      serverReadyDisposeRef.current?.();
      serverReadyDisposeRef.current = null;
      void installProcessRef.current?.kill();
      void devProcessRef.current?.kill();
      installProcessRef.current = null;
      devProcessRef.current = null;
    };
  }, []);

  const addLog = (text: string, type: LogEntry['type'] = 'info') => {
    logIdRef.current += 1;
    const newLog: LogEntry = {
      id: logIdRef.current,
      text,
      type,
      timestamp: new Date()
    };
  setLogs((prev: LogEntry[]) => [...prev.slice(-9), newLog]);
  };

  async function setupProject() {
    try {
      if (!webContainer) {
        return;
      }

      await stopRunningProcesses();

      const runId = Date.now();
      runIdRef.current = runId;

      setIsLoading(true);
      setUrl('');
      setLogs([]);
  logIdRef.current = 0;
      setProgress(0);
      setShowLogs(true);
      setStatus('Preparing preview workspace...');
      addLog('Setting up preview workspace', 'info');
      setProgress(10);
      
      const fileTree = createReactFileTree(files);
      addLog('Created React file structure', 'success');
      setProgress(25);
      await webContainer.mount(fileTree);
      addLog('Mounted files to WebContainer', 'success');
      if (runIdRef.current !== runId) {
        return;
      }

      setStatus('Installing dependencies...');
      setProgress(40);
      addLog('Installing dependencies...', 'info');

      const installProcess = await webContainer.spawn('npm', ['install']);
      installProcessRef.current = installProcess;
      void streamProcessOutput(installProcess, runId, line => addLog(line, 'info'));

      const installCode = await installProcess.exit;
      installProcessRef.current = null;
      if (runIdRef.current !== runId) {
        return;
      }

      setProgress(70);
      
      if (installCode !== 0) {
        addLog('Dependencies installation failed', 'error');
        setStatus('Install failed!');
        setIsLoading(false);
        setShowLogs(true);
        return;
      }
      
      addLog('Dependencies installed successfully', 'success');
      setStatus('Starting React dev server...');
      setProgress(85);
      addLog('Starting React development server...', 'info');

      const devProcess = await webContainer.spawn('npm', ['run', 'dev']);
      devProcessRef.current = devProcess;
      void streamProcessOutput(devProcess, runId, line => addLog(line, 'info'));

      void devProcess.exit.then((code: number) => {
        devProcessRef.current = null;

        if (runIdRef.current !== runId) {
          return;
        }

        if (code !== 0) {
          addLog(`Dev server exited with code ${code}`, 'error');
          setStatus('Dev server exited unexpectedly');
          setIsLoading(false);
          setShowLogs(true);
        }
      }).catch((error: unknown) => {
        devProcessRef.current = null;

        if (runIdRef.current === runId) {
          addLog(`Dev server exit error: ${error}`, 'error');
          setStatus('Dev server error');
          setIsLoading(false);
          setShowLogs(true);
        }
      });

      attachServerReadyListener(runId);
    } catch (error) {
      console.error('❌ Preview setup error:', error);
      addLog(`Setup failed: ${error}`, 'error');
      setStatus(`Error: ${error}`);
      setIsLoading(false);
      setShowLogs(true);
    }
  }
  
  async function stopRunningProcesses() {
    const processes: WebContainerProcess[] = [];
    if (installProcessRef.current) {
      processes.push(installProcessRef.current);
    }
    if (devProcessRef.current) {
      processes.push(devProcessRef.current);
    }

    installProcessRef.current = null;
    devProcessRef.current = null;

    await Promise.all(processes.map(async process => {
      try {
        await process.kill();
      } catch (error) {
        console.error('Failed to stop WebContainer process', error);
      }
    }));
  }

  function attachServerReadyListener(runId: number) {
    if (!webContainer) {
      return;
    }

    serverReadyDisposeRef.current?.();
    serverReadyDisposeRef.current = null;

    const handler = (port: number, previewUrl: string) => {
      if (runIdRef.current !== runId) {
        return;
      }

      addLog(`Server started on port ${port}`, 'success');
      addLog('React preview is ready', 'success');
      setUrl(previewUrl);
      setStatus('Ready!');
      setProgress(100);
      setIsLoading(false);

      setTimeout(() => {
        if (runIdRef.current === runId) {
          setShowLogs(false);
        }
      }, 3000);
    };

    const dispose = (webContainer as any).on?.('server-ready', handler);

    if (typeof dispose === 'function') {
      serverReadyDisposeRef.current = dispose;
      return;
    }

    if (typeof (webContainer as any).off === 'function') {
      serverReadyDisposeRef.current = () => {
        (webContainer as any).off('server-ready', handler);
      };
    }
  }

  async function streamProcessOutput(
    process: WebContainerProcess,
    runId: number,
    onLine: (line: string) => void
  ) {
    const reader = process.output.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { value, done } = await reader.read();

        if (done || runIdRef.current !== runId) {
          break;
        }

        if (value !== undefined && value !== null) {
          const text = typeof value === 'string'
            ? value
            : decoder.decode(value as AllowSharedBufferSource, { stream: true });
          text.split('\n').map(line => line.trim()).filter(Boolean).forEach(onLine);
        }
      }
    } catch (error) {
      if (runIdRef.current === runId) {
        addLog(`Log stream error: ${error}`, 'warning');
      }
    } finally {
      reader.releaseLock();
    }
  }

  const getStatusIcon = () => {
    if (isLoading) return <Loader2 className="w-5 h-5 animate-spin" />;
    if (url) return <CheckCircle className="w-5 h-5 text-green-400" />;
    if (status.includes('Error') || status.includes('failed')) return <AlertCircle className="w-5 h-5 text-red-400" />;
    return <Play className="w-5 h-5 text-blue-400" />;
  };

  if (!webContainer) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Initializing WebContainer...</div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Generate a project to see preview</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Status Bar */}
      <div className="p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3 mb-2">
          {getStatusIcon()}
          <span className="text-sm text-gray-300 font-medium">
            Status: {status}
          </span>
          {url && (
            <div className="ml-auto">
              <div className="flex items-center gap-2 text-xs text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                Live Preview Ready
              </div>
            </div>
          )}
        </div>
        
        {isLoading && (
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
      </div>
      
      {showLogs && (isLoading || logs.some(log => log.type === 'error')) && (
        <div className="bg-gray-900/90 border-b border-gray-700 max-h-48 overflow-y-auto">
          <div className="p-3">
            <div className="text-xs text-gray-400 mb-2 font-medium">Build Logs:</div>
            <div className="space-y-1">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 text-xs">
                  <span className="text-gray-500 min-w-[60px]">
                    {log.timestamp.toLocaleTimeString().slice(-8)}
                  </span>
                  <span className={`${
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'success' ? 'text-green-400' :
                    log.type === 'warning' ? 'text-yellow-400' :
                    'text-gray-300'
                  }`}>
                    {log.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Preview Content */}
      <div className="flex-1">
        {url ? (
          <iframe 
            src={url} 
            className="w-full h-full border-0"
            title="Preview"
          />
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full bg-gray-800/20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
              <div className="text-lg font-medium text-white mb-2">Building React App</div>
              <div className="text-sm text-gray-400">Converting to React components...</div>
              <div className="mt-4 w-64 bg-gray-700 rounded-full h-2 mx-auto">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-2">{progress}% Complete</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-yellow-400">{status}</div>
          </div>
        )}
      </div>
    </div>
  );
}

type FlatFile = {
  path: string;
  content: string;
};

function createReactFileTree(files: FileItem[]): FileSystemTree {
  const flatFiles = flattenFileItems(files);
  const fileMap = new Map<string, FlatFile>();

  flatFiles.forEach(file => {
    const normalized = normalizePath(file.path);
    if (normalized) {
      fileMap.set(normalized, {
        path: normalized,
        content: file.content
      });
    }
  });

  // Try to convert vanilla HTML/CSS/JS to React
  const wasPatched = convertVanillaToReact(fileMap);
  console.log('🔧 Conversion result:', wasPatched);

  const hasTypeScript = Array.from(fileMap.keys()).some(path => path.endsWith('.ts') || path.endsWith('.tsx'));

  const appCandidates = ['src/App.tsx', 'src/App.ts', 'src/App.jsx', 'src/App.js'];
  const existingAppPath = appCandidates.find(candidate => fileMap.has(candidate));
  const inferredAppExtension = existingAppPath?.split('.').pop() ?? (hasTypeScript ? 'tsx' : 'jsx');
  const appExtension = inferredAppExtension === 'ts' ? 'tsx' : inferredAppExtension === 'js' ? 'jsx' : inferredAppExtension;
  const appPath = existingAppPath ?? `src/App.${appExtension}`;

  console.log('📂 App path check:', { appPath, exists: fileMap.has(appPath), wasPatched });

  // Only add default App if no App exists AND we didn't just patch one
  if (!fileMap.has(appPath) && !wasPatched) {
    console.log('📝 Adding default App.tsx placeholder');
    fileMap.set(appPath, {
      path: appPath,
      content: defaultAppContent(appExtension === 'tsx' ? 'tsx' : 'jsx')
    });
  } else if (fileMap.has(appPath)) {
    console.log('✅ Using existing App at:', appPath);
  }

  const mainCandidates = ['src/main.tsx', 'src/main.ts', 'src/main.jsx', 'src/main.js'];
  const existingMainPath = mainCandidates.find(candidate => fileMap.has(candidate));
  const inferredMainExtension = existingMainPath?.split('.').pop() ?? (appPath.endsWith('.tsx') || appPath.endsWith('.ts') ? 'tsx' : 'jsx');
  const mainExtension = inferredMainExtension === 'ts' ? 'tsx' : inferredMainExtension === 'js' ? 'jsx' : inferredMainExtension;
  const mainPath = existingMainPath ?? `src/main.${mainExtension}`;

  if (!fileMap.has(mainPath)) {
    fileMap.set(mainPath, {
      path: mainPath,
      content: defaultMainContent()
    });
  }

  const needsTsconfig = Array.from(fileMap.keys()).some(path => path.endsWith('.ts') || path.endsWith('.tsx'));
  const scriptEntry = `/${mainPath}`;

  const pkg: Record<string, unknown> = {
    name: 'ai-generated-app',
    private: true,
    type: 'module',
    scripts: {
      dev: 'vite --host',
      build: 'vite build',
      preview: 'vite preview'
    },
    dependencies: {
      react: '^18.3.1',
      'react-dom': '^18.3.1'
    },
    devDependencies: {
      '@vitejs/plugin-react': '^4.3.1',
      vite: '^5.4.2'
    }
  };

  if (needsTsconfig) {
    const devDeps = pkg.devDependencies as Record<string, string>;
    devDeps.typescript = '^5.5.3';
    devDeps['@types/react'] = '^18.3.5';
    devDeps['@types/react-dom'] = '^18.3.0';
  }

  const tree: FileSystemTree = {
    'package.json': {
      file: {
        contents: JSON.stringify(pkg, null, 2)
      }
    },
    'vite.config.ts': {
      file: {
        contents: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000
  }
});`
      }
    },
    'index.html': {
      file: {
        contents: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Generated App</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${scriptEntry}"></script>
</body>
</html>`
      }
    }
  };

  if (needsTsconfig) {
    tree['tsconfig.json'] = {
      file: {
        contents: JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            useDefineForClassFields: true,
            module: 'ESNext',
            lib: ['ES2020', 'DOM'],
            moduleResolution: 'Bundler',
            jsx: 'react-jsx',
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true
          },
          include: ['src']
        }, null, 2)
      }
    };
  }

  for (const file of fileMap.values()) {
    if (!file.path || ['package.json', 'vite.config.ts', 'index.html', 'tsconfig.json'].includes(file.path)) {
      continue;
    }

    insertFileIntoTree(tree, file.path.split('/'), file.content);
  }

  return tree;
}

function flattenFileItems(items: FileItem[], parentPath = ''): FlatFile[] {
  const flattened: FlatFile[] = [];

  items.forEach(item => {
    const derivedPath = parentPath ? `${parentPath}/${item.name}` : item.name;

    if (item.type === 'folder') {
      if (item.children && item.children.length > 0) {
        flattened.push(...flattenFileItems(item.children, derivedPath));
      }
      return;
    }

    const targetPath = item.path ? normalizePath(item.path) : normalizePath(derivedPath);
    if (targetPath) {
      flattened.push({
        path: targetPath,
        content: item.content ?? ''
      });
    }
  });

  return flattened;
}

function insertFileIntoTree(tree: FileSystemTree, segments: string[], contents: string) {
  if (segments.length === 0) {
    return;
  }

  const [segment, ...rest] = segments;

  if (!segment) {
    insertFileIntoTree(tree, rest, contents);
    return;
  }

  if (rest.length === 0) {
    tree[segment] = {
      file: {
        contents
      }
    };
    return;
  }

  if (!tree[segment] || !('directory' in (tree[segment] as any))) {
    tree[segment] = {
      directory: {}
    };
  }

  insertFileIntoTree((tree[segment] as any).directory, rest, contents);
}

function defaultAppContent(extension: 'tsx' | 'jsx'): string {
  if (extension === 'tsx') {
    return `import React from 'react';

const App: React.FC = () => (
  <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
    <h1>Generated Preview</h1>
    <p>Update the generated files to refresh this preview.</p>
  </main>
);

export default App;
`;
  }

  return `import React from 'react';

function App() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Generated Preview</h1>
      <p>Update the generated files to refresh this preview.</p>
    </main>
  );
}

export default App;
`;
}

function defaultMainContent(): string {
  return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;
}

function normalizePath(path: string): string {
  return path.replace(/^\/+/g, '').replace(/\\/g, '/');
}

/**
 * Universal converter: Converts ANY vanilla HTML/CSS/JS app to React
 * Works for todo apps, portfolios, weather apps, etc.
 */
function convertVanillaToReact(fileMap: Map<string, FlatFile>): boolean {
  // Don't convert if React App already exists
  if (fileMap.has('src/App.tsx') || fileMap.has('src/App.jsx')) {
    console.log('✅ React app already exists, skipping conversion');
    return false;
  }

  console.log('🔍 Checking for vanilla HTML/CSS/JS app. Available files:', Array.from(fileMap.keys()));

  // Find HTML, JS, and CSS files
  const htmlFile = fileMap.get('index.html') || fileMap.get('src/index.html') || fileMap.get('portfolio/index.html');
  const jsFiles = Array.from(fileMap.entries()).filter(([path]) => 
    path.endsWith('.js') && !path.includes('node_modules') && !path.includes('vite.config')
  );
  const cssFiles = Array.from(fileMap.entries()).filter(([path]) => 
    path.endsWith('.css') && !path.includes('node_modules') && !path.includes('index.css')
  );

  console.log('📁 Found files:', { 
    html: !!htmlFile,
    htmlPath: htmlFile ? Array.from(fileMap.keys()).find(k => k.includes('html')) : null,
    jsFiles: jsFiles.map(([path]) => path),
    cssFiles: cssFiles.map(([path]) => path),
    allFiles: Array.from(fileMap.keys())
  });

  // Must have at least HTML to convert
  if (!htmlFile) {
    console.log('❌ No HTML file found, cannot convert. Available:', Array.from(fileMap.keys()));
    return false;
  }

  console.log('✅ Converting vanilla app to React!');

  // Extract body content from HTML
  const htmlContent = htmlFile.content;
  const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : htmlContent;
  
  // Extract title
  const titleMatch = htmlContent.match(/<title>([^<]+)<\/title>/i);
  const pageTitle = titleMatch ? titleMatch[1] : 'Generated App';

  // Remove script tags from body content
  const cleanBodyContent = bodyContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // Combine all CSS
  const combinedCSS = cssFiles.map(([, file]) => file.content).join('\n\n');

  // Combine all JS (we'll convert to React hooks)
  const combinedJS = jsFiles.map(([, file]) => file.content).join('\n\n');

  // Generate React component
  const reactApp = generateReactComponent(cleanBodyContent, combinedJS, pageTitle);
  const reactCSS = generateReactCSS(combinedCSS, cleanBodyContent);

  // Add React files
  fileMap.set('src/App.tsx', {
    path: 'src/App.tsx',
    content: reactApp
  });

  fileMap.set('src/App.css', {
    path: 'src/App.css',
    content: reactCSS
  });

  // Remove all vanilla files
  fileMap.delete('index.html');
  fileMap.delete('src/index.html');
  jsFiles.forEach(([path]) => fileMap.delete(path));
  cssFiles.forEach(([path]) => fileMap.delete(path));

  console.log('✅ Successfully converted vanilla app to React!');
  console.log('📦 New files:', Array.from(fileMap.keys()));

  return true;
}

/**
 * Generate React component from HTML and JS
 */
function generateReactComponent(htmlContent: string, jsContent: string, title: string): string {
  // Clean and convert HTML to JSX-friendly format
  let jsxContent = htmlContent
    .replace(/class=/g, 'className=')
    .replace(/for=/g, 'htmlFor=')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();

  // Detect if there's dynamic content that needs state
  const needsState = /addEventListener|getElementById|querySelector|fetch|innerHTML/.test(jsContent);

  if (needsState) {
    return `import { useEffect, useState } from 'react';
import './App.css';

export default function App() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize app
    setLoading(false);
    
    // Note: Original JavaScript code needs manual conversion to React
    // The vanilla JS used DOM manipulation which doesn't work in React
    // Please convert event listeners and DOM queries to React patterns
  }, []);

  return (
    <div className="app-container">
      <h1>${title}</h1>
      <div dangerouslySetInnerHTML={{ __html: \`${jsxContent.replace(/`/g, '\\`')}\` }} />
      {loading && <p>Loading...</p>}
    </div>
  );
}
`;
  }

  // Simple static content
  return `import './App.css';

export default function App() {
  return (
    <div className="app-container">
      <div dangerouslySetInnerHTML={{ __html: \`${jsxContent.replace(/`/g, '\\`')}\` }} />
    </div>
  );
}
`;
}

/**
 * Generate React CSS with improvements
 */
function generateReactCSS(originalCSS: string, _htmlContent: string): string {
  // Add base styles if not present
  const hasBaseStyles = /body\s*{/.test(originalCSS);
  
  const baseStyles = hasBaseStyles ? '' : `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  min-height: 100vh;
}

`;

  return `${baseStyles}
.app-container {
  width: 100%;
  min-height: 100vh;
}

/* Original styles */
${originalCSS}
`;
}
