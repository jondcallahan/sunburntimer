import { Check } from "lucide-react";
import { FitzpatrickType, SKIN_TYPE_CONFIG } from "../types";
import { useAppStore } from "../store";
import { CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { SelectableCard } from "./ui/selectable-card";

interface SkinTypeCardProps {
	type: FitzpatrickType;
	selected: boolean;
	onSelect: (type: FitzpatrickType) => void;
}

function SkinTypeCard({ type, selected, onSelect }: SkinTypeCardProps) {
	const config = SKIN_TYPE_CONFIG[type];

	// Use consistent dark text on white background
	const textColor = "text-gray-800";
	const descriptionColor = "text-gray-600";
	const labelColor = "text-gray-500";

	return (
		<SelectableCard
			selected={selected}
			className="relative min-h-36 overflow-hidden bg-white"
			onClick={() => onSelect(type)}
			aria-label={`Select skin type ${type}: ${config.subtitle}`}
		>
			{/* Skin tone stripe */}
			<div
				className="absolute left-0 top-0 bottom-0 w-2.5"
				style={{ backgroundColor: config.color }}
			/>
			<CardContent className="relative flex h-full flex-col p-3 pl-5">
				<div className="flex-1 space-y-2">
					{/* Header */}
					<div className="flex items-start justify-between">
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-1.5 mb-1">
								<div className="text-2xl leading-none" aria-hidden="true">
									{config.emoji}
								</div>
								<Badge
									variant="secondary"
									className="flex-shrink-0 bg-gray-100 px-1.5 py-0.5 text-xs font-bold text-gray-800"
								>
									Type {type}
								</Badge>
								<div className={`truncate text-sm font-bold ${textColor}`}>
									{config.subtitle}
								</div>
							</div>
						</div>

						{selected && (
							<div className="ml-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-600 shadow-lg">
								<Check className="h-3.5 w-3.5 text-white stroke-[3]" />
							</div>
						)}
					</div>

					{/* Description */}
					<div
						className={`text-xs ${descriptionColor} font-medium leading-snug`}
					>
						{config.description}
					</div>

					{/* Attributes */}
					<div className="space-y-1.5">
						<div>
							<div className={`text-xs ${labelColor} mb-0.5`}>Hair</div>
							<div className={`text-xs ${textColor} leading-snug`}>
								{config.hairColors.join(", ")}
							</div>
						</div>

						<div>
							<div className={`text-xs ${labelColor} mb-0.5`}>Eyes</div>
							<div className={`text-xs ${textColor} leading-snug`}>
								{config.eyeColors.join(", ")}
							</div>
						</div>

						<div>
							<div className={`text-xs ${labelColor} mb-0.5`}>Freckles</div>
							<div className={`text-xs ${textColor} leading-snug`}>
								{config.freckles}
							</div>
						</div>
					</div>
				</div>
			</CardContent>
		</SelectableCard>
	);
}

export function SkinTypeSelector() {
	const { skinType, setSkinType } = useAppStore();

	return (
		<div className="w-full">
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{Object.values(FitzpatrickType).map((type) => (
					<SkinTypeCard
						key={type}
						type={type}
						selected={skinType === type}
						onSelect={setSkinType}
					/>
				))}
			</div>
		</div>
	);
}
