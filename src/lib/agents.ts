/**
 * Multi-Agent System for ExpertMesh
 * Implements the 5-agent collaborative architecture
 */

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { getDb, COLLECTIONS, Query, AgentTask, Expert } from './mongodb';
import { parseQuery, generateExplanation } from './fireworks';
import { generateQueryEmbedding } from './voyage';

// Agent Types
export type AgentType = 'orchestrator' | 'analyst' | 'scout' | 'verifier' | 'recommender';

// Agent Message for collaboration
export interface AgentMessage {
    agent: AgentType;
    message: string;
    data?: unknown;
    timestamp: Date;
}

// Search Result with explanation
export interface ExpertMatch {
    expert: Expert;
    matchScore: number;
    reasoning: string[];
    matchedBy: AgentType;
}

/**
 * Base Agent Class
 */
abstract class BaseAgent {
    protected agentType: AgentType;
    protected queryId: string;

    constructor(agentType: AgentType, queryId: string) {
        this.agentType = agentType;
        this.queryId = queryId;
    }

    protected async log(message: string, data?: unknown) {
        const db = await getDb();
        await (db.collection(COLLECTIONS.QUERIES) as any).updateOne(
            { queryId: this.queryId },
            {
                $push: {
                    agentConversation: {
                        agent: this.agentType,
                        message,
                        data,
                        timestamp: new Date(),
                    },
                },
            }
        );
        console.log(`[${this.agentType.toUpperCase()}] ${message}`);
    }

    abstract execute(input: unknown): Promise<unknown>;
}

/**
 * Query Analyst Agent
 * Parses natural language queries into structured requirements
 */
export class QueryAnalystAgent extends BaseAgent {
    constructor(queryId: string) {
        super('analyst', queryId);
    }

    async execute(rawQuery: string): Promise<Query['parsedRequirements']> {
        await this.log('Analyzing query requirements...');

        const requirements = await parseQuery(rawQuery);

        await this.log(`Extracted ${requirements.skills.length} skills, ${requirements.constraints.length} constraints`, requirements);

        return requirements;
    }
}

/**
 * Profile Scout Agent
 * Searches MongoDB for matching experts using vector search
 */
export class ProfileScoutAgent extends BaseAgent {
    constructor(queryId: string) {
        super('scout', queryId);
    }

    async execute(input: {
        requirements: Query['parsedRequirements'];
        rawQuery: string;
    }): Promise<Expert[]> {
        await this.log('Searching expert database...');

        const db = await getDb();
        const queryEmbedding = await generateQueryEmbedding(input.rawQuery);

        // Try vector search first
        try {
            const pipeline: any[] = [
                {
                    $vectorSearch: {
                        index: 'Nested',
                        path: 'skillVector',
                        queryVector: queryEmbedding,
                        numCandidates: 100,
                        limit: 20,
                    },
                },
                {
                    $addFields: {
                        matchScore: { $meta: 'vectorSearchScore' },
                    },
                },
            ];

            // Apply renown constraints if present
            const renownConstraint = input.requirements?.constraints.find(c => c.type === 'renown');
            if (renownConstraint) {
                const renownValue = renownConstraint.value.toLowerCase();
                let filter: any = null;

                if (renownValue === 'popular') {
                    filter = { $or: [{ renownLevel: 'famous' }, { renownLevel: 'established' }] };
                } else if (renownValue === 'hidden') {
                    filter = { $or: [{ renownLevel: 'hidden' }, { renownLevel: 'rising' }] };
                }

                if (filter) {
                    await this.log(`Applying renown filter: ${renownValue}`);
                    // Since $vectorSearch must be first, we can use a separate $match after or 
                    // ideally use the 'filter' parameter of $vectorSearch if the index supports it.
                    // For now, we'll match after to ensure results are within the requested group.
                    pipeline.push({ $match: filter });
                }
            }

            const results = await db.collection(COLLECTIONS.EXPERTS)
                .aggregate(pipeline)
                .limit(10)
                .toArray();

            if (results.length > 0) {
                await this.log(`Found ${results.length} candidates via vector search`);
                return results as unknown as Expert[];
            }
        } catch (error) {
            console.log('Vector search not available, using fallback:', error);
        }

        // Fallback: text-based search on skills
        const skillNames = input.requirements?.skills.map(s => s.name) || [];
        const query = skillNames.length > 0
            ? { 'skills.name': { $in: skillNames.map(s => new RegExp(s, 'i')) } }
            : {};

        const experts = await db.collection(COLLECTIONS.EXPERTS)
            .find(query)
            .limit(10)
            .toArray();

        await this.log(`Found ${experts.length} candidates via text search`);
        return experts as unknown as Expert[];
    }
}

/**
 * Verifier Agent
 * Validates and cross-references expert credentials
 */
export class VerifierAgent extends BaseAgent {
    constructor(queryId: string) {
        super('verifier', queryId);
    }

    async execute(candidates: Expert[]): Promise<Expert[]> {
        await this.log(`Verifying ${candidates.length} candidates...`);

        // Simulate verification (in production, would check LinkedIn, GitHub, etc.)
        const verified = candidates.map(expert => ({
            ...expert,
            verified: true,
            verificationDetails: {
                profileComplete: !!expert.bio && expert.skills.length > 0,
                hasExternalLinks: !!(expert.linkedIn || expert.github),
                availabilityConfirmed: expert.availability?.status === 'available',
            },
        }));

        const availableCount = verified.filter(e => e.availability?.status === 'available').length;
        await this.log(`Verified ${verified.length} experts, ${availableCount} available`);

        return verified as unknown as Expert[];
    }
}

/**
 * Recommender Agent
 * Ranks experts and generates explanations
 */
export class RecommenderAgent extends BaseAgent {
    constructor(queryId: string) {
        super('recommender', queryId);
    }

    async execute(input: {
        candidates: Expert[];
        rawQuery: string;
        requirements: Query['parsedRequirements'];
    }): Promise<ExpertMatch[]> {
        await this.log('Ranking and explaining matches...');

        const matches: ExpertMatch[] = [];

        for (const expert of input.candidates.slice(0, 5)) {
            // Calculate match score based on requirements
            const skillMatch = this.calculateSkillMatch(expert, input.requirements);
            const renownMatch = this.calculateRenownMatch(expert, input.requirements);
            const availabilityBonus = expert.availability?.status === 'available' ? 0.1 : 0;

            // Weight: 70% skills, 30% renown/intent match
            const matchScore = Math.min(1, (skillMatch * 0.7) + (renownMatch * 0.3) + availabilityBonus);

            // Generate explanation
            const reasoning = await generateExplanation(
                input.rawQuery,
                expert,
                matchScore
            );

            matches.push({
                expert,
                matchScore,
                reasoning,
                matchedBy: 'recommender',
            });
        }

        // Sort by match score
        matches.sort((a, b) => b.matchScore - a.matchScore);

        await this.log(`Ranked ${matches.length} experts, top match: ${matches[0]?.expert.name || 'none'}`);

        return matches;
    }

    private calculateSkillMatch(
        expert: Expert,
        requirements: Query['parsedRequirements'] | undefined
    ): number {
        if (!requirements?.skills.length) return 0.5;

        const expertSkills = new Set(expert.skills.map(s => s.name.toLowerCase()));
        let totalWeight = 0;
        let matchedWeight = 0;

        for (const req of requirements.skills) {
            totalWeight += req.weight;
            if (expertSkills.has(req.name.toLowerCase())) {
                matchedWeight += req.weight;
            }
        }

        return totalWeight > 0 ? matchedWeight / totalWeight : 0.5;
    }

    private calculateRenownMatch(
        expert: Expert,
        requirements: Query['parsedRequirements'] | undefined
    ): number {
        const renownConstraint = requirements?.constraints.find(c => c.type === 'renown');
        if (!renownConstraint) return 0.5;

        const requested = renownConstraint.value.toLowerCase();
        const actual = expert.renownLevel || 'hidden';

        if (requested === 'popular') {
            if (actual === 'famous') return 1.0;
            if (actual === 'established') return 0.8;
            if (actual === 'rising') return 0.4;
            return 0.1;
        }

        if (requested === 'hidden') {
            if (actual === 'hidden') return 1.0;
            if (actual === 'rising') return 0.7;
            return 0.2;
        }

        return 0.5;
    }
}

/**
 * Orchestrator Agent
 * Coordinates all other agents
 */
export class OrchestratorAgent {
    private queryId: string;
    private taskId: string;

    constructor() {
        this.queryId = `query_${uuidv4().slice(0, 8)}`;
        this.taskId = `task_${uuidv4().slice(0, 8)}`;
    }

    async processQuery(rawQuery: string): Promise<{
        queryId: string;
        matches: ExpertMatch[];
        conversation: AgentMessage[];
    }> {
        const db = await getDb();
        const queryHash = crypto.createHash('sha256').update(rawQuery.trim().toLowerCase()).digest('hex');

        try {
            // 1. Check Search Result Cache
            const cachedResult = await db.collection(COLLECTIONS.CACHE_SEARCH_RESULTS).findOne({
                queryHash,
                expiresAt: { $gt: new Date() }
            });

            if (cachedResult) {
                console.log('⚡ Orchestrator: Cache Hit for prompt:', rawQuery);
                return {
                    queryId: cachedResult.result.queryId,
                    matches: cachedResult.result.matches,
                    conversation: [
                        {
                            agent: 'orchestrator' as AgentType,
                            message: 'Retrieved optimized results from lightning cache.',
                            timestamp: new Date()
                        },
                        ...cachedResult.result.conversation
                    ],
                };
            }

            console.log(`\n🤖 ORCHESTRATOR: Cache Miss. Starting full inference for query ${this.queryId}`);

            // Create query record
            await db.collection(COLLECTIONS.QUERIES).insertOne({
                queryId: this.queryId,
                rawQuery,
                status: 'processing',
                agentConversation: [],
                results: [],
                createdAt: new Date(),
            });

            // Create task record
            await db.collection(COLLECTIONS.AGENT_TASKS).insertOne({
                taskId: this.taskId,
                queryId: this.queryId,
                agents: ['orchestrator', 'analyst', 'scout', 'verifier', 'recommender'],
                status: 'in_progress',
                steps: [],
                startedAt: new Date(),
            });

            // Step 1: Analyze query
            const analyst = new QueryAnalystAgent(this.queryId);
            const requirements = await analyst.execute(rawQuery);

            // Step 2: Search for candidates
            const scout = new ProfileScoutAgent(this.queryId);
            const candidates = await scout.execute({ requirements, rawQuery });

            // Step 3: Verify candidates
            const verifier = new VerifierAgent(this.queryId);
            const verified = await verifier.execute(candidates);

            // Step 4: Rank and explain
            const recommender = new RecommenderAgent(this.queryId);
            const matches = await recommender.execute({
                candidates: verified,
                rawQuery,
                requirements,
            });

            // Update query status
            const matchIds = matches.map(m => m.expert._id ? String(m.expert._id) : '');

            await db.collection(COLLECTIONS.QUERIES).updateOne(
                { queryId: this.queryId },
                {
                    $set: {
                        status: 'completed',
                        parsedRequirements: requirements,
                        results: matchIds,
                        completedAt: new Date(),
                    },
                }
            );

            // Update task status
            await db.collection(COLLECTIONS.AGENT_TASKS).updateOne(
                { taskId: this.taskId },
                {
                    $set: {
                        status: 'completed',
                        completedAt: new Date(),
                    },
                }
            );

            // Get conversation log
            const query = await db.collection(COLLECTIONS.QUERIES).findOne({ queryId: this.queryId });
            const conversation = (query?.agentConversation || []) as AgentMessage[];

            console.log(`\n✅ ORCHESTRATOR: Query completed with ${matches.length} matches\n`);

            // Ensure all IDs are strings for JSON safety
            const safeMatches = matches.map(m => ({
                ...m,
                expert: {
                    ...m.expert,
                    _id: m.expert._id ? String(m.expert._id) : undefined
                }
            }));

            const finalResult = {
                queryId: this.queryId,
                matches: safeMatches,
                conversation,
            };

            // 5. Store in Search Result Cache (1 hour TTL)
            await db.collection(COLLECTIONS.CACHE_SEARCH_RESULTS).updateOne(
                { queryHash },
                {
                    $set: {
                        queryHash,
                        originalQuery: rawQuery,
                        result: finalResult,
                        createdAt: new Date(),
                        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
                    }
                },
                { upsert: true }
            );

            return finalResult;

        } catch (error) {
            console.error('Orchestrator error:', error);

            await db.collection(COLLECTIONS.QUERIES).updateOne(
                { queryId: this.queryId },
                { $set: { status: 'failed' } }
            );

            throw error;
        }
    }
}
