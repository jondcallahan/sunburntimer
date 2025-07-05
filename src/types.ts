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
    coefficient: 2.5 // MED: 200 J/m^2 (Baseline)
  },
  [FitzpatrickType.II]: {
    color: '#E7B592',
    subtitle: 'White, Fair',
    description: 'Usually burns, tans with difficulty',
    coefficient: 3.125 // MED: 250 J/m^2 (1.25x Type I)
  },
  [FitzpatrickType.III]: {
    color: '#D19F7F',
    subtitle: 'Medium, White to Olive',
    description: 'Sometimes mild burns, gradually tans to olive',
    coefficient: 4.375 // MED: 350 J/m^2 (1.75x Type I)
  },
  [FitzpatrickType.IV]: {
    color: '#BB7955',
    subtitle: 'Olive, Brown',
    description: 'Rarely burns, tans with ease to a moderate brown',
    coefficient: 5.625 // MED: 450 J/m^2 (2.25x Type I)
  },
  [FitzpatrickType.V]: {
    color: '#A55E31',
    subtitle: 'Brown, Dark Brown',
    description: 'Very rarely burns, tans very easily',
    coefficient: 7.5 // MED: 600 J/m^2 (3.00x Type I)
  },
  [FitzpatrickType.VI]: {
    color: '#3A1F1C',
    subtitle: 'Very Dark, Brown to Black',
    description: 'Never burns, tans very easily, deeply pigmented',
    coefficient: 12.5 // MED: 1000 J/m^2 (5.00x Type I)
  }
};

// SPF Levels
export const SPFLevel = {
  NONE: 'NONE',
  SPF_15: 'SPF_15',
  SPF_30: 'SPF_30',
  SPF_50_PLUS: 'SPF_50_PLUS'
} as const

export type SPFLevel = typeof SPFLevel[keyof typeof SPFLevel]

export const SPF_CONFIG: Record<SPFLevel, { label: string; coefficient: number }> = {
  [SPFLevel.NONE]: { label: 'None', coefficient: 1.0 },
  [SPFLevel.SPF_15]: { label: 'SPF 15', coefficient: 15.0 },
  [SPFLevel.SPF_30]: { label: 'SPF 30', coefficient: 30.0 },
  [SPFLevel.SPF_50_PLUS]: { label: 'SPF 50+', coefficient: 50.0 }
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
  BASE_DAMAGE_TIME: 200.0,
  UV_SCALING_FACTOR: 3.0,
  DAMAGE_THRESHOLD: 100.0,
  SAFETY_THRESHOLD: 95.0,
  MAX_CALCULATION_POINTS: 26,
  EVENING_CUTOFF_HOUR: 22,
  MIN_POINTS_FOR_EVENING_STOP: 11,
  MIN_UV_THRESHOLD: 0.001,
  MEANINGFUL_UV_THRESHOLD: 2.0,
  HIGH_RISK_TIME_LIMIT_HOURS: 4,
  EVENING_RISK_CUTOFF_HOUR: 18
};

export const TIME_SLICE_OPTIONS = [30, 12, 6, 4];