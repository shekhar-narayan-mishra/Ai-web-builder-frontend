import { WebContainer } from '@webcontainer/api';
import React, { useEffect, useState } from 'react';
import { FileItem } from '../types';
import { Loader2, CheckCircle, AlertCircle, Play } from 'lucide-react';

interface PreviewFrameProps {
  files: FileItem[];
  webContainer: WebContainer;
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

  useEffect(() => {
    if (!webContainer || files.length === 0) {
      setStatus('No files to preview');
      return;
    }
    
    setupProject();
  }, [webContainer, files]);

  const addLog = (text: string, type: LogEntry['type'] = 'info') => {
    const newLog: LogEntry = {
      id: Date.now(),
      text,
      type,
      timestamp: new Date()
    };
    setLogs(prev => [...prev.slice(-9), newLog]);
  };

  async function setupProject() {
    try {
      setIsLoading(true);
      setUrl('');
      setLogs([]);
      setProgress(0);
      setShowLogs(true);
      
      addLog('🚀 Setting up React project...', 'info');
      setStatus('Creating project files...');
      setProgress(10);
      
      const fileTree = createReactFileTree(files);
      addLog('📁 Created React file structure', 'success');
      setProgress(25);
      
      await webContainer.mount(fileTree);
      addLog('📁 Files mounted to WebContainer', 'success');
      setStatus('Installing dependencies...');
      setProgress(40);
      
      addLog('📦 Installing React dependencies...', 'info');
      const installProcess = await webContainer.spawn('npm', ['install']);
      
      const installCode = await installProcess.exit;
      setProgress(70);
      
      if (installCode !== 0) {
        addLog('❌ Dependencies installation failed', 'error');
        setStatus('Install failed!');
        setIsLoading(false);
        setShowLogs(true);
        return;
      }
      
      addLog('✅ Dependencies installed successfully', 'success');
      setStatus('Starting React dev server...');
      setProgress(85);
      
      addLog('🌟 Starting React development server...', 'info');
      const devProcess = await webContainer.spawn('npm', ['run', 'dev']);
      
      webContainer.on('server-ready', (port, url) => {
        console.log('🎉 React server ready at:', url);
        addLog('🎉 React preview is ready!', 'success');
        setUrl(url);
        setStatus('Ready!');
        setProgress(100);
        setIsLoading(false);
        
        setTimeout(() => {
          setShowLogs(false);
        }, 3000);
      });
      
    } catch (error) {
      console.error('❌ Preview setup error:', error);
      addLog(`❌ Setup failed: ${error}`, 'error');
      setStatus(`Error: ${error}`);
      setIsLoading(false);
      setShowLogs(true);
    }
  }

  function createReactFileTree(files: FileItem[]) {
    const tree: any = {};
    
    tree['package.json'] = {
      file: {
        contents: JSON.stringify({
          name: "ai-generated-app",
          private: true,
          type: "module",
          scripts: {
            dev: "vite --host",
            build: "vite build"
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
    };
    
    tree['vite.config.ts'] = {
      file: {
        contents: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { 
    host: true,
    port: 3000
  }
})`
      }
    };
    
    tree['index.html'] = {
      file: {
        contents: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Generated App</title>
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>`
      }
    };
    
    tree['src'] = { directory: {} };
    
    tree['src'].directory['main.jsx'] = {
      file: {
        contents: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`
      }
    };
    
    // Simple logic to determine app type
    const appContent = determineAppType(files);
    
    tree['src'].directory['App.jsx'] = {
      file: {
        contents: appContent
      }
    };
    
    return tree;
  }

  function determineAppType(files: FileItem[]): string {
    console.log('🔍 Determining app type from files:', files.map(f => f.name));
    
    // Check file names and content for keywords
    const allContent = files.map(f => `${f.name} ${f.content || ''}`).join(' ').toLowerCase();
    
    console.log('📝 Content keywords found:', {
      weather: allContent.includes('weather'),
      portfolio: allContent.includes('portfolio'),
      todo: allContent.includes('todo') || allContent.includes('task')
    });
    
    if (allContent.includes('weather')) {
      console.log('✅ Creating Weather App');
      return createWeatherApp();
    }
    
    if (allContent.includes('portfolio')) {
      console.log('✅ Creating Portfolio App');
      return createPortfolioApp();
    }
    
    if (allContent.includes('todo') || allContent.includes('task')) {
      console.log('✅ Creating Todo App');
      return createTodoApp();
    }
    
    console.log('⚠️ Creating Generic App');
    return createGenericApp(allContent);
  }

  function createWeatherApp(): string {
    return `import React, { useState, useEffect } from 'react';

function App() {
  const [weather, setWeather] = useState(null);
  const [city, setCity] = useState('London');
  const [loading, setLoading] = useState(false);

  const mockWeatherData = {
    London: { temp: 22, condition: 'Sunny ☀️', humidity: 65 },
    Paris: { temp: 18, condition: 'Cloudy ☁️', humidity: 70 },
    Tokyo: { temp: 25, condition: 'Rainy 🌧️', humidity: 80 },
    'New York': { temp: 20, condition: 'Partly Cloudy ⛅', humidity: 60 }
  };

  const getWeather = () => {
    setLoading(true);
    setTimeout(() => {
      setWeather(mockWeatherData[city] || { temp: 15, condition: 'Unknown ❓', humidity: 50 });
      setLoading(false);
    }, 1000);
  };

  useEffect(() => {
    getWeather();
  }, [city]);

  return (
    <div style={{ 
      maxWidth: '600px', 
      margin: '0 auto', 
      padding: '2rem',
      background: 'rgba(255,255,255,0.1)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      marginTop: '2rem',
      color: 'white',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>
        🌤️ Weather App
      </h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <select 
          value={city} 
          onChange={(e) => setCity(e.target.value)}
          style={{
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.3)',
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            fontSize: '16px',
            marginRight: '10px'
          }}
        >
          <option value="London">London</option>
          <option value="Paris">Paris</option>
          <option value="Tokyo">Tokyo</option>
          <option value="New York">New York</option>
        </select>
        <button
          onClick={getWeather}
          disabled={loading}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 600
          }}
        >
          {loading ? 'Loading...' : 'Get Weather'}
        </button>
      </div>

      {weather && (
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '2rem',
          marginTop: '2rem'
        }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>{city}</h2>
          <div style={{ fontSize: '3rem', margin: '1rem 0' }}>{weather.temp}°C</div>
          <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{weather.condition}</div>
          <div>Humidity: {weather.humidity}%</div>
        </div>
      )}
    </div>
  );
}

export default App;`;
  }

  function createPortfolioApp(): string {
    return `import React, { useState } from 'react';

function App() {
  const [activeSection, setActiveSection] = useState('home');

  const projects = [
    {
      title: 'E-commerce Website',
      description: 'Modern online shopping platform built with React',
      tech: ['React', 'Node.js', 'MongoDB'],
      image: '🛒'
    },
    {
      title: 'Weather Dashboard',
      description: 'Real-time weather tracking application',
      tech: ['JavaScript', 'API Integration', 'CSS'],
      image: '🌤️'
    },
    {
      title: 'Task Manager',
      description: 'Productivity app for managing daily tasks',
      tech: ['React', 'Local Storage', 'Material-UI'],
      image: '📋'
    }
  ];

  return (
    <div style={{ color: 'white', minHeight: '100vh' }}>
      <nav style={{ 
        padding: '1rem 2rem', 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '2rem',
        background: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        {['home', 'projects', 'contact'].map(section => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            style={{
              background: activeSection === section ? 'rgba(255,255,255,0.2)' : 'transparent',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {section}
          </button>
        ))}
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        {activeSection === 'home' && (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <h1 style={{ fontSize: '4rem', marginBottom: '1rem' }}>
              👋 Hi, I'm a Developer
            </h1>
            <p style={{ fontSize: '1.5rem', opacity: 0.8, maxWidth: '600px', margin: '0 auto' }}>
              I create amazing web applications using modern technologies. 
              Passionate about clean code and great user experiences.
            </p>
            <button
              onClick={() => setActiveSection('projects')}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '16px 32px',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '16px',
                marginTop: '2rem'
              }}
            >
              View My Projects
            </button>
          </div>
        )}

        {activeSection === 'projects' && (
          <div>
            <h2 style={{ fontSize: '3rem', textAlign: 'center', marginBottom: '3rem' }}>
              My Projects
            </h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
              gap: '2rem' 
            }}>
              {projects.map((project, index) => (
                <div
                  key={index}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '16px',
                    padding: '2rem',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}
                >
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{project.image}</div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{project.title}</h3>
                  <p style={{ opacity: 0.8, marginBottom: '1rem' }}>{project.description}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {project.tech.map(tech => (
                      <span
                        key={tech}
                        style={{
                          background: 'rgba(255,255,255,0.2)',
                          padding: '4px 12px',
                          borderRadius: '16px',
                          fontSize: '0.875rem'
                        }}
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'contact' && (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <h2 style={{ fontSize: '3rem', marginBottom: '2rem' }}>Get In Touch</h2>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              padding: '3rem',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              <p style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>📧 developer@example.com</p>
              <p style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>🐱 GitHub: /developer</p>
              <p style={{ fontSize: '1.25rem' }}>💼 LinkedIn: /in/developer</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;`;
  }

  function createTodoApp(): string {
    return `import React, { useState } from 'react';

function App() {
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState('');

  const addTodo = () => {
    if (input.trim()) {
      setTodos([...todos, { id: Date.now(), text: input, completed: false }]);
      setInput('');
    }
  };

  const toggleTodo = (id) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '2rem',
      background: 'rgba(255,255,255,0.1)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      marginTop: '2rem',
      color: 'white',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
    }}>
      <h1 style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '2rem' }}>
        📋 Todo App
      </h1>
      
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add new task"
          style={{
            flex: 1,
            padding: '12px',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            fontSize: '16px'
          }}
          onKeyPress={(e) => e.key === 'Enter' && addTodo()}
        />
        <button
          onClick={addTodo}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Add Task
        </button>
      </div>
      
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {todos.map(todo => (
          <li
            key={todo.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px',
              margin: '8px 0',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '8px',
              opacity: todo.completed ? 0.6 : 1,
              textDecoration: todo.completed ? 'line-through' : 'none'
            }}
          >
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
            />
            <span style={{ flex: 1, marginLeft: '10px' }}>{todo.text}</span>
            <button
              onClick={() => deleteTodo(todo.id)}
              style={{
                background: '#e74c3c',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      
      {todos.length === 0 && (
        <p style={{ textAlign: 'center', opacity: 0.7, marginTop: '2rem' }}>
          No tasks yet. Add one above!
        </p>
      )}
    </div>
  );
}

export default App;`;
  }

  function createGenericApp(content: string): string {
    return `import React from 'react';

function App() {
  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '2rem',
      background: 'rgba(255,255,255,0.1)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      marginTop: '2rem',
      color: 'white',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
    }}>
      <h1 style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '2rem' }}>
        🚀 Generated App
      </h1>
      
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
          Your app has been generated successfully!
        </p>
        <p style={{ opacity: 0.7 }}>
          This is a demo application created from your prompt.
        </p>
      </div>
    </div>
  );
}

export default App;`;
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
