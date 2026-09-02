// Fitzpatrick Skin Types
export const FitzpatrickType = {
	I: "I",
	II: "II",
	III: "III",
	IV: "IV",
	V: "V",
	VI: "VI",
} as const;

export type FitzpatrickType =
	(typeof FitzpatrickType)[keyof typeof FitzpatrickType];

export interface SkinTypeConfig {
	color: string;
	subtitle: string;
	description: string;
	coefficient: number;
	hairColors: string[];
	eyeColors: string[];
	freckles: string;
	emoji: string;
}

export const SKIN_TYPE_CONFIG: Record<FitzpatrickType, SkinTypeConfig> = {
	[FitzpatrickType.I]: {
		color: "#F5D0B3",
		subtitle: "Very Light",
		description: "Burns easily, often has freckles",
		coefficient: 2.5, // MED: 200 J/m^2 (Baseline)
		hairColors: ["Red", "Blond", "Brown"],
		eyeColors: ["Blue", "Green", "Gray", "Brown"],
		freckles: "Common",
		emoji: "✋🏻",
	},
	[FitzpatrickType.II]: {
		color: "#E7B592",
		subtitle: "Light",
		description: "Burns easily, tans minimally",
		coefficient: 3.125, // MED: 250 J/m^2 (1.25x Type I)
		hairColors: ["Light", "Dark"],
		eyeColors: ["Blue", "Green", "Hazel", "Brown", "Gray"],
		freckles: "Rare",
		emoji: "✋🏻",
	},
	[FitzpatrickType.III]: {
		color: "#D19F7F",
		subtitle: "Medium",
		description: "Burns moderately, tans gradually",
		coefficient: 4.375, // MED: 350 J/m^2 (1.75x Type I)
		hairColors: ["Brown"],
		eyeColors: ["Blue", "Green", "Brown", "Black"],
		freckles: "None",
		emoji: "✋🏼",
	},
	[FitzpatrickType.IV]: {
		color: "#BB7955",
		subtitle: "Olive",
		description: "Burns rarely, tans easily",
		coefficient: 5.625, // MED: 450 J/m^2 (2.25x Type I)
		hairColors: ["Dark Brown", "Black"],
		eyeColors: ["Blue", "Brown", "Green", "Black"],
		freckles: "None",
		emoji: "✋🏽",
	},
	[FitzpatrickType.V]: {
		color: "#A55E31",
		subtitle: "Brown",
		description: "Very rarely burns, tans deeply",
		coefficient: 7.5, // MED: 600 J/m^2 (3.00x Type I)
		hairColors: ["Black"],
		eyeColors: ["Brown", "Black"],
		freckles: "None",
		emoji: "✋🏾",
	},
	[FitzpatrickType.VI]: {
		color: "#3A1F1C",
		subtitle: "Very Dark",
		description: "Almost never burns, naturally dark",
		coefficient: 12.5, // MED: 1000 J/m^2 (5.00x Type I)
		hairColors: ["Black"],
		eyeColors: ["Black"],
		freckles: "None",
		emoji: "✋🏿",
	},
};

// SPF Levels
export const SPFLevel = {
	NONE: "NONE",
	SPF_15: "SPF_15",
	SPF_30: "SPF_30",
	SPF_50_PLUS: "SPF_50_PLUS",
} as const;

export type SPFLevel = (typeof SPFLevel)[keyof typeof SPFLevel];

export const SPF_CONFIG: Record<
	SPFLevel,
	{ label: string; coefficient: number }
> = {
	[SPFLevel.NONE]: { label: "None", coefficient: 1.0 },
	[SPFLevel.SPF_15]: { label: "SPF 15", coefficient: 15.0 },
	[SPFLevel.SPF_30]: { label: "SPF 30", coefficient: 30.0 },
	[SPFLevel.SPF_50_PLUS]: { label: "SPF 50+", coefficient: 50.0 },
};

// Sweat Levels
export const SweatLevel = {
	LOW: "LOW",
	MEDIUM: "MEDIUM",
	HIGH: "HIGH",
} as const;

export type SweatLevel = (typeof SweatLevel)[keyof typeof SweatLevel];

export const SWEAT_CONFIG: Record<
	SweatLevel,
	{
		label: string;
		startHours: number;
		durationHours: number;
	}
> = {
	[SweatLevel.LOW]: {
		label: "None",
		startHours: 0,
		durationHours: 0,
	},
	[SweatLevel.MEDIUM]: {
		label: "Some",
		startHours: 2.0,
		durationHours: 12.0,
	},
	[SweatLevel.HIGH]: {
		label: "Profuse",
		startHours: 1.0,
		durationHours: 6.0,
	},
};

export const DEFAULT_SWEAT_LEVEL = SweatLevel.LOW;

// Surroundings: ground reflection (albedo) adds to the down-welling UV that
// the UV Index measures. Multipliers follow the WHO Global Solar UV Index
// guide: fresh snow reflects up to 80% and "can double" exposure, dry sand
// ~15%, sea foam ~25%, water/grass <10%. Shade blocks the direct beam but
// roughly half the diffuse sky UV still reaches you.
export const Environment = {
	SHADE: "SHADE",
	OPEN: "OPEN",
	WATER: "WATER",
	SAND: "SAND",
	SNOW: "SNOW",
} as const;

export type Environment = (typeof Environment)[keyof typeof Environment];

export const ENVIRONMENT_CONFIG: Record<
	Environment,
	{ label: string; description: string; uvMultiplier: number }
> = {
	[Environment.SHADE]: {
		label: "Shade",
		description: "Under a tree or umbrella; only diffuse sky UV reaches you",
		uvMultiplier: 0.5,
	},
	[Environment.OPEN]: {
		label: "Grass / city",
		description: "Lawns, soil, pavement reflect less than 10%",
		uvMultiplier: 1.0,
	},
	[Environment.WATER]: {
		label: "Water",
		description: "Lakes, pools, boats; open water reflects ~8%",
		uvMultiplier: 1.1,
	},
	[Environment.SAND]: {
		label: "Beach",
		description: "Dry sand reflects ~15%, surf and foam up to 25%",
		uvMultiplier: 1.2,
	},
	[Environment.SNOW]: {
		label: "Snow",
		description: "Fresh snow reflects up to 80% and can double your dose",
		uvMultiplier: 1.8,
	},
};

export const DEFAULT_ENVIRONMENT = Environment.OPEN;

// Weather Data
export type TemperatureUnit = "fahrenheit" | "celsius";

export interface WeatherOverview {
	id: number;
	main: string;
	description: string;
	icon: string;
}

export interface CurrentWeather {
	dt: number;
	temp: number;
	dewPoint?: number;
	uvi: number;
	weather: WeatherOverview[];
}

export interface HourlyWeather {
	dt: number;
	temp: number;
	dewPoint?: number;
	uvi: number;
	weather: WeatherOverview[];
}

export interface AQIData {
	us_aqi: number;
}

export interface WeatherData {
	current: CurrentWeather;
	hourly: HourlyWeather[];
	temperatureUnit: TemperatureUnit;
	elevation: number; // meters above sea level
	aqi?: AQIData;
	sunrise: string; // ISO8601 datetime
	sunset: string; // ISO8601 datetime
	nextSunrise: string; // ISO8601 datetime
	timezone: string; // IANA timezone string (e.g. "America/Denver")
}

// Geographic Position
export interface Position {
	latitude: number;
	longitude: number;
}

export interface GeolocationState {
	status:
		| "blank"
		| "fetching_location"
		| "fetching_weather"
		| "completed"
		| "error";
	position?: Position;
	placeName?: string;
	countryCode?: string;
	weather?: WeatherData;
	lastFetched?: number; // timestamp when weather was last fetched
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
	environment?: Environment;
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
	environment?: Environment;
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
	EVENING_RISK_CUTOFF_HOUR: 18,
	// Low UVI soft ramp (smoothstep) to reduce perceived over-estimation at UVI 1–2
	LOW_UV_SMOOTHSTEP_ENABLED: true,
	LOW_UV_RAMP_LOW: 1.0,
	LOW_UV_RAMP_HIGH: 3.0,
};

export const TIME_SLICE_OPTIONS = [30, 12, 6, 4];
