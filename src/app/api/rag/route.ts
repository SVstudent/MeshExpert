/**
 * RAG Search API - Retrieval Augmented Generation
 * POST /api/rag - Full RAG pipeline with Vector Search + LLM
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, Expert } from '@/lib/mongodb';
import { generateQueryEmbedding } from '@/lib/voyage';
import { chat } from '@/lib/fireworks';

interface RAGRequest {
    query: string;
    topK?: number;
    includeContext?: boolean;
}

interface RAGResponse {
    query: string;
    answer: string;
    experts: {
        name: string;
        title: string;
        skills: string[];
        matchScore: number;
        bio: string;
        github?: string;
    }[];
    retrievalMethod: 'vector' | 'text';
    context?: string;
}

/**
 * RAG Search with Vector Retrieval + LLM Augmentation
 */
export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        const body = await request.json() as RAGRequest;
        const { query, topK = 5, includeContext = false } = body;

        if (!query) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        console.log(`\n🔍 RAG Query: "${query}"`);

        const db = await getDb();
        let experts: Expert[] = [];
        let retrievalMethod: 'vector' | 'text' = 'text';

        // Step 1: Generate query embedding
        console.log('📊 Generating query embedding...');
        let queryEmbedding: number[];
        try {
            queryEmbedding = await generateQueryEmbedding(query);
        } catch (embeddingError) {
            console.log('⚠️ Embedding failed, falling back to text search');
            queryEmbedding = [];
        }

        // Step 2: Vector Search (if embedding available)
        if (queryEmbedding.length > 0) {
            try {
                console.log('🔎 Performing vector search...');
                const pipeline = [
                    {
                        $vectorSearch: {
                            index: 'Nested',
                            path: 'skillVector',
                            queryVector: queryEmbedding,
                            numCandidates: 100,
                            limit: topK,
                        },
                    },
                    {
                        $addFields: {
                            vectorScore: { $meta: 'vectorSearchScore' },
                        },
                    },
                    {
                        $project: {
                            skillVector: 0, // Don't return embeddings
                        },
                    },
                ];

                const vectorResults = await db.collection(COLLECTIONS.EXPERTS)
                    .aggregate(pipeline)
                    .toArray();

                if (vectorResults.length > 0) {
                    experts = vectorResults as Expert[];
                    retrievalMethod = 'vector';
                    console.log(`   Found ${experts.length} via vector search`);
                }
            } catch (vectorError) {
                console.log('   Vector search failed, using text fallback');
            }
        }

        // Step 3: Fallback to text search
        if (experts.length === 0) {
            console.log('🔎 Performing text search...');

            // Extract keywords from query
            const keywords = query.toLowerCase()
                .split(/\s+/)
                .filter(w => w.length > 2)
                .filter(w => !['find', 'get', 'the', 'and', 'for', 'with', 'who', 'can', 'expert', 'developer', 'engineer'].includes(w));

            const searchQuery = keywords.length > 0
                ? {
                    $or: [
                        { 'skills.name': { $regex: keywords.join('|'), $options: 'i' } },
                        { title: { $regex: keywords.join('|'), $options: 'i' } },
                        { bio: { $regex: keywords.join('|'), $options: 'i' } },
                    ]
                }
                : {};

            experts = await db.collection(COLLECTIONS.EXPERTS)
                .find(searchQuery)
                .project({ skillVector: 0 })
                .limit(topK)
                .toArray() as Expert[];

            console.log(`   Found ${experts.length} via text search`);
        }

        // Step 4: Build context for RAG
        const context = experts.map((e, i) => {
            const skills = e.skills?.map(s => s.name).join(', ') || 'various skills';
            return `Expert ${i + 1}: ${e.name}
Title: ${e.title}
Skills: ${skills}
Bio: ${e.bio || 'No bio available'}
GitHub: ${e.github || 'N/A'}`;
        }).join('\n\n');

        // Step 5: LLM Augmentation - Generate synthesized answer
        console.log('🤖 Generating RAG response...');

        const systemPrompt = `You are an expert matching assistant for ExpertMesh.
Based on the retrieved expert profiles, provide a helpful response to the user's query.
Be concise, highlight the top matches, and explain why they're relevant.

Retrieved Expert Profiles:
${context}`;

        const userPrompt = `User Query: "${query}"

Based on the experts above, provide:
1. A brief summary of who best matches this query and why
2. Key skills that make them relevant
3. Any notable achievements or background

Keep your response concise (2-3 paragraphs max).`;

        let answer: string;
        try {
            answer = await chat([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ], { temperature: 0.7, maxTokens: 500 });
        } catch (llmError) {
            console.log('⚠️ LLM generation failed, using basic response');
            answer = `Found ${experts.length} matching experts for "${query}". Top match: ${experts[0]?.name || 'No matches found'}.`;
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ RAG completed in ${duration}s\n`);

        const response: RAGResponse = {
            query,
            answer,
            experts: experts.map(e => ({
                name: e.name,
                title: e.title,
                skills: e.skills?.map(s => s.name) || [],
                matchScore: (e as unknown as { vectorScore?: number }).vectorScore || 0.5,
                bio: e.bio || '',
                github: e.github,
            })),
            retrievalMethod,
            ...(includeContext && { context }),
        };

        return NextResponse.json({
            success: true,
            duration: `${duration}s`,
            ...response,
        });

    } catch (error) {
        console.error('RAG error:', error);
        return NextResponse.json(
            { error: 'RAG search failed', details: String(error) },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'RAG Search API',
        description: 'Retrieval Augmented Generation for expert matching',
        usage: 'POST with { query: "your search query", topK: 5, includeContext: false }',
        features: [
            'Vector Search with Voyage AI embeddings',
            'MongoDB Atlas Vector Search index',
            'Fireworks LLM for response generation',
            'Fallback to text search if vector unavailable',
        ],
    });
}
