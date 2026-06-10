const { GoogleGenerativeAI } = require("@google/generative-ai");
const { google } = require("googleapis");
const googleTrends = require('google-trends-api');
const axios = require('axios');

// الإعدادات: يقرأ من الـ Secrets أولاً، وإذا لم يجدها يقرأ النص المباشر
const CONFIG = {
    // ضع المفتاح الجديد هنا مباشرة ليتجاوز الـ Secrets تماماً
    geminiKey: "AQ.Ab8RN6I6CpCtGYqw9wn8d6O_P4pCHZxi9ZcmZfVJRNGriu_RNg",
    blogId: "2725115584838237159",
    clientId: "1022254688087-6bj9eij12uuh5u2apm300hg0rl3v3u5i.apps.googleusercontent.com",
    clientSecret: "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",
    refreshToken: "1//04npcWG7RN3UwCgYIARAAGAQSNwF-L9IrrQTVgQCZ0m7WdslFX1lpUIZRy3ODYu70BImi5mYfMUQ8RvKaIPyi3Uhu7esth8aeVro",
    siteName: "zypxora2" 
};

// تفعيل ذكاء Gemini بالطريقة الرسمية المعزولة لتفادي خطأ الـ 401
const ai = new GoogleGenerativeAI(CONFIG.geminiKey);
const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

// إعداد صلاحيات بلوجر لجلب ورفع البيانات
const oauth2Client = new google.auth.OAuth2(CONFIG.clientId, CONFIG.clientSecret);
oauth2Client.setCredentials({ refresh_token: CONFIG.refreshToken });
const blogger = google.blogger({ version: "v3", auth: oauth2Client });

// 1. دالة جلب الترند اليومي
async function getTrendingTopic() {
    try {
        console.log("📈 Fetching today's Google Trends (US)...");
        const results = await googleTrends.dailyTrends({
            trendDate: new Date(),
            geo: 'US',
        });
        const parsedResults = JSON.parse(results);
        const trendingSearches = parsedResults.default.trendingSearchesDays[0].trendingSearches;
        const topTrend = trendingSearches[0].title.query;
        console.log(`🔥 Top Trend Found: ${topTrend}`);
        return topTrend;
    } catch (error) {
        console.warn("⚠️ Google Trends blocked/failed. Using stable trending backup topic.");
        const techBackups = [
            "Artificial Intelligence Startups 2026",
            "Next Generation Quantum Computing",
            "Future of Automation and Robotics",
            "Cybersecurity Trends for Businesses"
        ];
        return techBackups[Math.floor(Math.random() * techBackups.length)]; 
    }
}

// 2. دالة رفع الصورة إلى بلوجر لضمان بقائها للأبد
async function uploadImageToBlogger(imageUrl, title) {
    try {
        console.log("📸 Downloading image from Pollinations...");
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const base64Image = Buffer.from(response.data, 'binary').toString('base64');

        console.log("💾 Uploading image directly to Blogger Media Album...");
        const mediaResponse = await blogger.media.insert({
            blogId: CONFIG.blogId,
            requestBody: {
                title: `${title.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`,
                mimeType: 'image/jpeg'
            },
            media: {
                mimeType: 'image/jpeg',
                body: Buffer.from(base64Image, 'base64')
            }
        });

        console.log("✨ Image uploaded successfully to Blogger Server!");
        return mediaResponse.data.url; 
    } catch (error) {
        console.error("⚠️ Image upload to Blogger failed, using original link as backup.", error.message);
        return imageUrl; 
    }
}

// 3. الدالة الأساسية للمشروع
async function runGeminiPublisher() {
    try {
        const trendingTopic = await getTrendingTopic();

        // أ. صناعة عنوان السيو بواسطة Gemini
        console.log(`📝 Generating SEO Title for: ${trendingTopic}...`);
        const titlePrompt = `Act as an expert SEO copywriter. Generate a highly-searched, viral click-magnet title about "${trendingTopic}" for the year 2026. Make it solve a user's problem or reveal a shocking fact. NO quotes, max 60 characters. Return only the final title string without any other text.`;
        const titleResult = await model.generateContent(titlePrompt);
        const targetTitle = titleResult.response.text().trim();
        console.log(`🎯 Title: ${targetTitle}`);

        // ب. توليد المقال والـ JSON بهيكل صارم لمنع أخطاء الاستخراج
        console.log("🤖 Generating AdSense-Approved Content & Schema via Gemini...");
        const contentPrompt = `Write a highly engaging, SEO-optimized article about "${targetTitle}". 
        
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
        5. Output formatting: Output ONLY a valid JSON object matching the requested schema. No markdown formatting like \`\`\`json.
        
        JSON STRUCTURE SCHEMA:
        {
            "articleHtml": "The full HTML starting with the introduction (no <h1> needed, blogger adds it). Use rich formatting like <blockquote>, <ul>, and <strong>. Use single quotes for HTML attributes.",
            "metaDescription": "A 150-character catchy meta description for search engines.",
            "labels": ["keyword1", "keyword2", "keyword3", "keyword4"]
        }`;

        const contentResult = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: contentPrompt }] }],
            generationConfig: {
                responseMimeType: "application/json" 
            }
        });

        // تنظيف النص المسترجع للتأكد من أنه JSON نقي
        let cleanJsonText = contentResult.response.text().trim();
        if (cleanJsonText.startsWith("```json")) {
            cleanJsonText = cleanJsonText.replace(/```json|```/g, "").trim();
        }

        const articleData = JSON.parse(cleanJsonText);

        // جـ. توليد وصف الصورة وبنائها
        console.log("🎨 Crafting AI Image Prompt...");
        const imgPromptReq = `Write a 5-word prompt for an AI image generator to create a modern, minimalist, faceless tech blog banner for: "${targetTitle}". Return only the prompt words.`;
        const imgDescResult = await model.generateContent(imgPromptReq);
        const imgPrompt = encodeURIComponent(imgDescResult.response.text().trim());
        const rawImageUrl = `https://image.pollinations.ai/prompt/${imgPrompt}?width=1200&height=630&nologo=true`; 

        // د. رفع الصورة فوراً إلى خوادم بلوجر
        const finalImageUrl = await uploadImageToBlogger(rawImageUrl, targetTitle);

        // هـ. تجميع الـ HTML النهائي مع السيو والـ Schema
        console.log("🏗️ Assembling Professional HTML...");
        const schemaMarkup = {
            "@context": "[https://schema.org](https://schema.org)",
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
                    <img src="[https://api.dicebear.com/7.x/avataaars/svg?seed=TechVanguard](https://api.dicebear.com/7.x/avataaars/svg?seed=TechVanguard)" alt="Author">
                    <div>
                        <strong>Published by ${CONFIG.siteName}</strong>
                        <p style="font-size: 14px; margin: 0; color: #64748b;">Delivering the latest insights in Tech and Business.</p>
                    </div>
                </div>
            </div>
        `;

        const finalLabels = [...new Set([...(articleData.labels || []), "Trending", "Tech News"])].slice(0, 8);

        // و. خطوة النشر النهائية في بلوجر
        console.log(`🚀 Publishing to Blogger with labels: ${finalLabels.join(', ')}...`);
        const response = await blogger.posts.insert({
            blogId: CONFIG.blogId,
            requestBody: { 
                title: targetTitle, 
                content: finalHtml, 
                labels: finalLabels,
                customMetaData: articleData.metaDescription 
            }
        });

        console.log(`✨ DONE! Article Published Successfully: ${response.data.url}`);
    } catch (error) {
        console.error("🔴 Error details:", error.message);
    }
}

runGeminiPublisher();
