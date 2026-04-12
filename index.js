require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { google } = require("googleapis");
const googleTrends = require('google-trends-api');

// إعدادات المحرك والمدونة من المتغيرات البيئية
const CONFIG = {
    geminiKey: process.env.GEMINI_API_KEY,
    blogId: process.env.BLOG_ID,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
    siteName: "zypxora"
};

// تهيئة Gemini
const genAI = new GoogleGenerativeAI(CONFIG.geminiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

// 1. دالة جلب الترند (مع معالجة الأخطاء)
async function getTrendingTopic() {
    try {
        console.log("📈 Fetching Google Trends...");
        const results = await googleTrends.dailyTrends({
            trendDate: new Date(),
            geo: 'US',
        });
        const parsedResults = JSON.parse(results);
        return parsedResults.default.trendingSearchesDays[0].trendingSearches[0].title.query;
    } catch (error) {
        console.warn("⚠️ Google Trends failed, using fallback topic.");
        return "Emerging Tech Trends 2026";
    }
}

// 2. الدالة الرئيسية للنشر
async function runAutoPublisher() {
    try {
        const topic = await getTrendingTopic();
        console.log(`🎯 Target Topic: ${topic}`);

        // إنشاء المحتوى باستخدام Gemini
        const prompt = `Act as an expert SEO writer. Write a comprehensive 1500-word blog article about "${topic}".
        Include: Catchy title, H2 and H3 headings, detailed paragraphs, and an FAQ section.
        Use human-like tone, avoid AI cliches.
        
        IMPORTANT: Return the response ONLY as a valid JSON object with this structure:
        {
            "title": "SEO Optimized Title",
            "html": "Full article HTML content (use <p>, <h2>, <h3>, <ul>, <strong> tags)",
            "metaDescription": "150 characters for SEO",
            "labels": ["tag1", "tag2", "tag3"]
        }`;

        console.log("🤖 Gemini is generating content...");
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();

        // تنظيف النص من أي علامات Markdown قد يضيفها الموديل
        text = text.replace(/^```json/i, "").replace(/```$/i, "").trim();
        
        const data = JSON.parse(text);

        // بناء الـ HTML النهائي مع صورة مميزة وتنسيق
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(data.title)}?width=1200&height=630&nologo=true`;
        
        const finalHtml = `
            <div dir="ltr" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.8; color: #333;">
                <img src="${imageUrl}" style="width: 100%; border-radius: 15px; margin-bottom: 25px;" alt="${data.title}">
                <div class="article-body">
                    ${data.html}
                </div>
                <hr>
                <p style="color: #777;">Published by <strong>${CONFIG.siteName}</strong> - Your Guide to 2026 Tech.</p>
            </div>
        `;

        // النشر في بلوجر
        console.log("🚀 Connecting to Blogger API...");
        const oauth2Client = new google.auth.OAuth2(CONFIG.clientId, CONFIG.clientSecret);
        oauth2Client.setCredentials({ refresh_token: CONFIG.refreshToken });
        const blogger = google.blogger({ version: "v3", auth: oauth2Client });

        const bloggerResponse = await blogger.posts.insert({
            blogId: CONFIG.blogId,
            requestBody: {
                title: data.title,
                content: finalHtml,
                labels: [...data.labels, "Automated", "AI-News"]
            }
        });

        console.log(`✨ DONE! Article Published: ${bloggerResponse.data.url}`);

    } catch (error) {
        console.error("🔴 Fatal Error:", error.message);
    }
}

// تشغيل السكريبت
runAutoPublisher();
