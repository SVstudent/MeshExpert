import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { chat } from '@/lib/fireworks';
import { generateExpertEmbedding } from '@/lib/voyage';
import { PDFParse } from 'pdf-parse';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        let text = '';

        if (file.name.endsWith('.pdf')) {
            const parser = new PDFParse({ data: buffer });
            const data = await parser.getText();
            text = data.text;
            await parser.destroy();
        } else {
            text = buffer.toString('utf-8');
        }

        if (!text || text.trim().length < 50) {
            return NextResponse.json({ error: 'Document too short or empty' }, { status: 400 });
        }

        // Limit text length for LLM
        const textToAnalyze = text.slice(0, 10000);

        const systemPrompt = `You are a document analyzer. Extract expert profiles from the provided text.
An expert is a person mentioned in the text with their skills, title, and bio.

Respond ONLY with a JSON array of experts in this format:
[
  {
    "name": "Full Name",
    "title": "Professional Title",
    "department": "Department or Company",
    "bio": "A short professional bio matching the text",
    "skills": [
      { "name": "Skill Name", "level": "senior", "yearsExp": 5 }
    ],
    "availability": {
      "timezone": "EST",
      "hoursPerWeek": 40,
      "status": "available"
    }
  }
]
If no clear experts are found, return an empty array [].
Match as much detail as possible from the text.`;

        const response = await chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Analyze this document and extract experts:\n\n${textToAnalyze}` }
        ], { jsonMode: true });

        let syntheticExperts = [];
        try {
            syntheticExperts = JSON.parse(response);
            if (!Array.isArray(syntheticExperts)) {
                // Handle case where LLM might return an object with an 'experts' key
                if (syntheticExperts.experts && Array.isArray(syntheticExperts.experts)) {
                    syntheticExperts = syntheticExperts.experts;
                } else {
                    syntheticExperts = [];
                }
            }
        } catch (e) {
            console.error('Failed to parse AI response:', response);
            return NextResponse.json({ error: 'AI failed to generate valid JSON' }, { status: 500 });
        }

        if (syntheticExperts.length === 0) {
            return NextResponse.json({
                success: true,
                matches: [],
                message: 'No experts found in the document'
            });
        }

        const db = await getDb();
        const processedExperts = [];

        for (const expertData of syntheticExperts) {
            // Generate embedding for searchability
            const skillVector = await generateExpertEmbedding(expertData);

            const expert = {
                ...expertData,
                email: expertData.email || `${expertData.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
                skillVector,
                isSynthetic: true,
                matchCount: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const result = await db.collection(COLLECTIONS.EXPERTS).insertOne(expert);
            processedExperts.push({
                expert: {
                    ...expert,
                    _id: result.insertedId.toString()
                },
                matchScore: 1.0,
                reasoning: ['Generated from uploaded document'],
                matchedBy: 'document_ingestion'
            });
        }

        return NextResponse.json({
            success: true,
            matches: processedExperts,
            queryId: `doc-${Date.now()}`,
            conversation: [
                {
                    agent: 'orchestrator',
                    message: `Document analysis complete. Identified ${processedExperts.length} expert profiles matching the provided text.`,
                    timestamp: new Date().toISOString()
                }
            ]
        });

    } catch (error) {
        console.error('Document ingestion error:', error);
        return NextResponse.json({
            error: 'Failed to process document',
            details: String(error)
        }, { status: 500 });
    }
}
