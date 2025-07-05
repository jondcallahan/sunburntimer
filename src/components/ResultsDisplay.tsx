import { useMemo } from 'react'
import { Sun, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import { Card, CardContent } from './ui/card'
import type { CalculationResult } from '../types'
import { CALCULATION_CONSTANTS } from '../types'

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
  
  const isHighRisk = useMemo(() => {
    // Multi-factor risk assessment
    const isDamageHigh = finalDamage >= CALCULATION_CONSTANTS.SAFETY_THRESHOLD;
    
    // Check if burn time is within high-risk window (< 4 hours)
    const isQuickBurn = safeTime && burnTime && startTime ? 
      (burnTime.getTime() - startTime.getTime()) / (1000 * 60 * 60) < CALCULATION_CONSTANTS.HIGH_RISK_TIME_LIMIT_HOURS : false;
    
    // Check if burn occurs during high UV hours (before 6 PM)
    const isHighUVPeriod = burnTime ? 
      burnTime.getHours() < CALCULATION_CONSTANTS.EVENING_RISK_CUTOFF_HOUR : true;
    
    // High risk only if all conditions are met
    return isDamageHigh && isQuickBurn && isHighUVPeriod;
  }, [finalDamage, safeTime, burnTime, startTime])
  
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          {/* Main Message */}
          <div className="flex flex-col items-center gap-3">
            {isHighRisk ? (
              <Sun className="w-8 h-8 text-orange-500" />
            ) : (
              <CheckCircle className="w-8 h-8 text-green-600" />
            )}
            <div className="text-center">
              {burnTime && safeTime ? (
                <div>
                  <p className="text-2xl font-bold text-slate-800">
                    {isHighRisk ? `Safe for ${safeTime}` : `Safe for ${safeTime}`}
                  </p>
                  <p className="text-slate-600">
                    {isHighRisk ? `Use sunscreen by ${format(burnTime, 'h:mm a')}, sun damage may occur after` : `Until ${format(burnTime, 'h:mm a')}`}
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