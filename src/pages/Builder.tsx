import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { StepsList } from '../components/StepsList';
import { FileExplorer } from '../components/FileExplorer';
import { TabView } from '../components/TabView';
import { CodeEditor } from '../components/CodeEditor';
import { PreviewFrame } from '../components/PreviewFrame';
import { Step, FileItem } from '../types';
import axios from 'axios';
import { BACKEND_URL } from '../config';
import { parseXml } from '../steps';
import { useWebContainer } from '../hooks/useWebContainer';
import { Loader } from '../components/Loader';

export function Builder() {
  const location = useLocation();
  const { prompt } = location.state as { prompt: string };
  const [userPrompt, setPrompt] = useState("");
  const [llmMessages, setLlmMessages] = useState<{role: "user" | "assistant", content: string;}[]>([]);
  const [loading, setLoading] = useState(false);
  const [templateSet, setTemplateSet] = useState(false);
  const webcontainer = useWebContainer();

  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  
  const [steps, setSteps] = useState<Step[]>([]);

  const [files, setFiles] = useState<FileItem[]>([]);

  useEffect(() => {
    let originalFiles = [...files];
    let updateHappened = false;
    steps.filter(({ status }) => status === "pending").map((step: Step) => {
      updateHappened = true;
      if (step?.path && step?.code) {
        let parsedPath = step.path.split("/") ?? [];
        let currentFileStructure = [...originalFiles]; // {}
        let finalAnswerRef = currentFileStructure;
  
        let currentFolder = ""
        while(parsedPath.length) {
          currentFolder =  `${currentFolder}/${parsedPath[0]}`;
          let currentFolderName = parsedPath[0];
          parsedPath = parsedPath.slice(1);
  
          if (!parsedPath.length) {
            // final file
            let file = currentFileStructure.find(x => x.path === currentFolder)
            if (!file) {
              currentFileStructure.push({
                name: currentFolderName,
                type: 'file',
                path: currentFolder,
                content: step.code
              })
            } else {
              file.content = step.code;
            }
          } else {
            /// in a folder
            let folder = currentFileStructure.find(x => x.path === currentFolder)
            if (!folder) {
              // create the folder
              currentFileStructure.push({
                name: currentFolderName,
                type: 'folder',
                path: currentFolder,
                children: []
              })
            }
  
            currentFileStructure = currentFileStructure.find(x => x.path === currentFolder)!.children!;
          }
        }
        originalFiles = finalAnswerRef;
      }

    })

    if (updateHappened) {
      setFiles(originalFiles);
      setSteps((previous: Step[]) => previous.map((stepItem) => ({
        ...stepItem,
        status: "completed"
      })));
    }
  }, [steps, files]);

  async function init() {
    const response = await axios.post(`${BACKEND_URL}/template`, {
      prompt: prompt.trim()
    });
    setTemplateSet(true);
    
    const {prompts, uiPrompts} = response.data;

    setSteps(parseXml(uiPrompts[0]).map((x: Step) => ({
      ...x,
      status: "pending"
    })));

    setLoading(true);
    const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
      messages: [...prompts, prompt].map(content => ({
        role: "user",
        content
      }))
    })

    setLoading(false);

    setSteps((current: Step[]) => [...current, ...parseXml(stepsResponse.data.response).map(x => ({
      ...x,
      status: "pending" as "pending"
    }))]);

    setLlmMessages([...prompts, prompt].map(content => ({
      role: "user",
      content
    })));

    setLlmMessages((current) => [...current, {role: "assistant", content: stepsResponse.data.response}])
  }

  useEffect(() => {
    init();
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header with gradient border */}
      <header className="bg-[#111111] border-b border-gray-800/50 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 animate-pulse"></div>
              <h1 className="text-xl font-semibold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                AI Website Builder
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 text-xs font-medium bg-green-500/10 text-green-400 rounded-full border border-green-500/20">
                ● Live
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2 font-mono">
            <span className="text-gray-600">$</span> {prompt}
          </p>
        </div>
      </header>
      
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-4 gap-4 p-4">
          {/* Build Steps & Chat Panel */}
          <div className="col-span-1 space-y-4 overflow-auto">
            {/* Build Steps with modern design */}
            <div className="bg-[#111111] rounded-xl border border-gray-800/50 overflow-hidden">
              <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                <StepsList
                  steps={steps}
                  currentStep={currentStep}
                  onStepClick={setCurrentStep}
                />
              </div>
            </div>

            {/* Chat Input with modern design */}
            <div className="bg-[#111111] rounded-xl border border-gray-800/50 p-4">
              {(loading || !templateSet) ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader />
                  <p className="text-gray-500 text-sm mt-4 animate-pulse">
                    {!templateSet ? 'Initializing...' : 'Processing...'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Modify Request
                  </label>
                  <textarea 
                    value={userPrompt} 
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ask for changes or improvements..."
                    className="w-full bg-[#1a1a1a] text-gray-300 placeholder-gray-600 rounded-lg p-3 text-sm font-mono border border-gray-800 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all resize-none"
                    rows={4}
                  />
                  <button 
                    onClick={async () => {
                      const newMessage = {
                        role: "user" as "user",
                        content: userPrompt
                      };

                      setLoading(true);
                      const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
                        messages: [...llmMessages, newMessage]
                      });
                      setLoading(false);

                      setLlmMessages((current) => [...current, newMessage]);
                      setLlmMessages((current) => [...current, {
                        role: "assistant",
                        content: stepsResponse.data.response
                      }]);
                      
                      setSteps((currentSteps: Step[]) => [...currentSteps, ...parseXml(stepsResponse.data.response).map(x => ({
                        ...x,
                        status: "pending" as "pending"
                      }))]);
                      setPrompt("");
                    }}
                    disabled={!userPrompt.trim()}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-500/25"
                  >
                    Send Request
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* File Explorer */}
          <div className="col-span-1 bg-[#111111] rounded-xl border border-gray-800/50 overflow-hidden">
            <FileExplorer 
              files={files} 
              onFileSelect={setSelectedFile}
            />
          </div>

          {/* Code Editor & Preview */}
          <div className="col-span-2 bg-[#111111] rounded-xl border border-gray-800/50 overflow-hidden h-[calc(100vh-6rem)]">
            <TabView activeTab={activeTab} onTabChange={setActiveTab} />
            <div className="h-[calc(100%-3.5rem)]">
              {activeTab === 'code' ? (
                <CodeEditor file={selectedFile} />
              ) : (
                <PreviewFrame webContainer={webcontainer} files={files} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}