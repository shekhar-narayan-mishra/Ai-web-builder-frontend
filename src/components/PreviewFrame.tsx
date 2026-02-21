import { useEffect, useRef, useState } from 'react';
import { transform } from 'sucrase';
import { FileItem } from '../types';
import { AlertCircle } from 'lucide-react';

interface PreviewFrameProps {
  files: FileItem[];
}

export function PreviewFrame({ files }: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Cleanup previous blob URL
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    if (files.length === 0) {
      setStatus('idle');
      return;
    }

    try {
      const html = buildPreview(files);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;

      if (iframeRef.current) {
        iframeRef.current.src = url;
      }

      setStatus('ready');
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Preview build failed';
      setError(msg);
      setStatus('error');
      console.error('Preview build error:', e);
    }
  }, [files]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Generate a project to see preview</div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center px-8 max-w-md">
          <AlertCircle className="w-10 h-10 text-red-400/70 mx-auto mb-3" />
          <p className="text-red-400/80 text-sm mb-2 font-medium">Preview Error</p>
          <p className="text-gray-500 text-xs leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Status Bar */}
      <div className="p-2 px-3 bg-[#111113] border-b border-gray-800/60">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
          <span className="text-xs text-emerald-400 font-medium">Live Preview</span>
        </div>
      </div>

      {/* Preview iframe */}
      <iframe
        ref={iframeRef}
        className="flex-1 w-full border-0 bg-white"
        title="Preview"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}

// ─── Preview Builder ─────────────────────────────────────────────────────────

function buildPreview(files: FileItem[]): string {
  const flatFiles = flattenFiles(files);

  // Separate CSS and code files
  const cssFiles = flatFiles.filter(f => f.path.endsWith('.css'));
  const codeFiles = flatFiles.filter(f => /\.(tsx?|jsx?)$/.test(f.path));

  // Combine all CSS
  const allCSS = cssFiles.map(f => f.content).join('\n\n');

  // Find App file (render entry point) and skip main.tsx (we handle rendering)
  const appFile = codeFiles.find(f => /\/App\.(tsx|jsx|ts|js)$/.test(f.path) || f.path === 'App.tsx' || f.path === 'App.jsx');
  const mainFile = codeFiles.find(f => /main\.(tsx|jsx|ts|js)$/.test(f.path));
  const componentFiles = codeFiles.filter(f => f !== appFile && f !== mainFile);

  // Order: components first, then App
  const orderedFiles = [...componentFiles, appFile].filter(Boolean) as typeof codeFiles;

  // Transform each file
  const transformedChunks = orderedFiles.map(file => {
    let code = file.content;

    // Remove all import statements
    code = code.replace(/^import\s+.*$/gm, '');

    // Remove export default but keep the declaration
    code = code.replace(/export\s+default\s+function\s+/g, 'function ');
    code = code.replace(/export\s+default\s+class\s+/g, 'class ');
    code = code.replace(/export\s+default\s+/g, '');
    // Remove named exports
    code = code.replace(/^export\s+(?=(?:const|let|var|function|class|enum|interface|type)\s)/gm, '');

    try {
      return transform(code, {
        transforms: ['jsx', 'typescript'],
        jsxRuntime: 'classic',
        production: true,
      }).code;
    } catch (e) {
      console.error(`Transform error for ${file.path}:`, e);
      return `/* Error transforming ${file.path}: ${e} */`;
    }
  });

  // Detect the App component name
  let appComponentName = 'App';
  if (appFile) {
    const fnMatch = appFile.content.match(/(?:export\s+default\s+)?function\s+([A-Z]\w*)/);
    if (fnMatch) {
      appComponentName = fnMatch[1];
    } else {
      const constMatch = appFile.content.match(/(?:export\s+default\s+)?(?:const|var|let)\s+([A-Z]\w*)/);
      if (constMatch) appComponentName = constMatch[1];
    }
  }

  // Escape </script> inside code to prevent breaking HTML
  const safeCode = transformedChunks.join('\n\n').replace(/<\/script/gi, '<\\/script');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Preview</title>
  <style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; }
${allCSS}
  </style>
</head>
<body>
  <div id="root"></div>
  <script crossorigin src="https://unpkg.com/react@18.3.1/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
  <script>
  (function() {
    try {
      var _R = React;
      var useState = _R.useState;
      var useEffect = _R.useEffect;
      var useRef = _R.useRef;
      var useCallback = _R.useCallback;
      var useMemo = _R.useMemo;
      var useContext = _R.useContext;
      var useReducer = _R.useReducer;
      var useLayoutEffect = _R.useLayoutEffect;
      var createContext = _R.createContext;
      var Fragment = _R.Fragment;
      var createElement = _R.createElement;
      var forwardRef = _R.forwardRef;
      var memo = _R.memo;
      var lazy = _R.lazy;
      var Suspense = _R.Suspense;
      var Children = _R.Children;
      var cloneElement = _R.cloneElement;
      var isValidElement = _R.isValidElement;

      ${safeCode}

      var _AppComponent = typeof ${appComponentName} !== 'undefined'
        ? ${appComponentName}
        : function() { return React.createElement('div', {style:{padding:'2rem',fontFamily:'system-ui'}}, 'App component not found'); };

      ReactDOM.createRoot(document.getElementById('root')).render(
        React.createElement(_AppComponent)
      );
    } catch(e) {
      document.getElementById('root').innerHTML =
        '<div style="padding:24px;font-family:monospace">' +
        '<h3 style="color:#ef4444;margin-bottom:8px">Preview Error</h3>' +
        '<pre style="color:#f87171;white-space:pre-wrap;font-size:13px">' + e.message + '</pre>' +
        '<pre style="color:#9ca3af;white-space:pre-wrap;font-size:11px;margin-top:8px">' + (e.stack || '') + '</pre>' +
        '</div>';
      console.error('Preview runtime error:', e);
    }
  })();
  </script>
</body>
</html>`;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

interface FlatFile {
  path: string;
  content: string;
}

function flattenFiles(items: FileItem[], parentPath = ''): FlatFile[] {
  const result: FlatFile[] = [];

  for (const item of items) {
    const path = parentPath ? `${parentPath}/${item.name}` : item.name;

    if (item.type === 'folder' && item.children) {
      result.push(...flattenFiles(item.children, path));
    } else if (item.type === 'file') {
      result.push({
        path: item.path || path,
        content: item.content || '',
      });
    }
  }

  return result;
}
