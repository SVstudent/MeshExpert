/**
 * Voyage AI Integration for ExpertMesh
 * Generates embeddings for expert skills and queries
 */

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';
const VOYAGE_MODEL = 'voyage-2'; // General purpose model

import { getDb, COLLECTIONS } from './mongodb';
import crypto from 'crypto';

export async function generateEmbedding(text: string): Promise<number[]> {
    const voyageKey = process.env.VOYAGE_API_KEY;

    if (!voyageKey) {
        console.log('⚠️ Voyage API key not set, using mock embedding');
        return Array(1024).fill(0).map(() => Math.random() * 2 - 1);
    }

    // 1. Check cache first
    const textHash = crypto.createHash('sha256').update(text).digest('hex');

    try {
        const db = await getDb();
        const cached = await db.collection(COLLECTIONS.CACHE_EMBEDDINGS).findOne({ textHash });

        if (cached) {
            console.log('🎯 Embedding Cache Hit!');
            return cached.embedding;
        }

        // 2. Cache miss: Call Voyage AI
        console.log('🌐 Embedding Cache Miss: Calling Voyage AI...');
        const response = await fetch(VOYAGE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${voyageKey}`,
            },
            body: JSON.stringify({
                input: text,
                model: VOYAGE_MODEL,
            }),
        });

        if (!response.ok) {
            throw new Error(`Voyage API error: ${response.statusText}`);
        }

        const data = await response.json();
        const embedding = data.data[0].embedding;

        // 3. Store in cache
        await db.collection(COLLECTIONS.CACHE_EMBEDDINGS).updateOne(
            { textHash },
            {
                $set: {
                    textHash,
                    text: text.slice(0, 500), // Store preview
                    embedding,
                    createdAt: new Date()
                }
            },
            { upsert: true }
        );

        return embedding;
    } catch (error) {
        console.error('Voyage embedding error:', error);
        return Array(1024).fill(0).map(() => Math.random() * 2 - 1);
    }
}

/**
 * Generate embedding for an expert's full profile
 */
export async function generateExpertEmbedding(expert: {
    name: string;
    title: string;
    bio: string;
    skills: { name: string; level: string; yearsExp: number }[];
}): Promise<number[]> {
    // Create a rich text representation of the expert
    const skillsText = expert.skills
        .map(s => `${s.name} (${s.level}, ${s.yearsExp} years)`)
        .join(', ');

    const fullText = `
        ${expert.name}, ${expert.title}
        ${expert.bio}
        Skills: ${skillsText}
    `.trim();

    return generateEmbedding(fullText);
}

/**
 * Generate embedding for a search query
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
    return generateEmbedding(query);
}
