import { useMemo } from 'react'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import { Card, CardContent } from './ui/card'
import type { CalculationResult } from '../types'

interface ResultsDisplayProps {
  result: CalculationResult
}

export function ResultsDisplay({ result }: ResultsDisplayProps) {
  const { burnTime, startTime, points, advice } = result
  
  const finalDamage = useMemo(() => {
    if (points.length === 0) return 0
    const lastPoint = points[points.length - 1]
    return lastPoint.totalDamageAtStart + lastPoint.burnCost
  }, [points])
  
  const safeTime = useMemo(() => {
    if (!startTime || !burnTime) return null
    const diffMs = burnTime.getTime() - startTime.getTime()
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours === 0) {
      return `${minutes} minutes`
    } else if (minutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`
    } else {
      return `${hours}h ${minutes}m`
    }
  }, [startTime, burnTime])
  
  const isHighRisk = finalDamage >= 95
  
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          {/* Main Message */}
          <div className="flex items-center justify-center gap-3">
            {isHighRisk ? (
              <AlertTriangle className="w-8 h-8 text-red-600" />
            ) : (
              <CheckCircle className="w-8 h-8 text-green-600" />
            )}
            <div>
              {burnTime && safeTime ? (
                <div>
                  <p className="text-2xl font-bold text-slate-800">
                    {isHighRisk ? `Safe for ${safeTime}` : `Safe for ${safeTime}`}
                  </p>
                  <p className="text-slate-600">
                    {isHighRisk ? `Until ${format(burnTime, 'h:mm a')} - High burn risk` : `Until ${format(burnTime, 'h:mm a')}`}
                  </p>
                </div>
              ) : (
                <p className="text-2xl font-bold text-green-600">
                  Safe for extended exposure
                </p>
              )}
            </div>
          </div>
          
          {/* Simple Advice */}
          {advice.length > 0 && (
            <p className="text-slate-600 text-sm max-w-md mx-auto">
              {advice[0]}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}