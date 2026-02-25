import { Zap, Code, Globe, Smartphone, ShoppingCart, MessageSquare, Calendar, FileText, Palette, ArrowRight, Sparkles } from 'lucide-react';

interface HomePageProps {
  onProjectSelect: (prompt: string) => void;
  onGetStarted: () => void;
}

const projectSuggestions = [
  {
    title: "Todo App",
    description: "Task management with add, edit, and delete functionality",
    icon: <FileText className="w-5 h-5" />,
    prompt: "Create a modern todo app with add, edit, delete, and mark as complete features",
    color: "text-blue-600 bg-blue-50",
  },
  {
    title: "E-commerce Store",
    description: "Product catalog with shopping cart",
    icon: <ShoppingCart className="w-5 h-5" />,
    prompt: "Build an e-commerce store with product grid, shopping cart, and checkout",
    color: "text-purple-600 bg-purple-50",
  },
  {
    title: "Portfolio Website",
    description: "Personal portfolio with projects showcase",
    icon: <Globe className="w-5 h-5" />,
    prompt: "Create a personal portfolio website with hero section, projects, and contact form",
    color: "text-emerald-600 bg-emerald-50",
  },
  {
    title: "Chat Application",
    description: "Real-time messaging interface",
    icon: <MessageSquare className="w-5 h-5" />,
    prompt: "Build a chat application with message history and user interface",
    color: "text-orange-600 bg-orange-50",
  },
  {
    title: "Dashboard",
    description: "Analytics dashboard with charts",
    icon: <Code className="w-5 h-5" />,
    prompt: "Create an analytics dashboard with charts, metrics, and data visualization",
    color: "text-indigo-600 bg-indigo-50",
  },
  {
    title: "Landing Page",
    description: "Marketing page with CTA sections",
    icon: <Palette className="w-5 h-5" />,
    prompt: "Design a modern landing page with hero section, features, and call-to-action",
    color: "text-amber-600 bg-amber-50",
  },
  {
    title: "Calendar App",
    description: "Event scheduling and management",
    icon: <Calendar className="w-5 h-5" />,
    prompt: "Build a calendar application with event creation and scheduling",
    color: "text-teal-600 bg-teal-50",
  },
  {
    title: "Mobile App UI",
    description: "Mobile-first responsive design",
    icon: <Smartphone className="w-5 h-5" />,
    prompt: "Create a mobile app interface with navigation and responsive design",
    color: "text-rose-600 bg-rose-50",
  }
];

export function HomePage({ onProjectSelect, onGetStarted }: HomePageProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-[15px] font-semibold text-gray-900 tracking-tight">AI Website Builder</span>
          </div>
          <button
            onClick={onGetStarted}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-blue-50 rounded-full blur-3xl opacity-60"></div>
          <div className="absolute top-40 right-1/4 w-[400px] h-[400px] bg-indigo-50 rounded-full blur-3xl opacity-60"></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium mb-6">
            <Zap className="w-3.5 h-3.5" />
            AI-Powered Website Generation
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-5 leading-[1.1] tracking-tight">
            Build websites{" "}
            <span className="text-blue-600">in seconds</span>
          </h1>

          <p className="text-lg text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Describe your project and watch it come to life. Our AI generates clean,
            production-ready code with live preview — no coding required.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              onClick={onGetStarted}
              className="group flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium text-[15px] shadow-sm shadow-blue-600/20 hover:shadow-md hover:shadow-blue-600/25 transition-all"
            >
              Start Building
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => onProjectSelect("Create a modern portfolio website with hero section and projects showcase")}
              className="text-gray-600 hover:text-gray-900 px-6 py-3 rounded-xl font-medium text-[15px] hover:bg-gray-50 transition-all"
            >
              Try an example
            </button>
          </div>
        </div>
      </div>

      {/* Project Suggestions */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Start with a template
          </h2>
          <p className="text-gray-500 text-[15px]">
            Choose a project type to get started instantly
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          {projectSuggestions.map((project, index) => (
            <button
              key={index}
              onClick={() => onProjectSelect(project.prompt)}
              className="group text-left p-5 bg-white border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-md hover:shadow-gray-100/80 transition-all"
            >
              <div className={`inline-flex p-2.5 rounded-lg ${project.color} mb-3`}>
                {project.icon}
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                {project.title}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {project.description}
              </p>
              <div className="mt-3 text-xs font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                Try it <ArrowRight className="w-3 h-3" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="border-t border-gray-100 bg-gray-50/50">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              How it works
            </h2>
            <p className="text-gray-500 text-[15px]">
              Three simple steps to your new website
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-white w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Describe your idea</h3>
              <p className="text-xs text-gray-500 leading-relaxed">Tell our AI what you want to build in plain English</p>
            </div>
            <div className="text-center">
              <div className="bg-white w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
                <Code className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">AI generates code</h3>
              <p className="text-xs text-gray-500 leading-relaxed">Watch as clean, production-ready React code appears</p>
            </div>
            <div className="text-center">
              <div className="bg-white w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
                <Globe className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Preview instantly</h3>
              <p className="text-xs text-gray-500 leading-relaxed">See your website live in the built-in preview panel</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 py-6 bg-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-gray-400 text-xs">
            Made by Bucky • Powered by React & WebContainer
          </p>
        </div>
      </div>
    </div>
  );
}
