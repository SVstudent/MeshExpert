/**
 * Diverse Expert Generator API
 * POST /api/generate/experts - Generate professionals from various fields
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { chat } from '@/lib/fireworks';
import { generateExpertEmbedding } from '@/lib/voyage';

// Professional fields and roles
const PROFESSIONAL_FIELDS = {
    technology: {
        department: 'Engineering',
        roles: [
            'Frontend Developer', 'Backend Developer', 'Full-Stack Developer',
            'DevOps Engineer', 'SRE', 'Data Engineer', 'Mobile Developer',
            'QA Engineer', 'Security Engineer', 'Platform Engineer',
        ],
        skills: ['JavaScript', 'Python', 'React', 'Node.js', 'AWS', 'Docker', 'Kubernetes', 'SQL', 'Git', 'CI/CD'],
    },
    data: {
        department: 'Data',
        roles: [
            'Data Scientist', 'ML Engineer', 'Data Analyst', 'BI Analyst',
            'Analytics Engineer', 'Research Scientist', 'AI Engineer',
        ],
        skills: ['Python', 'SQL', 'Machine Learning', 'TensorFlow', 'PyTorch', 'Pandas', 'Statistics', 'A/B Testing'],
    },
    product: {
        department: 'Product',
        roles: [
            'Product Manager', 'Product Designer', 'UX Designer', 'UI Designer',
            'UX Researcher', 'Design Lead', 'Product Analyst',
        ],
        skills: ['Product Strategy', 'User Research', 'Figma', 'Prototyping', 'A/B Testing', 'Analytics', 'Roadmapping'],
    },
    sales: {
        department: 'Sales',
        roles: [
            'Account Executive', 'Sales Development Rep', 'Enterprise Sales',
            'Sales Manager', 'Solutions Consultant', 'Sales Engineer',
            'Business Development Rep', 'Account Manager',
        ],
        skills: ['Salesforce', 'CRM', 'Negotiation', 'Pipeline Management', 'Cold Calling', 'B2B Sales', 'Enterprise Sales'],
    },
    marketing: {
        department: 'Marketing',
        roles: [
            'Marketing Manager', 'Content Marketer', 'Growth Marketer',
            'SEO Specialist', 'Social Media Manager', 'Brand Manager',
            'Demand Gen Manager', 'Marketing Analyst', 'Performance Marketer',
        ],
        skills: ['Google Analytics', 'SEO', 'Content Strategy', 'Social Media', 'Email Marketing', 'Paid Ads', 'HubSpot'],
    },
    finance: {
        department: 'Finance',
        roles: [
            'Financial Analyst', 'FP&A Analyst', 'Controller', 'Accountant',
            'Investment Analyst', 'Treasury Analyst', 'Tax Specialist',
        ],
        skills: ['Financial Modeling', 'Excel', 'Budgeting', 'Forecasting', 'GAAP', 'Reporting', 'QuickBooks'],
    },
    hr: {
        department: 'People',
        roles: [
            'HR Manager', 'Recruiter', 'Talent Acquisition', 'HR Business Partner',
            'Compensation Analyst', 'People Operations', 'Learning & Development',
        ],
        skills: ['Recruiting', 'HRIS', 'Employee Relations', 'Compensation', 'Benefits', 'Onboarding', 'Workday'],
    },
    operations: {
        department: 'Operations',
        roles: [
            'Operations Manager', 'Project Manager', 'Program Manager',
            'Supply Chain Manager', 'Logistics Coordinator', 'Process Analyst',
        ],
        skills: ['Project Management', 'Process Improvement', 'Lean', 'Six Sigma', 'Jira', 'Agile', 'Scrum'],
    },
    legal: {
        department: 'Legal',
        roles: [
            'Corporate Counsel', 'Contract Manager', 'Compliance Officer',
            'Legal Analyst', 'Privacy Counsel', 'IP Counsel',
        ],
        skills: ['Contract Review', 'Compliance', 'GDPR', 'Privacy Law', 'Corporate Law', 'Negotiation', 'Risk Management'],
    },
    consulting: {
        department: 'Consulting',
        roles: [
            'Management Consultant', 'Strategy Consultant', 'IT Consultant',
            'Business Analyst', 'Implementation Consultant', 'Change Manager',
        ],
        skills: ['Strategy', 'Business Analysis', 'PowerPoint', 'Client Management', 'Problem Solving', 'Frameworks'],
    },
};

// Realistic first and last names
const FIRST_NAMES = [
    'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn',
    'Sarah', 'Michael', 'David', 'Jennifer', 'Emily', 'James', 'Robert', 'Maria',
    'Daniel', 'Jessica', 'Matthew', 'Ashley', 'Andrew', 'Amanda', 'Joshua', 'Rachel',
    'Kevin', 'Samantha', 'Christopher', 'Nicole', 'Brian', 'Stephanie', 'Ryan', 'Heather',
    'Wei', 'Priya', 'Raj', 'Chen', 'Aisha', 'Omar', 'Yuki', 'Carlos', 'Sofia', 'Mohammed',
];

const LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez',
    'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott',
    'Patel', 'Kim', 'Chen', 'Wang', 'Singh', 'Kumar', 'Nguyen', 'Tanaka', 'Santos',
];

const TIMEZONES = ['PST', 'EST', 'CST', 'MST', 'GMT', 'CET', 'IST', 'SGT', 'JST'];

function randomFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateProfessional(field: keyof typeof PROFESSIONAL_FIELDS, index: number) {
    const fieldData = PROFESSIONAL_FIELDS[field];
    const firstName = randomFrom(FIRST_NAMES);
    const lastName = randomFrom(LAST_NAMES);
    const name = `${firstName} ${lastName}`;
    const role = randomFrom(fieldData.roles);

    // Random experience level
    const yearsBase = Math.floor(Math.random() * 12) + 2;
    const level = yearsBase >= 8 ? 'Senior' : yearsBase >= 5 ? '' : 'Junior';
    const title = level ? `${level} ${role}` : role;

    // Select 4-6 skills with varied experience
    const numSkills = Math.floor(Math.random() * 3) + 4;
    const selectedSkills = [...fieldData.skills]
        .sort(() => Math.random() - 0.5)
        .slice(0, numSkills)
        .map(skill => ({
            name: skill,
            level: Math.random() > 0.3 ? 'senior' : 'mid',
            yearsExp: Math.floor(Math.random() * (yearsBase - 1)) + 1,
        }));

    return {
        name,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@example.com`,
        title,
        department: fieldData.department,
        bio: `Experienced ${role.toLowerCase()} with ${yearsBase} years in the industry. ` +
            `Specializes in ${selectedSkills.slice(0, 2).map(s => s.name).join(' and ')}.`,
        skills: selectedSkills,
        linkedIn: `https://linkedin.com/in/${firstName.toLowerCase()}${lastName.toLowerCase()}${index}`,
        availability: {
            timezone: randomFrom(TIMEZONES),
            hoursPerWeek: Math.floor(Math.random() * 20) + 20,
            status: Math.random() > 0.3 ? 'available' : 'busy' as const,
        },
        sources: [{
            platform: 'generated',
            profileUrl: '',
            lastSyncedAt: new Date(),
        }],
        metrics: {
            yearsExperience: yearsBase,
            projectsCompleted: Math.floor(Math.random() * 50) + 10,
        },
    };
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        const body = await request.json();
        const {
            fields = Object.keys(PROFESSIONAL_FIELDS),
            perField = 10,
            clearExisting = false,
        } = body;

        const db = await getDb();
        const expertsCollection = db.collection(COLLECTIONS.EXPERTS);

        if (clearExisting) {
            await expertsCollection.deleteMany({ 'sources.platform': 'generated' });
            console.log('🗑️ Cleared existing generated experts');
        }

        const results = {
            imported: 0,
            errors: 0,
            byField: {} as Record<string, number>,
        };

        let index = 0;
        for (const field of fields) {
            if (!(field in PROFESSIONAL_FIELDS)) {
                console.log(`⚠️ Unknown field: ${field}`);
                continue;
            }

            console.log(`\n📦 Generating ${perField} ${field} professionals...`);
            results.byField[field] = 0;

            for (let i = 0; i < perField; i++) {
                try {
                    const expert = generateProfessional(field as keyof typeof PROFESSIONAL_FIELDS, index++);

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

                    console.log(`   ✅ ${expert.name} - ${expert.title}`);
                    results.imported++;
                    results.byField[field]++;

                    // Small delay for embedding API
                    await new Promise(resolve => setTimeout(resolve, 100));

                } catch (error) {
                    console.error(`   ❌ Error:`, error);
                    results.errors++;
                }
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        return NextResponse.json({
            success: true,
            message: `Generated ${results.imported} professionals in ${duration}s`,
            duration: `${duration}s`,
            ...results,
        });

    } catch (error) {
        console.error('Generate error:', error);
        return NextResponse.json(
            { error: 'Generation failed', details: String(error) },
            { status: 500 }
        );
    }
}

export async function GET() {
    const db = await getDb();
    const count = await db.collection(COLLECTIONS.EXPERTS).countDocuments();

    return NextResponse.json({
        message: 'Diverse Expert Generator API',
        currentExperts: count,
        availableFields: Object.keys(PROFESSIONAL_FIELDS),
        usage: 'POST with { fields: ["sales", "marketing"], perField: 10 }',
    });
}
