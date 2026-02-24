import { useState, useEffect } from 'react';
import { HomePage } from './components/HomePage';
import { StepsList } from './components/StepsList';
import { FileExplorer } from './components/FileExplorer';
import { CodeEditor } from './components/CodeEditor';
import { PreviewFrame } from './components/PreviewFrame';
import { TabView } from './components/TabView';
import { ToastContainer } from './components/Toast';
import { useWebContainer } from './hooks/useWebContainer';
import { useToast } from './hooks/useToast';
import { parseXml } from './steps';
import { Step, FileItem } from './types';
import { ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { BACKEND_URL } from './config';

function App() {
  console.log('🚀 BOLT v2.0 - SSE & Speed Optimized');
  const [currentView, setCurrentView] = useState<'home' | 'builder'>('home');
  const [prompt, setPrompt] = useState('');
  const [steps, setSteps] = useState<Step[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [isLoading, setIsLoading] = useState(false);
  const [buildStatus, setBuildStatus] = useState('');

  const { webcontainer, bootError, retry: retryWebContainer } = useWebContainer();
  const toast = useToast();

  useEffect(() => {
    // Wake up the backend immediately on load (for Render free tier cold starts)
    axios.get(`${BACKEND_URL}/health`).catch(() => { });
  }, []);

  const handleProjectSelect = async (projectPrompt: string) => {
    setPrompt(projectPrompt);
    setCurrentView('builder');
    await generateProject(projectPrompt);
  };

  const generateProject = async (projectPrompt: string) => {
    setIsLoading(true);
    setSteps([]);
    setFiles([]);
    setBuildStatus('Starting generation...');

    try {
      console.log('🚀 Starting project generation for:', projectPrompt);

      // Get template type first
      setBuildStatus('Loading template...');

      // Show cold-start warning after 10s
      const coldStartTimer = setTimeout(() => {
        setBuildStatus('Backend is waking up, please wait...');
      }, 10000);

      const templateResponse = await axios.post(`${BACKEND_URL}/template`, {
        prompt: projectPrompt
      }, {
        timeout: 60000  // 60s timeout for cold starts
      });
      clearTimeout(coldStartTimer);

      console.log('📋 Template response:', templateResponse.data);

      // Build context messages from template prompts
      const templatePrompts: string[] = templateResponse.data.prompts || [];
      const contextMessages = templatePrompts.map((p: string) => ({
        role: 'user' as const,
        content: p
      }));

      // Get code generation with streaming
      setBuildStatus('Generating code with AI...');

      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...contextMessages,
            { role: 'user', content: projectPrompt }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullAIResponse = '';

      if (!reader) {
        throw new Error('No stream reader available');
      }

      let currentModel = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;

          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const data = JSON.parse(jsonStr);

              if (data.model) currentModel = data.model;
              if (data.warning) toast.info(data.warning);

              if (data.error) {
                throw new Error(data.error);
              }

              if (data.chunk) {
                fullAIResponse += data.chunk;
                // Update status with incremental length to show progress
                const modelLabel = currentModel ? ` [${currentModel}]` : '';
                setBuildStatus(`Generating code... (${Math.round(fullAIResponse.length / 102.4) / 10}KB)${modelLabel}`);
              }

              if (data.done) {
                console.log('✅ Stream complete');
              }
            } catch (e: any) {
              // If it's our thrown error, rethrow to be caught by outer catch
              if (e.message?.includes('Chat error') || e.message?.includes('rate-limited')) throw e;
              console.error('Error parsing SSE line:', e, line);
            }
          }
        }
      }

      if (!fullAIResponse.trim()) {
        throw new Error('AI returned an empty response. Please try again.');
      }

      console.log('💬 Full AI Response length:', fullAIResponse.length);
      setBuildStatus('Parsing response...');

      // Parse the response
      const generatedSteps = parseXml(fullAIResponse);
      console.log('📁 Parsed steps:', generatedSteps);

      if (generatedSteps.length === 0) {
        throw new Error('No files could be parsed from the AI response.');
      }

      setSteps(generatedSteps);
      setBuildStatus(`Generated ${generatedSteps.length} files — building preview...`);

      // Convert steps to files
      const generatedFiles = convertStepsToFiles(generatedSteps);
      setFiles(generatedFiles);

      // Auto-switch to preview if we have files
      if (generatedFiles.length > 0) {
        setActiveTab('preview');
      }

    } catch (error: any) {
      console.error('❌ Error generating project:', error);
      setBuildStatus('');

      const errMsg = error?.message || 'Unexpected error occurred';
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!prompt.trim() || isLoading) return;
    await generateProject(prompt.trim());
  };

  const convertStepsToFiles = (steps: Step[]): FileItem[] => {
    const fileMap = new Map<string, FileItem>();

    steps.forEach(step => {
      if (step.path && step.code) {
        const pathParts = step.path.split('/');
        const fileName = pathParts[pathParts.length - 1];

        fileMap.set(step.path, {
          name: fileName,
          type: 'file',
          path: step.path,
          content: step.code
        });
      }
    });

    return Array.from(fileMap.values());
  };

  if (currentView === 'home') {
    return (
      <HomePage
        onProjectSelect={handleProjectSelect}
        onGetStarted={() => setCurrentView('builder')}
      />
    );
  }

  return (
    <div className="h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-900 bg-[#0d0d0d]">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => setCurrentView('home')}
            className="p-2 hover:bg-gray-900 rounded-lg transition-colors flex items-center gap-2 text-gray-500 hover:text-gray-300"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </button>
          <h1 className="text-2xl font-semibold text-gray-400">
            AI Website Builder
          </h1>
        </div>

        {/* Inline Build Status */}
        {buildStatus && (
          <div className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-md bg-purple-500/5 border border-purple-500/10">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></div>
            <span className="text-xs text-purple-300/80 font-medium">{buildStatus}</span>
          </div>
        )}

        <div className="flex gap-4">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your project (e.g., Create a todo app)..."
            className="flex-1 p-3 bg-[#111111] border border-gray-900 rounded-lg text-white placeholder-gray-600 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all"
            onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
          />
          <button
            onClick={handleManualSubmit}
            disabled={isLoading}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-600 rounded-lg font-medium transition-all shadow-lg shadow-purple-500/20"
          >
            {isLoading ? 'Building...' : 'Build Website'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Sidebar - Steps */}
        <div className="w-80 border-r border-gray-900 overflow-y-auto bg-[#0d0d0d]">
          <StepsList
            steps={steps}
            currentStep={currentStep}
            onStepClick={setCurrentStep}
          />
        </div>

        {/* Middle - File Explorer */}
        <div className="w-80 border-r border-gray-900 overflow-y-auto bg-[#0a0a0a]">
          <FileExplorer
            files={files}
            onFileSelect={setSelectedFile}
          />
        </div>

        {/* Right - Code/Preview */}
        <div className="flex-1 flex flex-col bg-[#0a0a0a]">
          <TabView activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="flex-1">
            {activeTab === 'code' ? (
              <CodeEditor file={selectedFile} />
            ) : (
              <PreviewFrame files={files} webContainer={webcontainer} bootError={bootError} onRetry={retryWebContainer} />
            )}
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </div>
  );
}

export default App;
