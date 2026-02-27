type GeminiGenerateTextParams = {
	prompt: string;
	systemInstruction?: string;
	model?: string;
	apiKey: string;
};

type GeminiGenerateTextResult = {
	text: string;
	model: string;
	tokensIn?: number;
	tokensOut?: number;
};

function getTextFromCandidates(payload: unknown) {
	if (!payload || typeof payload !== "object") return null;
	const root = payload as Record<string, unknown>;
	const candidates = Array.isArray(root.candidates) ? root.candidates : [];

	for (const candidate of candidates) {
		if (!candidate || typeof candidate !== "object") continue;
		const content = (candidate as Record<string, unknown>).content;
		if (!content || typeof content !== "object") continue;
		const parts = Array.isArray((content as Record<string, unknown>).parts)
			? ((content as Record<string, unknown>).parts as unknown[])
			: [];
		const textParts = parts
			.map((part) => {
				if (!part || typeof part !== "object") return null;
				const text = (part as Record<string, unknown>).text;
				return typeof text === "string" ? text : null;
			})
			.filter((value): value is string => Boolean(value));
		if (textParts.length > 0) return textParts.join("\n").trim();
	}

	return null;
}

function getUsageTokens(payload: unknown) {
	if (!payload || typeof payload !== "object") return {};
	const root = payload as Record<string, unknown>;
	const usageMetadata =
		root.usageMetadata && typeof root.usageMetadata === "object"
			? (root.usageMetadata as Record<string, unknown>)
			: null;
	if (!usageMetadata) return {};

	const promptTokenCount =
		typeof usageMetadata.promptTokenCount === "number"
			? usageMetadata.promptTokenCount
			: undefined;
	const candidatesTokenCount =
		typeof usageMetadata.candidatesTokenCount === "number"
			? usageMetadata.candidatesTokenCount
			: undefined;

	return {
		tokensIn: promptTokenCount,
		tokensOut: candidatesTokenCount,
	};
}

export async function generateTextWithGemini(
	params: GeminiGenerateTextParams
): Promise<GeminiGenerateTextResult> {
	const model = params.model ?? process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
	const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(params.apiKey)}`;

	const response = await fetch(url, {
		method: "POST",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify({
			...(params.systemInstruction
				? {
						systemInstruction: {
							parts: [{ text: params.systemInstruction }],
						},
					}
				: {}),
			contents: [
				{
					role: "user",
					parts: [{ text: params.prompt }],
				},
			],
		}),
	});

	const rawText = await response.text();
	let payload: unknown = null;
	try {
		payload = rawText ? (JSON.parse(rawText) as unknown) : null;
	} catch {
		payload = null;
	}

	if (!response.ok) {
		throw new Error(
			`GEMINI_HTTP_${response.status}:${typeof rawText === "string" ? rawText.slice(0, 300) : ""}`
		);
	}

	const text = getTextFromCandidates(payload);
	if (!text) throw new Error("GEMINI_EMPTY_RESPONSE");

	const usage = getUsageTokens(payload);
	return {
		text,
		model,
		...usage,
	};
}
