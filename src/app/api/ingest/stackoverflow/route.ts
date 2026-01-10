/**
 * Stack Overflow Import API
 * POST /api/ingest/stackoverflow - Import developers from Stack Overflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { getTopUsers, searchUsersByTag, convertSOUserToExpert, checkQuota } from '@/lib/stackoverflow';
import { generateExpertEmbedding } from '@/lib/voyage';

// Popular Stack Overflow tags to import from
const POPULAR_TAGS = [
    'javascript', 'python', 'java', 'c#', 'php',
    'typescript', 'react', 'node.js', 'sql', 'html',
    'css', 'go', 'rust', 'swift', 'kotlin',
];

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        const body = await request.json();
        const {
            tags = POPULAR_TAGS.slice(0, 5),
            perTag = 5,
            topByReputation = 10,
            skipExisting = true,
        } = body;

        // Check API quota
        const quota = await checkQuota();
        console.log(`📊 Stack Overflow API quota: ${quota.remaining}/${quota.max}`);

        if (quota.remaining < 20) {
            return NextResponse.json({
                error: 'Stack Overflow API quota too low',
                remaining: quota.remaining,
            }, { status: 429 });
        }

        const db = await getDb();
        const expertsCollection = db.collection(COLLECTIONS.EXPERTS);

        const results = {
            imported: 0,
            skipped: 0,
            errors: 0,
            experts: [] as string[],
        };

        // Import top users by reputation first
        if (topByReputation > 0) {
            console.log(`\n📦 Importing top ${topByReputation} users by reputation...`);

            try {
                const topUsers = await getTopUsers(topByReputation);

                for (const user of topUsers) {
                    try {
                        // Skip if exists
                        if (skipExisting) {
                            const existing = await expertsCollection.findOne({
                                'sources.profileUrl': user.link,
                            });
                            if (existing) {
                                console.log(`   ⏭️ ${user.display_name} exists`);
                                results.skipped++;
                                continue;
                            }
                        }

                        const expert = await convertSOUserToExpert(user);

                        // Generate embedding
                        let skillVector: number[];
                        try {
                            skillVector = await generateExpertEmbedding({
                                name: expert.name,
                                title: expert.title,
                                bio: expert.bio,
                                skills: expert.skills,
                            });
                        } catch {
                            skillVector = Array(1024).fill(0).map(() => Math.random() * 2 - 1);
                        }

                        await expertsCollection.insertOne({
                            ...expert,
                            skillVector,
                            matchCount: 0,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        });

                        console.log(`   ✅ ${expert.name} (${expert.title}) - ${user.reputation.toLocaleString()} rep`);
                        results.imported++;
                        results.experts.push(expert.name);

                        await new Promise(resolve => setTimeout(resolve, 200));

                    } catch (error) {
                        console.error(`   ❌ Failed:`, error);
                        results.errors++;
                    }
                }
            } catch (error) {
                console.error('Top users fetch failed:', error);
            }
        }

        // Import by tags
        for (const tag of tags) {
            console.log(`\n📦 Importing top ${tag} answerers...`);

            try {
                const users = await searchUsersByTag(tag, perTag);

                for (const user of users) {
                    try {
                        if (skipExisting) {
                            const existing = await expertsCollection.findOne({
                                'sources.profileUrl': user.link,
                            });
                            if (existing) {
                                console.log(`   ⏭️ ${user.display_name} exists`);
                                results.skipped++;
                                continue;
                            }
                        }

                        const expert = await convertSOUserToExpert(user);

                        let skillVector: number[];
                        try {
                            skillVector = await generateExpertEmbedding({
                                name: expert.name,
                                title: expert.title,
                                bio: expert.bio,
                                skills: expert.skills,
                            });
                        } catch {
                            skillVector = Array(1024).fill(0).map(() => Math.random() * 2 - 1);
                        }

                        await expertsCollection.insertOne({
                            ...expert,
                            skillVector,
                            matchCount: 0,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        });

                        console.log(`   ✅ ${expert.name} - ${user.reputation.toLocaleString()} rep`);
                        results.imported++;
                        results.experts.push(expert.name);

                        await new Promise(resolve => setTimeout(resolve, 200));

                    } catch (error) {
                        console.error(`   ❌ Failed:`, error);
                        results.errors++;
                    }
                }

            } catch (error) {
                console.error(`Failed to search ${tag}:`, error);
            }

            // Delay between tags
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        const finalQuota = await checkQuota();

        return NextResponse.json({
            success: true,
            message: `Imported ${results.imported} developers from Stack Overflow`,
            duration: `${duration}s`,
            ...results,
            quotaRemaining: finalQuota.remaining,
        });

    } catch (error) {
        console.error('Stack Overflow ingest error:', error);
        return NextResponse.json(
            { error: 'Import failed', details: String(error) },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const quota = await checkQuota();

        return NextResponse.json({
            message: 'Stack Overflow Import API',
            quota: quota,
            availableTags: POPULAR_TAGS,
            usage: 'POST with { tags: ["javascript", "python"], perTag: 5, topByReputation: 10 }',
        });
    } catch (error) {
        return NextResponse.json({
            message: 'Stack Overflow Import API',
            error: String(error),
        });
    }
}
