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
	const abortRef = useRef<AbortController | null>(null);

	useEffect(() => {
		return () => {
			clearTimeout(timerRef.current);
			abortRef.current?.abort();
		};
	}, []);

	const doSearch = useCallback(async (q: string) => {
		if (q.length < 2) {
			setResults([]);
			setIsOpen(false);
			return;
		}

		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;

		setIsSearching(true);
		try {
			const res = await searchLocations(q, controller.signal);
			setResults(res);
			setIsOpen(res.length > 0);
			setActiveIndex(-1);
		} catch (e) {
			if (e instanceof Error && e.name === "AbortError") return;
			setResults([]);
		} finally {
			if (!controller.signal.aborted) {
				setIsSearching(false);
			}
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
					className="w-full pl-9 pr-8 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 text-base"
					role="combobox"
					aria-expanded={isOpen}
					aria-haspopup="listbox"
					aria-activedescendant={
						activeIndex >= 0 ? `result-${results[activeIndex]?.id}` : undefined
					}
					aria-label="Search for a city"
				/>
				{isSearching && (
					<LoaderIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
				)}
			</div>

			{isOpen && (
				<div
					role="listbox"
					className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-md overflow-hidden"
				>
					{results.map((r, i) => (
						<div
							key={r.id}
							role="option"
							id={`result-${r.id}`}
							aria-selected={i === activeIndex}
							tabIndex={-1}
							className={`w-full text-left px-3 py-2 text-sm hover:bg-accent cursor-pointer ${
								i === activeIndex ? "bg-accent" : ""
							}`}
							onMouseDown={() => handleSelect(r)}
						>
							{formatResult(r)}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
