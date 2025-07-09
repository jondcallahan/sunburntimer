import { Check } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { FitzpatrickType, SKIN_TYPE_CONFIG } from "../types";
import { useAppStore } from "../store";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";

interface SkinTypeCardProps {
  type: FitzpatrickType;
  selected: boolean;
  onSelect: (type: FitzpatrickType) => void;
  cardRef?: React.RefObject<HTMLDivElement | null>;
}

function SkinTypeCard(
  { type, selected, onSelect, cardRef }: SkinTypeCardProps,
) {
  const config = SKIN_TYPE_CONFIG[type];

  // Use consistent dark text on white background
  const textColor = "text-gray-800";
  const descriptionColor = "text-gray-600";
  const labelColor = "text-gray-500";

  return (
    <Card
      ref={cardRef}
      className={`
        cursor-pointer transition-all duration-200 border relative overflow-hidden w-72 h-80 flex-shrink-0 snap-center bg-white scroll-m-12
        ${
        selected
          ? "shadow-inner"
          : "border-stone-200 hover:border-slate-400 hover:shadow-md"
      }
      `}
      onClick={() => onSelect(type)}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`Select skin type ${type}: ${config.subtitle}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(type);
        }
      }}
    >
      {/* Skin tone stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-6"
        style={{ backgroundColor: config.color }}
      />
      <CardContent className="p-4 pl-10 relative h-full flex flex-col">
        <div className="flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <Badge
                  variant="secondary"
                  className="font-bold text-sm px-2 py-1 flex-shrink-0 bg-gray-100 text-gray-800"
                >
                  Type {type}
                </Badge>
                <div className={`font-bold text-base ${textColor} truncate`}>
                  {config.subtitle}
                </div>
                <div className="text-2xl">{config.emojiTone}</div>
              </div>
            </div>

            {selected && (
              <div className="flex items-center justify-center w-6 h-6 bg-green-600 rounded-full shadow-lg flex-shrink-0 ml-2">
                <Check className="w-4 h-4 text-white stroke-[3]" />
              </div>
            )}
          </div>

          {/* Description */}
          <div
            className={`text-sm ${descriptionColor} font-medium leading-snug`}
          >
            {config.description}
          </div>

          {/* Attributes */}
          <div className="space-y-2.5">
            <div>
              <div className={`text-xs ${labelColor} mb-0.5`}>
                Hair
              </div>
              <div className={`text-sm ${textColor} leading-snug`}>
                {config.hairColors.join(", ")}
              </div>
            </div>

            <div>
              <div className={`text-xs ${labelColor} mb-0.5`}>
                Eyes
              </div>
              <div className={`text-sm ${textColor} leading-snug`}>
                {config.eyeColors.join(", ")}
              </div>
            </div>

            <div>
              <div className={`text-xs ${labelColor} mb-0.5`}>
                Freckles
              </div>
              <div className={`text-sm ${textColor} leading-snug`}>
                {config.freckles}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SkinTypeSelector() {
  const { skinType, setSkinType } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // Create refs for each skin type - must be called outside of any loops
  const typeIRef = useRef<HTMLDivElement>(null);
  const typeIIRef = useRef<HTMLDivElement>(null);
  const typeIIIRef = useRef<HTMLDivElement>(null);
  const typeIVRef = useRef<HTMLDivElement>(null);
  const typeVRef = useRef<HTMLDivElement>(null);
  const typeVIRef = useRef<HTMLDivElement>(null);

  const cardRefs = {
    [FitzpatrickType.I]: typeIRef,
    [FitzpatrickType.II]: typeIIRef,
    [FitzpatrickType.III]: typeIIIRef,
    [FitzpatrickType.IV]: typeIVRef,
    [FitzpatrickType.V]: typeVRef,
    [FitzpatrickType.VI]: typeVIRef,
  };

  // Scroll selected card into view
  useLayoutEffect(() => {
    if (skinType && cardRefs[skinType]?.current) {
      const selectedCard = cardRefs[skinType].current;

      selectedCard.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [skinType]);

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory scrollbar-hide"
      >
        {Object.values(FitzpatrickType).map((type) => (
          <SkinTypeCard
            key={type}
            type={type}
            selected={skinType === type}
            onSelect={setSkinType}
            cardRef={cardRefs[type]}
          />
        ))}
      </div>
      <div className="text-center text-sm text-gray-500 mt-2">
        Swipe to browse skin types
      </div>
    </div>
  );
}
