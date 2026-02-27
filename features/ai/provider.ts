import { generateTextWithGemini } from "@/features/ai/providers/gemini";

export type AiTextGenerationParams = {
	prompt: string;
	systemInstruction?: string;
	fallbackText: string;
};

export type AiTextGenerationResult = {
	text: string;
	model: string;
	tokensIn?: number;
	tokensOut?: number;
};

export async function generateAiText(
	params: AiTextGenerationParams
): Promise<AiTextGenerationResult> {
	const provider = (process.env.AI_PROVIDER ?? "gemini").toLowerCase();
	const geminiApiKey = process.env.GEMINI_API_KEY;

	// Keep local development and CI/E2E bypass flows deterministic without external API dependency.
	if (process.env.ENABLE_E2E_TEST_BYPASS === "1" || !geminiApiKey) {
		return {
			text: params.fallbackText,
			model: "demo-project-report-v1",
		};
	}

	try {
		if (provider === "gemini") {
			return await generateTextWithGemini({
				apiKey: geminiApiKey,
				prompt: params.prompt,
				systemInstruction: params.systemInstruction,
			});
		}
		throw new Error(`UNSUPPORTED_AI_PROVIDER:${provider}`);
	} catch (error) {
		// Use a normalized error so action layers can map provider failures cleanly.
		throw new Error(
			error instanceof Error ? `AI_PROVIDER_ERROR:${error.message}` : "AI_PROVIDER_ERROR"
		);
	}
}
