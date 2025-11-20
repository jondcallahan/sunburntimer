import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Calculator, Sun, Shield, User } from "lucide-react";

export function MathExplanation() {
	return (
		<Accordion type="single" collapsible className="w-full">
			<AccordionItem
				value="math-explanation"
				className="bg-white/50 border-stone-200 shadow-sm rounded-lg"
			>
				<AccordionTrigger className="px-6 py-4 hover:no-underline">
					<div className="flex items-center gap-2 text-slate-600 hover:text-amber-600 transition-colors">
						<Calculator className="w-5 h-5" />
						<span className="font-medium">How is this calculated?</span>
					</div>
				</AccordionTrigger>
				<AccordionContent className="px-6 pb-6">
					<div className="space-y-6 pt-2">
						<p className="text-slate-600">
							Calculations are based on peer-reviewed dermatological research
							and physics. Here's how your safe exposure time is calculated:
						</p>

						{/* 1. The Source: UV Index */}
						<div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
							<h3 className="font-semibold text-amber-900 flex items-center gap-2 mb-2">
								<Sun className="w-5 h-5" />
								1. The Source: UV Energy
							</h3>
							<p className="text-sm text-slate-700 mb-2">
								The UV Index (UVI) measures the intensity of skin-damaging
								radiation.
							</p>
							<div className="bg-white/60 p-3 rounded text-sm font-mono text-slate-600 border border-amber-100/50">
								1 UVI Unit = 25 mW/m² (Milliwatts per square meter)
							</div>
							<p className="text-xs text-slate-500 mt-2 italic">
								*A 0.8x geometry factor is applied to account for the fact that
								you are a standing, moving person, not a flat horizontal sensor.
							</p>
						</div>

						{/* 2. The Target: Your Skin */}
						<div className="bg-stone-50 p-4 rounded-lg border border-stone-100">
							<h3 className="font-semibold text-stone-900 flex items-center gap-2 mb-2">
								<User className="w-5 h-5" />
								2. The Target: Your Skin Limit (MED)
							</h3>
							<p className="text-sm text-slate-700 mb-2">
								Every skin type has a "Minimal Erythemal Dose" (MED), the total
								energy required to cause first signs of redness, represented as Joules per square meter (J/m²).
							</p>
							<ul className="list-disc list-inside text-sm text-slate-600 space-y-1 ml-2">
								<li>
									<span className="font-medium">Type I (Very Fair):</span> ~200
									J/m²
								</li>
								<li>
									<span className="font-medium">Type III (Medium):</span  > ~350
									J/m²
								</li>
								<li>
									<span className="font-medium">Type VI (Very Dark):</span>{" "}
									~1000 J/m²
								</li>
							</ul>
						</div>

						{/* 3. The Shield: Sunscreen */}
						<div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
							<h3 className="font-semibold text-blue-900 flex items-center gap-2 mb-2">
								<Shield className="w-5 h-5" />
								3. The Shield: SPF Protection
							</h3>
							<p className="text-sm text-slate-700">
								SPF acts as a divisor. <strong>SPF 30</strong> means only{" "}
								<strong>1/30th</strong> of the UV energy reaches your skin.
							</p>
							<p className="text-xs text-blue-700 mt-2">
								*Sunscreen degradation is also modeled over time based on your
								sweat level.
							</p>
						</div>

						{/* 4. The Formula */}
						<div className="border-t pt-4">
							<h3 className="font-semibold text-slate-800 mb-3">
								The Final Calculation
							</h3>
							<div className="bg-slate-900 text-slate-50 p-4 rounded-lg font-mono text-sm overflow-x-auto">
								<div className="mb-2 text-slate-400">
									// Damage accumulated per minute
								</div>
								<div>
									Damage % = (UV_Energy_Per_Min / (MED * SPF)) * 100
								</div>
							</div>
							<p className="text-sm text-slate-600 mt-3">
								This formula is integrated minute-by-minute using live forecast
								data, interpolating between hourly updates for precision.
							</p>
							<p className="text-xs text-slate-500 mt-2 italic">
								*For low UV levels (UVI &lt; 3), a smoothing curve is applied to
								account for reduced exposure at lower sun angles (dawn/dusk).
								When the accumulated damage hits 100%, that's your burn time.
							</p>
						</div>
						<div className="border-t pt-4">
							<h3 className="font-semibold text-slate-800 mb-3">
								Sources & References
							</h3>
							<ul className="space-y-2 text-sm text-slate-600">
								<li>
									<a
										href="https://www.who.int/news-room/questions-and-answers/item/radiation-the-ultraviolet-(uv)-index"
										target="_blank"
										rel="noopener noreferrer"
										className="text-slate-600 hover:text-amber-600 hover:underline flex items-center gap-1 transition-colors"
									>
										World Health Organization (WHO)
										<span className="text-slate-400">- UV Index Definition</span>
									</a>
								</li>
								<li>
									<a
										href="https://www.epa.gov/sunsafety/uv-index-scale-0"
										target="_blank"
										rel="noopener noreferrer"
										className="text-slate-600 hover:text-amber-600 hover:underline flex items-center gap-1 transition-colors"
									>
										U.S. EPA
										<span className="text-slate-400">- Sun Safety Guide</span>
									</a>
								</li>
								<li>
									<span className="text-slate-500">
										Fitzpatrick, T. B. (1988). "The validity and practicality of
										sun-reactive skin types I through VI."
									</span>
								</li>
								<li>
									<span className="text-slate-500">
										McKinlay, A.F. & Diffey, B.L. (1987). "A reference action
										spectrum for ultraviolet induced erythema in human skin."
									</span>
								</li>
								<li>
									<a
										href="https://open-meteo.com/"
										target="_blank"
										rel="noopener noreferrer"
										className="text-slate-600 hover:text-amber-600 hover:underline flex items-center gap-1 transition-colors"
									>
										Open-Meteo
										<span className="text-slate-400">- Weather Data API</span>
									</a>
								</li>
							</ul>
						</div>
					</div>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}
