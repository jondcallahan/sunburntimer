import { Check, Loader2 } from "lucide-react";

interface StepHeaderProps {
	stepNumber: number;
	title: string;
	description?: string;
	isCompleted?: boolean;
	isLoading?: boolean;
	hideDescription?: boolean;
}

export function StepHeader({
	stepNumber,
	title,
	description,
	isCompleted,
	isLoading,
	hideDescription,
}: StepHeaderProps) {
	return (
		<div>
			<div className="flex items-center text-slate-800 text-xl font-semibold mb-2">
				<span
					className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-base font-bold mr-4 ${
						isCompleted
							? "bg-green-600 text-white"
							: isLoading
								? "bg-blue-600 text-white"
								: "bg-amber-600 text-white"
					}`}
				>
					{isLoading ? (
						<Loader2 className="w-5 h-5 animate-spin" />
					) : isCompleted ? (
						<Check className="w-5 h-5" />
					) : (
						stepNumber
					)}
				</span>
				{title}
			</div>
			{description && !hideDescription && (
				<p className="text-slate-600 ml-12">{description}</p>
			)}
		</div>
	);
}
