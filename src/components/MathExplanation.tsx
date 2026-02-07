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
						<span className="font-medium">How does this work?</span>
					</div>
				</AccordionTrigger>
				<AccordionContent className="px-6 pb-6">
					<div className="space-y-6 pt-2">
						<p className="text-slate-600">
							These estimates are based on dermatological research on UV
							exposure and erythema (skin reddening). Here's how it works:
						</p>

						{/* 1. UV Index */}
						<div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
							<h3 className="font-semibold text-amber-900 flex items-center gap-2 mb-2">
								<Sun className="w-5 h-5" />
								1. UV energy input
							</h3>
							<p className="text-sm text-slate-700 mb-2">
								The UV Index measures the intensity of skin-damaging radiation.
								Higher number means faster burn.
							</p>
							<div className="bg-white/60 p-3 rounded text-sm font-mono text-slate-600 border border-amber-100/50">
								1 UVI = 25 mW/m² (milliwatts per square meter)
							</div>
							<p className="text-xs text-slate-500 mt-2">
								A 0.8× geometry factor is applied because you're a person
								standing and moving, not a flat sensor pointing at the sky.
							</p>
						</div>

						{/* 2. Skin threshold */}
						<div className="bg-stone-50 p-4 rounded-lg border border-stone-100">
							<h3 className="font-semibold text-stone-900 flex items-center gap-2 mb-2">
								<User className="w-5 h-5" />
								2. Your skin's threshold (MED)
							</h3>
							<p className="text-sm text-slate-700 mb-2">
								Each skin type has a Minimal Erythemal Dose (MED), the UV energy
								needed to cause visible reddening. Measured in J/m² (joules per
								square meter).
							</p>
							<ul className="list-disc list-inside text-sm text-slate-600 space-y-1 ml-2">
								<li>
									<span className="font-medium">Type I (very fair):</span> ~200
									J/m²
								</li>
								<li>
									<span className="font-medium">Type III (medium):</span> ~350
									J/m²
								</li>
								<li>
									<span className="font-medium">Type VI (very dark):</span>{" "}
									~1000 J/m²
								</li>
							</ul>
							<p className="text-xs text-slate-500 mt-2">
								These are population averages. Your actual threshold varies with
								genetics, recent exposure, and other factors.
							</p>
						</div>

						{/* 3. Sunscreen */}
						<div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
							<h3 className="font-semibold text-blue-900 flex items-center gap-2 mb-2">
								<Shield className="w-5 h-5" />
								3. SPF as a divisor
							</h3>
							<p className="text-sm text-slate-700">
								SPF divides the UV reaching your skin. <strong>SPF 30</strong>{" "}
								means only <strong>1/30th</strong> of the UV energy gets
								through in the lab.
							</p>
							<p className="text-xs text-blue-700 mt-2">
								In practice, people apply less sunscreen than lab conditions
								(~1 mg/cm² vs 2 mg/cm²), so we reduce effective SPF to ~60%
								of the label. Sunscreen also degrades over time from sweat,
								oils, and UV exposure — even without sweating.
							</p>
						</div>

						{/* 4. The math */}
						<div className="border-t pt-4">
							<h3 className="font-semibold text-slate-800 mb-3">
								4. The calculation
							</h3>
							<p className="text-sm text-slate-600 mb-3">
								Think of it as filling a bucket. Each minute adds UV damage, and
								at 100% you're burnt.
							</p>
							<div className="bg-slate-900 text-slate-50 p-4 rounded-lg font-mono text-sm overflow-x-auto">
								<div className="mb-2 text-slate-400">Each minute:</div>
								<div>Damage % = (UV_Energy_Per_Min / (MED × SPF)) × 100</div>
							</div>
							<p className="text-sm text-slate-600 mt-3">
								This runs minute-by-minute using hourly UV forecasts,
								interpolating between data points.
							</p>
							<p className="text-xs text-slate-500 mt-2">
								For low UV (UVI &lt; 3), a smoothing curve accounts for reduced
								effective exposure at dawn/dusk sun angles.
							</p>
						</div>

						{/* References */}
						<div className="border-t pt-4">
							<h3 className="font-semibold text-slate-800 mb-3">References</h3>
							<ul className="space-y-2 text-sm text-slate-600">
								<li>
									<a
										href="https://www.who.int/news-room/questions-and-answers/item/radiation-the-ultraviolet-(uv)-index"
										target="_blank"
										rel="noopener noreferrer"
										className="text-slate-600 hover:text-amber-600 hover:underline transition-colors"
									>
										WHO: UV Index definition
									</a>
								</li>
								<li>
									<a
										href="https://www.epa.gov/sunsafety/uv-index-scale-0"
										target="_blank"
										rel="noopener noreferrer"
										className="text-slate-600 hover:text-amber-600 hover:underline transition-colors"
									>
										EPA: Sun safety guide
									</a>
								</li>
								<li className="text-slate-500">
									Fitzpatrick, T.B. (1988). "The validity and practicality of
									sun-reactive skin types I through VI."
								</li>
								<li className="text-slate-500">
									McKinlay, A.F. & Diffey, B.L. (1987). "A reference action
									spectrum for ultraviolet induced erythema in human skin."
								</li>
								<li>
									<a
										href="https://open-meteo.com/"
										target="_blank"
										rel="noopener noreferrer"
										className="text-slate-600 hover:text-amber-600 hover:underline transition-colors"
									>
										Open-Meteo
									</a>
									<span className="text-slate-400"> (weather data)</span>
								</li>
							</ul>
						</div>
					</div>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}
