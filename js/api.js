// ==========================================
// Unified API Module
// ==========================================

class API {
    static getConfig() {
        return JSON.parse(localStorage.getItem('apiConfig') || '{}');
    }

    static async callAI(messages, config = null) {
        const cfg = config || this.getConfig();
        if (!cfg.chatApiKey) throw new Error('请先配置 Chat API Key');

        let url = cfg.chatApiUrl;
        if (!url.endsWith('/chat/completions')) url = url.endsWith('/') ? `${url}chat/completions` : `${url}/chat/completions`;

        // Ensure messages is array
        const msgs = Array.isArray(messages) ? messages : [{ role: 'user', content: messages }];

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cfg.chatApiKey}`
                },
                body: JSON.stringify({
                    model: cfg.chatModel || 'gpt-3.5-turbo',
                    messages: msgs,
                    temperature: 0.7
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                let errMsg = errText;
                try {
                    const errJson = JSON.parse(errText);
                    if (errJson.error && errJson.error.message) errMsg = errJson.error.message;
                } catch (e) {}
                throw new Error(`API Error (${res.status}): ${errMsg}`);
            }

            const json = await res.json();
            if (!json.choices || !json.choices[0] || !json.choices[0].message) {
                throw new Error('Invalid API Response Format');
            }
            let content = json.choices[0].message.content;
            // Remove thinking process if any (DeepSeek style)
            content = content.replace(/<think>[\s\S]*?<\/think>/gi, '');
            return content.trim();
        } catch (e) {
            console.error('AI Call Failed:', e);
            alert(`AI 生成失败: ${e.message}`);
            throw e;
        }
    }

    static async generateImage(prompt, config = null) {
        const cfg = config || this.getConfig();
        if (!cfg.imageApiKey) throw new Error('请先配置 Image API Key');

        let url = cfg.imageApiUrl;
        // Default to OpenAI DALL-E format if not specified, but allow custom endpoints
        if (!url) url = 'https://api.openai.com/v1/images/generations';

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cfg.imageApiKey}`
                },
                body: JSON.stringify({
                    prompt: prompt,
                    n: 1,
                    size: "512x512",
                    response_format: "b64_json" // Prefer base64 to avoid expiration
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                let errMsg = errText;
                try {
                    const errJson = JSON.parse(errText);
                    if (errJson.error && errJson.error.message) errMsg = errJson.error.message;
                } catch (e) {}
                throw new Error(`Image API Error (${res.status}): ${errMsg}`);
            }

            const json = await res.json();
            // Handle different response formats (OpenAI vs others)
            if (json.data && json.data[0]) {
                if (json.data[0].b64_json) return 'data:image/png;base64,' + json.data[0].b64_json;
                if (json.data[0].url) {
                    // If URL, try to fetch and convert to base64 to save locally
                    const imgRes = await fetch(json.data[0].url);
                    const blob = await imgRes.blob();
                    return await window.Utils.fileToBase64(blob);
                }
            }
            throw new Error('Unknown Image API Response Format');
        } catch (e) {
            console.error('Image Gen Failed:', e);
            throw e;
        }
    }

    static async generateSpeech(text, config = null) {
        const cfg = config || this.getConfig();
        if (!cfg.ttsApiKey) throw new Error('请先配置 TTS API Key');

        let url = cfg.ttsApiUrl;
        if (!url) url = 'https://api.openai.com/v1/audio/speech';

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cfg.ttsApiKey}`
                },
                body: JSON.stringify({
                    model: "tts-1",
                    input: text,
                    voice: "alloy"
                })
            });

            if (!res.ok) {
                const err = await res.text();
                throw new Error(`TTS API Error: ${res.status} - ${err}`);
            }

            const blob = await res.blob();
            return await window.Utils.fileToBase64(blob); // Return as base64 audio
        } catch (e) {
            console.error('TTS Failed:', e);
            throw e;
        }
    }
}

window.API = API;
