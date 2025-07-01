// Fitzpatrick Skin Types
export const FitzpatrickType = {
  I: 'I',
  II: 'II',
  III: 'III',
  IV: 'IV',
  V: 'V',
  VI: 'VI'
} as const

export type FitzpatrickType = typeof FitzpatrickType[keyof typeof FitzpatrickType]

export interface SkinTypeConfig {
  color: string;
  subtitle: string;
  description: string;
  coefficient: number;
}

export const SKIN_TYPE_CONFIG: Record<FitzpatrickType, SkinTypeConfig> = {
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

// SPF Levels
export const SPFLevel = {
  NONE: 'NONE',
  SPF_15: 'SPF_15',
  SPF_30: 'SPF_30',
  SPF_50: 'SPF_50',
  SPF_60: 'SPF_60',
  SPF_80: 'SPF_80',
  SPF_100: 'SPF_100'
} as const

export type SPFLevel = typeof SPFLevel[keyof typeof SPFLevel]

export const SPF_CONFIG: Record<SPFLevel, { label: string; coefficient: number }> = {
  [SPFLevel.NONE]: { label: 'None', coefficient: 1.0 },
  [SPFLevel.SPF_15]: { label: 'SPF 15', coefficient: 15.0 },
  [SPFLevel.SPF_30]: { label: 'SPF 30', coefficient: 30.0 },
  [SPFLevel.SPF_50]: { label: 'SPF 50', coefficient: 50.0 },
  [SPFLevel.SPF_60]: { label: 'SPF 60', coefficient: 60.0 },
  [SPFLevel.SPF_80]: { label: 'SPF 80', coefficient: 80.0 },
  [SPFLevel.SPF_100]: { label: 'SPF 100', coefficient: 100.0 }
};

// Sweat Levels
export const SweatLevel = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH'
} as const

export type SweatLevel = typeof SweatLevel[keyof typeof SweatLevel]

export const SWEAT_CONFIG: Record<SweatLevel, {
  label: string;
  startHours: number;
  durationHours: number;
}> = {
  [SweatLevel.LOW]: {
    label: 'None',
    startHours: 0,
    durationHours: 0
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

// Weather Data
export interface WeatherOverview {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface CurrentWeather {
  dt: number;
  temp: number;
  feels_like: number;
  pressure: number;
  humidity: number;
  uvi: number;
  clouds: number;
  wind_speed: number;
  wind_gust?: number;
  weather: WeatherOverview[];
}

export interface HourlyWeather {
  dt: number;
  temp: number;
  feels_like: number;
  pressure: number;
  humidity: number;
  uvi: number;
  clouds: number;
  wind_speed: number;
  wind_gust?: number;
  weather: WeatherOverview[];
  pop: number;
}

export interface WeatherData {
  current: CurrentWeather;
  hourly: HourlyWeather[];
}

// Geographic Position
export interface Position {
  latitude: number;
  longitude: number;
}

export interface GeolocationState {
  status: 'blank' | 'fetching_location' | 'fetching_weather' | 'completed' | 'error';
  position?: Position;
  placeName?: string;
  weather?: WeatherData;
  error?: string;
}

// Calculation Models
export interface CalculationInput {
  weather: WeatherData;
  placeName: string;
  currentTime: Date;
  skinType: FitzpatrickType;
  spfLevel: SPFLevel;
  sweatLevel: SweatLevel;
}

export interface TimeSlice {
  datetime: Date;
  uvIndex: number;
}

export interface CalculationPoint {
  slice: TimeSlice;
  burnCost: number;
  totalDamageAtStart: number;
}

export interface CalculationResult {
  startTime?: Date;
  burnTime?: Date;
  points: CalculationPoint[];
  timeSlices: number;
  advice: string[];
}

// App State
export interface AppState {
  skinType?: FitzpatrickType;
  spfLevel?: SPFLevel;
  sweatLevel?: SweatLevel;
  geolocation: GeolocationState;
  calculation?: CalculationResult;
}

// Constants
export const CALCULATION_CONSTANTS = {
  BASE_DAMAGE_TIME: 167.0, // Scientific baseline: max_time = 167/UVI minutes (https://meteo.lcd.lu/papers/uv/uvi/uvi_01.html)
  UV_SCALING_FACTOR: 3.0,
  DAMAGE_THRESHOLD: 100.0,
  SAFETY_THRESHOLD: 95.0,
  MAX_CALCULATION_POINTS: 26,
  EVENING_CUTOFF_HOUR: 22,
  MIN_POINTS_FOR_EVENING_STOP: 11,
  MIN_UV_THRESHOLD: 0.001
};

// Time and Duration Constants
export const TIME_CONSTANTS = {
  MILLISECONDS_PER_SECOND: 1000,
  SECONDS_PER_MINUTE: 60,
  MINUTES_PER_HOUR: 60,
  SECONDS_PER_HOUR: 3600,
  MILLISECONDS_PER_HOUR: 3600000,
  TIMER_UPDATE_INTERVAL_MS: 1000, // UI timer refresh rate
  PERCENTAGE_BASE: 100.0, // Base for percentage calculations
} as const;

// Damage and Risk Thresholds
export const DAMAGE_THRESHOLDS = {
  SAFE_EXPOSURE_MAX: 25, // Safe sun exposure threshold
  CAUTION_THRESHOLD: 50, // Warning starts here
  WARNING_THRESHOLD: 75, // More serious warning
  CRITICAL_THRESHOLD: 90, // Critical damage level
  DANGER_THRESHOLD: 95, // Danger - near burn
} as const;

// UV Index Risk Categories (WHO standard)
export const UV_RISK_LEVELS = {
  LOW_MAX: 2, // Low risk: 0-2
  MODERATE_MAX: 5, // Moderate risk: 3-5
  HIGH_MAX: 7, // High risk: 6-7
  VERY_HIGH_MAX: 10, // Very high risk: 8-10
  // 11+ is extreme
} as const;

// SPF and Protection Constants
export const SPF_CONSTANTS = {
  BASE_COEFFICIENT: 1.0, // No protection multiplier
  MIN_PROTECTION_FACTOR: 1.0, // Minimum SPF after degradation
} as const;

// API and Network Configuration
export const API_CONFIG = {
  COORDINATE_PRECISION: 4, // Decimal places for lat/lng
  WEATHER_FORECAST_DAYS: 3, // Days of forecast data
  RATE_LIMIT_STATUS_CODE: 429, // HTTP status for rate limiting
  DEFAULT_ATMOSPHERIC_PRESSURE: 1013, // hPa - standard pressure
  DEFAULT_PRECIPITATION_PROBABILITY: 0, // Default 0% chance of rain
} as const;

export const TIME_SLICE_OPTIONS = [30, 12, 6, 4]; // Time slices per hour for calculations