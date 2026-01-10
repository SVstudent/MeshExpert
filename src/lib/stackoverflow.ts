/**
 * Stack Overflow API Integration for ExpertMesh
 * Fetches real developer profiles from Stack Overflow
 */

const STACK_API_BASE = 'https://api.stackexchange.com/2.3';

interface StackOverflowUser {
    user_id: number;
    display_name: string;
    reputation: number;
    badge_counts: {
        bronze: number;
        silver: number;
        gold: number;
    };
    profile_image: string;
    link: string;
    location?: string;
    website_url?: string;
    about_me?: string;
    creation_date: number;
    last_access_date: number;
    answer_count: number;
    question_count: number;
}

interface StackOverflowTag {
    tag_name: string;
    answer_count: number;
    answer_score: number;
    question_count: number;
    question_score: number;
}

/**
 * Search for top users by tag (e.g., "javascript", "python")
 */
export async function searchUsersByTag(
    tag: string,
    limit: number = 30
): Promise<StackOverflowUser[]> {
    const apiKey = process.env.STACKOVERFLOW_KEY || '';
    const keyParam = apiKey ? `&key=${apiKey}` : '';

    const url = `${STACK_API_BASE}/tags/${encodeURIComponent(tag)}/top-answerers/all_time?site=stackoverflow&pagesize=${limit}${keyParam}`;

    console.log(`🔍 Searching Stack Overflow for top ${tag} answerers...`);

    const response = await fetch(url);

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Stack Overflow API failed: ${error}`);
    }

    const data = await response.json();

    // Get full user details for each
    const userIds = data.items.map((item: { user: { user_id: number } }) => item.user.user_id);
    return getUsersByIds(userIds.slice(0, limit));
}

/**
 * Get top users by reputation
 */
export async function getTopUsers(limit: number = 30): Promise<StackOverflowUser[]> {
    const apiKey = process.env.STACKOVERFLOW_KEY || '';
    const keyParam = apiKey ? `&key=${apiKey}` : '';

    const url = `${STACK_API_BASE}/users?order=desc&sort=reputation&site=stackoverflow&pagesize=${limit}${keyParam}`;

    console.log(`🔍 Fetching top ${limit} Stack Overflow users by reputation...`);

    const response = await fetch(url);

    if (!response.ok) {
        const text = await response.text();
        console.error('API Error:', text);
        throw new Error(`Stack Overflow API failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`   Found ${data.items?.length || 0} users`);
    return data.items || [];
}

/**
 * Get users by IDs
 */
export async function getUsersByIds(userIds: number[]): Promise<StackOverflowUser[]> {
    if (userIds.length === 0) return [];

    const apiKey = process.env.STACKOVERFLOW_KEY || '';
    const keyParam = apiKey ? `&key=${apiKey}` : '';

    const ids = userIds.slice(0, 100).join(';'); // Max 100 per request
    const url = `${STACK_API_BASE}/users/${ids}?order=desc&sort=reputation&site=stackoverflow${keyParam}`;

    const response = await fetch(url);

    if (!response.ok) {
        const text = await response.text();
        console.error('API Error:', text);
        throw new Error(`Stack Overflow API failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
}

/**
 * Get user's top tags (skills)
 */
export async function getUserTopTags(userId: number): Promise<StackOverflowTag[]> {
    const apiKey = process.env.STACKOVERFLOW_KEY || '';
    const keyParam = apiKey ? `&key=${apiKey}` : '';

    const url = `${STACK_API_BASE}/users/${userId}/top-tags?site=stackoverflow&pagesize=10${keyParam}`;

    const response = await fetch(url);

    if (!response.ok) {
        return []; // Fail gracefully
    }

    const data = await response.json();
    return data.items || [];
}

/**
 * Convert Stack Overflow user to ExpertMesh expert format
 */
export async function convertSOUserToExpert(user: StackOverflowUser): Promise<{
    name: string;
    email: string;
    title: string;
    department: string;
    bio: string;
    skills: { name: string; level: string; yearsExp: number }[];
    stackoverflow: string;
    availability: {
        timezone: string;
        hoursPerWeek: number;
        status: 'available' | 'busy' | 'unavailable';
    };
    sources: { platform: string; profileUrl: string; lastSyncedAt: Date }[];
    metrics: {
        soReputation: number;
        soAnswers: number;
        soBadges: { gold: number; silver: number; bronze: number };
    };
    renownLevel: 'hidden' | 'rising' | 'established' | 'famous';
}> {
    // Get user's top tags as skills
    const topTags = await getUserTopTags(user.user_id);

    const skills = topTags.slice(0, 6).map(tag => {
        const score = tag.answer_score + tag.question_score;
        let level: 'junior' | 'mid' | 'senior' | 'expert' = 'mid';

        if (score > 1000) level = 'expert';
        else if (score > 500) level = 'senior';
        else if (score > 100) level = 'mid';
        else level = 'junior';

        // Estimate years from activity
        const yearsExp = Math.min(Math.floor(Math.log10(score + 1) * 2), 15) || 1;

        return {
            name: tag.tag_name,
            level,
            yearsExp,
        };
    });

    // Generate title based on top tag and reputation
    const topSkill = skills[0]?.name || 'Software';
    let title = `${topSkill} Developer`;

    if (user.reputation > 100000) title = `Principal ${topSkill} Expert`;
    else if (user.reputation > 50000) title = `Senior ${topSkill} Engineer`;
    else if (user.reputation > 10000) title = `${topSkill} Developer`;
    else title = `${topSkill} Developer`;

    // Determine renown level based on reputation
    let renownLevel: 'hidden' | 'rising' | 'established' | 'famous' = 'hidden';
    if (user.reputation > 100000) renownLevel = 'famous';
    else if (user.reputation > 25000) renownLevel = 'established';
    else if (user.reputation > 5000) renownLevel = 'rising';
    else renownLevel = 'hidden';

    // Clean up about_me (remove HTML) and add renown indicator for RAG
    let cleanBio = user.about_me
        ? user.about_me.replace(/<[^>]*>/g, '').slice(0, 300)
        : '';

    if (!cleanBio) {
        if (renownLevel === 'hidden') {
            cleanBio = `Hidden talent ${topSkill} developer with ${user.reputation.toLocaleString()} reputation and ${user.answer_count} answers. Lesser-known but skilled Stack Overflow contributor.`;
        } else if (renownLevel === 'rising') {
            cleanBio = `Rising ${topSkill} developer with growing reputation. ${user.reputation.toLocaleString()} rep and ${user.answer_count} answers on Stack Overflow.`;
        } else {
            cleanBio = `Stack Overflow ${topSkill} expert with ${user.reputation.toLocaleString()} reputation and ${user.answer_count} answers.`;
        }
    } else if (renownLevel === 'hidden') {
        cleanBio = `${cleanBio} [Hidden talent - lesser-known but skilled developer]`;
    }

    return {
        name: user.display_name,
        email: `${user.display_name.toLowerCase().replace(/\s+/g, '.')}@stackoverflow.example.com`,
        title,
        department: 'Engineering',
        bio: cleanBio,
        skills,
        stackoverflow: user.link,
        availability: {
            timezone: guessTimezone(user.location),
            hoursPerWeek: 20,
            status: 'available',
        },
        sources: [{
            platform: 'stackoverflow',
            profileUrl: user.link,
            lastSyncedAt: new Date(),
        }],
        metrics: {
            soReputation: user.reputation,
            soAnswers: user.answer_count,
            soBadges: user.badge_counts,
        },
        renownLevel,
    };
}

/**
 * Guess timezone from location
 */
function guessTimezone(location?: string): string {
    if (!location) return 'UTC';

    const loc = location.toLowerCase();
    if (loc.includes('california') || loc.includes('seattle') || loc.includes('san francisco')) return 'PST';
    if (loc.includes('new york') || loc.includes('boston') || loc.includes('florida')) return 'EST';
    if (loc.includes('chicago') || loc.includes('texas')) return 'CST';
    if (loc.includes('london') || loc.includes('uk')) return 'GMT';
    if (loc.includes('india') || loc.includes('bangalore')) return 'IST';
    if (loc.includes('germany') || loc.includes('france')) return 'CET';

    return 'UTC';
}

/**
 * Check API quota
 */
export async function checkQuota(): Promise<{ remaining: number; max: number }> {
    const apiKey = process.env.STACKOVERFLOW_KEY || '';
    const keyParam = apiKey ? `&key=${apiKey}` : '';

    const url = `${STACK_API_BASE}/users/1?site=stackoverflow${keyParam}`;
    const response = await fetch(url);

    const remaining = parseInt(response.headers.get('x-ratelimit-remaining') || '300');
    const max = parseInt(response.headers.get('x-ratelimit-max') || '300');

    return { remaining, max };
}
