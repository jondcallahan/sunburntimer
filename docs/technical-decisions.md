# Technical Decisions

This document records key technical decisions made during development of the Sunburn Timer application.

## State Management: Zustand vs TanStack Query

**Decision**: Continue using Zustand for all state management, including data fetching

**Date**: 2025-07-12

**Context**: 
- Existing implementation uses Zustand with persistence for user settings and API data
- Considered migrating data fetching to TanStack Query for potential benefits

**Analysis**:
- **Current approach**: Zustand + manual async functions in services layer
- **Alternative considered**: TanStack Query for data fetching + Zustand for UI state

**Rationale**:
1. **Simple data needs** - Only 3 API endpoints (weather, geolocation, reverse geocoding)
2. **Infrequent updates** - Weather data fetched once per session, not continuously
3. **Persistence is critical** - User settings (skin type, SPF, location) must persist between sessions
4. **Current pattern works well** - Clean separation between services and state management
5. **No complex caching needs** - App doesn't require background refetching or complex cache invalidation

**Trade-offs**:
- **Benefits of staying with Zustand**: Simpler architecture, fewer dependencies, existing persistence works well
- **Benefits of TanStack Query**: Automatic caching, background refetching, request deduplication, built-in loading states
- **Conclusion**: TanStack Query's benefits don't justify the complexity for this use case

**Implementation**:
- Continue using Zustand's `persist` middleware for user preferences and location data
- Keep weather data fetching in services layer with manual error handling
- Maintain current pattern of custom hooks (like `useLocationRefresh`) for triggering data fetches

**Future considerations**:
- If the app evolves to include frequent API calls, real-time weather updates, or complex data relationships, TanStack Query should be reconsidered
- Current architecture can coexist with TanStack Query if partial migration becomes beneficial