require('dotenv').config();
const Groq = require("groq-sdk");
const { google } = require("googleapis");
const googleTrends = require('google-trends-api');

const CONFIG = {
  groqKey: "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",
    blogId: "8249860422330426533",
    clientId: "872415365656-7qribadnc7k2u21kl6jjcbatdueevifh.apps.googleusercontent.com",
    clientSecret: "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",
    refreshToken: "1//04yti9k2agPknCgYIARAAGAQSNwF-L9IrTZPKt5Fqbg2vrM9sBtOks9cnY4M7Idg0LToQnlbYGME06k20vcyr_SVmYk1H_yZJdEc",
    siteName: "zypxora"
};

const groq = new Groq({ apiKey: CONFIG.groqKey });

// دالة لجلب الترند من جوجل (الولايات المتحدة)
async function getTrendingTopic() {
    try {
        console.log("📈 Fetching today's Google Trends (US)...");
        const results = await googleTrends.dailyTrends({
            trendDate: new Date(),
            geo: 'US',
        });
        
        const parsedResults = JSON.parse(results);
        const trendingSearches = parsedResults.default.trendingSearchesDays[0].trendingSearches;
        
        // نأخذ أول ترند (الأكثر بحثاً)
        const topTrend = trendingSearches[0].title.query;
        console.log(`🔥 Top Trend Found: ${topTrend}`);
        return topTrend;
    } catch (error) {
        console.warn("⚠️ Failed to fetch Google Trends, falling back to a default Tech Topic.", error.message);
        return "Artificial Intelligence Startups"; // بديل في حال تعطل الترند
    }
}

async function runGroqPublisher() {
    try {
        // 1. جلب موضوع الترند
        const trendingTopic = await getTrendingTopic();
        
        // 2. إنشاء عنوان SEO جذاب
        console.log(`📝 Generating SEO Title for: ${trendingTopic}...`);
        const titleRes = await groq.chat.completions.create({
            messages: [{ 
                role: "user", 
                content: `Act as an expert SEO copywriter. Generate a highly-searched, viral click-magnet title about "${trendingTopic}" for the year 2026. Make it solve a user's problem or reveal a shocking fact. NO quotes, max 60 characters.` 
            }],
            model: "llama-3.3-70b-versatile",
        });
        const targetTitle = titleRes.choices[0].message.content.trim();
        console.log(`🎯 Title: ${targetTitle}`);

        // 3. كتابة المحتوى البشري المتوافق مع أدسنس
        console.log("🤖 Generating AdSense-Approved Content & Schema...");
        const contentRes = await groq.chat.completions.create({
            messages: [{ 
                role: "user", 
                content: `Write a highly engaging, SEO-optimized article about "${targetTitle}". 
                
                STRICT ADSENSE GUIDELINES:
                1. Tone: Conversational, human-like, expert yet accessible. Avoid AI buzzwords completely (e.g., "delve", "tapestry", "in conclusion", "beacon").
                2. Structure: 
                   - Catchy Introduction hook.
                   - Table of Contents (HTML list).
                   - Deep-dive body paragraphs with <h2> and <h3>.
                   - Real-world examples or hypothetical scenarios.
                   - An FAQ section at the end (Very important for SEO).
                3. Length: Comprehensive (1500+ words).
                4. Links: Include exactly 2 authority external links (e.g., Wikipedia, Forbes) using: <a href='URL' target='_blank' rel='noopener noreferrer'>Link Text</a>.
                5. Output formatting: Output ONLY valid JSON. Use single quotes (') for HTML attributes.
                
                JSON STRUCTURE:
                {
                    "articleHtml": "The full HTML starting with the introduction (no <h1> needed, blogger adds it). Use rich formatting like <blockquote>, <ul>, and <strong>.",
                    "metaDescription": "A 150-character catchy meta description for search engines.",
                    "labels": ["keyword1", "keyword2", "keyword3", "keyword4"]
                }` 
            }],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" } 
        });
        
        const articleData = JSON.parse(contentRes.choices[0].message.content);

        // 4. جلب الصورة
        console.log("🎨 Generating Featured Image...");
        const imgDescRes = await groq.chat.completions.create({
            messages: [{ role: "user", content: `Write a 5-word prompt for an AI image generator to create a modern, minimalist, faceless tech blog banner for: "${targetTitle}".` }],
            model: "llama-3.3-70b-versatile",
        });
        const imgPrompt = encodeURIComponent(imgDescRes.choices[0].message.content.trim());
        const finalImageUrl = `https://image.pollinations.ai/prompt/${imgPrompt}?width=1200&height=630&nologo=true`; 

        // 5. بناء كود HTML احترافي مع إضافة Schema SEO
        console.log("🏗️ Assembling Professional HTML...");
        const schemaMarkup = {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": targetTitle,
            "image": finalImageUrl,
            "publisher": {
                "@type": "Organization",
                "name": CONFIG.siteName
            },
            "description": articleData.metaDescription
        };

        const finalHtml = `
            <script type="application/ld+json">
                ${JSON.stringify(schemaMarkup)}
            </script>

            <style>
                :root { --primary-color: #2563eb; --text-main: #334155; --bg-light: #f8fafc; }
                .pro-article { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: var(--text-main); line-height: 1.7; font-size: 18px; max-width: 900px; margin: auto; }
                .pro-image { width: 100%; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); margin-bottom: 2rem; }
                .pro-article h2 { color: #0f172a; font-size: 1.75rem; margin-top: 2.5rem; margin-bottom: 1rem; border-bottom: 2px solid var(--primary-color); padding-bottom: 0.5rem; display: inline-block; }
                .pro-article h3 { color: #1e293b; font-size: 1.35rem; margin-top: 2rem; }
                .pro-article p { margin-bottom: 1.5rem; }
                .pro-article a { color: var(--primary-color); text-decoration: none; font-weight: 600; transition: all 0.3s ease; }
                .pro-article a:hover { text-decoration: underline; color: #1d4ed8; }
                .pro-toc { background: var(--bg-light); border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; margin: 2rem 0; }
                .pro-toc strong { display: block; font-size: 1.2rem; margin-bottom: 1rem; color: #0f172a; }
                .pro-article ul, .pro-article ol { padding-left: 1.5rem; margin-bottom: 1.5rem; }
                .pro-article li { margin-bottom: 0.5rem; }
                .pro-faq { background: #f0fdf4; border-left: 4px solid #16a34a; padding: 1.5rem; margin-top: 2rem; border-radius: 0 8px 8px 0; }
                .pro-author { display: flex; align-items: center; margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #e2e8f0; }
                .pro-author img { width: 50px; height: 50px; border-radius: 50%; margin-right: 15px; }
            </style>

            <div class="pro-article" dir="ltr">
                <img class="pro-image" src="${finalImageUrl}" alt="${targetTitle}" loading="lazy">
                
                <div class="article-body">
                    ${articleData.articleHtml}
                </div>
                
                <div class="pro-author">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=TechVanguard" alt="Author">
                    <div>
                        <strong>Published by ${CONFIG.siteName}</strong>
                        <p style="font-size: 14px; margin: 0; color: #64748b;">Delivering the latest insights in Tech and Business.</p>
                    </div>
                </div>
            </div>
        `;

        const finalLabels = [...new Set([...(articleData.labels || []), "Trending", "Tech News"])].slice(0, 8);

        // 6. النشر في بلوجر
        console.log(`🚀 Publishing to Blogger with labels: ${finalLabels.join(', ')}...`);
        const oauth2Client = new google.auth.OAuth2(CONFIG.clientId, CONFIG.clientSecret);
        oauth2Client.setCredentials({ refresh_token: CONFIG.refreshToken });
        const blogger = google.blogger({ version: "v3", auth: oauth2Client });

        const response = await blogger.posts.insert({
            blogId: CONFIG.blogId,
            requestBody: { 
                title: targetTitle, 
                content: finalHtml, 
                labels: finalLabels,
                customMetaData: articleData.metaDescription // مهم جداً للـ SEO في بلوجر
            }
        });

        console.log(`✨ DONE! Article Published: ${response.data.url}`);
    } catch (error) {
        console.error("🔴 Error details:", error.message);
    }
}

runGroqPublisher();
