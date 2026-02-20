import fs from "node:fs";
import path from "node:path";

import { ImageResponse } from "@vercel/og";

const fontPath = path.join(
	process.cwd(),
	"node_modules/@fontsource/tiktok-sans/files/tiktok-sans-latin-700-normal.woff",
);
const fontData = fs.readFileSync(fontPath);

const image = new ImageResponse(
	<div
		style={{
			background: "#fff7ed",
			display: "flex",
			flexDirection: "column",
			fontFamily: '"TikTok Sans"',
			height: "100%",
			padding: "80px",
			position: "relative",
			width: "100%",
		}}
	>
		{/* Large decorative sun in top-right — warm, faded */}
		<div
			style={{
				position: "absolute",
				top: "-80px",
				right: "-80px",
				width: "420px",
				height: "420px",
				borderRadius: "50%",
				background:
					"radial-gradient(circle, #fdba74 0%, #fed7aa 40%, transparent 70%)",
				display: "flex",
				opacity: 0.5,
			}}
		/>

		{/* Header */}
		<div
			style={{ alignItems: "center", display: "flex", marginBottom: "auto" }}
		>
			<svg
				width="44"
				height="44"
				viewBox="0 0 32 32"
				fill="none"
				style={{ marginRight: "14px" }}
				role="img"
				aria-label="SunburnTimer logo"
			>
				<title>SunburnTimer logo</title>
				<g stroke="#f97316" stroke-width="2" stroke-linecap="round">
					<line x1="16" y1="3" x2="16" y2="6" />
					<line x1="25.95" y1="8.05" x2="23.78" y2="10.22" />
					<line x1="29" y1="16" x2="26" y2="16" />
					<line x1="25.95" y1="23.95" x2="23.78" y2="21.78" />
					<line x1="16" y1="29" x2="16" y2="26" />
					<line x1="8.05" y1="23.95" x2="10.22" y2="21.78" />
					<line x1="3" y1="16" x2="6" y2="16" />
					<line x1="8.05" y1="8.05" x2="10.22" y2="10.22" />
				</g>
				<circle cx="16" cy="16" r="8" fill="#f97316" />
				<g stroke="white" stroke-width="1.5" stroke-linecap="round">
					<line x1="16" y1="16" x2="18.5" y2="12.5" />
					<line x1="16" y1="16" x2="16" y2="10" />
				</g>
				<circle cx="16" cy="16" r="1" fill="white" />
			</svg>
			<div
				style={{
					color: "#c2410c",
					display: "flex",
					fontSize: "32px",
					fontWeight: "bold",
				}}
			>
				SunburnTimer
			</div>
		</div>

		{/* Main content */}
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				justifyContent: "center",
				flex: 1,
			}}
		>
			<div
				style={{
					color: "#1c1917",
					display: "flex",
					fontSize: "72px",
					fontWeight: "bold",
					letterSpacing: "-0.04em",
					lineHeight: 1.1,
					marginBottom: "28px",
					maxWidth: "700px",
				}}
			>
				How long until you burn?
			</div>
			<div
				style={{
					color: "#78716c",
					display: "flex",
					fontSize: "28px",
					fontWeight: "bold",
					lineHeight: 1.5,
				}}
			>
				Your skin type + real-time UV = your safe time in the sun
			</div>
		</div>

		{/* Footer */}
		<div
			style={{
				alignItems: "center",
				display: "flex",
				justifyContent: "space-between",
				marginTop: "auto",
			}}
		>
			<div
				style={{
					color: "#c2410c",
					display: "flex",
					fontSize: "22px",
					fontWeight: "bold",
				}}
			>
				sunburntimer.com
			</div>
			<div style={{ display: "flex", gap: "10px" }}>
				{["Free", "No account needed"].map((tag) => (
					<div
						key={tag}
						style={{
							background: "#fed7aa",
							borderRadius: "20px",
							color: "#9a3412",
							display: "flex",
							fontSize: "17px",
							fontWeight: "bold",
							padding: "8px 20px",
						}}
					>
						{tag}
					</div>
				))}
			</div>
		</div>
	</div>,
	{
		fonts: [
			{
				name: "TikTok Sans",
				data: fontData,
				weight: 700,
				style: "normal" as const,
			},
		],
		height: 630,
		width: 1200,
	},
);

const buffer = Buffer.from(await image.arrayBuffer());
const outPath = path.join(process.cwd(), "public", "ogimage.png");
fs.writeFileSync(outPath, buffer);
console.log(`✅ OG image written to ${outPath}`);
