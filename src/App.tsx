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
import { ArrowLeft, Sparkles, Send } from 'lucide-react';
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
      setBuildStatus('Loading template...');

      const coldStartTimer = setTimeout(() => {
        setBuildStatus('Backend is waking up from sleep mode (this can take up to 50 seconds)...');
      }, 3000);

      const templateResponse = await axios.post(`${BACKEND_URL}/template`, {
        prompt: projectPrompt
      }, {
        timeout: 60000
      });
      clearTimeout(coldStartTimer);

      console.log('📋 Template response:', templateResponse.data);

      const templatePrompts: string[] = templateResponse.data.prompts || [];
      const contextMessages = templatePrompts.map((p: string) => ({
        role: 'user' as const,
        content: p
      }));

      setBuildStatus('Generating code with AI...');

      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
                const modelLabel = currentModel ? ` [${currentModel}]` : '';
                setBuildStatus(`Generating code... (${Math.round(fullAIResponse.length / 102.4) / 10}KB)${modelLabel}`);
              }

              if (data.done) {
                console.log('✅ Stream complete');
              }
            } catch (e: any) {
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

      const generatedSteps = parseXml(fullAIResponse);
      console.log('📁 Parsed steps:', generatedSteps);

      if (generatedSteps.length === 0) {
        throw new Error('No files could be parsed from the AI response.');
      }

      setSteps(generatedSteps);
      setBuildStatus(`Generated ${generatedSteps.length} files — building preview...`);

      const generatedFiles = convertStepsToFiles(generatedSteps);
      setFiles(generatedFiles);

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
    <div className="h-screen bg-gray-50 text-gray-900 flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-4 mb-3">
          <button
            onClick={() => setCurrentView('home')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <h1 className="text-[15px] font-semibold text-gray-900 tracking-tight">
              AI Website Builder
            </h1>
          </div>
        </div>

        {/* Build Status */}
        {buildStatus && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-xs text-blue-700 font-medium">{buildStatus}</span>
          </div>
        )}

        {/* Prompt Input */}
        <div className="flex gap-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your project (e.g., Create a todo app)..."
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
            onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
          />
          <button
            onClick={handleManualSubmit}
            disabled={isLoading}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg font-medium text-sm transition-all flex items-center gap-2 shadow-sm"
          >
            <Send className="w-4 h-4" />
            {isLoading ? 'Building...' : 'Build'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar - Steps */}
        <div className="w-72 border-r border-gray-200 overflow-y-auto bg-white">
          <StepsList
            steps={steps}
            currentStep={currentStep}
            onStepClick={setCurrentStep}
          />
        </div>

        {/* Middle - File Explorer */}
        <div className="w-64 border-r border-gray-200 overflow-y-auto bg-white">
          <FileExplorer
            files={files}
            onFileSelect={setSelectedFile}
          />
        </div>

        {/* Right - Code/Preview */}
        <div className="flex-1 flex flex-col bg-white">
          <TabView activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="flex-1 min-h-0">
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
