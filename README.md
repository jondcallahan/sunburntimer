# SunburnTimer - Smart Sun Exposure Calculator

A modern web application that calculates safe sun exposure time based on your skin type, SPF protection, sweating level, and real-time weather data. Built with React, TypeScript, and modern tooling.

## Features

- **Fitzpatrick Skin Type Selection**: Choose from 6 scientifically-based skin types
- **SPF Protection Modeling**: Account for different sunscreen strengths and degradation over time
- **Activity Level Consideration**: Factor in sweating that reduces SPF effectiveness
- **Real-time Weather Data**: Uses Open-Meteo API for UV index and weather conditions
- **Interactive Visualization**: Chart.js displays skin damage accumulation over time
- **Location Services**: Support for both GPS location and manual address entry
- **Responsive Design**: Beautiful UI built with shadcn/ui components
- **Progressive Web App Ready**: Modern architecture with offline capabilities

## Scientific Accuracy

This implementation fixes critical bugs from the original OCaml version:

- **UV Interpolation Fix**: Corrects integer division bug that caused up to 89% error in calculations
- **SPF Degradation Modeling**: Proper lower bounds to prevent negative protection values
- **Time-based Calculations**: Accurate UV scaling and damage accumulation algorithms

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: shadcn/ui, Tailwind CSS
- **State Management**: Zustand with persistence
- **Charts**: Chart.js with react-chartjs-2
- **APIs**: Open-Meteo, BigDataCloud Geocoding
- **Build Tools**: Vite, ESLint, TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- No API keys required - uses free Open-Meteo and BigDataCloud APIs

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sunburn-calc
   ```

2. **Install dependencies**
   ```bash
   bun install
   # or
   npm install
   ```

3. **Start the development server**
   ```bash
   bun dev
   # or
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

### Building for Production

```bash
bun run build
# or
npm run build
```

## Usage

1. **Select Your Skin Type**: Choose from the Fitzpatrick scale (I-VI) based on your skin's reaction to sun exposure
2. **Choose SPF Level**: Select your sunscreen's SPF rating or "None" if not using sunscreen
3. **Set Activity Level**: Indicate how much you'll be sweating (affects SPF degradation)
4. **Set Location**: Use GPS or enter a city/address for weather data
5. **Calculate**: Get your personalized burn time and safety recommendations

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
│   └── geolocation.ts  # GPS and BigDataCloud geocoding
├── lib/               # Utility functions
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
- Fitzpatrick skin type scale for scientific accuracy
- Open-Meteo and BigDataCloud for reliable, free data services
- shadcn/ui for beautiful, accessible components

## Support

For issues, feature requests, or questions:
- Open an issue on GitHub
- Check the [troubleshooting guide](docs/troubleshooting.md)
- Review the [API documentation](docs/api.md)