import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/tiktok-sans/index.css";
import "./index.css";
import App from "./App.tsx";
import { Analytics } from "@vercel/analytics/react";

const root = document.getElementById("root");

if (!root) {
	throw new Error("Root element not found, check index.html!");
}

createRoot(root).render(
	<StrictMode>
		<App />
		<Analytics />
	</StrictMode>,
);
