/**
 * Search API Endpoint
 * POST /api/search - Submit a query to the multi-agent system
 */

import { NextRequest, NextResponse } from 'next/server';
import { OrchestratorAgent } from '@/lib/agents';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { query } = body;

        if (!query || typeof query !== 'string') {
            return NextResponse.json(
                { error: 'Query is required' },
                { status: 400 }
            );
        }

        console.log('\n🔍 New search request:', query);

        // Create orchestrator and process the query
        const orchestrator = new OrchestratorAgent();
        const result = await orchestrator.processQuery(query);

        return NextResponse.json({
            success: true,
            ...result,
        });

    } catch (error) {
        console.error('Search API error:', error);
        return NextResponse.json(
            { error: 'Search failed', details: String(error) },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'ExpertMesh Search API',
        usage: 'POST with { query: "your search query" }',
    });
}
