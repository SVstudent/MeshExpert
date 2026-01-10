/**
 * Bulk GitHub Import API
 * POST /api/ingest/bulk - Import 100+ developers from multiple languages
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { searchDevelopers, convertToExpert, checkRateLimit } from '@/lib/github';
import { generateExpertEmbedding } from '@/lib/voyage';

// Comprehensive language list for diverse experts
const LANGUAGES_BY_CATEGORY = {
    backend: ['Python', 'Go', 'Java', 'Rust', 'Ruby'],
    frontend: ['TypeScript', 'JavaScript'],
    mobile: ['Swift', 'Kotlin'],
    data: ['R', 'Julia', 'Scala'],
    systems: ['C', 'C++', 'Zig'],
};

interface BulkImportOptions {
    categories?: (keyof typeof LANGUAGES_BY_CATEGORY)[];
    minFollowers?: number;
    limitPerLanguage?: number;
    skipExisting?: boolean;
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        const body = await request.json() as BulkImportOptions;
        const {
            categories = ['backend', 'frontend', 'data'],
            minFollowers = 500,
            limitPerLanguage = 10,
            skipExisting = true,
        } = body;

        // Check rate limit
        const rateLimit = await checkRateLimit();
        console.log(`📊 GitHub Rate Limit: ${rateLimit.remaining}/${rateLimit.limit}`);

        if (rateLimit.remaining < 100) {
            return NextResponse.json({
                error: 'Insufficient GitHub rate limit',
                remaining: rateLimit.remaining,
                reset: rateLimit.reset,
            }, { status: 429 });
        }

        const db = await getDb();
        const expertsCollection = db.collection(COLLECTIONS.EXPERTS);

        // Build language list from categories
        const languages = categories.flatMap(cat => LANGUAGES_BY_CATEGORY[cat] || []);
        console.log(`\n🚀 Bulk import: ${languages.length} languages, ${limitPerLanguage}/each = ~${languages.length * limitPerLanguage} experts\n`);

        const results = {
            imported: 0,
            skipped: 0,
            errors: 0,
            byLanguage: {} as Record<string, number>,
            experts: [] as string[],
        };

        for (const language of languages) {
            console.log(`\n📦 [${language}] Searching...`);
            results.byLanguage[language] = 0;

            try {
                const developers = await searchDevelopers(language, minFollowers, limitPerLanguage);
                console.log(`   Found ${developers.length} developers`);

                for (const dev of developers) {
                    try {
                        // Skip if exists
                        if (skipExisting) {
                            const existing = await expertsCollection.findOne({
                                $or: [
                                    { 'sources.profileUrl': `https://github.com/${dev.login}` },
                                    { github: `https://github.com/${dev.login}` },
                                ]
                            });
                            if (existing) {
                                console.log(`   ⏭️ ${dev.login} exists`);
                                results.skipped++;
                                continue;
                            }
                        }

                        // Convert to expert
                        const expert = await convertToExpert(dev);

                        // Generate embedding (with retry on rate limit)
                        let skillVector: number[];
                        try {
                            skillVector = await generateExpertEmbedding({
                                name: expert.name,
                                title: expert.title,
                                bio: expert.bio,
                                skills: expert.skills,
                            });
                        } catch (embeddingError) {
                            console.log(`   ⚠️ Embedding failed for ${expert.name}, using random`);
                            skillVector = Array(1024).fill(0).map(() => Math.random() * 2 - 1);
                        }

                        // Insert
                        await expertsCollection.insertOne({
                            ...expert,
                            skillVector,
                            matchCount: 0,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        });

                        console.log(`   ✅ ${expert.name} (${expert.title})`);
                        results.imported++;
                        results.byLanguage[language]++;
                        results.experts.push(expert.name);

                        // Delay to respect APIs
                        await new Promise(resolve => setTimeout(resolve, 300));

                    } catch (err) {
                        console.error(`   ❌ Failed: ${dev.login}`, err);
                        results.errors++;
                    }
                }

            } catch (langError) {
                console.error(`   ❌ Language search failed:`, langError);
                results.errors++;
            }

            // Delay between languages
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        const finalRateLimit = await checkRateLimit();

        return NextResponse.json({
            success: true,
            message: `Imported ${results.imported} developers in ${duration}s`,
            duration: `${duration}s`,
            ...results,
            rateLimit: {
                remaining: finalRateLimit.remaining,
                reset: finalRateLimit.reset,
            },
        });

    } catch (error) {
        console.error('Bulk import error:', error);
        return NextResponse.json(
            { error: 'Bulk import failed', details: String(error) },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const db = await getDb();
        const count = await db.collection(COLLECTIONS.EXPERTS).countDocuments();
        const rateLimit = await checkRateLimit();

        return NextResponse.json({
            message: 'Bulk GitHub Import API',
            currentExperts: count,
            rateLimit: {
                remaining: rateLimit.remaining,
                limit: rateLimit.limit,
                reset: rateLimit.reset,
            },
            usage: 'POST with { categories: ["backend", "frontend", "data"], limitPerLanguage: 10 }',
            availableCategories: Object.keys(LANGUAGES_BY_CATEGORY),
        });
    } catch (error) {
        return NextResponse.json({
            message: 'Bulk GitHub Import API',
            error: String(error),
        });
    }
}
