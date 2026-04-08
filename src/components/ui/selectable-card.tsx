import * as React from "react";
import { haptic } from "ios-haptics";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SelectableCardProps extends React.ComponentProps<"div"> {
	selected?: boolean;
	disabled?: boolean;
}

const SelectableCard = React.forwardRef<HTMLDivElement, SelectableCardProps>(
	(
		{ className, selected = false, onClick, onKeyDown, disabled, ...props },
		ref,
	) => {
		return (
			<Card asChild>
				{/* biome-ignore lint/a11y/useSemanticElements: selectable cards need block card content, so this wrapper manages button semantics explicitly */}
				<div
					ref={ref}
					data-slot="selectable-card"
					data-selected={selected ? "true" : "false"}
					role="button"
					tabIndex={disabled ? -1 : 0}
					aria-pressed={props["aria-pressed"] ?? selected}
					aria-disabled={disabled || undefined}
					className={cn(
						"w-full cursor-pointer text-left transition-all duration-200 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50",
						selected
							? "border-primary shadow-md"
							: "border-stone-200 hover:border-slate-400 hover:shadow-md",
						className,
						disabled && "pointer-events-none opacity-50",
					)}
					onClick={(event) => {
						if (disabled) {
							return;
						}
						haptic();
						onClick?.(event);
					}}
					onKeyDown={(event) => {
						onKeyDown?.(event);
						if (disabled) {
							return;
						}
						if (event.key === "Enter" || event.key === " ") {
							event.preventDefault();
							event.currentTarget.click();
						}
					}}
					{...props}
				/>
			</Card>
		);
	},
);

SelectableCard.displayName = "SelectableCard";

export { SelectableCard };
