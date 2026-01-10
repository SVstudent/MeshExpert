import { getDb, COLLECTIONS } from './mongodb';

/**
 * Ensures all necessary MongoDB indexes are created for performance.
 * This should be run on application startup or database initialization.
 */
export async function ensureIndexes() {
    console.log('⚡ Starting MongoDB Index Optimization...');
    const db = await getDb();

    try {
        // 1. Experts Collection Indexes
        console.log('   - Optimizing experts...');
        await db.collection(COLLECTIONS.EXPERTS).createIndex({ email: 1 }, { unique: true });
        await db.collection(COLLECTIONS.EXPERTS).createIndex({ name: 1 });
        await db.collection(COLLECTIONS.EXPERTS).createIndex({ title: 1 });
        await db.collection(COLLECTIONS.EXPERTS).createIndex({ isSynthetic: 1 }); // Quick filtering

        // 2. Query Collection Indexes
        console.log('   - Optimizing queries...');
        await db.collection(COLLECTIONS.QUERIES).createIndex({ queryId: 1 }, { unique: true });
        await db.collection(COLLECTIONS.QUERIES).createIndex({ status: 1 });
        await db.collection(COLLECTIONS.QUERIES).createIndex({ createdAt: -1 });

        // 3. Embedding Cache Indexes
        console.log('   - Optimizing embedding cache...');
        await db.collection(COLLECTIONS.CACHE_EMBEDDINGS).createIndex({ textHash: 1 }, { unique: true });

        // 4. Search Result Cache Indexes (TTL)
        console.log('   - Optimizing search result cache...');
        await db.collection(COLLECTIONS.CACHE_SEARCH_RESULTS).createIndex({ queryHash: 1 }, { unique: true });
        // TTL Index: Automatically removes documents after the expiresAt date
        await db.collection(COLLECTIONS.CACHE_SEARCH_RESULTS).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

        console.log('✅ MongoDB Index Optimization Complete.');
    } catch (error) {
        console.error('❌ Failed to ensure indexes:', error);
    }
}
