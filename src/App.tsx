import { useState } from 'react';
import { HomePage } from './components/HomePage';
import { StepsList } from './components/StepsList';
import { FileExplorer } from './components/FileExplorer';
import { CodeEditor } from './components/CodeEditor';
import { PreviewFrame } from './components/PreviewFrame';
import { TabView } from './components/TabView';
import { useWebContainer } from './hooks/useWebContainer';
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
      
      // Get template type first
      const templateResponse = await axios.post(`${BACKEND_URL}/template`, {
        prompt: projectPrompt
      });
      
      console.log('📋 Template response:', templateResponse.data);

      // Get code generation
      const chatResponse = await axios.post(`${BACKEND_URL}/chat`, {
        messages: [
          { role: 'user', content: projectPrompt }
        ]
      });

      console.log('💬 Full AI Response:', chatResponse.data.response);
      console.log('💬 Response length:', chatResponse.data.response.length);

      // Parse the response
      const generatedSteps = parseXml(chatResponse.data.response);
      console.log('📁 Parsed steps:', generatedSteps);
      
      setSteps(generatedSteps);
      
      // Convert steps to files
      const generatedFiles = convertStepsToFiles(generatedSteps);
      console.log('📄 Generated files:', generatedFiles);
      
      setFiles(generatedFiles);
      
      // Auto-switch to preview if we have files
      if (generatedFiles.length > 0) {
        setActiveTab('preview');
      }
      
    } catch (error) {
      console.error('❌ Error generating project:', error);
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
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-700 bg-gradient-to-r from-gray-900 to-gray-800">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => setCurrentView('home')}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            AI Website Builder
          </h1>
        </div>
        
        <div className="flex gap-4">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your project (e.g., Create a todo app)..."
            className="flex-1 p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
          />
          <button
            onClick={handleManualSubmit}
            disabled={isLoading}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 rounded-lg font-medium transition-all"
          >
            {isLoading ? 'Building...' : 'Build Website'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Sidebar - Steps */}
        <div className="w-80 border-r border-gray-700 overflow-y-auto bg-gray-800/30">
          <StepsList 
            steps={steps} 
            currentStep={currentStep}
            onStepClick={setCurrentStep}
          />
        </div>

        {/* Middle - File Explorer */}
        <div className="w-80 border-r border-gray-700 overflow-y-auto bg-gray-800/20">
          <FileExplorer 
            files={files}
            onFileSelect={setSelectedFile}
          />
        </div>

        {/* Right - Code/Preview */}
        <div className="flex-1 flex flex-col">
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
    </div>
  );
}

export default App;
