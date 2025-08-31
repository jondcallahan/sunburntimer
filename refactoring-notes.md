# Calculations.ts Refactoring Notes

## Current Issues

### Function Complexity
- `calculateBurnTimeWithSlices` (lines 196-335): 140 lines, multiple responsibilities
- `createTimeSlices`: nested loops with complex conditions
- Mixed concerns: damage calculation, threshold detection, interpolation all in one place

### Variable Naming
- `damagePercent` vs `totalDamage` vs `damageNeeded` - unclear relationship
- `effectiveSliceMinutes` - what makes it "effective"?
- `sliceDamageRatio` - ratio of what to what?

## Proposed Refactoring

### Break Down `calculateBurnTimeWithSlices`

**Extract functions:**
1. `processTimeSlice(slice, input, isFirstSlice)` - single slice damage calculation
2. `detectBurnThreshold(damageBeforeSlice, damageAfterSlice, slice)` - threshold crossing logic
3. `handleFirstSliceProration(slice, currentTime, sliceMinutes)` - proration logic
4. `interpolateBurnTime(slice, damageBeforeSlice, damagePercent, effectiveSliceMinutes)` - exact burn time calculation

**Main loop becomes:**
```typescript
for (const slice of timeSlices) {
  const sliceCalc = processTimeSlice(slice, input, isFirstSlice);
  
  if (sliceCalc.crossesThreshold) {
    burnTime = interpolateBurnTime(slice, totalDamage, sliceCalc.damage, sliceCalc.duration);
    break;
  }
  
  totalDamage += sliceCalc.damage;
  points.push(createCalculationPoint(slice, sliceCalc));
}
```

### Improve Variable Names
- `damagePercent` → `sliceDamagePercent`
- `effectiveSliceMinutes` → `actualSliceDuration`
- `sliceDamageRatio` → `thresholdProgressRatio`
- `damageBeforeSlice` → `cumulativeDamage`
- `damageAfterSlice` → `projectedDamage`

### Add Intermediate Types
```typescript
interface SliceCalculation {
  damage: number;
  duration: number;
  crossesThreshold: boolean;
}

interface ThresholdCrossing {
  burnTime: Date;
  interpolatedPoint: CalculationPoint;
}
```

### Benefits
- Each function has single responsibility
- Easier to test individual pieces
- Clearer data flow
- More maintainable
- Better error handling opportunities

## Priority
- High: Extract burn threshold detection logic
- Medium: Extract slice processing logic  
- Low: Variable renaming (can be done gradually)