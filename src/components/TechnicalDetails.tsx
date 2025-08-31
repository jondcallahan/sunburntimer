import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "./ui/accordion";

export function TechnicalDetails() {
	return (
		<div className="mt-12">
			<Accordion type="single" collapsible className="w-full">
				<AccordionItem
					value="technical-details"
					className="bg-gradient-to-br from-zinc-50 to-zinc-100 rounded-xl overflow-hidden"
				>
					<AccordionTrigger className="px-8 py-6 hover:no-underline hover:bg-zinc-50/50 transition-colors">
						<div className="flex-1 text-left">
							<h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
								<span className="text-amber-600">⚡</span>
								Technical Details & Formula
							</h3>
							<p className="text-sm text-slate-600 mt-1.5">
								Mathematical formula and scientific references
							</p>
						</div>
					</AccordionTrigger>
					<AccordionContent className="px-8 pb-8">
						<div className="space-y-8 text-sm">
							<div>
								<h4 className="font-semibold text-slate-800 mb-3 text-base">
									Core Formula
								</h4>
								<div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm">
									<div className="text-center mb-4">
										<div className="font-mono text-sm bg-amber-50 px-4 py-3 rounded-lg border border-amber-200">
											<div className="text-slate-700 mb-2">
												Time to burn (minutes) =
											</div>
											<div className="text-amber-700 font-semibold leading-relaxed">
												<div className="ml-4">
													(BASE_DAMAGE_TIME × skinTypeCoeff × spfCoeff)
												</div>
												<div className="ml-4">÷</div>
												<div className="ml-4">
													(uvIndex × UV_SCALING_FACTOR)
												</div>
											</div>
										</div>
									</div>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
										<div className="bg-zinc-50 p-3 rounded-lg">
											<span className="font-semibold text-slate-700">
												BASE_DAMAGE_TIME
											</span>
											<span className="text-slate-600">: 200 minutes</span>
										</div>
										<div className="bg-zinc-50 p-3 rounded-lg">
											<span className="font-semibold text-slate-700">
												UV_SCALING_FACTOR
											</span>
											<span className="text-slate-600">: 3.0</span>
										</div>
										<div className="bg-zinc-50 p-3 rounded-lg">
											<span className="font-semibold text-slate-700">
												skinTypeCoeff
											</span>
											<span className="text-slate-600">
												: varies by Fitzpatrick skin type
											</span>
										</div>
										<div className="bg-zinc-50 p-3 rounded-lg">
											<span className="font-semibold text-slate-700">
												spfCoeff
											</span>
											<span className="text-slate-600">
												: SPF protection factor
											</span>
										</div>
									</div>
								</div>
							</div>

							<div>
								<h4 className="font-semibold text-slate-800 mb-3 text-base">
									Skin Type Coefficients
								</h4>
								<p className="text-slate-600 mb-4">
									Based on Fitzpatrick skin types and Minimal Erythema Dose
									(MED) values. The Fitzpatrick scale is also the basis for
									emoji skin tone modifiers:
								</p>
								<div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm">
									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
										<div className="bg-red-50 border border-red-200 p-3 rounded-lg">
											<div className="font-semibold text-red-800 flex items-center gap-2">
												🖐🏻 Type I
											</div>
											<div className="text-red-700">Coeff: 2.5</div>
											<div className="text-red-600 text-[10px]">
												MED: 200 J/m²
											</div>
										</div>
										<div className="bg-orange-50 border border-orange-200 p-3 rounded-lg">
											<div className="font-semibold text-orange-800 flex items-center gap-2">
												🖐🏻 Type II
											</div>
											<div className="text-orange-700">Coeff: 3.125</div>
											<div className="text-orange-600 text-[10px]">
												MED: 250 J/m²
											</div>
										</div>
										<div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
											<div className="font-semibold text-yellow-800 flex items-center gap-2">
												🖐🏼 Type III
											</div>
											<div className="text-yellow-700">Coeff: 4.375</div>
											<div className="text-yellow-600 text-[10px]">
												MED: 350 J/m²
											</div>
										</div>
										<div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
											<div className="font-semibold text-amber-800 flex items-center gap-2">
												🖐🏽 Type IV
											</div>
											<div className="text-amber-700">Coeff: 5.625</div>
											<div className="text-amber-600 text-[10px]">
												MED: 450 J/m²
											</div>
										</div>
										<div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
											<div className="font-semibold text-emerald-800 flex items-center gap-2">
												🖐🏾 Type V
											</div>
											<div className="text-emerald-700">Coeff: 7.5</div>
											<div className="text-emerald-600 text-[10px]">
												MED: 600 J/m²
											</div>
										</div>
										<div className="bg-teal-50 border border-teal-200 p-3 rounded-lg">
											<div className="font-semibold text-teal-800 flex items-center gap-2">
												🖐🏿 Type VI
											</div>
											<div className="text-teal-700">Coeff: 12.5</div>
											<div className="text-teal-600 text-[10px]">
												MED: 1000 J/m²
											</div>
										</div>
									</div>
								</div>
							</div>

							<div>
								<h4 className="font-semibold text-slate-800 mb-3 text-base">
									References
								</h4>
								<div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm">
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<a
											href="https://en.wikipedia.org/wiki/Fitzpatrick_scale"
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-start gap-3 p-3 rounded-lg hover:bg-zinc-50 transition-colors group"
										>
											<span className="text-amber-600 mt-0.5">📖</span>
											<div>
												<div className="font-medium text-slate-800 group-hover:text-amber-700">
													Fitzpatrick skin phototype scale
												</div>
												<div className="text-xs text-slate-500">Wikipedia</div>
											</div>
										</a>
										<a
											href="https://www.who.int/news-room/fact-sheets/detail/ultraviolet-radiation"
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-start gap-3 p-3 rounded-lg hover:bg-zinc-50 transition-colors group"
										>
											<span className="text-amber-600 mt-0.5">🏥</span>
											<div>
												<div className="font-medium text-slate-800 group-hover:text-amber-700">
													Ultraviolet radiation
												</div>
												<div className="text-xs text-slate-500">
													World Health Organization
												</div>
											</div>
										</a>
										<a
											href="https://www.epa.gov/sunsafety/uv-index-scale-0"
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-start gap-3 p-3 rounded-lg hover:bg-zinc-50 transition-colors group"
										>
											<span className="text-amber-600 mt-0.5">🌞</span>
											<div>
												<div className="font-medium text-slate-800 group-hover:text-amber-700">
													UV Index Scale
												</div>
												<div className="text-xs text-slate-500">
													Environmental Protection Agency
												</div>
											</div>
										</a>
										<a
											href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3709783/"
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-start gap-3 p-3 rounded-lg hover:bg-zinc-50 transition-colors group"
										>
											<span className="text-amber-600 mt-0.5">🔬</span>
											<div>
												<div className="font-medium text-slate-800 group-hover:text-amber-700">
													Minimal erythema dose and skin phototype
												</div>
												<div className="text-xs text-slate-500">
													National Center for Biotechnology Information
												</div>
											</div>
										</a>
									</div>
								</div>
							</div>

							<div>
								<h4 className="font-semibold text-slate-800 mb-3 text-base">
									Additional Features
								</h4>
								<div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm">
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
											<span className="text-blue-600 mt-0.5">⏱️</span>
											<div>
												<div className="font-medium text-blue-800">
													SPF Degradation
												</div>
												<div className="text-xs text-blue-600">
													Time-based protection reduction by activity level
												</div>
											</div>
										</div>
										<div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
											<span className="text-purple-600 mt-0.5">📊</span>
											<div>
												<div className="font-medium text-purple-800">
													UV Interpolation
												</div>
												<div className="text-xs text-purple-600">
													Smooth transitions between hourly weather data
												</div>
											</div>
										</div>
										<div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
											<span className="text-red-600 mt-0.5">🛑</span>
											<div>
												<div className="font-medium text-red-800">
													Safety Cutoff
												</div>
												<div className="text-xs text-red-600">
													Automatic stopping at 100% burn damage
												</div>
											</div>
										</div>
										<div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
											<span className="text-green-600 mt-0.5">🌤️</span>
											<div>
												<div className="font-medium text-green-800">
													Weather Data
												</div>
												<div className="text-xs text-green-600">
													Real-time data from Open-Meteo API
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</div>
	);
}
