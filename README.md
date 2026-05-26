# SunburnTimer - Smart Sun Exposure Calculator

A modern web application that estimates sun exposure time based on your skin type, SPF protection, sweating level, planned start time, activity length, and live weather data. Built with React, TypeScript, and modern tooling.

## Features

- **Fitzpatrick Skin Type Selection**: Choose from 6 scientifically-based skin types
- **SPF Protection Modeling**: Account for different sunscreen strengths and degradation over time
- **Activity Level Consideration**: Factor in sweating that reduces SPF effectiveness
- **Real-time Weather Data**: Uses Open-Meteo API for UV index and weather conditions
- **Plan Ahead**: Choose "now" or a later start time before you go outside
- **Visible Unit Switching**: Switch between Fahrenheit/miles and Celsius/kilometers from the main planner
- **SPF Recommendation**: Enter time outside and a skin-change goal to get a suggested SPF level
- **Estimate Caveats**: Shows clear notes and source links because UV risk varies by person and conditions
- **Interactive Visualization**: Chart.js displays skin damage accumulation over time
- **Activity-Focused UV Chart**: Shows UV for the planned activity window by default, with a local-day view for context
- **Current UV Anchoring**: Uses the observed current UV reading for the first forecast segment when it differs from hourly forecast data
- **Skin Recovery Model**: Uses a leaky-bucket recovery model so long low-UV gaps can reduce accumulated burn risk
- **Google Weather Preview**: `/google` can switch to Google Weather through a Vercel function when `GOOGLE_MAPS_API_KEY` is configured
- **Location Services**: Support for both GPS location and manual address entry
- **Responsive Design**: Beautiful UI built with shadcn/ui components
- **Progressive Web App Ready**: Modern architecture with offline capabilities

## Scientific Accuracy

This implementation fixes critical bugs from the original OCaml version:

- **UV Interpolation Fix**: Corrects integer division bug that caused up to 89% error in calculations
- **Observed UV Anchoring**: Anchors the first active segment to the live UV reading instead of blindly trusting the hourly forecast point
- **Leaky-Bucket Recovery**: Applies slow UVB recovery over roughly 24-30 hours, so damage can drain during long no-UV breaks
- **SPF Degradation Modeling**: Proper lower bounds to prevent negative protection values
- **Time-based Calculations**: Accurate UV scaling and damage accumulation algorithms

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite
- **UI Components**: shadcn/ui, Tailwind CSS
- **State Management**: Zustand with persistence
- **Charts**: Chart.js with react-chartjs-2
- **APIs**: Open-Meteo, BigDataCloud Geocoding
- **Build Tools**: Vite, Biome, TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- No API keys required - uses free Open-Meteo and BigDataCloud APIs

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sunburntimer
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Start the development server**
   ```bash
   bun dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

### Building for Production

```bash
bun run build
```

## Usage

1. **Plan the outing**: Choose now or later, set time outside, pick units, and choose your skin-change goal
2. **Select Your Skin Type**: Choose from the Fitzpatrick scale (I-VI) based on your skin's reaction to sun exposure
3. **Choose SPF Level**: Select your sunscreen's SPF rating or "None" if not using sunscreen
4. **Set Activity Level**: Indicate how much you'll be sweating, because this affects SPF wear-off
5. **Set Location**: Use GPS or enter a city/address for weather data
6. **Review the result**: Check burn time, estimated dose, charts, and the recommended SPF for your plan
7. **Inspect UV timing**: Use the UV chart's Activity view for your planned timespan or Day view for the same local calendar day

## Estimate Notes

SunburnTimer gives estimates, not medical advice. A tan means UV exposure and skin damage risk, even if the app labels a goal as "light tan" or "more tan". The SPF recommendation uses forecast UV Index, Fitzpatrick skin type, sunscreen level, sweat wear-off, and planned time outside to choose a protection level that fits the selected risk budget.

The app links to CDC, FDA, and American Academy of Dermatology guidance in the planner. Their guidance is still simple: protect skin from UV, use broad-spectrum sunscreen, reapply it at least every 2 hours, and reapply after sweating, swimming, or towel drying.

## Core Algorithm

The application uses scientifically-based formulas:

```typescript
// Core burn time calculation
const safeUV = Math.max(0.001, uvIndex * 3.0)
const timeForFullBurn = 200.0 * skinTypeCoeff / safeUV * spfCoeff
const damagePercentage = sliceMinutes * 100.0 / timeForFullBurn
```

Key improvements over the original:
- **Fixed UV interpolation**: Uses proper float division instead of integer division
- **SPF degradation modeling**: Linear degradation based on sweating level and time
- **Adaptive time slicing**: Automatically adjusts granularity for optimal performance

## Architecture

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui base components
│   ├── SkinTypeSelector.tsx
│   ├── SPFSelector.tsx
│   ├── SweatLevelSelector.tsx
│   ├── LocationSelector.tsx
│   ├── PlanControls.tsx
│   ├── ResultsDisplay.tsx
│   ├── BurnChart.tsx
│   ├── UVChart.tsx
│   ├── SunTimer.tsx
│   ├── RelativeTime.tsx
│   └── StepHeader.tsx
├── hooks/              # Custom React hooks
│   ├── useCurrentTime.ts
│   └── useLocationRefresh.ts
├── services/           # External API services
│   ├── weather.ts      # Open-Meteo integration
│   ├── geolocation.ts  # GPS and BigDataCloud geocoding
│   ├── geocoding.ts    # Manual location search
│   └── aqi.ts          # Air quality data
├── lib/               # Utility functions
│   ├── units.ts
│   ├── uvSeries.ts
│   └── utils.ts
├── store.ts           # Zustand state management
├── types.ts           # TypeScript definitions
├── calculations.ts    # Core algorithms
├── calculations.test.ts # Algorithm tests
└── App.tsx           # Main application
```

## API Integration

### Open-Meteo
- **Endpoint**: Free Weather API
- **Data**: Current weather, hourly forecasts, UV index
- **Rate Limits**: No API key required, generous free tier

### Google Weather Preview
- **Endpoint**: Google Weather hourly forecast API through `/api/google-weather`
- **Route**: Open `/google` to reveal the provider switch
- **Requirement**: Set `GOOGLE_MAPS_API_KEY` in Vercel preview or production
- **Notes**: Open-Meteo is still used for elevation, sun timing, and AQI metadata

### BigDataCloud
- **Endpoint**: Free Reverse Geocoding API
- **Features**: Location-based city/country lookup
- **Rate Limits**: No API key required, free tier available

## Security & Privacy

- No API keys required - uses free public APIs
- No personal data is stored on servers
- User preferences saved locally with Zustand persist
- HTTPS enforced for all API calls

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Use shadcn/ui components when possible
- Write type-safe code with proper error handling
- Test calculations thoroughly
- Maintain accessibility standards

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Based on the original OCaml sunburn calculator
- Original app by [Jon Callahan](https://joncallahan.com) in [jondcallahan/sunburntimer](https://github.com/jondcallahan/sunburntimer)
- Additions by [@coloboxp](https://github.com/coloboxp)
- Fitzpatrick skin type scale for scientific accuracy
- Open-Meteo and BigDataCloud for reliable, free data services
- shadcn/ui for beautiful, accessible components

## Support

For issues, feature requests, or questions:
- Open an issue on GitHub
- Check the [troubleshooting guide](docs/troubleshooting.md)
- Review the [API documentation](docs/api.md)
