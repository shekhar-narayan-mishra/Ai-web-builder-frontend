import React from 'react';
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl"></div>
        
        <div className="relative container mx-auto px-6 pt-20 pb-16">
          <div className="text-center max-w-4xl mx-auto">
            {/* Logo/Brand */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                AI Website Builder
              </h1>
            </div>

            {/* Hero Headline */}
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Build{" "}
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Stunning Websites
              </span>{" "}
              in Seconds
            </h2>

            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Transform your ideas into fully functional websites with our AI-powered platform. 
              Just describe what you want, and watch it come to life instantly.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={onGetStarted}
                className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 flex items-center gap-2"
              >
                <Zap className="w-5 h-5" />
                Start Building Now
                <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">→</div>
              </button>
              
              <button 
                onClick={() => onProjectSelect("Create a modern portfolio website with hero section and projects showcase")}
                className="text-gray-300 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors border border-gray-600 hover:border-gray-500"
              >
                See Example
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Project Suggestions */}
      <div className="container mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-white mb-4">
            Choose Your Project
          </h3>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Get started instantly with our curated project templates. Each one is designed to showcase different capabilities and use cases.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {projectSuggestions.map((project, index) => (
            <div
              key={index}
              onClick={() => onProjectSelect(project.prompt)}
              className="group cursor-pointer bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 hover:bg-gray-800/70 transition-all duration-300 hover:scale-105 hover:border-gray-600"
            >
              <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${project.gradient} mb-4 group-hover:scale-110 transition-transform`}>
                {project.icon}
              </div>
              
              <h4 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-300 transition-colors">
                {project.title}
              </h4>
              
              <p className="text-gray-400 text-sm leading-relaxed">
                {project.description}
              </p>
              
              <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="text-blue-400 text-sm font-medium flex items-center gap-1">
                  Try it now <span>→</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-gray-800/30 py-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-white mb-4">
              Powerful Features
            </h3>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">Lightning Fast</h4>
              <p className="text-gray-400">Generate complete websites in seconds with our AI-powered engine</p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Code className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">Clean Code</h4>
              <p className="text-gray-400">Production-ready React code with modern best practices</p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-r from-pink-500 to-red-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">Live Preview</h4>
              <p className="text-gray-400">See your website in action with instant preview functionality</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 py-8">
        <div className="container mx-auto px-6 text-center">
          <p className="text-gray-500">
            Built with ❤️ using AI • Powered by React & WebContainer
          </p>
        </div>
      </div>
    </div>
  );
}
