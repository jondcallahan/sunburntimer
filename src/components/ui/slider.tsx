import * as React from "react";

import { cn } from "@/lib/utils";

type SliderProps = Omit<
	React.InputHTMLAttributes<HTMLInputElement>,
	"value" | "defaultValue" | "min" | "max" | "step" | "onChange"
> & {
	value?: number[];
	defaultValue?: number[];
	min?: number;
	max?: number;
	step?: number;
	onValueChange?: (value: number[]) => void;
};

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
	(
		{
			className,
			value,
			defaultValue,
			min = 0,
			max = 100,
			step = 1,
			onValueChange,
			...props
		},
		ref,
	) => {
		const currentValue = value?.[0] ?? defaultValue?.[0] ?? min;

		return (
			<input
				ref={ref}
				type="range"
				data-slot="slider"
				min={min}
				max={max}
				step={step}
				value={currentValue}
				onInput={(event) => {
					onValueChange?.([Number(event.currentTarget.value)]);
				}}
				className={cn(
					"h-2 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
					className,
				)}
				{...props}
			/>
		);
	},
);

Slider.displayName = "Slider";

export { Slider };
