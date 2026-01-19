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
						<span className="font-medium">How does this actually work?</span>
					</div>
				</AccordionTrigger>
				<AccordionContent className="px-6 pb-6">
					<div className="space-y-6 pt-2">
						<p className="text-slate-600">
							These numbers are estimates based on how dermatologists measure
							sunburn risk. Not perfect, but the science is solid. Here's what's
							happening under the hood:
						</p>

						{/* UV Index */}
						<div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
							<h3 className="font-semibold text-amber-900 flex items-center gap-2 mb-2">
								<Sun className="w-5 h-5" />
								UV Index: the number that matters
							</h3>
							<p className="text-sm text-slate-700 mb-2">
								The UV Index tells you how intense the sun's skin-damaging rays
								are right now. Higher number = faster burn.
							</p>
							<div className="bg-white/60 p-3 rounded text-sm font-mono text-slate-600 border border-amber-100/50">
								1 UV Index = 25 mW/m² of UV energy hitting you
							</div>
							<p className="text-xs text-slate-500 mt-2">
								We apply a 0.8x adjustment because you're a person standing and
								moving around, not a flat sensor pointing straight up at the
								sky.
							</p>
						</div>

						{/* Skin threshold */}
						<div className="bg-stone-50 p-4 rounded-lg border border-stone-100">
							<h3 className="font-semibold text-stone-900 flex items-center gap-2 mb-2">
								<User className="w-5 h-5" />
								Your skin's burn threshold
							</h3>
							<p className="text-sm text-slate-700 mb-2">
								Your skin has a "budget" for UV exposure before it burns.
								Dermatologists call this your MED (Minimal Erythemal Dose)—how
								much UV energy it takes to turn you pink.
							</p>
							<p className="text-sm text-slate-600 mb-2">
								This varies a lot by skin type:
							</p>
							<ul className="text-sm text-slate-600 space-y-1 ml-2">
								<li>Type I (very fair): burns after ~200 J/m²</li>
								<li>Type III (medium): burns after ~350 J/m²</li>
								<li>Type VI (very dark): burns after ~1000 J/m²</li>
							</ul>
							<p className="text-xs text-slate-500 mt-2">
								These are averages. Your actual threshold depends on genetics,
								recent sun exposure, and other factors.
							</p>
						</div>

						{/* Sunscreen */}
						<div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
							<h3 className="font-semibold text-blue-900 flex items-center gap-2 mb-2">
								<Shield className="w-5 h-5" />
								What sunscreen actually does
							</h3>
							<p className="text-sm text-slate-700">
								SPF is a divider. SPF 30 means only 1/30th of the UV gets
								through to your skin. Pretty simple.
							</p>
							<p className="text-xs text-blue-700 mt-2">
								The catch: real-world sunscreen rarely performs at full
								strength. You probably didn't apply enough, and it breaks down
								as you sweat. We model that degradation over time.
							</p>
						</div>

						{/* The math */}
						<div className="border-t pt-4">
							<h3 className="font-semibold text-slate-800 mb-3">
								Putting it together
							</h3>
							<p className="text-sm text-slate-600 mb-3">
								Think of it like filling a glass. Each minute in the sun adds a
								little more UV damage, and when you hit 100%, you're burnt.
							</p>
							<div className="bg-slate-900 text-slate-50 p-4 rounded-lg font-mono text-sm overflow-x-auto">
								<div className="mb-2 text-slate-400">
									Every minute, we calculate:
								</div>
								<div>Damage % = (UV energy received / your MED / SPF) × 100</div>
							</div>
							<p className="text-sm text-slate-600 mt-3">
								We run this calculation minute-by-minute using the hourly UV
								forecast, smoothing between hours for better accuracy.
							</p>
							<p className="text-xs text-slate-500 mt-2">
								At dawn and dusk (UV below 3), we apply extra smoothing since
								the sun angle makes the standard formula less reliable.
							</p>
						</div>

						{/* References */}
						<div className="border-t pt-4">
							<h3 className="font-semibold text-slate-800 mb-3">
								Where this comes from
							</h3>
							<ul className="space-y-2 text-sm text-slate-600">
								<li>
									<a
										href="https://www.who.int/news-room/questions-and-answers/item/radiation-the-ultraviolet-(uv)-index"
										target="_blank"
										rel="noopener noreferrer"
										className="text-slate-600 hover:text-amber-600 hover:underline transition-colors"
									>
										WHO's UV Index definition
									</a>
								</li>
								<li>
									<a
										href="https://www.epa.gov/sunsafety/uv-index-scale-0"
										target="_blank"
										rel="noopener noreferrer"
										className="text-slate-600 hover:text-amber-600 hover:underline transition-colors"
									>
										EPA's sun safety guide
									</a>
								</li>
								<li className="text-slate-500">
									Fitzpatrick (1988) on skin type classification
								</li>
								<li className="text-slate-500">
									McKinlay & Diffey (1987) on UV erythema response
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
									{" "}for weather data
								</li>
							</ul>
						</div>
					</div>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}
