/**
 * MongoDB Connection for ExpertMesh
 * Handles agent memory, expert profiles, and vector search
 */

import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI!;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'expertmesh';

if (!MONGODB_URI) {
    throw new Error('Please define MONGODB_URI in .env.local');
}

// Collection names
export const COLLECTIONS = {
    EXPERTS: 'experts',
    QUERIES: 'queries',
    AGENT_MEMORY: 'agent_memory',
    AGENT_TASKS: 'agent_tasks',
    CACHE_EMBEDDINGS: 'cache_embeddings',
    CACHE_SEARCH_RESULTS: 'cache_search_results',
} as const;

// Cached connection
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
    if (cachedClient && cachedDb) {
        return { client: cachedClient, db: cachedDb };
    }

    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(MONGODB_DB_NAME);

    cachedClient = client;
    cachedDb = db;

    console.log('✅ Connected to MongoDB:', MONGODB_DB_NAME);

    // Run index optimization in the background
    const { ensureIndexes } = await import('./index-setup');
    ensureIndexes().catch(err => console.error('Failed to run index optimization:', err));

    return { client, db };
}

export async function getDb(): Promise<Db> {
    const { db } = await connectToDatabase();
    return db;
}

// Expert Profile Interface
export interface Expert {
    _id?: string;
    name: string;
    email: string;
    title: string;
    department: string;
    bio: string;
    skills: {
        name: string;
        level: 'junior' | 'mid' | 'senior' | 'expert';
        yearsExp: number;
    }[];
    skillVector?: number[]; // Voyage AI embedding
    linkedIn?: string;
    github?: string;
    stackoverflow?: string;
    availability: {
        timezone: string;
        hoursPerWeek: number;
        status: 'available' | 'busy' | 'unavailable';
    };
    // Renown level for RAG matching on "hidden talent" queries
    renownLevel?: 'hidden' | 'rising' | 'established' | 'famous';
    // Quality metrics beyond follower count
    qualityMetrics?: {
        activityScore: number;      // Based on commits, contributions
        consistencyScore: number;   // Regular activity over time
        expertiseDepth: number;     // Specialization in skills
    };
    // Source-specific metrics
    sources?: { platform: string; profileUrl: string; lastSyncedAt: Date }[];
    metrics?: {
        githubFollowers?: number;
        githubRepos?: number;
        githubStars?: number;
        soReputation?: number;
        soAnswers?: number;
        soBadges?: { gold: number; silver: number; bronze: number };
    };
    matchCount: number;
    createdAt: Date;
    updatedAt: Date;
}

// Query Interface
export interface Query {
    _id?: string;
    queryId: string;
    rawQuery: string;
    parsedRequirements?: {
        skills: { name: string; weight: number }[];
        constraints: { type: string; value: string }[];
        intent: string;
    };
    agentConversation: {
        agent: string;
        message: string;
        data?: unknown;
        timestamp: Date;
    }[];
    results: string[]; // Expert IDs
    status: 'processing' | 'completed' | 'failed';
    createdAt: Date;
    completedAt?: Date;
}

// Agent Task Interface
export interface AgentTask {
    _id?: string;
    taskId: string;
    queryId: string;
    agents: string[];
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    steps: {
        agent: string;
        action: string;
        output?: unknown;
        completedAt?: Date;
    }[];
    startedAt: Date;
    completedAt?: Date;
}
