import { CheckCircle, Circle, AlertCircle, FileCode, Loader2 } from 'lucide-react';
import { Step } from '../types';

interface StepsListProps {
  steps: Step[];
  currentStep: number;
  onStepClick: (step: number) => void;
}

export function StepsList({ steps, currentStep, onStepClick }: StepsListProps) {
  const getStepIcon = (step: Step) => {
    if (step.status === 'completed') {
      return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    }
    if (step.status === 'error') {
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    }
    if (step.status === 'pending') {
      return <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />;
    }
    return <Circle className="w-4 h-4 text-gray-600" />;
  };

  const getStatusColor = (step: Step) => {
    if (step.status === 'completed') return 'text-emerald-400';
    if (step.status === 'error') return 'text-red-400';
    if (step.status === 'pending') return 'text-purple-400';
    return 'text-gray-500';
  };

  const getStatusBg = (step: Step, isActive: boolean) => {
    if (isActive) return 'bg-purple-500/10 border-purple-500/30';
    if (step.status === 'completed') return 'bg-emerald-500/5 border-emerald-500/20';
    if (step.status === 'error') return 'bg-red-500/5 border-red-500/20';
    if (step.status === 'pending') return 'bg-purple-500/5 border-purple-500/20';
    return 'bg-transparent border-gray-800/50';
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800/50">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Build Logs
        </h2>
        <span className="text-xs text-gray-500 font-mono">
          {steps.filter(s => s.status === 'completed').length}/{steps.length}
        </span>
      </div>

      {/* Steps List */}
      <div className="space-y-2">
        {steps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileCode className="w-12 h-12 text-gray-700 mb-3" />
            <p className="text-gray-500 text-sm">No build steps yet</p>
            <p className="text-gray-600 text-xs mt-1">Steps will appear as the build progresses</p>
          </div>
        ) : (
          steps.map((step, index) => {
            const isActive = index === currentStep;
            const timestamp = new Date().toLocaleTimeString('en-US', { 
              hour12: false, 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit' 
            });

            return (
              <div
                key={step.id}
                onClick={() => onStepClick(index)}
                className={`group relative flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-all duration-200 hover:border-purple-500/30 ${getStatusBg(step, isActive)}`}
              >
                {/* Timeline connector */}
                {index < steps.length - 1 && (
                  <div className="absolute left-[1.4rem] top-10 w-px h-6 bg-gradient-to-b from-gray-700 to-transparent"></div>
                )}

                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {getStepIcon(step)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Timestamp */}
                  <div className="text-[10px] text-gray-600 font-mono mb-1">
                    {timestamp}
                  </div>

                  {/* Title */}
                  <div className={`font-medium text-sm mb-1 transition-colors ${getStatusColor(step)}`}>
                    {step.title || step.path?.split('/').pop() || 'Untitled step'}
                  </div>

                  {/* Path */}
                  {step.path && (
                    <div className="text-xs text-gray-500 font-mono mb-1 truncate">
                      <span className="text-gray-600">→</span> {step.path}
                    </div>
                  )}

                  {/* Description */}
                  {step.description && (
                    <div className="text-xs text-gray-600 line-clamp-2">
                      {step.description}
                    </div>
                  )}

                  {/* Status badge */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] font-medium uppercase tracking-wider ${getStatusColor(step)}`}>
                      {step.status === 'completed' && '[OK]'}
                      {step.status === 'error' && '[ERROR]'}
                      {step.status === 'pending' && '[PROCESSING]'}
                      {!step.status && '[IDLE]'}
                    </span>
                  </div>
                </div>

                {/* Active indicator */}
                {isActive && (
                  <div className="absolute right-2 top-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Summary footer */}
      {steps.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-800/50">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <span className="text-emerald-400">
                ✓ {steps.filter(s => s.status === 'completed').length}
              </span>
              <span className="text-red-400">
                ✗ {steps.filter(s => s.status === 'error').length}
              </span>
              <span className="text-purple-400">
                ⟳ {steps.filter(s => s.status === 'pending').length}
              </span>
            </div>
            <span className="text-gray-600 font-mono">
              {((steps.filter(s => s.status === 'completed').length / steps.length) * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
