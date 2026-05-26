# TODO

## Current UX Follow-Up

- Verify the compact planner on real mobile devices after the browser pass.
- Check whether users prefer Activity or Day as the saved default for the UV chart after a few real use cases.
- Decide whether to publish a maintained fork, gist, or static deployment before creating an external public copy.
- Test `/google` in Vercel preview with a real `GOOGLE_MAPS_API_KEY`; plain Vite dev cannot serve the provider function.
- Watch the Open-Meteo proxy route in production logs after launch, because it now protects the default GPS flow from browser CORS failures and falls back to CurrentUVIndex + MET Norway when Open-Meteo is unavailable.
- Consider adding activity presets like walking, running, cycling, and beach day if users need faster setup.
- Consider showing a small SPF option table so users can compare dose for None, SPF 15, SPF 30, and SPF 50+.

## Product Risks

- SPF and tanning guidance must stay clearly marked as an estimate.
- Tanning goals should never be described as safe. They are only risk budgets for UV exposure.
- Weather forecast coverage is limited, so long future plans need a visible warning.
