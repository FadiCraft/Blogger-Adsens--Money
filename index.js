require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { google } = require("googleapis");
const googleTrends = require('google-trends-api');

const CONFIG = {
    geminiKey:"AIzaSyABmbvwX47N7iBTIV6QmOtfGrMZL699F9w", 
    blogId: "8249860422330426533",
    clientId: "872415365656-7qribadnc7k2u21kl6jjcbatdueevifh.apps.googleusercontent.com",
    clientSecret: "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",
    refreshToken: "1//04yti9k2agPknCgYIARAAGAQSNwF-L9IrTZPKt5Fqbg2vrM9sBtOks9cnY4M7Idg0LToQnlbYGME06k20vcyr_SVmYk1H_yZJdEc",
    siteName: "zypxora"
};

const genAI = new GoogleGenerativeAI(CONFIG.geminiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // موديل سريع ومجاني

async function getTrendingTopic() {
    try {
        const results = await googleTrends.dailyTrends({ trendDate: new Date(), geo: 'US' });
        const parsedResults = JSON.parse(results);
        return parsedResults.default.trendingSearchesDays[0].trendingSearches[0].title.query;
    } catch (e) { return "Future of AI in 2026"; }
}

async function runGeminiPublisher() {
    try {
        const topic = await getTrendingTopic();
        console.log(`📈 Topic: ${topic}`);

        // توليد المحتوى
        const prompt = `Write a 1500-word SEO article about ${topic}. Return ONLY JSON: 
        {"title": "title here", "html": "HTML content here", "desc": "meta description", "labels": ["tech"]}`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().replace(/```json|```/g, ""); // تنظيف الرد
        const data = JSON.parse(text);

        // النشر في بلوجر
        const oauth2Client = new google.auth.OAuth2(CONFIG.clientId, CONFIG.clientSecret);
        oauth2Client.setCredentials({ refresh_token: CONFIG.refreshToken });
        const blogger = google.blogger({ version: "v3", auth: oauth2Client });

        const res = await blogger.posts.insert({
            blogId: CONFIG.blogId,
            requestBody: {
                title: data.title,
                content: data.html,
                labels: data.labels
            }
        });

        console.log(`✨ Published: ${res.data.url}`);
    } catch (error) {
        console.error("🔴 Error:", error.message);
    }
}

runGeminiPublisher();
