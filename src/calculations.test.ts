import { describe, it, expect } from 'bun:test'
import { findOptimalTimeSlicing } from './calculations'
import type { CalculationInput, WeatherData } from './types'
import { FitzpatrickType, SPFLevel, SweatLevel } from './types'

// Mock weather data generator
function createMockWeatherData(uvValues: number[]): WeatherData {
  const baseTime = Math.floor(Date.now() / 1000)
  
  return {
    current: {
      dt: baseTime,
      temp: 75,
      feels_like: 75,
      pressure: 1013,
      humidity: 50,
      uvi: uvValues[0] || 5,
      clouds: 20,
      wind_speed: 5,
      weather: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01d' }]
    },
    hourly: uvValues.map((uvi, index) => ({
      dt: baseTime + (index * 3600),
      temp: 75,
      feels_like: 75,
      pressure: 1013,
      humidity: 50,
      uvi,
      clouds: 20,
      wind_speed: 5,
      weather: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01d' }],
      pop: 0
    }))
  }
}

function createCalculationInput(
  skinType: FitzpatrickType,
  spfLevel: SPFLevel,
  sweatLevel: SweatLevel,
  uvValues: number[]
): CalculationInput {
  return {
    weather: createMockWeatherData(uvValues),
    placeName: 'Test Location',
    currentTime: new Date(),
    skinType,
    spfLevel,
    sweatLevel
  }
}

describe('Sunburn Calculation Algorithm', () => {
  describe('Core Algorithm Validation', () => {
    it('should calculate reasonable burn times for Type I skin without sunscreen', () => {
      // Type I skin, UV 8, no protection - should burn quickly (~20 minutes)
      const input = createCalculationInput(
        FitzpatrickType.I,
        SPFLevel.NONE,
        SweatLevel.LOW,
        [8, 8, 8, 8, 8]
      )
      
      const result = findOptimalTimeSlicing(input)
      
      expect(result.points.length).toBeGreaterThan(0)
      expect(result.burnTime).toBeDefined()
      
      // Should reach burn threshold in about 15-30 minutes
      const burnTimeMinutes = result.burnTime ? 
        (result.burnTime.getTime() - input.currentTime.getTime()) / (1000 * 60) : 0
      expect(burnTimeMinutes).toBeGreaterThan(10)
      expect(burnTimeMinutes).toBeLessThan(40)
    })

    it('should calculate much longer burn times with SPF protection', () => {
      // Same conditions but with SPF 30 - should extend time significantly
      const input = createCalculationInput(
        FitzpatrickType.I,
        SPFLevel.SPF_30,
        SweatLevel.LOW,
        Array(15).fill(8) // 15 hours of UV 8 to ensure enough data
      )
      
      const result = findOptimalTimeSlicing(input)
      
      // With SPF 30, should take much longer to burn (hours)
      const burnTimeMinutes = result.burnTime ? 
        (result.burnTime.getTime() - input.currentTime.getTime()) / (1000 * 60) : 0
      
      // If no burn time, check that total damage is significant but under threshold
      if (burnTimeMinutes === 0) {
        const lastPoint = result.points[result.points.length - 1]
        expect(lastPoint?.totalDamageAtStart).toBeGreaterThan(50) // Should accumulate damage
        expect(lastPoint?.totalDamageAtStart).toBeLessThan(100) // But not reach burn
      } else {
        expect(burnTimeMinutes).toBeGreaterThan(300) // More than 5 hours
      }
    })

    it('should show darker skin types burn much slower', () => {
      // Type VI skin, UV 8, no protection - should take much longer
      const input = createCalculationInput(
        FitzpatrickType.VI,
        SPFLevel.NONE,
        SweatLevel.LOW,
        [8, 8, 8, 8, 8, 8, 8]
      )
      
      const result = findOptimalTimeSlicing(input)
      
      // Type VI should take much longer to burn than Type I
      const burnTimeMinutes = result.burnTime ? 
        (result.burnTime.getTime() - input.currentTime.getTime()) / (1000 * 60) : 0
      expect(burnTimeMinutes).toBeGreaterThan(60) // Should be over an hour
    })
  })

  describe('UV Index Sensitivity', () => {
    it('should burn faster in high UV conditions', () => {
      const highUV = createCalculationInput(
        FitzpatrickType.II,
        SPFLevel.NONE,
        SweatLevel.LOW,
        [12, 12, 12, 12]
      )
      
      const lowUV = createCalculationInput(
        FitzpatrickType.II,
        SPFLevel.NONE,
        SweatLevel.LOW,
        [3, 3, 3, 3]
      )
      
      const highUVResult = findOptimalTimeSlicing(highUV)
      const lowUVResult = findOptimalTimeSlicing(lowUV)
      
      const highUVBurnTime = highUVResult.burnTime ? 
        (highUVResult.burnTime.getTime() - highUV.currentTime.getTime()) / (1000 * 60) : Infinity
      const lowUVBurnTime = lowUVResult.burnTime ? 
        (lowUVResult.burnTime.getTime() - lowUV.currentTime.getTime()) / (1000 * 60) : Infinity
      
      // High UV should burn faster than low UV
      expect(highUVBurnTime).toBeLessThan(lowUVBurnTime)
    })
  })

  describe('SPF Protection Levels', () => {
    it('should provide appropriate protection for SPF 15', () => {
      const withoutSPF = createCalculationInput(
        FitzpatrickType.II,
        SPFLevel.NONE,
        SweatLevel.LOW,
        [6, 6, 6, 6, 6]
      )
      
      const withSPF = createCalculationInput(
        FitzpatrickType.II,
        SPFLevel.SPF_15,
        SweatLevel.LOW,
        Array(10).fill(6)
      )
      
      const noSPFResult = findOptimalTimeSlicing(withoutSPF)
      const spfResult = findOptimalTimeSlicing(withSPF)
      
      const noSPFTime = noSPFResult.burnTime ? 
        (noSPFResult.burnTime.getTime() - withoutSPF.currentTime.getTime()) / (1000 * 60) : 0
      const spfTime = spfResult.burnTime ? 
        (spfResult.burnTime.getTime() - withSPF.currentTime.getTime()) / (1000 * 60) : 0
      
      if (noSPFTime > 0 && spfTime > 0) {
        const actualMultiplier = spfTime / noSPFTime
        // Should be roughly 15x protection (within reasonable tolerance)
        expect(actualMultiplier).toBeGreaterThan(10)
        expect(actualMultiplier).toBeLessThan(20)
      }
    })
  })

  describe('Sweat Level Degradation', () => {
    it('should reduce SPF effectiveness over time with sweating', () => {
      // Create weather data spanning many hours
      const longUVData = Array(12).fill(6) // 12 hours of UV 6
      
      const noSweat = createCalculationInput(
        FitzpatrickType.II,
        SPFLevel.SPF_30,
        SweatLevel.LOW,
        longUVData
      )
      
      const highSweat = createCalculationInput(
        FitzpatrickType.II,
        SPFLevel.SPF_30,
        SweatLevel.HIGH,
        longUVData
      )
      
      const noSweatResult = findOptimalTimeSlicing(noSweat)
      const highSweatResult = findOptimalTimeSlicing(highSweat)
      
      // High sweat should result in faster burning due to SPF degradation
      const noSweatTime = noSweatResult.burnTime ? 
        (noSweatResult.burnTime.getTime() - noSweat.currentTime.getTime()) / (1000 * 60 * 60) : Infinity
      const highSweatTime = highSweatResult.burnTime ? 
        (highSweatResult.burnTime.getTime() - highSweat.currentTime.getTime()) / (1000 * 60 * 60) : Infinity
      
      expect(highSweatTime).toBeLessThan(noSweatTime)
    })
  })

  describe('Skin Type Progression', () => {
    it('should show increasing burn resistance from Type I to Type VI', () => {
      const skinTypes = [
        FitzpatrickType.I,
        FitzpatrickType.II,
        FitzpatrickType.III,
        FitzpatrickType.IV,
        FitzpatrickType.V,
        FitzpatrickType.VI
      ]

      const burnTimes = skinTypes.map(skinType => {
        const input = createCalculationInput(
          skinType,
          SPFLevel.NONE,
          SweatLevel.LOW,
          [8, 8, 8, 8, 8, 8, 8]
        )
        
        const result = findOptimalTimeSlicing(input)
        return result.burnTime ? 
          (result.burnTime.getTime() - input.currentTime.getTime()) / (1000 * 60) : Infinity
      })
      
      // Each skin type should burn slower than the previous (or at least not faster)
      for (let i = 1; i < burnTimes.length; i++) {
        expect(burnTimes[i]).toBeGreaterThanOrEqual(burnTimes[i - 1])
      }
      
      // Type VI should be significantly more resistant than Type I
      expect(burnTimes[5]).toBeGreaterThan(burnTimes[0] * 2)
    })
  })

  describe('Real-World Scenarios', () => {
    it('should handle typical beach day scenario safely', () => {
      // Miami beach: Type II skin, SPF 30, moderate UV throughout day
      const input = createCalculationInput(
        FitzpatrickType.II,
        SPFLevel.SPF_30,
        SweatLevel.MEDIUM,
        [4, 6, 8, 10, 12, 11, 9, 7, 5, 3, 2, 1] // Realistic daily UV curve
      )
      
      const result = findOptimalTimeSlicing(input)
      
      expect(result.points.length).toBeGreaterThan(0)
      expect(result.advice.length).toBeGreaterThan(0)
      
      // Should provide reasonable protection for several hours
      if (result.burnTime) {
        const protectionHours = (result.burnTime.getTime() - input.currentTime.getTime()) / (1000 * 60 * 60)
        expect(protectionHours).toBeGreaterThan(2) // At least 2 hours protection
      }
    })

    it('should handle overcast conditions correctly', () => {
      // Overcast day: lower but still present UV
      const input = createCalculationInput(
        FitzpatrickType.II,
        SPFLevel.NONE,
        SweatLevel.LOW,
        [2, 2, 3, 3, 3, 2, 2, 1] // Overcast UV levels
      )
      
      const result = findOptimalTimeSlicing(input)
      
      // Should allow longer exposure times in low UV
      if (result.burnTime) {
        const burnTimeHours = (result.burnTime.getTime() - input.currentTime.getTime()) / (1000 * 60 * 60)
        expect(burnTimeHours).toBeGreaterThan(1) // Should get at least an hour in low UV
      }
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle zero UV index safely', () => {
      const input = createCalculationInput(
        FitzpatrickType.I,
        SPFLevel.NONE,
        SweatLevel.LOW,
        [0, 0, 0, 0]
      )
      
      const result = findOptimalTimeSlicing(input)
      
      expect(result.points.length).toBeGreaterThan(0)
      // With zero UV, should not reach burn threshold
      expect(result.burnTime).toBeUndefined()
    })

    it('should handle single hour weather data', () => {
      const input = createCalculationInput(
        FitzpatrickType.III,
        SPFLevel.SPF_15,
        SweatLevel.LOW,
        [5, 5] // Need at least 2 hours for time slice creation
      )
      
      const result = findOptimalTimeSlicing(input)
      
      expect(result.points.length).toBeGreaterThan(0)
      expect(result.advice.length).toBeGreaterThan(0)
    })

    it('should provide conservative estimates for safety', () => {
      // Test that algorithm errs on the side of caution
      const input = createCalculationInput(
        FitzpatrickType.II,
        SPFLevel.SPF_30,
        SweatLevel.MEDIUM,
        [8, 8, 8, 8]
      )
      
      const result = findOptimalTimeSlicing(input)
      
      // Should stop calculation before 100% damage for safety
      const lastPoint = result.points[result.points.length - 1]
      if (lastPoint && result.burnTime) {
        expect(lastPoint.totalDamageAtStart + lastPoint.burnCost).toBeLessThanOrEqual(100)
      }
    })
  })

  describe('Algorithm Performance', () => {
    it('should complete calculations in reasonable time', () => {
      const start = Date.now()
      
      const input = createCalculationInput(
        FitzpatrickType.III,
        SPFLevel.SPF_30,
        SweatLevel.MEDIUM,
        Array(24).fill(6) // Full day of data
      )
      
      const result = findOptimalTimeSlicing(input)
      
      const executionTime = Date.now() - start
      
      expect(result.points.length).toBeGreaterThan(0)
      expect(executionTime).toBeLessThan(100) // Should complete in under 100ms
    })

    it('should limit calculation points for performance', () => {
      const input = createCalculationInput(
        FitzpatrickType.VI, // Dark skin - won't burn quickly
        SPFLevel.SPF_100,   // High protection
        SweatLevel.LOW,     // No degradation
        Array(72).fill(8)   // 3 days of high UV
      )
      
      const result = findOptimalTimeSlicing(input)
      
      // Should limit points for performance (MAX_CALCULATION_POINTS = 26, but allow some flexibility)
      expect(result.points.length).toBeLessThanOrEqual(30)
    })
  })
})