require('dotenv').config();
const OpenAI = require("openai");
const { google } = require("googleapis");
const googleTrends = require('google-trends-api');

// إعدادات المحرك والمدونة
const CONFIG = {
    deepseekKey: "sk-391be34f374c488cb3b28782c75dc1b9",
    blogId: "8249860422330426533",
    clientId: "872415365656-7qribadnc7k2u21kl6jjcbatdueevifh.apps.googleusercontent.com",
    clientSecret: "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",
    refreshToken: "1//04yti9k2agPknCgYIARAAGAQSNwF-L9IrTZPKt5Fqbg2vrM9sBtOks9cnY4M7Idg0LToQnlbYGME06k20vcyr_SVmYk1H_yZJdEc",
    siteName: "zypxora"
};

// تهيئة DeepSeek (باستخدام مكتبة OpenAI)
const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: CONFIG.deepseekKey
});

// 1. دالة جلب الترند
async function getTrendingTopic() {
    try {
        console.log("📈 Fetching today's Google Trends (US)...");
        const results = await googleTrends.dailyTrends({
            trendDate: new Date(),
            geo: 'US',
        });
        const parsedResults = JSON.parse(results);
        const topTrend = parsedResults.default.trendingSearchesDays[0].trendingSearches[0].title.query;
        console.log(`🔥 Top Trend Found: ${topTrend}`);
        return topTrend;
    } catch (error) {
        console.warn("⚠️ Google Trends failed, using default topic.");
        return "Future of AI and Robotics 2026";
    }
}

// 2. الدالة الرئيسية
async function runDeepSeekPublisher() {
    try {
        const trendingTopic = await getTrendingTopic();

        // توليد العنوان
        console.log(`📝 Generating SEO Title...`);
        const titleRes = await openai.chat.completions.create({
            model: "deepseek-chat",
            messages: [{ role: "user", content: `Generate a viral, SEO-optimized blog title about "${trendingTopic}" for 2026. No quotes, max 60 chars.` }]
        });
        const targetTitle = titleRes.choices[0].message.content.trim();
        console.log(`🎯 Title: ${targetTitle}`);

        // توليد المحتوى بتنسيق JSON
        console.log("🤖 Generating Article Content...");
        const contentRes = await openai.chat.completions.create({
            model: "deepseek-chat",
            messages: [{ 
                role: "user", 
                content: `Write a 1500+ word SEO article about "${targetTitle}". 
                Use professional yet human-like tone. Include HTML tags (h2, h3, p, ul, strong). 
                Output ONLY a JSON object:
                {
                    "articleHtml": "content here...",
                    "metaDescription": "150 chars description...",
                    "labels": ["tech", "trends", "2026"]
                }` 
            }],
            response_format: { type: "json_object" }
        });

        const articleData = JSON.parse(contentRes.choices[0].message.content);

        // جلب الصورة (بناءً على العنوان)
        const imgPrompt = encodeURIComponent(targetTitle.slice(0, 50));
        const finalImageUrl = `https://image.pollinations.ai/prompt/${imgPrompt}?width=1200&height=630&nologo=true`;

        // بناء الـ HTML النهائي
        const finalHtml = `
            <div class="pro-article" dir="ltr" style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <img src="${finalImageUrl}" style="width: 100%; border-radius: 10px; margin-bottom: 20px;" alt="${targetTitle}">
                <div class="content">${articleData.articleHtml}</div>
                <hr>
                <p><strong>Published by ${CONFIG.siteName}</strong></p>
            </div>
        `;

        // النشر في بلوجر
        console.log("🚀 Publishing to Blogger...");
        const oauth2Client = new google.auth.OAuth2(CONFIG.clientId, CONFIG.clientSecret);
        oauth2Client.setCredentials({ refresh_token: CONFIG.refreshToken });
        const blogger = google.blogger({ version: "v3", auth: oauth2Client });

        const response = await blogger.posts.insert({
            blogId: CONFIG.blogId,
            requestBody: {
                title: targetTitle,
                content: finalHtml,
                labels: articleData.labels,
            }
        });

        console.log(`✨ DONE! Article Published: ${response.data.url}`);

    } catch (error) {
        console.error("🔴 Fatal Error:", error.message);
        if (error.message.includes("401")) {
            console.error("👉 Check your DeepSeek API Key!");
        }
    }
}

// البدء
runDeepSeekPublisher();
