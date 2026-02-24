import { Sparkles, Zap, Code, Palette, Globe, Smartphone, ShoppingCart, MessageSquare, Calendar, FileText } from 'lucide-react';

interface HomePageProps {
  onProjectSelect: (prompt: string) => void;
  onGetStarted: () => void;
}

const projectSuggestions = [
  {
    title: "Todo App",
    description: "Task management with add, edit, and delete functionality",
    icon: <FileText className="w-6 h-6" />,
    prompt: "Create a modern todo app with add, edit, delete, and mark as complete features",
    gradient: "from-blue-500 to-cyan-500"
  },
  {
    title: "E-commerce Store",
    description: "Product catalog with shopping cart",
    icon: <ShoppingCart className="w-6 h-6" />,
    prompt: "Build an e-commerce store with product grid, shopping cart, and checkout",
    gradient: "from-purple-500 to-pink-500"
  },
  {
    title: "Portfolio Website",
    description: "Personal portfolio with projects showcase",
    icon: <Globe className="w-6 h-6" />,
    prompt: "Create a personal portfolio website with hero section, projects, and contact form",
    gradient: "from-green-500 to-teal-500"
  },
  {
    title: "Chat Application",
    description: "Real-time messaging interface",
    icon: <MessageSquare className="w-6 h-6" />,
    prompt: "Build a chat application with message history and user interface",
    gradient: "from-orange-500 to-red-500"
  },
  {
    title: "Dashboard",
    description: "Analytics dashboard with charts",
    icon: <Code className="w-6 h-6" />,
    prompt: "Create an analytics dashboard with charts, metrics, and data visualization",
    gradient: "from-indigo-500 to-purple-500"
  },
  {
    title: "Landing Page",
    description: "Marketing page with CTA sections",
    icon: <Palette className="w-6 h-6" />,
    prompt: "Design a modern landing page with hero section, features, and call-to-action",
    gradient: "from-yellow-500 to-orange-500"
  },
  {
    title: "Calendar App",
    description: "Event scheduling and management",
    icon: <Calendar className="w-6 h-6" />,
    prompt: "Build a calendar application with event creation and scheduling",
    gradient: "from-teal-500 to-blue-500"
  },
  {
    title: "Mobile App UI",
    description: "Mobile-first responsive design",
    icon: <Smartphone className="w-6 h-6" />,
    prompt: "Create a mobile app interface with navigation and responsive design",
    gradient: "from-pink-500 to-rose-500"
  }
];

export function HomePage({ onProjectSelect, onGetStarted }: HomePageProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative container mx-auto px-6 pt-24 pb-20">
          <div className="text-center max-w-5xl mx-auto">
            {/* Logo/Brand */}
            <div className="flex items-center justify-center gap-3 mb-10">
              <div className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-lg shadow-purple-500/20">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-400">
                AI Website Builder
              </h1>
            </div>

            {/* Hero Headline */}
            <h2 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Build{" "}
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent animate-gradient">
                Stunning Websites
              </span>{" "}
              <span className="text-white">in</span>
              <br />
              <span className="text-white">Seconds</span>
            </h2>

            <p className="text-xl text-gray-400 mb-10 max-w-3xl mx-auto leading-relaxed">
              Transform your ideas into fully functional websites with our AI-powered platform.
              Just describe what you want, and watch it come to life instantly.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={onGetStarted}
                className="group relative bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-105 flex items-center gap-2"
              >
                <Zap className="w-5 h-5" />
                Start Building Now
              </button>

              <button
                onClick={() => onProjectSelect("Create a modern portfolio website with hero section and projects showcase")}
                className="text-gray-300 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all border border-gray-800 hover:border-gray-700 hover:bg-gray-900"
              >
                See Example
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Project Suggestions */}
      <div className="container mx-auto px-6 py-20 border-t border-gray-900">
        <div className="text-center mb-16">
          <h3 className="text-4xl font-bold text-white mb-4">
            Choose Your Project
          </h3>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Get started instantly with our curated project templates. Each one is designed to showcase different capabilities and use cases.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
          {projectSuggestions.map((project, index) => (
            <div
              key={index}
              onClick={() => onProjectSelect(project.prompt)}
              className="group cursor-pointer bg-[#111111] border border-gray-900 rounded-2xl p-6 hover:border-gray-800 transition-all duration-300 hover:bg-[#151515]"
            >
              <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${project.gradient} mb-4 shadow-lg`}>
                {project.icon}
              </div>

              <h4 className="text-lg font-semibold text-white mb-2">
                {project.title}
              </h4>

              <p className="text-gray-500 text-sm leading-relaxed mb-4">
                {project.description}
              </p>

              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="text-purple-400 text-sm font-medium flex items-center gap-1">
                  Try it now <span>→</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className="border-t border-gray-900 py-20 bg-[#0d0d0d]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-white mb-4">
              Powerful Features
            </h3>
            <p className="text-gray-500 text-lg">
              Everything you need to build amazing websites
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center p-8 bg-[#111111] rounded-2xl border border-gray-900">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/20">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-3">Lightning Fast</h4>
              <p className="text-gray-500">Generate complete websites in seconds with our AI-powered engine</p>
            </div>

            <div className="text-center p-8 bg-[#111111] rounded-2xl border border-gray-900">
              <div className="bg-gradient-to-r from-pink-600 to-purple-600 w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-pink-500/20">
                <Code className="w-7 h-7 text-white" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-3">Clean Code</h4>
              <p className="text-gray-500">Production-ready React code with modern best practices</p>
            </div>

            <div className="text-center p-8 bg-[#111111] rounded-2xl border border-gray-900">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
                <Globe className="w-7 h-7 text-white" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-3">Live Preview</h4>
              <p className="text-gray-500">See your website in action with instant preview functionality</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-900 py-8 bg-[#0a0a0a]">
        <div className="container mx-auto px-6 text-center">
          <p className="text-gray-600 text-sm">
            made with ❤️ by bucky with his left arm • Powered by React & WebContainer
          </p>
        </div>
      </div>
    </div>
  );
}
