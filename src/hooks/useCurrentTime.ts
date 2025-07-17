import { useEffect, useState } from "react";

/**
 * Hook that returns the current time and updates every minute
 * Useful for displaying relative time that needs to refresh automatically
 */
export function useCurrentTime() {
	const [currentTime, setCurrentTime] = useState(() => new Date());

	useEffect(() => {
		// Update immediately
		setCurrentTime(new Date());

		// Then update every minute
		const interval = setInterval(() => {
			setCurrentTime(new Date());
		}, 60000); // 60 seconds

		return () => clearInterval(interval);
	}, []);

	return currentTime;
}
