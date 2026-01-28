import { logger } from "./logger";

export interface NewsItem {
    title: string;
    description: string;
    destUrl: string;
    imageUrl: string;
    type?: "NEWS";
    date?: string;
}

const OFFICIAL_NEWS_URL = "http://examples/news.json";
const HYTALE_BLOG_API = "https://hytale.com/api/blog/post/published";

export async function getHytaleNews(): Promise<NewsItem[]> {
    const allNews: NewsItem[] = [];


    const results = await Promise.allSettled([
        fetch(OFFICIAL_NEWS_URL, { headers: { "User-Agent": "Mozilla/5.0" } }).then(r => r.ok ? r.json() : null),
        fetch(HYTALE_BLOG_API, { headers: { "User-Agent": "Mozilla/5.0" } }).then(r => r.ok ? r.json() : null)
    ]);


    if (results[0].status === "fulfilled" && results[0].value) {
        try {
            const data = results[0].value;
            const items = Array.isArray(data) ? data : (data.articles || data.news || []);
            const customItems = items.map((article: any) => ({
                title: article.title || "",
                description: article.description || article.summary || "",
                destUrl: article.destUrl || article.dest_url || article.url || "",
                imageUrl: article.imageUrl || article.image_url || article.image || "",
                type: "NEWS" as const,
                date: article.date || "RECENT"
            }));
            allNews.push(...customItems);
        } catch (e) {
            logger.error("[News] Error parsing custom feed:", e);
        }
    }


    if (results[1].status === "fulfilled" && results[1].value) {
        try {
            const data = results[1].value;
            if (Array.isArray(data)) {
                const officialItems = data.map((post: any) => {
                    const date = new Date(post.publishedAt);
                    const year = date.getUTCFullYear();
                    const month = date.getUTCMonth() + 1;
                    const destUrl = `https://hytale.com/news/${year}/${month}/${post.slug}`;


                    const imageUrl = post.coverImage?.s3Key
                        ? `https://cdn.hytale.com/variants/blog_thumb_${post.coverImage.s3Key}`
                        : "";

                    return {
                        title: post.title || "",
                        description: post.bodyExcerpt?.replace(/<[^>]*>?/gm, '') || "",
                        destUrl,
                        imageUrl,
                        type: "NEWS" as const,
                        date: "OFFICIAL"
                    };
                });
                allNews.push(...officialItems);
            }
        } catch (e) {
            logger.error("[News] Error mapping Hytale blog posts:", e);
        }
    }

    if (allNews.length === 0) {
        return [
            {
                title: "Hytale News",
                description: "Stay tuned for the latest updates from the official Hytale website.",
                destUrl: "https://hytale.com/news",
                imageUrl: "",
                type: "NEWS",
                date: "RECENT"
            }
        ];
    }

    const seen = new Set<string>();
    const uniqueNews = allNews.filter((item) => {
        const title = item.title.trim().toLowerCase();
        if (!title || seen.has(title)) return false;
        seen.add(title);
        return true;
    });

    return uniqueNews;
}
