# SunburnTimer - Smart Sun Exposure Calculator

A modern web application that calculates safe sun exposure time based on your skin type, SPF protection, sweating level, and real-time weather data. Built with React, TypeScript, and modern tooling.

## Features

- **Fitzpatrick Skin Type Selection**: Choose from 6 scientifically-based skin types
- **SPF Protection Modeling**: Account for different sunscreen strengths and degradation over time
- **Activity Level Consideration**: Factor in sweating that reduces SPF effectiveness
- **Real-time Weather Data**: Uses OpenWeatherMap API for UV index and conditions
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
- **APIs**: OpenWeatherMap, Mapbox Geocoding
- **Build Tools**: Vite, ESLint, TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- API keys from:
  - [OpenWeatherMap](https://openweathermap.org/api) (free tier available)
  - [Mapbox](https://account.mapbox.com/access-tokens/) (free tier available)

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

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your API keys:
   ```env
   VITE_OPENWEATHER_API_KEY=your_openweather_api_key_here
   VITE_MAPBOX_API_KEY=your_mapbox_access_token_here
   ```

4. **Start the development server**
   ```bash
   bun dev
   # or
   npm run dev
   ```

5. **Open your browser**
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
│   └── BurnChart.tsx
├── services/           # External API services
│   ├── weather.ts      # OpenWeatherMap integration
│   └── geolocation.ts  # GPS and geocoding
├── store.ts           # Zustand state management
├── types.ts           # TypeScript definitions
├── calculations.ts    # Core algorithms
└── App.tsx           # Main application
```

## API Integration

### OpenWeatherMap
- **Endpoint**: One Call API 3.0
- **Data**: Current weather, hourly forecasts, UV index
- **Rate Limits**: 1,000 calls/day (free tier)

### Mapbox
- **Endpoint**: Geocoding API
- **Features**: Address search, reverse geocoding
- **Rate Limits**: 100,000 requests/month (free tier)

## Security & Privacy

- API keys are environment variables (not hardcoded)
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
- OpenWeatherMap and Mapbox for reliable data services
- shadcn/ui for beautiful, accessible components

## Support

For issues, feature requests, or questions:
- Open an issue on GitHub
- Check the [troubleshooting guide](docs/troubleshooting.md)
- Review the [API documentation](docs/api.md)