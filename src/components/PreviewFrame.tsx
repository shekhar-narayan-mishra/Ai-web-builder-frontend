import { WebContainer, type FileSystemTree, type WebContainerProcess } from '@webcontainer/api';
import { useEffect, useRef, useState } from 'react';
import { FileItem } from '../types';
import { Loader2, CheckCircle, AlertCircle, Play, Server, FolderOpen } from 'lucide-react';

// ── Module-level flag: skip re-mount of server.js on rebuilds ──


interface PreviewFrameProps {
  files: FileItem[];
  webContainer: WebContainer | null;
  bootError?: string | null;
  onRetry?: () => void;
}

interface LogEntry {
  id: number;
  text: string;
  type: 'info' | 'success' | 'error' | 'warning';
  timestamp: Date;
}

type BuildPhase = 'idle' | 'setup' | 'installing' | 'starting' | 'ready' | 'error';

// Strip ANSI escape codes and control characters from terminal output
function stripAnsi(text: string): string {
  return text
    .replace(/\x1B\[[0-9;]*[A-Za-z]/g, '')
    .replace(/\x1B\][^\x07]*\x07/g, '')
    .replace(/\x1B[()][AB012]/g, '')
    .replace(/\x1B[>=<]/g, '')
    .replace(/\r/g, '')
    .replace(/^[\\|/\-]\s*$/g, '')
    .trim();
}

function isNoisyLine(line: string): boolean {
  const stripped = stripAnsi(line);
  if (!stripped || stripped.length === 0) return true;
  if (/^[\\|/\-⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏\[\]()]+$/.test(stripped)) return true;
  if (/^\[\d*[A-Za-z]?$/.test(stripped)) return true;
  if (stripped.length <= 2) return true;
  return false;
}

export function PreviewFrame({ files, webContainer, bootError, onRetry }: PreviewFrameProps) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [buildPhase, setBuildPhase] = useState<BuildPhase>('idle');
  const runIdRef = useRef(0);
  const logIdRef = useRef(0);
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
      return;
    }

    setupProject();
  }, [webContainer, files]);

  useEffect(() => {
    return () => {
      serverReadyDisposeRef.current?.();
      serverReadyDisposeRef.current = null;
      void devProcessRef.current?.kill();
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

      // Kill previous dev server
      if (devProcessRef.current) {
        try { await devProcessRef.current.kill(); } catch { }
        devProcessRef.current = null;
      }

      const runId = Date.now();
      runIdRef.current = runId;

      setIsLoading(true);
      setUrl('');
      setLogs([]);
      logIdRef.current = 0;
      setProgress(0);
      setBuildPhase('setup');
      setStatus('Preparing preview...');
      addLog('Setting up preview workspace', 'info');
      setProgress(15);

      const fileTree = createFileTree(files);
      addLog('Created file structure', 'success');
      setProgress(30);

      // Mount all files (no npm install needed!)
      await webContainer.mount(fileTree);
      addLog('Mounted files to WebContainer', 'success');
      if (runIdRef.current !== runId) return;

      setProgress(60);

      // Skip straight to starting server — no install step!
      setBuildPhase('starting');
      setStatus('Starting preview server...');
      setProgress(80);
      addLog('Starting preview server...', 'info');

      // Start the lightweight Node.js HTTP server (no npm deps)
      const devProcess = await webContainer.spawn('node', ['server.cjs']);
      devProcessRef.current = devProcess;
      void streamProcessOutput(devProcess, runId, line => addLog(line, 'info'));

      void devProcess.exit.then((code: number) => {
        devProcessRef.current = null;
        if (runIdRef.current !== runId) return;
        if (code !== 0) {
          addLog(`Server exited with code ${code}`, 'error');
          setStatus('Server exited unexpectedly');
          setIsLoading(false);
          setBuildPhase('error');
        }
      }).catch((error: unknown) => {
        devProcessRef.current = null;
        if (runIdRef.current === runId) {
          addLog(`Server error: ${error}`, 'error');
          setStatus('Server error');
          setIsLoading(false);
          setBuildPhase('error');
        }
      });

      attachServerReadyListener(runId);
    } catch (error) {
      console.error('❌ Preview setup error:', error);
      addLog(`Setup failed: ${error}`, 'error');
      setStatus(`Error: ${error}`);
      setIsLoading(false);
      setBuildPhase('error');
    }
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
      addLog('Preview is ready!', 'success');
      setUrl(previewUrl);
      setStatus('Ready!');
      setProgress(100);
      setBuildPhase('ready');
      setIsLoading(false);
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
          text.split('\n')
            .map(line => stripAnsi(line))
            .filter(line => !isNoisyLine(line))
            .forEach(onLine);
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
        <div className="text-center px-8 max-w-md">
          {bootError ? (
            <>
              <AlertCircle className="w-10 h-10 text-red-400/70 mx-auto mb-3" />
              <p className="text-red-400/80 text-sm mb-2 font-medium">WebContainer Failed to Start</p>
              <p className="text-gray-500 text-xs mb-4 leading-relaxed">{bootError}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition-colors"
                >
                  Retry
                </button>
              )}
            </>
          ) : (
            <>
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Initializing WebContainer...</p>
              <p className="text-gray-600 text-xs mt-1">This may take a few seconds</p>
            </>
          )}
        </div>
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

  const buildSteps = [
    { phase: 'setup' as BuildPhase, label: 'Setting up workspace', icon: FolderOpen },
    { phase: 'starting' as BuildPhase, label: 'Starting server', icon: Server },
    { phase: 'ready' as BuildPhase, label: 'Preview ready', icon: CheckCircle },
  ];

  const getPhaseIndex = (phase: BuildPhase) => {
    switch (phase) {
      case 'setup': return 0;
      case 'installing': return 0; // skip — map to setup
      case 'starting': return 1;
      case 'ready': return 2;
      default: return -1;
    }
  };

  const currentPhaseIndex = getPhaseIndex(buildPhase);

  return (
    <div className="h-full flex flex-col">
      {/* Status Bar */}
      <div className="p-3 bg-[#111113] border-b border-gray-800/60">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <span className="text-sm text-gray-400 font-medium">
            {status || 'Waiting for files...'}
          </span>
          {url && (
            <div className="ml-auto">
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                Live Preview
              </div>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="mt-2 w-full bg-gray-800 rounded-full h-1 overflow-hidden">
            <div
              className="h-1 rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa)'
              }}
            ></div>
          </div>
        )}
      </div>

      {/* Preview Content */}
      <div className="flex-1">
        {url ? (
          <iframe
            src={url}
            className="w-full h-full border-0"
            title="Preview"
          />
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full bg-[#0c0c0e]">
            <div className="w-full max-w-md px-8">
              {/* Build Steps */}
              <div className="space-y-3 mb-8">
                {buildSteps.map((step, index) => {
                  const isActive = index === currentPhaseIndex;
                  const isComplete = index < currentPhaseIndex;
                  const Icon = step.icon;

                  return (
                    <div
                      key={step.phase}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-500 ${isActive
                        ? 'bg-purple-500/8 border-purple-500/20 shadow-sm shadow-purple-500/5'
                        : isComplete
                          ? 'bg-emerald-500/5 border-emerald-500/15'
                          : 'bg-gray-900/30 border-gray-800/30'
                        }`}
                    >
                      {/* Icon */}
                      <div className={`flex-shrink-0 ${isActive ? 'text-purple-400' : isComplete ? 'text-emerald-400' : 'text-gray-700'
                        }`}>
                        {isComplete ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : isActive ? (
                          <div className="relative">
                            <Icon className="w-5 h-5" />
                            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-purple-400 rounded-full build-dot-pulse"></div>
                          </div>
                        ) : (
                          <Icon className="w-5 h-5" />
                        )}
                      </div>

                      {/* Label */}
                      <span className={`text-sm font-medium transition-colors duration-300 ${isActive ? 'text-purple-300' : isComplete ? 'text-emerald-300/80' : 'text-gray-600'
                        }`}>
                        {step.label}
                      </span>

                      {/* Status indicator */}
                      <div className="ml-auto">
                        {isActive && (
                          <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                        )}
                        {isComplete && (
                          <span className="text-[10px] text-emerald-500/60 font-mono">done</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Progress */}
              <div className="text-center">
                <div className="w-full bg-gray-800/50 rounded-full h-1.5 mb-3 overflow-hidden">
                  <div
                    className="h-1.5 rounded-full transition-all duration-700 ease-out build-progress-bar"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-500 font-mono">{progress}%</p>
                </div>
              </div>
            </div>
          </div>
        ) : logs.some(log => log.type === 'error') ? (
          <div className="flex items-center justify-center h-full bg-[#0c0c0e]">
            <div className="text-center px-8">
              <AlertCircle className="w-10 h-10 text-red-400/70 mx-auto mb-3" />
              <p className="text-red-400/80 text-sm">{status}</p>
              <div className="mt-4 max-w-lg mx-auto bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                {logs.filter(l => l.type === 'error').slice(-3).map(log => (
                  <p key={log.id} className="text-xs text-red-300/60 font-mono">{log.text}</p>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-600 text-sm">{status || 'Generate a project to see preview'}</div>
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

/**
 * Create a file tree that uses ESM CDN imports — NO npm install needed!
 * React/ReactDOM are loaded from esm.sh CDN via importmap.
 * JSX is transpiled using Babel standalone in the browser.
 * A tiny Node.js HTTP server (zero npm deps) serves the files.
 */
function createFileTree(files: FileItem[]): FileSystemTree {
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

  // Collect all CSS content
  const cssFiles: string[] = [];
  for (const [path, file] of fileMap) {
    if (path.endsWith('.css')) {
      cssFiles.push(file.content);
    }
  }
  const allCSS = cssFiles.join('\n\n');

  // Collect all component files (tsx/jsx/ts/js)
  const componentFiles: { path: string; content: string }[] = [];
  for (const [path, file] of fileMap) {
    if (/\.(tsx|jsx|ts|js)$/.test(path) && !path.includes('node_modules')) {
      componentFiles.push({ path, content: file.content });
    }
  }

  // Find the main App component content
  let appContent = '';
  const appCandidates = ['src/App.tsx', 'src/App.jsx', 'src/App.ts', 'src/App.js', 'App.tsx', 'App.jsx'];
  for (const candidate of appCandidates) {
    if (fileMap.has(candidate)) {
      appContent = fileMap.get(candidate)!.content;
      break;
    }
  }

  // If no App found, check for index.html (vanilla site)
  const htmlFile = fileMap.get('index.html') || fileMap.get('src/index.html');
  if (!appContent && htmlFile) {
    // Vanilla HTML/CSS/JS — serve as-is
    return createVanillaFileTree(fileMap);
  }

  // If no App and no HTML, create a simple one
  if (!appContent) {
    appContent = `
function App() {
  return React.createElement('div', { style: { padding: '2rem', fontFamily: 'system-ui, sans-serif' } },
    React.createElement('h1', null, 'Generated Preview'),
    React.createElement('p', null, 'Update the generated files to refresh this preview.')
  );
}
`;
  }

  // Clean the App content: remove import/export statements (CDN handles React)
  const cleanedApp = cleanComponentForCDN(appContent);

  // Gather other components
  const otherComponents: string[] = [];
  for (const comp of componentFiles) {
    const isApp = appCandidates.some(c => comp.path === c);
    if (!isApp && !comp.path.includes('main.')) {
      otherComponents.push(cleanComponentForCDN(comp.content));
    }
  }

  const allComponentCode = [...otherComponents, cleanedApp].join('\n\n');

  // Build the HTML file with CDN-loaded React
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Generated App</title>
  <style>
${allCSS}
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script>
    window.onerror = function(msg, url, line, col, error) {
      console.error('❌ [Preview Runtime Error]:', msg, 'at', line + ':' + col);
    };
  </script>
  <script type="text/babel" data-type="module">
    console.log('⚡ [Preview] Babel starting transpilation...');
    try {
${allComponentCode}

      // Render
      const rootEl = document.getElementById('root');
      if (rootEl) {
        const root = ReactDOM.createRoot(rootEl);
        root.render(React.createElement(App));
        console.log('✅ [Preview] App rendered successfully');
      } else {
        console.error('❌ [Preview] Root element #root not found');
      }
    } catch (err) {
      console.error('❌ [Preview Babel/Render Error]:', err);
      document.body.innerHTML = '<div style="padding: 20px; color: red; font-family: sans-serif;"><h3>Render Error</h3><pre>' + err.message + '</pre></div>';
    }
  </script>
</body>
</html>`;

  // Tiny Node.js HTTP server — zero npm dependencies!
  const serverJs = `
const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  let filePath = '.' + (req.url === '/' ? '/index.html' : req.url);
  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      // Fallback to index.html for SPA routing
      fs.readFile('./index.html', (err2, fallback) => {
        if (err2) {
          res.writeHead(404);
          res.end('Not found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(fallback);
        }
      });
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.on('error', (e) => {
  console.error('❌ [Server Error]:', e.message || e);
  if (e.code === 'EADDRINUSE') {
    console.error('Port 3000 is already in use.');
  }
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('❌ [Uncaught Exception]:', err.message || err);
  process.exit(1);
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
`;

  const tree: FileSystemTree = {
    'index.html': {
      file: { contents: indexHtml }
    },
    'server.cjs': {
      file: { contents: serverJs }
    }
  };

  // Also mount any static assets (images, fonts, etc.)
  for (const [filePath, file] of fileMap) {
    if (filePath.endsWith('.css') || /\.(tsx|jsx|ts|js)$/.test(filePath)) continue;
    if (filePath === 'index.html' || filePath === 'package.json') continue;
    if (filePath.includes('node_modules')) continue;
    insertFileIntoTree(tree, filePath.split('/'), file.content);
  }

  return tree;
}

/**
 * For vanilla HTML/CSS/JS projects — serve as-is with the tiny HTTP server
 */
function createVanillaFileTree(fileMap: Map<string, FlatFile>): FileSystemTree {
  const serverJs = `
const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  let filePath = '.' + (req.url === '/' ? '/index.html' : req.url);
  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      fs.readFile('./index.html', (err2, fallback) => {
        if (err2) {
          res.writeHead(404);
          res.end('Not found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(fallback);
        }
      });
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
`;

  const tree: FileSystemTree = {
    'server.cjs': {
      file: { contents: serverJs }
    }
  };

  // Mount all user files as-is
  for (const [filePath, file] of fileMap) {
    if (filePath === 'package.json') continue;
    if (filePath.includes('node_modules')) continue;
    insertFileIntoTree(tree, filePath.split('/'), file.content);
  }

  return tree;
}

/**
 * Clean a React component for CDN usage:
 * - Remove import statements (React is loaded via CDN script tag)
 * - Remove export statements
 * - Convert `export default function X` to `function X`
 * - Strip TypeScript type annotations (basic)
 */
function cleanComponentForCDN(code: string): string {
  return code
    // Remove import lines
    .replace(/^import\s+.*$/gm, '')
    // Convert `export default function X` → `function X`
    .replace(/export\s+default\s+function\s+/g, 'function ')
    // Convert `export default` (for arrow/const) → remove export default
    .replace(/export\s+default\s+/g, '')
    // Remove named exports
    .replace(/export\s+(?:const|let|var|function|class)\s+/g, (match) => {
      return match.replace('export ', '');
    })
    .replace(/^export\s+\{[^}]*\};?\s*$/gm, '')
    // Strip basic TypeScript type annotations
    .replace(/:\s*React\.FC\b/g, '')
    .replace(/:\s*React\.ReactNode\b/g, '')
    .replace(/<[A-Za-z]+\[\]>/g, '') // Array<Type>
    .replace(/:\s*string\b/g, '')
    .replace(/:\s*number\b/g, '')
    .replace(/:\s*boolean\b/g, '')
    .replace(/:\s*any\b/g, '')
    .replace(/interface\s+\w+\s*\{[^}]*\}/g, '') // Remove interface declarations
    .replace(/type\s+\w+\s*=\s*[^;]+;/g, '') // Remove type aliases
    .trim();
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

function normalizePath(path: string): string {
  return path.replace(/^\/+/g, '').replace(/\\/g, '/');
}
