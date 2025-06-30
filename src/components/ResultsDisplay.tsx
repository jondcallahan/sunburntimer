import { useMemo } from 'react'
import { Clock, Sun, AlertTriangle, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { Progress } from './ui/progress'
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
  
  const getRiskLevel = (damage: number) => {
    if (damage < 25) return { level: 'Safe', variant: 'secondary' as const, color: 'text-green-600' }
    if (damage < 75) return { level: 'Caution', variant: 'outline' as const, color: 'text-yellow-600' }
    if (damage < 95) return { level: 'Warning', variant: 'destructive' as const, color: 'text-orange-600' }
    return { level: 'Danger', variant: 'destructive' as const, color: 'text-red-600' }
  }
  
  const risk = getRiskLevel(finalDamage)
  
  return (
    <div className="space-y-6">
      {/* Main Result Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {finalDamage < 95 ? (
                <CheckCircle className={risk.color} />
              ) : (
                <AlertTriangle className={risk.color} />
              )}
              {burnTime ? 'Burn Risk Analysis' : 'Safe for Extended Exposure'}
            </CardTitle>
            <Badge variant={risk.variant}>{risk.level}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Skin Damage</span>
              <span className="font-medium">{Math.round(finalDamage)}%</span>
            </div>
            <Progress value={Math.min(finalDamage, 100)} className="h-2" />
          </div>
          
          {/* Time Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {startTime && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Start Time</p>
                  <p className="text-sm text-muted-foreground">
                    {format(startTime, 'h:mm a')}
                  </p>
                </div>
              </div>
            )}
            
            {burnTime && safeTime && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Sun className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Safe Time</p>
                  <p className="text-sm text-muted-foreground">{safeTime}</p>
                </div>
              </div>
            )}
            
            {burnTime && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-sm font-medium">Burn Time</p>
                  <p className="text-sm text-muted-foreground">
                    {format(burnTime, 'h:mm a')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Advice Section */}
      {advice.length > 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Recommendations:</p>
              <ul className="space-y-1">
                {advice.map((tip, index) => (
                  <li key={index} className="text-sm flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Calculation Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Calculation Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Data Points</p>
              <p className="text-sm font-medium">{points.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Time Resolution</p>
              <p className="text-sm font-medium">
                {60 / result.timeSlices} min intervals
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Max UV Index</p>
              <p className="text-sm font-medium">
                {Math.max(...points.map(p => p.slice.uvIndex)).toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg UV Index</p>
              <p className="text-sm font-medium">
                {(points.reduce((sum, p) => sum + p.slice.uvIndex, 0) / points.length).toFixed(1)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}