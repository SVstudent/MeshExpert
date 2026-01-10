import { NextRequest, NextResponse } from 'next/server';
import { chat } from '@/lib/fireworks';

/**
 * MeshBoard Assistant API
 * POST /api/meshboard/assistant
 * Body: { experts: Expert[], projects: Project[] }
 */
export async function POST(request: NextRequest) {
    try {
        const { experts, projects } = await request.json();

        if (!experts || !projects) {
            return NextResponse.json({ error: 'Experts and projects are required' }, { status: 400 });
        }

        const systemPrompt = `You are the ExpertMesh Strategic Advisor. 
You help managers assign experts (employees) to projects based on their skills and the project's needs.
Be professional, concise, and strategic.
Format your response as a clear recommendation for each expert that isn't already assigned.`;

        const userPrompt = `I have the following experts:
${experts.map((e: any) => `- ${e.name}: ${e.title}. Skills: ${e.skills.map((s: any) => s.name).join(', ')}. Bio: ${e.bio}`).join('\n')}

I have these projects:
${projects.map((p: any) => `- ${p.name}: ${p.description}`).join('\n')}

Please provide a strategic recommendation on where to place the experts. Highlight why they fit the specific projects.`;

        const advice = await chat(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            {
                maxTokens: 500,
            }
        );

        return NextResponse.json({
            success: true,
            advice,
        });
    } catch (error) {
        console.error('MeshBoard Assistant error:', error);
        return NextResponse.json(
            { error: 'Failed to generate advice', details: String(error) },
            { status: 500 }
        );
    }
}
