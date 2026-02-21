import { WebContainer, type FileSystemTree, type WebContainerProcess } from '@webcontainer/api';
import { useEffect, useRef, useState } from 'react';
import { FileItem } from '../types';
import { Loader2, CheckCircle, AlertCircle, Play, Package, Server, FolderOpen } from 'lucide-react';

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

type BuildPhase = 'idle' | 'setup' | 'installing' | 'starting' | 'ready' | 'error';

// Strip ANSI escape codes and control characters from terminal output
function stripAnsi(text: string): string {
  return text
    // Remove all ANSI escape sequences
    .replace(/\x1B\[[0-9;]*[A-Za-z]/g, '')
    .replace(/\x1B\][^\x07]*\x07/g, '')
    .replace(/\x1B[()][AB012]/g, '')
    .replace(/\x1B[>=<]/g, '')
    // Remove carriage return based sequences
    .replace(/\r/g, '')
    // Remove common npm spinner chars
    .replace(/^[\\|/\-]\s*$/g, '')
    .trim();
}

function isNoisyLine(line: string): boolean {
  const stripped = stripAnsi(line);
  if (!stripped || stripped.length === 0) return true;
  // Filter out single-char spinner frames, ANSI artifacts
  if (/^[\\|/\-⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏\[\]()]+$/.test(stripped)) return true;
  if (/^\[\d*[A-Za-z]?$/.test(stripped)) return true; // [1G, [0K etc
  if (stripped.length <= 2) return true;
  return false;
}

export function PreviewFrame({ files, webContainer }: PreviewFrameProps) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [buildPhase, setBuildPhase] = useState<BuildPhase>('idle');
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
      setBuildPhase('setup');
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

      setBuildPhase('installing');
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
        setBuildPhase('error');
        return;
      }

      addLog('Dependencies installed successfully', 'success');
      setBuildPhase('starting');
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
          setBuildPhase('error');
        }
      }).catch((error: unknown) => {
        devProcessRef.current = null;

        if (runIdRef.current === runId) {
          addLog(`Dev server exit error: ${error}`, 'error');
          setStatus('Dev server error');
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

  const buildSteps = [
    { phase: 'setup' as BuildPhase, label: 'Setting up workspace', icon: FolderOpen },
    { phase: 'installing' as BuildPhase, label: 'Installing dependencies', icon: Package },
    { phase: 'starting' as BuildPhase, label: 'Starting dev server', icon: Server },
    { phase: 'ready' as BuildPhase, label: 'Preview ready', icon: CheckCircle },
  ];

  const getPhaseIndex = (phase: BuildPhase) => {
    switch (phase) {
      case 'setup': return 0;
      case 'installing': return 1;
      case 'starting': return 2;
      case 'ready': return 3;
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
                <p className="text-xs text-gray-500 font-mono">{progress}%</p>
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

  // Auto-fix missing imports and broken CSS references across all files
  fixMissingImports(fileMap);
  fixBrokenCssImports(fileMap);

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
 * Auto-inject missing import statements.
 * Scans every .tsx/.jsx file for PascalCase JSX tags that correspond to other
 * generated files and adds import lines when they are absent.
 */
function fixMissingImports(fileMap: Map<string, FlatFile>) {
  // Build a lookup: component name -> relative import path
  const componentFiles = new Map<string, string>();
  for (const path of fileMap.keys()) {
    if (/\.(tsx|jsx)$/.test(path) && !path.endsWith('main.tsx') && !path.endsWith('main.jsx')) {
      const basename = path.split('/').pop()!;
      const name = basename.replace(/\.(tsx|jsx)$/, '');
      componentFiles.set(name, path);
    }
  }

  for (const [filePath, file] of fileMap) {
    if (!/\.(tsx|jsx)$/.test(filePath)) continue;

    const currentName = filePath.split('/').pop()!.replace(/\.(tsx|jsx)$/, '');
    const existingImports = new Set<string>();

    // Collect already-imported identifiers
    const importRegex = /import\s+(?:\{[^}]*\}|(\w+))\s+from\s+['"][^'"]+['"]/g;
    let m;
    while ((m = importRegex.exec(file.content)) !== null) {
      if (m[1]) existingImports.add(m[1]);
      // named imports
      const namedMatch = m[0].match(/\{([^}]+)\}/);
      if (namedMatch) {
        namedMatch[1].split(',').forEach(n => existingImports.add(n.trim().split(/\s+as\s+/).pop()!));
      }
    }

    // Find PascalCase JSX tags used in the file
    const jsxTagRegex = /<([A-Z][A-Za-z0-9]+)[\s/>]/g;
    const missingImports: string[] = [];

    while ((m = jsxTagRegex.exec(file.content)) !== null) {
      const tagName = m[1];
      if (existingImports.has(tagName)) continue;
      if (tagName === currentName) continue;
      if (!componentFiles.has(tagName)) continue;

      existingImports.add(tagName); // prevent duplicates
      const targetPath = componentFiles.get(tagName)!;
      const relPath = getRelativeImportPath(filePath, targetPath);
      missingImports.push(`import ${tagName} from '${relPath}';`);
    }

    if (missingImports.length > 0) {
      console.log(`🔧 Auto-adding imports to ${filePath}:`, missingImports);
      // Insert after existing imports, or at top of file
      const lastImportIdx = file.content.lastIndexOf('import ');
      if (lastImportIdx >= 0) {
        const lineEnd = file.content.indexOf('\n', lastImportIdx);
        const insertPos = lineEnd >= 0 ? lineEnd + 1 : file.content.length;
        file.content = file.content.slice(0, insertPos) + missingImports.join('\n') + '\n' + file.content.slice(insertPos);
      } else {
        file.content = missingImports.join('\n') + '\n\n' + file.content;
      }
    }
  }
}

/**
 * Compute a relative import path from `from` to `to`.
 */
function getRelativeImportPath(from: string, to: string): string {
  const fromParts = from.split('/');
  fromParts.pop(); // remove filename
  const toParts = to.split('/');
  const toFile = toParts.pop()!;
  const toName = toFile.replace(/\.(tsx|jsx|ts|js)$/, '');

  // Find common prefix
  let common = 0;
  while (common < fromParts.length && common < toParts.length && fromParts[common] === toParts[common]) {
    common++;
  }

  const ups = fromParts.length - common;
  const prefix = ups > 0 ? '../'.repeat(ups) : './';
  const remaining = toParts.slice(common);
  return prefix + [...remaining, toName].join('/');
}

/**
 * Remove CSS import lines that reference non-existent CSS files.
 */
function fixBrokenCssImports(fileMap: Map<string, FlatFile>) {
  for (const [filePath, file] of fileMap) {
    if (!/\.(tsx|jsx|ts|js)$/.test(filePath)) continue;

    const lines = file.content.split('\n');
    let changed = false;

    const fixedLines = lines.filter(line => {
      const cssImportMatch = line.match(/import\s+['"](.+\.css)['"]/);
      if (!cssImportMatch) return true;

      const cssPath = cssImportMatch[1];
      // Resolve relative to current file
      const fileParts = filePath.split('/');
      fileParts.pop();
      const resolvedParts = [...fileParts];

      for (const seg of cssPath.split('/')) {
        if (seg === '..') resolvedParts.pop();
        else if (seg !== '.') resolvedParts.push(seg);
      }

      const resolvedPath = resolvedParts.join('/');
      if (!fileMap.has(resolvedPath)) {
        console.log(`🧹 Removing broken CSS import in ${filePath}: ${cssPath}`);
        changed = true;
        return false;
      }
      return true;
    });

    if (changed) {
      file.content = fixedLines.join('\n');
    }
  }
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
