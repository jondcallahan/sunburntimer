# Time2burn - Complete Technical Specification

## Overview

Time2burn is a web application that calculates safe sun exposure time based on user's skin type, SPF protection, sweating level, location, and real-time weather data. The application prevents sunburn by providing personalized recommendations with interactive visualizations.

## 1. Complete Data Models and Types

### 1.1 Skin Type (Fitzpatrick Scale)
```typescript
enum FitzpatrickType {
  I = 'I',     // Always burns, never tans
  II = 'II',   // Usually burns, tans with difficulty
  III = 'III', // Sometimes mild burns, gradually tans to olive
  IV = 'IV',   // Rarely burns, tans with ease to a moderate brown
  V = 'V',     // Very rarely burns, tans very easily
  VI = 'VI'    // Never burns, tans very easily, deeply pigmented
}

interface SkinTypeConfig {
  color: string;      // UI background color
  subtitle: string;   // Display name
  description: string; // Detailed description
  coefficient: number; // Burn protection multiplier
}

const SKIN_TYPE_CONFIG: Record<FitzpatrickType, SkinTypeConfig> = {
  [FitzpatrickType.I]: {
    color: '#F5D0B3',
    subtitle: 'Light, Pale White',
    description: 'Always burns, never tans',
    coefficient: 2.5
  },
  [FitzpatrickType.II]: {
    color: '#E7B592',
    subtitle: 'White, Fair',
    description: 'Usually burns, tans with difficulty',
    coefficient: 3.0
  },
  [FitzpatrickType.III]: {
    color: '#D19F7F',
    subtitle: 'Medium, White to Olive',
    description: 'Sometimes mild burns, gradually tans to olive',
    coefficient: 4.0
  },
  [FitzpatrickType.IV]: {
    color: '#BB7955',
    subtitle: 'Olive, Brown',
    description: 'Rarely burns, tans with ease to a moderate brown',
    coefficient: 5.0
  },
  [FitzpatrickType.V]: {
    color: '#A55E31',
    subtitle: 'Brown, Dark Brown',
    description: 'Very rarely burns, tans very easily',
    coefficient: 8.0
  },
  [FitzpatrickType.VI]: {
    color: '#3A1F1C',
    subtitle: 'Very Dark, Brown to Black',
    description: 'Never burns, tans very easily, deeply pigmented',
    coefficient: 15.0
  }
};
```

### 1.2 SPF Protection Levels
```typescript
enum SPFLevel {
  NONE = 'NONE',
  SPF_15 = 'SPF_15',
  SPF_30 = 'SPF_30',
  SPF_50 = 'SPF_50',
  SPF_60 = 'SPF_60',
  SPF_80 = 'SPF_80',
  SPF_100 = 'SPF_100'
}

const SPF_CONFIG: Record<SPFLevel, { label: string; coefficient: number }> = {
  [SPFLevel.NONE]: { label: 'None', coefficient: 1.0 },
  [SPFLevel.SPF_15]: { label: 'SPF 15', coefficient: 15.0 },
  [SPFLevel.SPF_30]: { label: 'SPF 30', coefficient: 30.0 },
  [SPFLevel.SPF_50]: { label: 'SPF 50', coefficient: 50.0 },
  [SPFLevel.SPF_60]: { label: 'SPF 60', coefficient: 60.0 },
  [SPFLevel.SPF_80]: { label: 'SPF 80', coefficient: 80.0 },
  [SPFLevel.SPF_100]: { label: 'SPF 100', coefficient: 100.0 }
};
```

### 1.3 Sweating/Activity Levels
```typescript
enum SweatLevel {
  LOW = 'LOW',       // None - no SPF degradation
  MEDIUM = 'MEDIUM', // Some - gradual degradation
  HIGH = 'HIGH'      // Profuse - rapid degradation
}

const SWEAT_CONFIG: Record<SweatLevel, {
  label: string;
  startHours: number;   // When degradation begins
  durationHours: number; // Hours until complete degradation
}> = {
  [SweatLevel.LOW]: {
    label: 'None',
    startHours: 0,
    durationHours: 0 // No degradation
  },
  [SweatLevel.MEDIUM]: {
    label: 'Some',
    startHours: 2.0,
    durationHours: 12.0
  },
  [SweatLevel.HIGH]: {
    label: 'Profuse',
    startHours: 1.0,
    durationHours: 6.0
  }
};
```

### 1.4 Weather Data Structure
```typescript
interface WeatherOverview {
  id: number;
  main: string;
  description: string;
  icon: string;
}

interface CurrentWeather {
  dt: number;           // Unix timestamp
  temp: number;         // Temperature in Fahrenheit
  feels_like: number;   // Feels like temperature
  pressure: number;     // Atmospheric pressure
  humidity: number;     // Humidity percentage
  uvi: number;         // UV Index (key field)
  clouds: number;      // Cloud coverage percentage
  wind_speed: number;  // Wind speed
  wind_gust?: number;  // Optional wind gust
  weather: WeatherOverview[];
}

interface HourlyWeather {
  dt: number;
  temp: number;
  feels_like: number;
  pressure: number;
  humidity: number;
  uvi: number;         // UV Index (critical for calculations)
  clouds: number;
  wind_speed: number;
  wind_gust?: number;
  weather: WeatherOverview[];
  pop: number;         // Probability of precipitation
}

interface WeatherData {
  current: CurrentWeather;
  hourly: HourlyWeather[]; // Up to 48 hours of data
}
```

### 1.5 Geographic Position
```typescript
interface Position {
  latitude: number;
  longitude: number;
}

interface GeolocationState {
  status: 'blank' | 'fetching_location' | 'fetching_weather' | 'completed' | 'error';
  position?: Position;
  placeName?: string;
  weather?: WeatherData;
  error?: string;
}
```

### 1.6 Main Application Data Model
```typescript
interface CalculationInput {
  weather: WeatherData;
  placeName: string;
  currentTime: Date;
  skinType: FitzpatrickType;
  spfLevel: SPFLevel;
  sweatLevel: SweatLevel;
}

interface TimeSlice {
  datetime: Date;
  uvIndex: number;
}

interface CalculationPoint {
  slice: TimeSlice;
  burnCost: number;        // Damage percentage for this slice
  totalDamageAtStart: number; // Cumulative damage up to this point
}

interface CalculationResult {
  startTime?: Date;        // When going outside
  burnTime?: Date;         // When 100% damage reached
  points: CalculationPoint[];
  timeSlices: number;      // Granularity used (4, 6, 12, or 30 per hour)
  advice: string[];
}
```

## 2. Core Algorithms and Mathematical Formulas

### 2.1 Primary Sunburn Calculation Formula
The core sunburn time calculation uses this formula:

```typescript
function calculateBurnTime(
  uvIndex: number,
  skinTypeCoeff: number,
  spfCoeff: number,
  sliceMinutes: number
): number {
  // Core formula from the OCaml implementation
  const safeUV = Math.max(0.001, uvIndex * 3.0); // Prevent division by zero
  const timeForFullBurn = 200.0 * skinTypeCoeff / safeUV * spfCoeff;
  const damagePercentage = sliceMinutes * 100.0 / timeForFullBurn;

  return damagePercentage;
}
```

**Formula Breakdown:**
- `200.0 * skinTypeCoeff`: Base protection time in minutes for 100% skin damage
- `uvIndex * 3.0`: UV intensity multiplier (3.0 is the empirical scaling factor)
- `Math.max(0.001, ...)`: Prevents division by zero for very low UV
- `spfCoeff`: SPF protection factor (time-varying based on sweating)
- `sliceMinutes`: Duration of each time slice (varies: 60, 30, 15, 10 minutes)
- **Result**: Percentage of skin damage accumulated in this time slice

### 2.2 UV Interpolation Algorithm (FIXED)
**CRITICAL BUG IDENTIFIED:** The original OCaml has integer division bug.

```typescript
function interpolateUV(
  startUV: number,
  endUV: number,
  sliceIndex: number,
  totalSlices: number
): number {
  // CORRECT implementation (original OCaml has bug here)
  const gradient = sliceIndex / totalSlices; // Must be float division!
  return startUV * (1.0 - gradient) + endUV * gradient;
}

function createTimeSlices(
  hourlyWeather: HourlyWeather[],
  startTime: Date,
  slicesPerHour: number
): TimeSlice[] {
  const slices: TimeSlice[] = [];
  const sliceMinutes = 60 / slicesPerHour;

  for (let i = 0; i < hourlyWeather.length - 1; i++) {
    const currentHour = hourlyWeather[i];
    const nextHour = hourlyWeather[i + 1];

    for (let j = 0; j < slicesPerHour; j++) {
      const sliceTime = new Date(currentHour.dt * 1000 + j * sliceMinutes * 60000);

      // Only include slices after start time
      if (sliceTime >= startTime) {
        const interpolatedUV = interpolateUV(
          currentHour.uvi,
          nextHour.uvi,
          j,
          slicesPerHour
        );

        slices.push({
          datetime: sliceTime,
          uvIndex: interpolatedUV
        });
      }
    }
  }

  return slices;
}
```

### 2.3 SPF Degradation Over Time
SPF protection degrades based on sweating levels:

```typescript
function calculateSPFAtTime(
  baseSPF: number,
  sweatLevel: SweatLevel,
  timeElapsed: number // hours since application
): number {
  if (sweatLevel === SweatLevel.LOW || baseSPF === 1.0) {
    return baseSPF; // No degradation
  }

  const config = SWEAT_CONFIG[sweatLevel];

  if (timeElapsed <= config.startHours) {
    return baseSPF; // Full protection
  }

  if (timeElapsed >= config.startHours + config.durationHours) {
    return 1.0; // No protection remaining
  }

  // Linear degradation
  const degradationProgress = (timeElapsed - config.startHours) / config.durationHours;
  const remainingProtection = baseSPF * (1.0 - degradationProgress);

  return Math.max(1.0, remainingProtection); // Never below no protection
}
```

### 2.4 Adaptive Time Slicing
The algorithm uses different time slice granularities based on data density:

```typescript
function findOptimalTimeSlicing(input: CalculationInput): CalculationResult {
  const sliceOptions = [30, 12, 6, 4]; // 2, 5, 10, 15 minute intervals

  for (const slicesPerHour of sliceOptions) {
    const result = calculateBurnTime(input, slicesPerHour);

    // Use this granularity if we have <= 26 data points
    if (result.points.length <= 26) {
      return result;
    }
  }

  // Fall back to coarsest granularity
  return calculateBurnTime(input, 4);
}
```

### 2.5 Stopping Conditions
Calculation stops when:

```typescript
function shouldStopCalculation(
  totalDamage: number,
  currentTime: Date,
  pointCount: number
): boolean {
  // Stop at 100% skin damage
  if (totalDamage >= 100.0) {
    return true;
  }

  // Stop after 10 PM if we have enough data points
  const hour = currentTime.getHours();
  if (pointCount > 11 && hour >= 22) {
    return true;
  }

  return false;
}
```

## 3. Complete Calculation Algorithm

```typescript
function calculateBurnTime(
  input: CalculationInput,
  slicesPerHour: number
): CalculationResult {
  const sliceMinutes = 60 / slicesPerHour;
  const timeSlices = createTimeSlices(input.weather.hourly, input.currentTime, slicesPerHour);

  const points: CalculationPoint[] = [];
  let totalDamage = 0;
  let pointCount = 0;

  for (const slice of timeSlices) {
    // Calculate time-varying SPF
    const hoursElapsed = (slice.datetime.getTime() - input.currentTime.getTime()) / (1000 * 60 * 60);
    const spfAtTime = calculateSPFAtTime(
      SPF_CONFIG[input.spfLevel].coefficient,
      input.sweatLevel,
      hoursElapsed
    );

    // Calculate damage for this slice
    const skinCoeff = SKIN_TYPE_CONFIG[input.skinType].coefficient;
    const damagePercent = calculateBurnTime(slice.uvIndex, skinCoeff, spfAtTime, sliceMinutes);

    const point: CalculationPoint = {
      slice,
      burnCost: damagePercent,
      totalDamageAtStart: totalDamage
    };

    points.push(point);
    totalDamage += damagePercent;
    pointCount++;

    // Check stopping conditions
    if (shouldStopCalculation(totalDamage, slice.datetime, pointCount)) {
      break;
    }
  }

  return {
    startTime: timeSlices[0]?.datetime,
    burnTime: totalDamage >= 100 ? points[points.length - 1]?.slice.datetime : undefined,
    points,
    timeSlices: slicesPerHour,
    advice: generateAdvice(input, points)
  };
}
```

## 4. External API Integrations

### 4.1 OpenWeatherMap One Call API 3.0
```typescript
interface WeatherAPIParams {
  lat: number;
  lon: number;
  exclude: string; // 'minutely,daily,alerts'
  lang: string;    // 'en'
  units: string;   // 'imperial'
  appid: string;   // API key
}

async function fetchWeatherData(position: Position): Promise<WeatherData> {
  const url = 'https://api.openweathermap.org/data/3.0/onecall';
  const params: WeatherAPIParams = {
    lat: position.latitude,
    lon: position.longitude,
    exclude: 'minutely,daily,alerts',
    lang: 'en',
    units: 'imperial',
    appid: process.env.OPENWEATHER_API_KEY // Move to env variable
  };

  const response = await fetch(`${url}?${new URLSearchParams(params as any)}`);

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }

  return response.json();
}
```

**Security Note**: The original hardcoded API key should be moved to environment variables.

### 4.2 Mapbox Geocoding API
```typescript
interface MapboxFeature {
  place_name: string;
  center: [number, number]; // [longitude, latitude]
}

interface MapboxResponse {
  features: MapboxFeature[];
}

async function geocodeAddress(query: string): Promise<{ placeName: string; position: Position }> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`;
  const params = {
    autocomplete: 'true',
    fuzzyMatch: 'true',
    language: 'en',
    limit: '1',
    routing: 'false',
    types: 'district,place,locality,neighborhood,address,poi',
    worldview: 'us',
    access_token: process.env.MAPBOX_API_KEY // Move to env variable
  };

  const response = await fetch(`${url}?${new URLSearchParams(params)}`);

  if (!response.ok) {
    throw new Error(`Geocoding error: ${response.status}`);
  }

  const data: MapboxResponse = await response.json();

  if (data.features.length === 0) {
    throw new Error('Location not found');
  }

  const feature = data.features[0];
  return {
    placeName: feature.place_name,
    position: {
      latitude: feature.center[1],
      longitude: feature.center[0]
    }
  };
}
```

### 4.3 Browser Geolocation API
```typescript
interface GeolocationOptions {
  enableHighAccuracy: boolean;
  timeout: number;      // milliseconds
  maximumAge: number;   // milliseconds
}

async function getCurrentPosition(): Promise<Position> {
  const options: GeolocationOptions = {
    enableHighAccuracy: true,
    timeout: 10000,        // 10 seconds
    maximumAge: 600000     // 10 minutes
  };

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        const errorMessages = {
          [error.PERMISSION_DENIED]: 'Location access denied',
          [error.POSITION_UNAVAILABLE]: 'Location unavailable',
          [error.TIMEOUT]: 'Location request timeout'
        };
        reject(new Error(errorMessages[error.code] || 'Location error'));
      },
      options
    );
  });
}
```

## 5. UI Components Specification

### 5.1 Application Layout
```typescript
interface AppState {
  skinType?: FitzpatrickType;
  spfLevel?: SPFLevel;
  sweatLevel?: SweatLevel;
  geolocation: GeolocationState;
  calculation?: CalculationResult;
}

// Main component structure
function App() {
  return (
    <div className="container-fluid">
      <h3>Time to Sunburn</h3>

      <Section
        title="1. Fitzpatrick skin scale"
        subtitle="Your skin's sensitivity to UV. Click on one."
      >
        <SkinTypeSelector />
      </Section>

      <Section title="2. Sunscreen">
        <SPFSelector />
        {spfLevel !== SPFLevel.NONE && <SweatLevelSelector />}
      </Section>

      <Section
        title="3. Time & Place"
        subtitle="Used for cloud coverage and the angle of the sun."
      >
        <LocationSelector />
      </Section>

      {calculation && (
        <Section title="Results">
          <ResultsDisplay result={calculation} />
          <BurnChart result={calculation} />
        </Section>
      )}
    </div>
  );
}
```

### 5.2 Skin Type Selection Component
```typescript
interface SkinTypeCardProps {
  type: FitzpatrickType;
  selected: boolean;
  onSelect: (type: FitzpatrickType) => void;
}

function SkinTypeCard({ type, selected, onSelect }: SkinTypeCardProps) {
  const config = SKIN_TYPE_CONFIG[type];

  return (
    <div
      className={`card ${selected ? 'selected' : ''}`}
      onClick={() => onSelect(type)}
      style={{
        backgroundColor: config.color,
        boxShadow: selected ? 'inset 0 0 1rem #706666' : undefined
      }}
    >
      <div className="card-header">
        <span className="badge">{type}</span>
        {selected && <CheckIcon />}
      </div>
      <div className="card-body">
        <div className="subtitle">{config.subtitle}</div>
        <div className="description">{config.description}</div>
      </div>
    </div>
  );
}

function SkinTypeSelector() {
  return (
    <div className="skin-type-grid">
      {Object.values(FitzpatrickType).map(type => (
        <SkinTypeCard key={type} type={type} />
      ))}
    </div>
  );
}
```

### 5.3 Chart Visualization Component
```typescript
interface ChartData {
  labels: string[];           // Time labels
  withoutSunscreen: number[]; // Damage percentages
  withSunscreen?: number[];   // Optional: with SPF data
}

function BurnChart({ result }: { result: CalculationResult }) {
  const chartData: ChartData = {
    labels: result.points.map(p => formatTime(p.slice.datetime)),
    withoutSunscreen: result.points.map(p => p.totalDamageAtStart),
    withSunscreen: input.spfLevel !== SPFLevel.NONE ?
      result.points.map(p => p.totalDamageAtStart) : undefined
  };

  const chartConfig = {
    type: 'line',
    data: {
      labels: chartData.labels,
      datasets: [
        {
          label: 'Without sunscreen',
          data: chartData.withoutSunscreen,
          borderColor: '#FE650D',
          backgroundColor: createGradient(), // Gradient from white to red
          fill: true
        },
        ...(chartData.withSunscreen ? [{
          label: 'With sunscreen',
          data: chartData.withSunscreen,
          borderColor: '#3ADA05',
          fill: false
        }] : [])
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 0,
          max: 100,
          title: { display: true, text: 'Skin Damage (%)' }
        },
        x: {
          title: { display: true, text: 'Time' }
        }
      }
    }
  };

  return <Line data={chartConfig.data} options={chartConfig.options} />;
}
```

## 6. Business Logic and Validation Rules

### 6.1 Input Validation
```typescript
function validateInput(state: AppState): string[] {
  const errors: string[] = [];

  if (!state.skinType) {
    errors.push('Please select your skin type');
  }

  if (state.spfLevel === undefined) {
    errors.push('Please select SPF level');
  }

  if (state.spfLevel !== SPFLevel.NONE && !state.sweatLevel) {
    errors.push('Please select sweating level');
  }

  if (state.geolocation.status !== 'completed') {
    errors.push('Please set your location');
  }

  return errors;
}
```

### 6.2 Recommendation Generation
```typescript
function generateAdvice(input: CalculationInput, points: CalculationPoint[]): string[] {
  const advice: string[] = [];

  // Base advice for SPF users
  if (input.spfLevel !== SPFLevel.NONE) {
    advice.push('Reapply sunscreen after swimming or excessive sweating');
  }

  // Safety assessment
  const lastPoint = points[points.length - 1];
  if (!lastPoint) return advice;

  if (lastPoint.totalDamageAtStart < 95.0) {
    // Safe for extended exposure
    if (input.spfLevel === SPFLevel.NONE) {
      return advice;
    } else {
      advice.push('With these precautions you can spend the rest of the day out in the sun, enjoy! ☀️');
    }
  } else {
    // Risk of burning
    if (input.spfLevel === SPFLevel.NONE) {
      advice.push('You should try again with sunscreen');
    } else if (input.spfLevel === SPFLevel.SPF_100) {
      advice.push('Limit your time in the sun today');
    } else {
      advice.push('Try using a stronger sunscreen or limit your time in the sun today');
    }
  }

  return advice;
}
```

## 7. Constants and Configuration

### 7.1 Calculation Constants
```typescript
const CALCULATION_CONSTANTS = {
  BASE_DAMAGE_TIME: 200.0,        // Base minutes for 100% damage
  UV_SCALING_FACTOR: 3.0,         // UV intensity multiplier
  DAMAGE_THRESHOLD: 100.0,        // Maximum skin damage percentage
  SAFETY_THRESHOLD: 95.0,         // Early warning threshold
  MAX_CALCULATION_POINTS: 26,     // UI performance limit
  EVENING_CUTOFF_HOUR: 22,        // 10 PM stop time
  MIN_POINTS_FOR_EVENING_STOP: 11, // Minimum points before evening cutoff
  MIN_UV_THRESHOLD: 0.001         // Prevent division by zero
};
```

### 7.2 Time Slice Configurations
```typescript
const TIME_SLICE_OPTIONS = [30, 12, 6, 4]; // Slices per hour: 2, 5, 10, 15 min intervals
```

### 7.3 Chart Styling
```typescript
const CHART_CONFIG = {
  MAX_WIDTH: 650,
  ASPECT_RATIO: 2.0,
  COLORS: {
    WITHOUT_SPF: '#FE650D',
    WITH_SPF: '#3ADA05',
    GRADIENT_STOPS: [
      { offset: 0.0, color: '#FFFFFF' },   // White
      { offset: 0.6, color: '#FFF75D' },  // Light yellow
      { offset: 0.80, color: '#FFC11F' }, // Yellow
      { offset: 0.85, color: '#FE650D' }, // Orange
      { offset: 0.90, color: '#F33C04' }, // Red-orange
      { offset: 0.95, color: '#DA1F05' }, // Red
      { offset: 1.0, color: '#A10100' }   // Dark red
    ]
  }
};
```

### 7.4 Local Storage Keys
```typescript
const STORAGE_KEYS = {
  SKIN_TYPE: 'skin-type',
  SPF_LEVEL: 'spf-level',
  SWEAT_LEVEL: 'sweat-level'
};
```

## 8. Modern Implementation Recommendations

### 8.1 Technology Stack
- **Frontend**: React 18+ with TypeScript
- **State Management**: Zustand or Redux Toolkit
- **UI Framework**: Tailwind CSS + Headless UI
- **Charts**: Chart.js 4.x or Recharts
- **HTTP Client**: Axios with interceptors
- **Testing**: Vitest + React Testing Library
- **Build Tool**: Vite
- **PWA**: Workbox for offline support

### 8.2 Architecture Patterns
```typescript
// State machine for location workflow (using XState)
const locationMachine = createMachine({
  id: 'location',
  initial: 'idle',
  states: {
    idle: {
      on: { REQUEST_LOCATION: 'fetching_location' }
    },
    fetching_location: {
      invoke: {
        src: 'getCurrentPosition',
        onDone: { target: 'fetching_weather', actions: 'setPosition' },
        onError: { target: 'error', actions: 'setError' }
      }
    },
    fetching_weather: {
      invoke: {
        src: 'getWeatherData',
        onDone: { target: 'completed', actions: 'setWeather' },
        onError: { target: 'error', actions: 'setError' }
      }
    },
    completed: {},
    error: {
      on: { RETRY: 'idle' }
    }
  }
});
```

### 8.3 Performance Optimizations
- Memoize calculation results with React.useMemo
- Debounce user inputs
- Lazy load chart library
- Service worker for weather data caching
- Progressive image loading

### 8.4 Accessibility Features
- ARIA labels for all interactive elements
- Keyboard navigation support
- Screen reader friendly descriptions
- High contrast mode support
- Reduced motion preferences

### 8.5 Security Improvements
- Move API keys to environment variables
- Implement request rate limiting
- Add HTTPS enforcement
- Sanitize user inputs
- Implement CSP headers

## 9. Critical Bug Fixes Required

### 9.1 UV Interpolation Bug (HIGH PRIORITY)
**Original bug**: Integer division in OCaml causing no interpolation
**Fix**: Use proper float division in UV interpolation
**Impact**: Up to 89% error in burn time calculations

### 9.2 SPF Degradation Lower Bound
**Issue**: SPF can go negative with heavy sweating
**Fix**: Ensure SPF never drops below 1.0 (no protection)

### 9.3 API Security
**Issue**: Hardcoded API keys in source code
**Fix**: Move to environment variables with proper key rotation

This specification provides complete technical documentation for recreating Time2burn with modern technology while fixing critical bugs and improving user experience.
