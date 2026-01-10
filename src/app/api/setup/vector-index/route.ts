/**
 * Vector Search Setup API
 * POST /api/setup/vector-index - Creates MongoDB Vector Search index
 */

import { NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';

export async function POST() {
    try {
        const db = await getDb();

        // MongoDB Atlas Vector Search index must be created via Atlas UI or CLI
        // This endpoint provides instructions and validates the setup

        console.log('📊 Checking vector search index...');

        // Check if collection exists
        const collections = await db.listCollections({ name: COLLECTIONS.EXPERTS }).toArray();
        if (collections.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'experts collection does not exist. Please seed data first.',
            });
        }

        // Count documents
        const count = await db.collection(COLLECTIONS.EXPERTS).countDocuments();

        // Check if documents have skillVector field
        const withVectors = await db.collection(COLLECTIONS.EXPERTS).countDocuments({
            skillVector: { $exists: true, $type: 'array' }
        });

        return NextResponse.json({
            success: true,
            message: 'Collection ready for vector search',
            documentCount: count,
            documentsWithVectors: withVectors,
            instructions: {
                step1: 'Go to MongoDB Atlas: https://cloud.mongodb.com/',
                step2: 'Navigate to: Database > Atlas Search > Create Index',
                step3: 'Select JSON Editor and use the index definition below',
                indexDefinition: {
                    name: 'expert_vector_index',
                    type: 'vectorSearch',
                    definition: {
                        fields: [{
                            type: 'vector',
                            path: 'skillVector',
                            numDimensions: 1024,
                            similarity: 'cosine'
                        }]
                    }
                }
            }
        });

    } catch (error) {
        console.error('Vector index setup error:', error);
        return NextResponse.json(
            { error: 'Setup failed', details: String(error) },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'Vector Search Setup API',
        usage: 'POST to check setup and get index creation instructions',
    });
}
