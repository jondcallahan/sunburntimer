import { Check } from 'lucide-react'
import { FitzpatrickType, SKIN_TYPE_CONFIG } from '../types'
import { useAppStore } from '../store'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'

interface SkinTypeCardProps {
  type: FitzpatrickType
  selected: boolean
  onSelect: (type: FitzpatrickType) => void
}

function SkinTypeCard({ type, selected, onSelect }: SkinTypeCardProps) {
  const config = SKIN_TYPE_CONFIG[type]
  
  // Determine if we need light text for dark backgrounds
  const isDarkBackground = type === 'V' || type === 'VI'
  const textColor = isDarkBackground ? 'text-white' : 'text-gray-800'
  const descriptionColor = isDarkBackground ? 'text-gray-200' : 'text-gray-600'

  return (
    <Card
      className={`
        cursor-pointer transition-all duration-200 hover:scale-[1.02] border-2 relative overflow-hidden h-24 sm:h-20
        ${selected 
          ? 'border-amber-600 shadow-xl ring-4 ring-amber-600/20 scale-[1.02]' 
          : 'border-stone-300 hover:border-amber-400 hover:shadow-md'
        }
      `}
      style={{
        backgroundColor: config.color,
      }}
      onClick={() => onSelect(type)}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`Select skin type ${type}: ${config.subtitle}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(type)
        }
      }}
    >
      <CardContent className="p-3 relative h-full flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Badge 
            variant="secondary" 
            className={`
              font-bold text-xs px-2 py-1
              ${isDarkBackground 
                ? 'bg-white/90 text-gray-900' 
                : 'bg-white/80 text-gray-800'
              }
            `}
          >
            {type}
          </Badge>
          <div>
            <div className={`font-semibold text-sm ${textColor}`}>
              {config.subtitle}
            </div>
            <div className={`text-xs ${descriptionColor} leading-tight max-w-[120px] sm:max-w-[140px]`}>
              {config.description}
            </div>
          </div>
        </div>
        
        {selected && (
          <div className="flex items-center justify-center w-6 h-6 bg-amber-600 rounded-full shadow-lg">
            <Check className="w-4 h-4 text-white stroke-[3]" />
          </div>
        )}
        
        {/* Selected overlay */}
        {selected && (
          <div className="absolute inset-0 bg-gradient-to-br from-amber-600/10 to-transparent pointer-events-none" />
        )}
      </CardContent>
    </Card>
  )
}

export function SkinTypeSelector() {
  const { skinType, setSkinType } = useAppStore()

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
      {Object.values(FitzpatrickType).map((type) => (
        <SkinTypeCard
          key={type}
          type={type}
          selected={skinType === type}
          onSelect={setSkinType}
        />
      ))}
    </div>
  )
}