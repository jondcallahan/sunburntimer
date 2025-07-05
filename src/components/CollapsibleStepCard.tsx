import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader } from './ui/card'
import { Button } from './ui/button'
import { StepHeader } from './StepHeader'

interface CollapsibleStepCardProps {
  stepNumber: number
  title: string
  description: string
  isCompleted: boolean
  defaultCollapsed?: boolean
  children: React.ReactNode
  className?: string
  previewContent?: React.ReactNode
}

export function CollapsibleStepCard({
  stepNumber,
  title,
  description,
  isCompleted,
  defaultCollapsed = false,
  children,
  className = '',
  previewContent
}: CollapsibleStepCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  return (
    <Card className={`mb-8 bg-stone-100 border-stone-200 shadow-sm ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <StepHeader 
              stepNumber={stepNumber}
              title={title}
              description={description}
              isCompleted={isCompleted}
            />
            {isCollapsed && previewContent && (
              <div className="mt-3 pl-8">
                {previewContent}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="ml-4 hover:bg-stone-200 flex-shrink-0"
          >
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent>
          {children}
        </CardContent>
      )}
    </Card>
  )
}