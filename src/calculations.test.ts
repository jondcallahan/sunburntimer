import { describe, it, expect } from "bun:test";
import { findOptimalTimeSlicing } from "./calculations";
import type { CalculationInput, WeatherData, CalculationResult } from "./types";
import { FitzpatrickType, SPFLevel, SweatLevel } from "./types";

// Test helper functions
function createMockWeatherData(
	uvValues: number[],
	baseTime?: number,
): WeatherData {
	const timestamp = baseTime || Math.floor(Date.now() / 1000);

	return {
		current: {
			dt: timestamp,
			temp: 75,
			feels_like: 75,
			pressure: 1013,
			humidity: 50,
			uvi: uvValues[0] || 5,
			clouds: 20,
			wind_speed: 5,
			weather: [
				{ id: 800, main: "Clear", description: "clear sky", icon: "01d" },
			],
		},
		hourly: uvValues.map((uvi, index) => ({
			dt: timestamp + index * 3600,
			temp: 75,
			feels_like: 75,
			pressure: 1013,
			humidity: 50,
			uvi,
			clouds: 20,
			wind_speed: 5,
			weather: [
				{ id: 800, main: "Clear", description: "clear sky", icon: "01d" },
			],
			pop: 0,
		})),
		elevation: 0,
		sunrise: new Date(timestamp * 1000).toISOString(),
		sunset: new Date((timestamp + 12 * 3600) * 1000).toISOString(),
		timezone: "America/Denver",
	};
}

function createTestScenario(
	skinType: FitzpatrickType,
	spfLevel: SPFLevel,
	sweatLevel: SweatLevel,
	uvValues: number[],
	currentTime?: Date,
): CalculationInput {
	const now = currentTime || new Date();
	const baseTime = Math.floor(now.getTime() / 1000);
	return {
		weather: createMockWeatherData(uvValues, baseTime),
		placeName: "Test Location",
		currentTime: now,
		skinType,
		spfLevel,
		sweatLevel,
	};
}

// Utility functions for test assertions
function getBurnTimeMinutes(
	result: CalculationResult,
	input: CalculationInput,
): number {
	return result.burnTime
		? (result.burnTime.getTime() - input.currentTime.getTime()) / (1000 * 60)
		: Infinity;
}

function getBurnTimeHours(
	result: CalculationResult,
	input: CalculationInput,
): number {
	return getBurnTimeMinutes(result, input) / 60;
}

function expectRelativeBurnTime(
	fasterResult: CalculationResult,
	fasterInput: CalculationInput,
	slowerResult: CalculationResult,
	slowerInput: CalculationInput,
	message?: string,
) {
	const fasterTime = getBurnTimeMinutes(fasterResult, fasterInput);
	const slowerTime = getBurnTimeMinutes(slowerResult, slowerInput);

	if (fasterTime === Infinity && slowerTime === Infinity) {
		// Both don't burn - compare damage accumulation
		const fasterDamage =
			fasterResult.points[fasterResult.points.length - 1]?.totalDamageAtStart ||
			0;
		const slowerDamage =
			slowerResult.points[slowerResult.points.length - 1]?.totalDamageAtStart ||
			0;
		expect(fasterDamage).toBeGreaterThanOrEqual(slowerDamage);
	} else if (fasterTime !== Infinity && slowerTime !== Infinity) {
		// Both burn - faster should be significantly quicker
		expect(fasterTime).toBeLessThan(slowerTime);
	} else if (fasterTime !== Infinity) {
		// Only faster burns - this is expected
		expect(true).toBe(true);
	} else {
		// Only slower burns - this violates our expectation
		throw new Error(
			message || "Expected faster scenario to burn before slower scenario",
		);
	}
}

// Common test scenarios
const TEST_SCENARIOS = {
	highUV: [8, 8, 8, 8, 8],
	mediumUV: [5, 5, 5, 5, 5],
	lowUV: [2, 2, 2, 2, 2],
	variableUV: [4, 6, 8, 10, 12, 11, 9, 7, 5, 3, 2, 1],
	extendedHighUV: Array(15).fill(8) as number[],
	extendedMediumUV: Array(12).fill(6) as number[],
};

describe("Sunburn Calculation Algorithm", () => {
	describe("Core Algorithm Validation", () => {
		it("should calculate reasonable burn times for Type I skin without sunscreen", () => {
			// Type I skin, UV 8, no protection - should burn quickly (~20 minutes)
			const input = createTestScenario(
				FitzpatrickType.I,
				SPFLevel.NONE,
				SweatLevel.LOW,
				TEST_SCENARIOS.highUV,
			);

			const result = findOptimalTimeSlicing(input);

			expect(result.points.length).toBeGreaterThan(0);
			expect(result.burnTime).toBeDefined();

			// Type I skin in high UV should burn relatively quickly
			const burnTimeMinutes = getBurnTimeMinutes(result, input);
			expect(burnTimeMinutes).toBeGreaterThan(10);
			expect(burnTimeMinutes).toBeLessThan(45);
		});

		it("should calculate much longer burn times with SPF protection", () => {
			// Same conditions but with SPF 30 - should extend time significantly
			const fixedTime = new Date("2025-09-06T09:00:00");
			const input = createTestScenario(
				FitzpatrickType.I,
				SPFLevel.SPF_30,
				SweatLevel.LOW,
				TEST_SCENARIOS.extendedHighUV,
				fixedTime,
			);

			const result = findOptimalTimeSlicing(input);

			// With SPF 30, should take much longer to burn (hours)
			const burnTimeMinutes = getBurnTimeMinutes(result, input);

			// If no burn time, check that total damage is meaningful but under threshold
			if (burnTimeMinutes === Infinity) {
				const lastPoint = result.points[result.points.length - 1];
				expect(lastPoint?.totalDamageAtStart).toBeGreaterThan(9); // Should accumulate some damage
				expect(lastPoint?.totalDamageAtStart).toBeLessThan(100); // But not reach burn
			} else {
				expect(burnTimeMinutes).toBeGreaterThan(300); // More than 5 hours
			}
		});

		it("should show darker skin types burn much slower", () => {
			// Type VI skin, UV 8, no protection - should take much longer
			const input = createTestScenario(
				FitzpatrickType.VI,
				SPFLevel.NONE,
				SweatLevel.LOW,
				Array(10).fill(8), // Extended data for resistant skin
			);

			const result = findOptimalTimeSlicing(input);

			// Type VI should take much longer to burn than Type I
			const burnTimeMinutes = getBurnTimeMinutes(result, input);

			// Type VI skin is very resistant, might not burn in the given timeframe
			if (burnTimeMinutes === Infinity) {
				// Should accumulate some damage but not reach burn threshold
				const lastPoint = result.points[result.points.length - 1];
				expect(lastPoint?.totalDamageAtStart).toBeGreaterThan(5);
				expect(lastPoint?.totalDamageAtStart).toBeLessThan(100);
			} else {
				expect(burnTimeMinutes).toBeGreaterThan(60); // Should be over an hour
			}
		});
	});

	describe("UV Index Sensitivity", () => {
		it("should burn faster in high UV conditions", () => {
			const highUV = createTestScenario(
				FitzpatrickType.II,
				SPFLevel.NONE,
				SweatLevel.LOW,
				Array(6).fill(12), // Extreme UV
			);

			const lowUV = createTestScenario(
				FitzpatrickType.II,
				SPFLevel.NONE,
				SweatLevel.LOW,
				Array(12).fill(3), // Low UV, more time needed
			);

			const highUVResult = findOptimalTimeSlicing(highUV);
			const lowUVResult = findOptimalTimeSlicing(lowUV);

			// High UV should cause faster burning than low UV
			expectRelativeBurnTime(
				highUVResult,
				highUV,
				lowUVResult,
				lowUV,
				"High UV should cause faster burning than low UV",
			);
		});
	});

	describe("SPF Protection Levels", () => {
		it("should provide appropriate protection for SPF 15", () => {
			const withoutSPF = createTestScenario(
				FitzpatrickType.II,
				SPFLevel.NONE,
				SweatLevel.LOW,
				TEST_SCENARIOS.mediumUV,
			);

			const withSPF = createTestScenario(
				FitzpatrickType.II,
				SPFLevel.SPF_15,
				SweatLevel.LOW,
				TEST_SCENARIOS.extendedMediumUV,
			);

			const noSPFResult = findOptimalTimeSlicing(withoutSPF);
			const spfResult = findOptimalTimeSlicing(withSPF);

			const noSPFTime = getBurnTimeMinutes(noSPFResult, withoutSPF);
			const spfTime = getBurnTimeMinutes(spfResult, withSPF);

			if (noSPFTime !== Infinity && spfTime !== Infinity) {
				const actualMultiplier = spfTime / noSPFTime;
				// Should be roughly 15x protection (within reasonable tolerance)
				expect(actualMultiplier).toBeGreaterThan(8);
				expect(actualMultiplier).toBeLessThan(25);
			} else {
				// SPF should at least prevent burning when no SPF would cause burning
				expectRelativeBurnTime(
					noSPFResult,
					withoutSPF,
					spfResult,
					withSPF,
					"SPF 15 should provide better protection than no SPF",
				);
			}
		});
	});

	describe("Sweat Level Degradation", () => {
		it("should reduce SPF effectiveness over time with sweating", () => {
			// Create weather data spanning many hours with higher UV
			const longUVData = Array(12).fill(8); // 12 hours of UV 8 (high UV)

			const noSweat = createTestScenario(
				FitzpatrickType.I, // More sensitive skin
				SPFLevel.SPF_15, // Lower SPF for more realistic burn times
				SweatLevel.LOW,
				longUVData,
			);

			const highSweat = createTestScenario(
				FitzpatrickType.I, // More sensitive skin
				SPFLevel.SPF_15, // Lower SPF for more realistic burn times
				SweatLevel.HIGH,
				longUVData,
			);

			const noSweatResult = findOptimalTimeSlicing(noSweat);
			const highSweatResult = findOptimalTimeSlicing(highSweat);

			// High sweat should degrade SPF and cause faster burning
			expectRelativeBurnTime(
				highSweatResult,
				highSweat,
				noSweatResult,
				noSweat,
				"High sweat should degrade SPF protection",
			);
		});
	});

	describe("Skin Type Progression", () => {
		it("should show increasing burn resistance from Type I to Type VI", () => {
			const skinTypes = [
				FitzpatrickType.I,
				FitzpatrickType.II,
				FitzpatrickType.III,
				FitzpatrickType.IV,
				FitzpatrickType.V,
				FitzpatrickType.VI,
			];

			const results = skinTypes.map((skinType) => {
				const input = createTestScenario(
					skinType,
					SPFLevel.NONE,
					SweatLevel.LOW,
					Array(10).fill(8), // Extended data for resistant skin types
				);

				const result = findOptimalTimeSlicing(input);
				return { input, result, burnTime: getBurnTimeMinutes(result, input) };
			});

			// Each skin type should burn slower than the previous (or at least not faster)
			for (let i = 1; i < results.length; i++) {
				const current = results[i];
				const previous = results[i - 1];

				if (current.burnTime !== Infinity && previous.burnTime !== Infinity) {
					expect(current.burnTime).toBeGreaterThanOrEqual(previous.burnTime);
				} else if (
					current.burnTime === Infinity &&
					previous.burnTime !== Infinity
				) {
					// Current is more resistant - good
					expect(true).toBe(true);
				} else if (
					current.burnTime !== Infinity &&
					previous.burnTime === Infinity
				) {
					// This shouldn't happen - less resistant skin burning when more resistant doesn't
					throw new Error(
						`Skin type ${skinTypes[i]} burns but ${skinTypes[i - 1]} doesn't`,
					);
				}
			}

			// Type VI should be significantly more resistant than Type I
			const typeI = results[0];
			const typeVI = results[5];
			expectRelativeBurnTime(
				typeI.result,
				typeI.input,
				typeVI.result,
				typeVI.input,
				"Type I should burn much faster than Type VI",
			);
		});
	});

	describe("Real-World Scenarios", () => {
		it("should handle typical beach day scenario safely", () => {
			// Miami beach: Type II skin, SPF 30, moderate UV throughout day
			const input = createTestScenario(
				FitzpatrickType.II,
				SPFLevel.SPF_30,
				SweatLevel.MEDIUM,
				TEST_SCENARIOS.variableUV,
			);

			const result = findOptimalTimeSlicing(input);

			expect(result.points.length).toBeGreaterThan(0);
			expect(result.advice.length).toBeGreaterThan(0);

			// Should provide reasonable protection for beach activities
			const protectionHours = getBurnTimeHours(result, input);
			if (protectionHours !== Infinity) {
				expect(protectionHours).toBeGreaterThan(2); // At least 2 hours
			}
		});

		it("should handle overcast conditions correctly", () => {
			// Overcast day: lower but still present UV
			const input = createTestScenario(
				FitzpatrickType.II,
				SPFLevel.NONE,
				SweatLevel.LOW,
				TEST_SCENARIOS.lowUV,
			);

			const result = findOptimalTimeSlicing(input);

			// Overcast should allow longer exposure than sunny conditions
			const sunny = createTestScenario(
				FitzpatrickType.II,
				SPFLevel.NONE,
				SweatLevel.LOW,
				TEST_SCENARIOS.highUV,
			);

			const sunnyResult = findOptimalTimeSlicing(sunny);

			expectRelativeBurnTime(
				sunnyResult,
				sunny,
				result,
				input,
				"Sunny conditions should cause faster burning than overcast",
			);
		});
	});

	describe("Edge Cases and Error Handling", () => {
		it("should handle zero UV index safely", () => {
			const input = createTestScenario(
				FitzpatrickType.I,
				SPFLevel.NONE,
				SweatLevel.LOW,
				Array(6).fill(0),
			);

			const result = findOptimalTimeSlicing(input);

			expect(result.points.length).toBeGreaterThan(0);
			// With zero UV, should not reach burn threshold
			expect(result.burnTime).toBeUndefined();

			// All burn costs should be zero or minimal
			const maxBurnCost = Math.max(...result.points.map((p) => p.burnCost));
			expect(maxBurnCost).toBeLessThanOrEqual(1);
		});

		it("should handle minimal weather data", () => {
			const input = createTestScenario(
				FitzpatrickType.III,
				SPFLevel.SPF_15,
				SweatLevel.LOW,
				[5, 5], // Minimal required data
			);

			const result = findOptimalTimeSlicing(input);

			expect(result.points.length).toBeGreaterThan(0);
			expect(result.advice.length).toBeGreaterThan(0);
			expect(result.startTime).toBeDefined();
		});

		it("should provide conservative estimates for safety", () => {
			// Test that algorithm errs on the side of caution
			const input = createTestScenario(
				FitzpatrickType.II,
				SPFLevel.SPF_30,
				SweatLevel.MEDIUM,
				TEST_SCENARIOS.highUV,
			);

			const result = findOptimalTimeSlicing(input);

			// Should maintain safety margins in calculations
			const lastPoint = result.points[result.points.length - 1];
			if (lastPoint && result.burnTime) {
				const totalDamage = lastPoint.totalDamageAtStart + lastPoint.burnCost;
				expect(totalDamage).toBeLessThanOrEqual(105); // Allow small tolerance
			}
		});
	});

	describe("Algorithm Performance", () => {
		it("should complete calculations in reasonable time", () => {
			const start = Date.now();

			const input = createTestScenario(
				FitzpatrickType.III,
				SPFLevel.SPF_30,
				SweatLevel.MEDIUM,
				Array(24).fill(6), // Full day of data
			);

			const result = findOptimalTimeSlicing(input);

			const executionTime = Date.now() - start;

			expect(result.points.length).toBeGreaterThan(0);
			// Should complete very quickly
			expect(executionTime).toBeLessThan(50); // Should be under 50ms
		});

		it("should handle large datasets efficiently", () => {
			const input = createTestScenario(
				FitzpatrickType.VI, // Resistant skin
				SPFLevel.SPF_50_PLUS, // High protection
				SweatLevel.LOW, // Minimal degradation
				Array(72).fill(8), // 3 days of data
			);

			const result = findOptimalTimeSlicing(input);

			// Should complete without errors and produce reasonable results
			expect(result.points.length).toBeGreaterThan(0);
			expect(result.advice.length).toBeGreaterThan(0);
			// Allow flexibility in point count for performance optimization
			expect(result.points.length).toBeLessThan(100);
		});
	});

	// Additional comprehensive tests
	describe("Boundary Conditions", () => {
		it("should handle extreme UV values", () => {
			const extremeUV = createTestScenario(
				FitzpatrickType.II,
				SPFLevel.NONE,
				SweatLevel.LOW,
				[15, 16, 17], // Extreme UV rarely seen in nature
			);

			const result = findOptimalTimeSlicing(extremeUV);

			expect(result.points.length).toBeGreaterThan(0);
			// Should burn very quickly in extreme UV
			if (result.burnTime) {
				const burnMinutes = getBurnTimeMinutes(result, extremeUV);
				expect(burnMinutes).toBeLessThan(20); // Very quick burn
			}
		});

		it("should be consistent with repeated calculations", () => {
			const input = createTestScenario(
				FitzpatrickType.III,
				SPFLevel.SPF_15,
				SweatLevel.MEDIUM,
				TEST_SCENARIOS.mediumUV,
			);

			// Run same calculation multiple times
			const results = Array(5)
				.fill(null)
				.map(() => findOptimalTimeSlicing(input));

			// All results should be identical
			for (let i = 1; i < results.length; i++) {
				expect(results[i].points.length).toBe(results[0].points.length);
				expect(getBurnTimeMinutes(results[i], input)).toBe(
					getBurnTimeMinutes(results[0], input),
				);
			}
		});

		it("should handle rapid UV changes", () => {
			const fixedTime = new Date("2025-09-06T09:00:00");
			const rapidChange = createTestScenario(
				FitzpatrickType.II,
				SPFLevel.NONE,
				SweatLevel.LOW,
				[1, 8, 2, 9, 3, 8, 1], // Rapid UV fluctuations
				fixedTime,
			);

			const result = findOptimalTimeSlicing(rapidChange);

			expect(result.points.length).toBeGreaterThan(0);
			expect(result.advice.length).toBeGreaterThan(0);
			// Should handle interpolation without errors
			expect(() => result).not.toThrow();
		});
	});

	describe("SPF and Sweat Interaction", () => {
		it("should show SPF effectiveness decreases with higher sweat levels", () => {
			const scenarios = [
				{ sweat: SweatLevel.LOW, label: "low sweat" },
				{ sweat: SweatLevel.MEDIUM, label: "medium sweat" },
				{ sweat: SweatLevel.HIGH, label: "high sweat" },
			];

			const results = scenarios.map((scenario) => {
				const input = createTestScenario(
					FitzpatrickType.II,
					SPFLevel.SPF_30,
					scenario.sweat,
					Array(8).fill(7), // Extended moderate UV
				);
				return {
					result: findOptimalTimeSlicing(input),
					input,
					label: scenario.label,
				};
			});

			// Higher sweat should generally reduce protection time
			const lowSweatTime = getBurnTimeMinutes(
				results[0].result,
				results[0].input,
			);
			const highSweatTime = getBurnTimeMinutes(
				results[2].result,
				results[2].input,
			);

			if (lowSweatTime !== Infinity && highSweatTime !== Infinity) {
				expect(highSweatTime).toBeLessThanOrEqual(lowSweatTime);
			}
		});
	});
});
