/**
 * GitHub API Integration for ExpertMesh
 * Fetches real developer profiles from GitHub
 */

const GITHUB_API_BASE = 'https://api.github.com';

interface GitHubUser {
    login: string;
    id: number;
    name: string | null;
    email: string | null;
    bio: string | null;
    location: string | null;
    company: string | null;
    blog: string | null;
    twitter_username: string | null;
    public_repos: number;
    followers: number;
    following: number;
    created_at: string;
    html_url: string;
    avatar_url: string;
}

interface GitHubRepo {
    name: string;
    description: string | null;
    language: string | null;
    stargazers_count: number;
    forks_count: number;
    topics: string[];
    html_url: string;
}

interface LanguageStats {
    [language: string]: number;
}

/**
 * Get authorization headers for GitHub API
 */
function getHeaders(): HeadersInit {
    const token = process.env.GITHUB_TOKEN;
    return {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'ExpertMesh-Hackathon',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
}

/**
 * Search GitHub users by programming language and minimum followers
 */
export async function searchDevelopers(
    language: string,
    minFollowers: number = 100,
    limit: number = 10
): Promise<GitHubUser[]> {
    const query = `language:${language} followers:>${minFollowers}`;
    const url = `${GITHUB_API_BASE}/search/users?q=${encodeURIComponent(query)}&sort=followers&order=desc&per_page=${limit}`;

    console.log(`🔍 Searching GitHub for ${language} developers with ${minFollowers}+ followers...`);

    const response = await fetch(url, { headers: getHeaders() });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`GitHub search failed: ${error}`);
    }

    const data = await response.json();

    // Fetch full user details for each result
    const users: GitHubUser[] = [];
    for (const item of data.items.slice(0, limit)) {
        try {
            const user = await getUserDetails(item.login);
            users.push(user);
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.warn(`Failed to get details for ${item.login}:`, error);
        }
    }

    console.log(`   Found ${users.length} developers`);
    return users;
}

/**
 * Search for hidden talents - developers with lower follower counts but high quality
 * These are skilled developers who haven't gained fame yet
 */
export async function searchHiddenTalents(
    language: string,
    minFollowers: number = 20,
    maxFollowers: number = 500,
    minRepos: number = 10,
    limit: number = 10
): Promise<GitHubUser[]> {
    // Search for developers with moderate follower counts but good repo activity
    const query = `language:${language} followers:${minFollowers}..${maxFollowers} repos:>=${minRepos}`;
    const url = `${GITHUB_API_BASE}/search/users?q=${encodeURIComponent(query)}&sort=repositories&order=desc&per_page=${limit}`;

    console.log(`🔍 Searching GitHub for hidden ${language} talents (${minFollowers}-${maxFollowers} followers, ${minRepos}+ repos)...`);

    const response = await fetch(url, { headers: getHeaders() });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`GitHub search failed: ${error}`);
    }

    const data = await response.json();

    // Fetch full user details for each result
    const users: GitHubUser[] = [];
    for (const item of data.items.slice(0, limit)) {
        try {
            const user = await getUserDetails(item.login);
            users.push(user);
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.warn(`Failed to get details for ${item.login}:`, error);
        }
    }

    console.log(`   Found ${users.length} hidden talents`);
    return users;
}

/**
 * Get detailed user profile
 */
export async function getUserDetails(username: string): Promise<GitHubUser> {
    const url = `${GITHUB_API_BASE}/users/${username}`;
    const response = await fetch(url, { headers: getHeaders() });

    if (!response.ok) {
        throw new Error(`Failed to fetch user ${username}`);
    }

    return response.json();
}

/**
 * Get user's public repositories
 */
export async function getUserRepos(username: string, limit: number = 30): Promise<GitHubRepo[]> {
    const url = `${GITHUB_API_BASE}/users/${username}/repos?sort=stars&per_page=${limit}`;
    const response = await fetch(url, { headers: getHeaders() });

    if (!response.ok) {
        throw new Error(`Failed to fetch repos for ${username}`);
    }

    return response.json();
}

/**
 * Calculate language breakdown from repos
 */
export async function getLanguageStats(username: string): Promise<LanguageStats> {
    const repos = await getUserRepos(username, 30);
    const stats: LanguageStats = {};

    for (const repo of repos) {
        if (repo.language) {
            stats[repo.language] = (stats[repo.language] || 0) + 1;
        }
    }

    return stats;
}

/**
 * Convert GitHub user to ExpertMesh expert format
 */
export async function convertToExpert(user: GitHubUser): Promise<{
    name: string;
    email: string;
    title: string;
    department: string;
    bio: string;
    skills: { name: string; level: string; yearsExp: number }[];
    github: string;
    linkedIn?: string;
    availability: {
        timezone: string;
        hoursPerWeek: number;
        status: 'available' | 'busy' | 'unavailable';
    };
    sources: { platform: string; profileUrl: string; lastSyncedAt: Date }[];
    metrics: {
        githubFollowers: number;
        githubRepos: number;
        githubStars: number;
    };
    renownLevel: 'hidden' | 'rising' | 'established' | 'famous';
    qualityMetrics: {
        activityScore: number;
        consistencyScore: number;
        expertiseDepth: number;
    };
}> {
    // Get language stats
    const languageStats = await getLanguageStats(user.login);
    const totalRepos = Object.values(languageStats).reduce((a, b) => a + b, 0);

    // Convert languages to skills
    const skills = Object.entries(languageStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([language, count]) => {
            const percentage = (count / totalRepos) * 100;
            let level: 'junior' | 'mid' | 'senior' | 'expert' = 'mid';

            if (percentage > 40 && user.followers > 1000) level = 'expert';
            else if (percentage > 30 || user.followers > 500) level = 'senior';
            else if (percentage > 15) level = 'mid';
            else level = 'junior';

            // Estimate years based on account age
            const accountAge = Math.floor(
                (Date.now() - new Date(user.created_at).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
            );
            const yearsExp = Math.min(Math.max(Math.ceil(accountAge * (percentage / 100) * 1.5), 1), 15);

            return { name: language, level, yearsExp };
        });

    // Get total stars from repos
    const repos = await getUserRepos(user.login, 10);
    const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);

    // Determine renown level based on followers
    let renownLevel: 'hidden' | 'rising' | 'established' | 'famous' = 'hidden';
    if (user.followers > 5000) renownLevel = 'famous';
    else if (user.followers > 1000) renownLevel = 'established';
    else if (user.followers > 300) renownLevel = 'rising';
    else renownLevel = 'hidden';

    // Calculate quality metrics (normalized 0-100)
    const accountAge = Math.floor(
        (Date.now() - new Date(user.created_at).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
    const activityScore = Math.min(100, (user.public_repos / accountAge) * 10);
    const consistencyScore = Math.min(100, accountAge * 15);
    const expertiseDepth = Math.min(100, (totalStars / Math.max(1, user.public_repos)) * 5);

    // Generate title based on top language and followers
    const topLanguage = Object.keys(languageStats)[0] || 'Software';
    let title = `${topLanguage} Developer`;
    if (user.followers > 5000) title = `Principal ${topLanguage} Engineer`;
    else if (user.followers > 1000) title = `Senior ${topLanguage} Developer`;
    else if (user.followers > 500) title = `${topLanguage} Developer`;
    else title = `${topLanguage} Developer`; // Hidden talent

    // Generate bio that indicates renown level for RAG matching
    let bio = user.bio || '';
    if (!bio) {
        if (renownLevel === 'hidden') {
            bio = `Hidden talent and lesser-known ${topLanguage} developer with ${user.public_repos} repositories and ${totalStars} stars. An undiscovered expert with strong potential.`;
        } else if (renownLevel === 'rising') {
            bio = `Rising ${topLanguage} developer with growing community presence. ${user.public_repos} public repositories and ${user.followers} followers.`;
        } else {
            bio = `${topLanguage} developer with ${user.public_repos} public repositories and ${user.followers} followers.`;
        }
    } else if (renownLevel === 'hidden') {
        bio = `${bio} [Hidden talent - lesser-known but skilled developer]`;
    }

    return {
        name: user.name || user.login,
        email: user.email || `${user.login}@github.example.com`,
        title,
        department: 'Engineering',
        bio,
        skills,
        github: user.html_url,
        linkedIn: undefined,
        availability: {
            timezone: guessTimezone(user.location),
            hoursPerWeek: 40,
            status: 'available',
        },
        sources: [{
            platform: 'github',
            profileUrl: user.html_url,
            lastSyncedAt: new Date(),
        }],
        metrics: {
            githubFollowers: user.followers,
            githubRepos: user.public_repos,
            githubStars: totalStars,
        },
        renownLevel,
        qualityMetrics: {
            activityScore: Math.round(activityScore),
            consistencyScore: Math.round(consistencyScore),
            expertiseDepth: Math.round(expertiseDepth),
        },
    };
}

/**
 * Guess timezone from location string
 */
function guessTimezone(location: string | null): string {
    if (!location) return 'UTC';

    const loc = location.toLowerCase();
    if (loc.includes('san francisco') || loc.includes('california') || loc.includes('seattle') || loc.includes('portland')) return 'PST';
    if (loc.includes('new york') || loc.includes('boston') || loc.includes('washington') || loc.includes('atlanta')) return 'EST';
    if (loc.includes('chicago') || loc.includes('texas') || loc.includes('austin') || loc.includes('dallas')) return 'CST';
    if (loc.includes('london') || loc.includes('uk') || loc.includes('england')) return 'GMT';
    if (loc.includes('berlin') || loc.includes('germany') || loc.includes('paris') || loc.includes('france')) return 'CET';
    if (loc.includes('india') || loc.includes('bangalore') || loc.includes('mumbai')) return 'IST';
    if (loc.includes('tokyo') || loc.includes('japan')) return 'JST';
    if (loc.includes('china') || loc.includes('beijing') || loc.includes('shanghai')) return 'CST';

    return 'UTC';
}

/**
 * Check GitHub API rate limit status
 */
export async function checkRateLimit(): Promise<{
    limit: number;
    remaining: number;
    reset: Date;
}> {
    const response = await fetch(`${GITHUB_API_BASE}/rate_limit`, { headers: getHeaders() });
    const data = await response.json();

    return {
        limit: data.rate.limit,
        remaining: data.rate.remaining,
        reset: new Date(data.rate.reset * 1000),
    };
}
