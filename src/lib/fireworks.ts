/**
 * Fireworks AI Integration for ExpertMesh
 * Powers all agent LLM inference
 */

const FIREWORKS_API_URL = 'https://api.fireworks.ai/inference/v1/chat/completions';
const DEFAULT_MODEL = 'accounts/fireworks/models/llama-v3p3-70b-instruct';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface FireworksResponse {
    id: string;
    choices: {
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }[];
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

/**
 * Call Fireworks AI for chat completion
 */
export async function chat(
    messages: ChatMessage[],
    options: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
        jsonMode?: boolean;
    } = {}
): Promise<string> {
    const apiKey = process.env.FIREWORKS_API_KEY;

    if (!apiKey) {
        throw new Error('FIREWORKS_API_KEY not set');
    }

    const {
        model = DEFAULT_MODEL,
        temperature = 0.7,
        maxTokens = 2048,
        jsonMode = false,
    } = options;

    const response = await fetch(FIREWORKS_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
            response_format: jsonMode ? { type: 'json_object' } : undefined,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Fireworks API error: ${error}`);
    }

    const data: FireworksResponse = await response.json();
    return data.choices[0]?.message?.content || '';
}

/**
 * Parse a query to extract structured requirements
 */
export async function parseQuery(rawQuery: string): Promise<{
    skills: { name: string; weight: number }[];
    constraints: { type: string; value: string }[];
    intent: string;
    summary: string;
}> {
    const systemPrompt = `You are a query parser for an expert matching system. 
Extract structured requirements from natural language queries.

Respond ONLY with valid JSON in this exact format:
{
  "skills": [{"name": "skill name", "weight": 0.8}],
  "constraints": [{"type": "renown", "value": "popular | hidden | rising | any"}],
  "intent": "technical_hire",
  "summary": "One sentence summary"
}
If the user asks for 'well-known', 'famous', or 'popular' people, set renown to 'popular'.
If the user asks for 'less-renowned', 'hidden', or 'unknown' people, set renown to 'hidden'.`;

    const defaultResult = {
        skills: rawQuery.toLowerCase().split(/\s+/)
            .filter(w => w.length > 3)
            .filter(w => !['find', 'need', 'want', 'looking', 'expert', 'developer', 'professional', 'professionals'].includes(w))
            .slice(0, 3)
            .map(name => ({ name: name.charAt(0).toUpperCase() + name.slice(1), weight: 0.8 })),
        constraints: [],
        intent: 'technical_hire',
        summary: rawQuery,
    };

    try {
        const response = await chat(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: rawQuery },
            ],
            { jsonMode: true, temperature: 0.3 }
        );

        const parsed = JSON.parse(response);

        // Validate structure
        return {
            skills: Array.isArray(parsed?.skills) ? parsed.skills : defaultResult.skills,
            constraints: Array.isArray(parsed?.constraints) ? parsed.constraints : [],
            intent: parsed?.intent || 'technical_hire',
            summary: parsed?.summary || rawQuery,
        };
    } catch (error) {
        console.log('parseQuery fallback:', error);
        return defaultResult;
    }
}

/**
 * Generate a recommendation explanation
 */
export async function generateExplanation(
    query: string,
    expert: { name: string; title: string; skills: { name: string }[] },
    matchScore: number
): Promise<string[]> {
    const systemPrompt = `You are explaining why an expert matches a query.
Generate 2-3 bullet points explaining the match.
Be specific and reference both the query requirements and expert skills.
Start each point with an emoji (✅ for match, ⚠️ for partial).`;

    const response = await chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Query: "${query}"\n\nExpert: ${expert.name}, ${expert.title}\nSkills: ${expert.skills.map(s => s.name).join(', ')}\nMatch Score: ${(matchScore * 100).toFixed(0)}%` },
    ], { temperature: 0.7 });

    return response.split('\n').filter(line => line.trim().length > 0);
}
