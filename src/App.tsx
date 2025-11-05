import { useState } from 'react';
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
  const [currentView, setCurrentView] = useState<'home' | 'builder'>('home');
  const [prompt, setPrompt] = useState('');
  const [steps, setSteps] = useState<Step[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [isLoading, setIsLoading] = useState(false);
  
  const webcontainer = useWebContainer();
  const toast = useToast();

  const handleProjectSelect = async (projectPrompt: string) => {
    setPrompt(projectPrompt);
    setCurrentView('builder');
    await generateProject(projectPrompt);
  };

  const generateProject = async (projectPrompt: string) => {
    setIsLoading(true);
    setSteps([]);
    setFiles([]);
    
    try {
      console.log('🚀 Starting project generation for:', projectPrompt);
      toast.info('🚀 Starting generation...');
      
      // Get template type first
      const templateResponse = await axios.post(`${BACKEND_URL}/template`, {
        prompt: projectPrompt
      }, {
        timeout: 30000 // 30 second timeout
      });
      
      console.log('📋 Template response:', templateResponse.data);
      toast.info('📋 Template loaded...');

      // Get code generation
      const chatResponse = await axios.post(`${BACKEND_URL}/chat`, {
        messages: [
          { role: 'user', content: projectPrompt }
        ]
      }, {
        timeout: 60000 // 60 second timeout
      });

      console.log('💬 Full AI Response:', chatResponse.data.response);
      console.log('💬 Response length:', chatResponse.data.response.length);
      toast.info('💬 Parsing response...');

      // Parse the response
      const generatedSteps = parseXml(chatResponse.data.response);
      console.log('📁 Parsed steps:', generatedSteps);
      
      if (generatedSteps.length === 0) {
        toast.warning('⚠️ No files generated. The AI response might not be in the correct format.');
        return;
      }
      
      setSteps(generatedSteps);
      toast.success(`✅ Generated ${generatedSteps.length} files`);
      
      // Convert steps to files
      const generatedFiles = convertStepsToFiles(generatedSteps);
      console.log('📄 Generated files:', generatedFiles);
      
      setFiles(generatedFiles);
      
      // Auto-switch to preview if we have files
      if (generatedFiles.length > 0) {
        setActiveTab('preview');
        toast.success('🎉 Project ready! Check the preview');
      }
      
    } catch (error) {
      console.error('❌ Error generating project:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ERR_NETWORK' || error.code === 'ERR_CONNECTION_REFUSED') {
          toast.error('❌ Cannot connect to backend server. Please ensure it\'s running on port 3000');
        } else if (error.code === 'ECONNABORTED') {
          toast.error('⏱️ Request timeout. The AI is taking too long to respond.');
        } else if (error.response) {
          toast.error(`❌ Server error: ${error.response.status} - ${error.response.statusText}`);
        } else {
          toast.error('❌ Network error. Please check your connection.');
        }
      } else {
        toast.error('❌ Unexpected error occurred');
      }
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
              <PreviewFrame files={files} webContainer={webcontainer!} />
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
