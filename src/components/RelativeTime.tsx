import { formatDistanceToNow } from "date-fns";
import { useCurrentTime } from "../hooks/useCurrentTime";

interface RelativeTimeProps {
	timestamp: number;
	className?: string;
}

export function RelativeTime({ timestamp, className }: RelativeTimeProps) {
	// This component re-renders every minute to update the relative time
	useCurrentTime();

	return (
		<span className={className}>
			Updated {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
		</span>
	);
}
