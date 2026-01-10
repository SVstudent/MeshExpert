/**
 * Experts API Endpoint
 * GET /api/experts - List all experts
 * POST /api/experts - Add a new expert
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, Expert } from '@/lib/mongodb';
import { generateExpertEmbedding } from '@/lib/voyage';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const ids = searchParams.get('ids')?.split(',').filter(Boolean);

        const db = await getDb();
        let query = {};

        if (ids && ids.length > 0) {
            const { ObjectId } = require('mongodb');
            try {
                const objectIds = ids.map(id => new ObjectId(id));
                query = { _id: { $in: objectIds } };
            } catch (e) {
                console.error('Invalid ID format in query:', e);
                // Fallback to string IDs if conversion fails (unlikely given how we save)
                query = { _id: { $in: ids } };
            }
        }

        const experts = await db.collection(COLLECTIONS.EXPERTS)
            .find(query)
            .project({ skillVector: 0 })
            .toArray();

        return NextResponse.json({
            success: true,
            count: experts.length,
            experts,
        });
    } catch (error) {
        console.error('Experts API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch experts', details: String(error) },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, title, department, bio, skills, linkedIn, github, availability } = body;

        if (!name || !email || !title) {
            return NextResponse.json(
                { error: 'name, email, and title are required' },
                { status: 400 }
            );
        }

        const db = await getDb();

        // Generate embedding for the expert
        const skillVector = await generateExpertEmbedding({
            name,
            title,
            bio: bio || '',
            skills: skills || [],
        });

        const expert: Expert = {
            name,
            email,
            title,
            department: department || 'General',
            bio: bio || '',
            skills: skills || [],
            skillVector,
            linkedIn,
            github,
            availability: availability || {
                timezone: 'UTC',
                hoursPerWeek: 40,
                status: 'available',
            },
            matchCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        } as any;

        const { _id, ...expertData } = expert;
        const result = await db.collection(COLLECTIONS.EXPERTS).insertOne(expertData as any);

        return NextResponse.json({
            success: true,
            expertId: result.insertedId,
            message: `Expert ${name} added successfully`,
        });
    } catch (error) {
        console.error('Add expert error:', error);
        return NextResponse.json(
            { error: 'Failed to add expert', details: String(error) },
            { status: 500 }
        );
    }
}
