import { CheckCircle, Circle, AlertCircle } from 'lucide-react';
import { Step } from '../types';

interface StepsListProps {
  steps: Step[];
  currentStep: number;
  onStepClick: (step: number) => void;
}

export function StepsList({ steps, currentStep, onStepClick }: StepsListProps) {
  const getStepIcon = (step: Step) => {
    if (step.status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    }
    if (step.status === 'error') {
      return <AlertCircle className="w-5 h-5 text-red-400" />;
    }
    return <Circle className="w-5 h-5 text-gray-500" />;
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4 text-white">Build Steps</h2>
      <div className="space-y-2">
        {steps.length === 0 ? (
          <div className="text-gray-400 text-sm">No build steps yet</div>
        ) : (
          steps.map((step, index) => (
            <div
              key={step.id}
              onClick={() => onStepClick(index)}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                index === currentStep ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-gray-800'
              }`}
            >
              {getStepIcon(step)}
              <div className="flex-1">
                <div className="font-medium text-white">{step.title}</div>
                {step.description && (
                  <div className="text-sm text-gray-400">{step.description}</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
