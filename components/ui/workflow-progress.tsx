import { CheckCircle2, Circle, Loader2 } from "lucide-react"

interface WorkflowStep {
  id: string
  label: string
  description: string
}

interface WorkflowProgressProps {
  steps: WorkflowStep[]
  activeStep: number
}

export function WorkflowProgress({ steps, activeStep }: WorkflowProgressProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex flex-col items-center relative">
            <div className="flex items-center justify-center">
              {index < activeStep ? (
                <div className="rounded-full bg-primary text-primary-foreground w-8 h-8 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              ) : index === activeStep ? (
                <div className="rounded-full bg-primary text-primary-foreground w-8 h-8 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <div className="rounded-full border border-muted-foreground text-muted-foreground w-8 h-8 flex items-center justify-center">
                  <Circle className="h-5 w-5" />
                </div>
              )}
            </div>
            <div className="mt-2 text-center">
              <p className={`text-sm font-medium ${index <= activeStep ? "text-primary" : "text-muted-foreground"}`}>
                {step.label}
              </p>
              <p className="text-xs text-muted-foreground max-w-[120px] text-center">{step.description}</p>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`absolute top-4 left-[calc(50%+16px)] w-[calc(100%-32px)] h-[2px] ${
                  index < activeStep ? "bg-primary" : "bg-muted"
                }`}
                style={{ right: "calc(-50% + 16px)" }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
