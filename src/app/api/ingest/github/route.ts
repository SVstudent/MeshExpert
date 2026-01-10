/**
 * GitHub Data Ingestion API
 * POST /api/ingest/github - Import developers from GitHub
 * Supports both popular developers and hidden talents modes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { searchDevelopers, searchHiddenTalents, convertToExpert, checkRateLimit } from '@/lib/github';
import { generateExpertEmbedding } from '@/lib/voyage';

// Default languages/topics to search - diverse fields
const DEFAULT_LANGUAGES = ['Python', 'JavaScript', 'TypeScript', 'Go', 'Rust'];

// Diverse topics including non-coding fields
const DIVERSE_TOPICS = [
    // Technical
    'Python', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'Java', 'Swift', 'Kotlin',
    // Data/ML
    'jupyter', 'tensorflow', 'pytorch',
    // DevOps/Infra
    'kubernetes', 'terraform', 'docker',
    // Other
    'markdown', 'latex',
];

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            languages = DEFAULT_LANGUAGES,
            minFollowers = 500,
            maxFollowers = 99999999,
            minRepos = 5,
            limitPerLanguage = 5,
            clearExisting = false,
            mode = 'popular', // 'popular' | 'hidden'
            diverseTopics = false, // Use DIVERSE_TOPICS if true
        } = body;

        // Use diverse topics if requested
        const searchTopics = diverseTopics ? DIVERSE_TOPICS : languages;

        // Check rate limit first
        const rateLimit = await checkRateLimit();
        console.log(`📊 GitHub Rate Limit: ${rateLimit.remaining}/${rateLimit.limit} (resets ${rateLimit.reset.toLocaleTimeString()})`);

        if (rateLimit.remaining < 50) {
            return NextResponse.json({
                error: 'GitHub rate limit too low',
                remaining: rateLimit.remaining,
                reset: rateLimit.reset,
            }, { status: 429 });
        }

        const db = await getDb();
        const expertsCollection = db.collection(COLLECTIONS.EXPERTS);

        // Optionally clear existing GitHub-sourced experts
        if (clearExisting) {
            await expertsCollection.deleteMany({ 'sources.platform': 'github' });
            console.log('🗑️ Cleared existing GitHub experts');
        }

        const results = {
            imported: 0,
            skipped: 0,
            errors: 0,
            experts: [] as string[],
            mode,
        };

        for (const language of searchTopics) {
            console.log(`\n📦 Importing ${language} developers (mode: ${mode})...`);

            try {
                // Use different search function based on mode
                const developers = mode === 'hidden'
                    ? await searchHiddenTalents(language, minFollowers, maxFollowers, minRepos, limitPerLanguage)
                    : await searchDevelopers(language, minFollowers, limitPerLanguage);

                for (const dev of developers) {
                    try {
                        // Check if already exists
                        const existing = await expertsCollection.findOne({
                            'sources.profileUrl': `https://github.com/${dev.login}`,
                        });

                        if (existing) {
                            console.log(`   ⏭️ Skipping ${dev.login} (already exists)`);
                            results.skipped++;
                            continue;
                        }

                        // Convert to expert format
                        const expert = await convertToExpert(dev);

                        // Generate embedding
                        console.log(`   🔤 Generating embedding for ${expert.name}...`);
                        const skillVector = await generateExpertEmbedding({
                            name: expert.name,
                            title: expert.title,
                            bio: expert.bio,
                            skills: expert.skills,
                        });

                        // Insert into MongoDB
                        await expertsCollection.insertOne({
                            ...expert,
                            skillVector,
                            matchCount: 0,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        });

                        console.log(`   ✅ Imported ${expert.name} (${expert.title})`);
                        results.imported++;
                        results.experts.push(expert.name);

                        // Small delay to be nice to APIs
                        await new Promise(resolve => setTimeout(resolve, 200));

                    } catch (error) {
                        console.error(`   ❌ Failed to import ${dev.login}:`, error);
                        results.errors++;
                    }
                }

            } catch (error) {
                console.error(`Failed to search ${language} developers:`, error);
                results.errors++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Imported ${results.imported} developers from GitHub`,
            ...results,
            rateLimitRemaining: (await checkRateLimit()).remaining,
        });

    } catch (error) {
        console.error('GitHub ingest error:', error);
        return NextResponse.json(
            { error: 'GitHub import failed', details: String(error) },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const rateLimit = await checkRateLimit();

        return NextResponse.json({
            message: 'GitHub Data Ingestion API',
            modes: {
                popular: 'Search for popular developers with high follower counts',
                hidden: 'Search for hidden talents with lower followers but good activity',
            },
            usage: {
                popular: 'POST with { mode: "popular", languages: ["Python"], minFollowers: 500, limitPerLanguage: 5 }',
                hidden: 'POST with { mode: "hidden", languages: ["Python"], minFollowers: 20, maxFollowers: 500, minRepos: 10 }',
                diverse: 'POST with { mode: "hidden", diverseTopics: true } to search across all fields',
            },
            rateLimit: {
                remaining: rateLimit.remaining,
                limit: rateLimit.limit,
                reset: rateLimit.reset,
            },
        });
    } catch (error) {
        return NextResponse.json({
            message: 'GitHub Data Ingestion API',
            error: 'GitHub token not configured',
        });
    }
}
