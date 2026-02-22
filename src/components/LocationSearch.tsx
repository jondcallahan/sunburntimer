import { useState, useRef, useEffect, useCallback } from "react";
import { Search, LoaderIcon } from "lucide-react";
import { searchLocations, type GeocodingResult } from "../services/geocoding";

interface LocationSearchProps {
	onSelect: (result: GeocodingResult) => void;
	disabled?: boolean;
}

export function LocationSearch({ onSelect, disabled }: LocationSearchProps) {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<GeocodingResult[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [isOpen, setIsOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(-1);
	const containerRef = useRef<HTMLDivElement>(null);
	const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	const doSearch = useCallback(async (q: string) => {
		if (q.length < 2) {
			setResults([]);
			setIsOpen(false);
			return;
		}
		setIsSearching(true);
		try {
			const res = await searchLocations(q);
			setResults(res);
			setIsOpen(res.length > 0);
			setActiveIndex(-1);
		} catch {
			setResults([]);
		} finally {
			setIsSearching(false);
		}
	}, []);

	const handleChange = (value: string) => {
		setQuery(value);
		clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => doSearch(value), 300);
	};

	const handleSelect = (result: GeocodingResult) => {
		setQuery("");
		setResults([]);
		setIsOpen(false);
		onSelect(result);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (!isOpen) return;
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setActiveIndex((i) => Math.min(i + 1, results.length - 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActiveIndex((i) => Math.max(i - 1, 0));
		} else if (e.key === "Enter" && activeIndex >= 0) {
			e.preventDefault();
			handleSelect(results[activeIndex]);
		} else if (e.key === "Escape") {
			setIsOpen(false);
		}
	};

	// Close on outside click
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	useEffect(() => {
		return () => clearTimeout(timerRef.current);
	}, []);

	const formatResult = (r: GeocodingResult) => {
		const parts = [r.name];
		if (r.admin1) parts.push(r.admin1);
		parts.push(r.country);
		return parts.join(", ");
	};

	return (
		<div ref={containerRef} className="relative">
			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
				<input
					type="text"
					value={query}
					onChange={(e) => handleChange(e.target.value)}
					onKeyDown={handleKeyDown}
					disabled={disabled}
					placeholder="Search for a city..."
					className="w-full pl-9 pr-8 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
				/>
				{isSearching && (
					<LoaderIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
				)}
			</div>

			{isOpen && (
				<ul className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-md overflow-hidden">
					{results.map((r, i) => (
						<li key={r.id}>
							<button
								type="button"
								className={`w-full text-left px-3 py-2 text-sm hover:bg-accent cursor-pointer ${
									i === activeIndex ? "bg-accent" : ""
								}`}
								onMouseDown={() => handleSelect(r)}
							>
								{formatResult(r)}
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
