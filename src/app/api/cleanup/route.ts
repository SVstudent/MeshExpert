/**
 * Database Cleanup API
 * POST /api/cleanup - Remove companies and organizations from experts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';

// Known company/organization names and patterns
const COMPANY_PATTERNS = [
    /^(Google|Microsoft|Apple|Meta|Facebook|Amazon|OpenAI|DeepMind|Netflix|Uber|Lyft|Stripe|Airbnb|Twitter|X Corp|GitHub|GitLab|Atlassian|Slack|Zoom|Salesforce|Oracle|IBM|Intel|AMD|NVIDIA|Databricks|Snowflake|MongoDB|Redis|Elastic|Confluent|HashiCorp|Cloudflare|Vercel|Netlify|DigitalOcean|Linode|Heroku|AWS|Azure|GCP|Alibaba|Tencent|Baidu|ByteDance|Huawei|Samsung|Sony|JetBrains|Unity|Epic Games|Activision|EA|Discord|Spotify|SoundCloud|Twitch|YouTube|TikTok|Pinterest|LinkedIn|Indeed|Glassdoor|AngelList|YC|Sequoia|a16z|Benchmark|Accel|Kleiner)$/i,
    /^The .+ (Language|Foundation|Project|Team|Community|Organization)$/i,
    /^.+ (Inc\.|LLC|Ltd|Corp|Foundation|Labs|Technologies|Software|Systems|Platform|Cloud|AI|ML)$/i,
    / Team$/i,
    / Official$/i,
    / Community$/i,
];

// More specific company names to remove
const KNOWN_COMPANIES = [
    'OpenAI', 'Google', 'Microsoft', 'Meta', 'Apple', 'Amazon', 'NVIDIA',
    'The Rust Programming Language', 'GitHub', 'GitHub Community', 'GitLab',
    'Bytedance Inc.', 'Alibaba', 'Databricks', 'Model Context Protocol',
    'The Apache Software Foundation', 'JuliaLang', 'SciML Open Source Scientific Machine Learning',
    'X (fka Twitter)', 'LangChain', 'TanStack', 'Hugging Face', 'DeepSeek',
    'Claude', 'Astral', 'Scroll', 'UpRock', 'CodeCrafters', 'Ai2',
];

function isCompany(name: string): boolean {
    // Check against known companies
    if (KNOWN_COMPANIES.some(c => name.toLowerCase() === c.toLowerCase())) {
        return true;
    }

    // Check against patterns
    if (COMPANY_PATTERNS.some(pattern => pattern.test(name))) {
        return true;
    }

    return false;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { dryRun = true } = body;

        const db = await getDb();
        const expertsCollection = db.collection(COLLECTIONS.EXPERTS);

        // Find all experts
        const allExperts = await expertsCollection.find({}).toArray();

        const toRemove: string[] = [];
        const toKeep: string[] = [];

        for (const expert of allExperts) {
            if (isCompany(expert.name)) {
                toRemove.push(expert.name);
            } else {
                toKeep.push(expert.name);
            }
        }

        console.log(`🗑️ Companies to remove (${toRemove.length}):`, toRemove);
        console.log(`✅ Individuals to keep (${toKeep.length}):`, toKeep.slice(0, 20));

        let removed = 0;
        if (!dryRun) {
            const result = await expertsCollection.deleteMany({
                name: { $in: toRemove }
            });
            removed = result.deletedCount;
            console.log(`Deleted ${removed} company accounts`);
        }

        return NextResponse.json({
            success: true,
            dryRun,
            companiesFound: toRemove.length,
            individualsKept: toKeep.length,
            companiesRemoved: dryRun ? 0 : removed,
            companyNames: toRemove,
            message: dryRun
                ? `Found ${toRemove.length} companies. Set dryRun=false to remove.`
                : `Removed ${removed} companies from database.`,
        });

    } catch (error) {
        console.error('Cleanup error:', error);
        return NextResponse.json(
            { error: 'Cleanup failed', details: String(error) },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'Database Cleanup API',
        usage: 'POST with { dryRun: true } to preview, { dryRun: false } to delete',
    });
}
