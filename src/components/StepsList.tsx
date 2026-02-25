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
      return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    }
    if (step.status === 'error') {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    if (step.status === 'pending') {
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    }
    return <Circle className="w-4 h-4 text-gray-300" />;
  };

  const getStatusColor = (step: Step) => {
    if (step.status === 'completed') return 'text-emerald-600';
    if (step.status === 'error') return 'text-red-600';
    if (step.status === 'pending') return 'text-blue-600';
    return 'text-gray-400';
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Build Logs
        </h2>
        <span className="text-xs text-gray-400 font-mono">
          {steps.filter(s => s.status === 'completed').length}/{steps.length}
        </span>
      </div>

      {/* Steps List */}
      <div className="space-y-1">
        {steps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <FileCode className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">No build steps yet</p>
            <p className="text-gray-300 text-xs mt-1">Steps will appear as the build progresses</p>
          </div>
        ) : (
          steps.map((step, index) => {
            const isActive = index === currentStep;

            return (
              <div
                key={step.id}
                onClick={() => onStepClick(index)}
                className={`group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${isActive
                    ? 'bg-blue-50 border border-blue-100'
                    : 'hover:bg-gray-50 border border-transparent'
                  }`}
              >
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {getStepIcon(step)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-sm ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                    {step.title || step.path?.split('/').pop() || 'Untitled step'}
                  </div>

                  {step.path && (
                    <div className="text-xs text-gray-400 font-mono mt-0.5 truncate">
                      {step.path}
                    </div>
                  )}

                  {step.description && (
                    <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {step.description}
                    </div>
                  )}

                  <div className="mt-1.5">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${getStatusColor(step)}`}>
                      {step.status === 'completed' && 'Done'}
                      {step.status === 'error' && 'Error'}
                      {step.status === 'pending' && 'Processing'}
                      {!step.status && 'Queued'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary footer */}
      {steps.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="text-emerald-500 font-medium">
                ✓ {steps.filter(s => s.status === 'completed').length}
              </span>
              <span className="text-red-500 font-medium">
                ✗ {steps.filter(s => s.status === 'error').length}
              </span>
              <span className="text-blue-500 font-medium">
                ⟳ {steps.filter(s => s.status === 'pending').length}
              </span>
            </div>
            <span className="text-gray-400 font-mono">
              {((steps.filter(s => s.status === 'completed').length / steps.length) * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
