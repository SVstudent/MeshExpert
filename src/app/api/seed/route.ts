/**
 * Seed API Endpoint
 * POST /api/seed - Populate database with sample experts
 */

import { NextResponse } from 'next/server';
import { getDb, COLLECTIONS, Expert } from '@/lib/mongodb';
import { generateExpertEmbedding } from '@/lib/voyage';

const SAMPLE_EXPERTS: Omit<Expert, '_id' | 'skillVector' | 'matchCount' | 'createdAt' | 'updatedAt'>[] = [
    {
        name: 'Dr. Sarah Chen',
        email: 'sarah.chen@example.com',
        title: 'Principal Security Architect',
        department: 'Security',
        bio: 'Former Google Security Lead with 15 years experience in cloud security and HIPAA compliance. PhD in Computer Security from MIT.',
        skills: [
            { name: 'Cloud Security', level: 'expert', yearsExp: 12 },
            { name: 'HIPAA Compliance', level: 'expert', yearsExp: 8 },
            { name: 'Kubernetes', level: 'senior', yearsExp: 6 },
            { name: 'AWS', level: 'expert', yearsExp: 10 },
            { name: 'Zero Trust Architecture', level: 'expert', yearsExp: 5 },
        ],
        linkedIn: 'https://linkedin.com/in/sarahchen',
        github: 'https://github.com/sarahchen',
        availability: { timezone: 'PST', hoursPerWeek: 20, status: 'available' },
    },
    {
        name: 'Marcus Johnson',
        email: 'marcus.j@example.com',
        title: 'Staff ML Engineer',
        department: 'AI/ML',
        bio: 'Machine Learning specialist focused on NLP and LLMs. Previously at OpenAI working on GPT models. Strong background in PyTorch and distributed training.',
        skills: [
            { name: 'Machine Learning', level: 'expert', yearsExp: 10 },
            { name: 'NLP', level: 'expert', yearsExp: 8 },
            { name: 'Python', level: 'expert', yearsExp: 12 },
            { name: 'PyTorch', level: 'expert', yearsExp: 6 },
            { name: 'LLMs', level: 'expert', yearsExp: 4 },
            { name: 'Distributed Systems', level: 'senior', yearsExp: 5 },
        ],
        linkedIn: 'https://linkedin.com/in/marcusjohnson',
        github: 'https://github.com/marcusj',
        availability: { timezone: 'EST', hoursPerWeek: 40, status: 'available' },
    },
    {
        name: 'Priya Sharma',
        email: 'priya.s@example.com',
        title: 'Senior Backend Engineer',
        department: 'Engineering',
        bio: 'Full-stack engineer specializing in high-performance backend systems. Expert in MongoDB, Node.js, and microservices architecture.',
        skills: [
            { name: 'MongoDB', level: 'expert', yearsExp: 7 },
            { name: 'Node.js', level: 'expert', yearsExp: 8 },
            { name: 'Python', level: 'senior', yearsExp: 6 },
            { name: 'Microservices', level: 'expert', yearsExp: 5 },
            { name: 'GraphQL', level: 'senior', yearsExp: 4 },
            { name: 'Docker', level: 'senior', yearsExp: 5 },
        ],
        linkedIn: 'https://linkedin.com/in/priyasharma',
        github: 'https://github.com/priyash',
        availability: { timezone: 'IST', hoursPerWeek: 30, status: 'available' },
    },
    {
        name: 'Alex Rivera',
        email: 'alex.r@example.com',
        title: 'DevOps Lead',
        department: 'Infrastructure',
        bio: 'Infrastructure expert with deep Kubernetes and CI/CD experience. Built deployment pipelines for Fortune 500 companies.',
        skills: [
            { name: 'Kubernetes', level: 'expert', yearsExp: 7 },
            { name: 'Docker', level: 'expert', yearsExp: 8 },
            { name: 'Terraform', level: 'expert', yearsExp: 5 },
            { name: 'AWS', level: 'expert', yearsExp: 9 },
            { name: 'CI/CD', level: 'expert', yearsExp: 6 },
            { name: 'GitOps', level: 'senior', yearsExp: 4 },
        ],
        linkedIn: 'https://linkedin.com/in/alexrivera',
        github: 'https://github.com/alexr',
        availability: { timezone: 'CST', hoursPerWeek: 40, status: 'available' },
    },
    {
        name: 'Dr. Emily Watson',
        email: 'emily.w@example.com',
        title: 'Data Science Manager',
        department: 'Data',
        bio: 'Former Stripe data science lead. Expert in product analytics, experimentation, and building data teams. MBA from Wharton.',
        skills: [
            { name: 'Data Science', level: 'expert', yearsExp: 12 },
            { name: 'Python', level: 'expert', yearsExp: 10 },
            { name: 'SQL', level: 'expert', yearsExp: 12 },
            { name: 'A/B Testing', level: 'expert', yearsExp: 8 },
            { name: 'Product Analytics', level: 'expert', yearsExp: 7 },
            { name: 'Team Management', level: 'senior', yearsExp: 5 },
        ],
        linkedIn: 'https://linkedin.com/in/emilywatson',
        availability: { timezone: 'PST', hoursPerWeek: 15, status: 'busy' },
    },
    {
        name: 'James Kim',
        email: 'james.k@example.com',
        title: 'Frontend Architect',
        department: 'Engineering',
        bio: 'React specialist who built UI frameworks at Meta. Expert in performance optimization and design systems.',
        skills: [
            { name: 'React', level: 'expert', yearsExp: 9 },
            { name: 'TypeScript', level: 'expert', yearsExp: 7 },
            { name: 'Next.js', level: 'expert', yearsExp: 5 },
            { name: 'CSS', level: 'expert', yearsExp: 10 },
            { name: 'Performance Optimization', level: 'expert', yearsExp: 6 },
            { name: 'Design Systems', level: 'senior', yearsExp: 4 },
        ],
        linkedIn: 'https://linkedin.com/in/jameskim',
        github: 'https://github.com/jamesk',
        availability: { timezone: 'PST', hoursPerWeek: 40, status: 'available' },
    },
    {
        name: 'Sofia Martinez',
        email: 'sofia.m@example.com',
        title: 'Healthcare IT Consultant',
        department: 'Consulting',
        bio: 'Healthcare technology specialist with expertise in EHR integrations, HIPAA, and FDA compliance. Previously at Epic Systems.',
        skills: [
            { name: 'HIPAA Compliance', level: 'expert', yearsExp: 10 },
            { name: 'Healthcare IT', level: 'expert', yearsExp: 12 },
            { name: 'EHR Integration', level: 'expert', yearsExp: 8 },
            { name: 'FDA Compliance', level: 'senior', yearsExp: 5 },
            { name: 'HL7 FHIR', level: 'expert', yearsExp: 6 },
            { name: 'Project Management', level: 'senior', yearsExp: 7 },
        ],
        linkedIn: 'https://linkedin.com/in/sofiamartinez',
        availability: { timezone: 'EST', hoursPerWeek: 30, status: 'available' },
    },
    {
        name: 'David Park',
        email: 'david.p@example.com',
        title: 'Blockchain Engineer',
        department: 'Web3',
        bio: 'Smart contract developer with experience building DeFi protocols. Expert in Solidity, auditing, and EVM optimization.',
        skills: [
            { name: 'Solidity', level: 'expert', yearsExp: 5 },
            { name: 'Ethereum', level: 'expert', yearsExp: 6 },
            { name: 'Smart Contract Auditing', level: 'senior', yearsExp: 3 },
            { name: 'DeFi', level: 'expert', yearsExp: 4 },
            { name: 'JavaScript', level: 'senior', yearsExp: 8 },
            { name: 'Web3.js', level: 'expert', yearsExp: 4 },
        ],
        linkedIn: 'https://linkedin.com/in/davidpark',
        github: 'https://github.com/davidp',
        availability: { timezone: 'KST', hoursPerWeek: 40, status: 'available' },
    },
];

export async function POST() {
    try {
        const db = await getDb();

        // Clear existing data
        await db.collection(COLLECTIONS.EXPERTS).deleteMany({});
        console.log('🗑️ Cleared existing experts');

        // Insert sample experts with embeddings
        const expertsWithEmbeddings: Expert[] = [];

        for (const expert of SAMPLE_EXPERTS) {
            console.log(`📝 Generating embedding for ${expert.name}...`);

            const skillVector = await generateExpertEmbedding({
                name: expert.name,
                title: expert.title,
                bio: expert.bio,
                skills: expert.skills,
            });

            expertsWithEmbeddings.push({
                ...expert,
                skillVector,
                matchCount: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }

        await db.collection(COLLECTIONS.EXPERTS).insertMany(expertsWithEmbeddings);
        console.log(`✅ Inserted ${expertsWithEmbeddings.length} experts`);

        return NextResponse.json({
            success: true,
            message: `Seeded ${expertsWithEmbeddings.length} experts`,
            experts: expertsWithEmbeddings.map(e => ({ name: e.name, title: e.title })),
        });
    } catch (error) {
        console.error('Seed error:', error);
        return NextResponse.json(
            { error: 'Seeding failed', details: String(error) },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'ExpertMesh Seed API',
        usage: 'POST to seed the database with sample experts',
    });
}
