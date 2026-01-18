class FanficStore {
    constructor() { this.init(); }
    init() {
        if(!localStorage.getItem('fanfic_data')) {
            const initialData = {
                posts: [], // {id, type, title, content, time, comments:[]}
                settings: {
                    customRules: ''
                }
            };
            localStorage.setItem('fanfic_data', JSON.stringify(initialData));
        }
    }
    get() { return JSON.parse(localStorage.getItem('fanfic_data')); }
    set(data) { localStorage.setItem('fanfic_data', JSON.stringify(data)); }
    update(fn) { const data = this.get(); fn(data); this.set(data); }
}

class FanficApp {
    constructor() {
        this.store = new FanficStore();
        this.currentTab = 'reverse';
        this.initUI();
    }

    initUI() {
        // Tab Switching
        document.querySelectorAll('.ff-tab').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.ff-tab').forEach(el => el.classList.remove('active'));
                btn.classList.add('active');
                this.currentTab = btn.dataset.tab;
                this.renderList();
                
                // Show/Hide Settings Icon
                const settingsIcon = document.getElementById('ffSettingsIcon');
                if(this.currentTab === 'custom') settingsIcon.style.display = 'block';
                else settingsIcon.style.display = 'none';
            };
        });

        // FAB
        document.getElementById('ffFab').onclick = () => this.openGenerator();

        // Settings
        document.getElementById('ffSettingsIcon').onclick = () => this.openSettings();
        document.getElementById('closeFfSettings').onclick = () => document.getElementById('ffSettingsModal').style.display = 'none';
        document.getElementById('saveFfSettings').onclick = () => this.saveSettings();
        document.getElementById('exportFfSettings').onclick = () => this.exportSettings();
        document.getElementById('importFfSettings').onclick = () => document.getElementById('importFfInput').click();
        document.getElementById('importFfInput').onchange = (e) => this.importSettings(e.target.files[0]);

        // Generator
        document.getElementById('closeFfGenerator').onclick = () => document.getElementById('ffGeneratorModal').style.display = 'none';
        document.getElementById('doFfGenerate').onclick = () => this.generatePost();

        // Reader
        document.getElementById('closeFfReader').onclick = () => document.getElementById('ffReaderModal').style.display = 'none';

        // Initial Render
        this.renderList();
    }

    renderList() {
        const list = document.getElementById('ffList');
        list.innerHTML = '';
        const data = this.store.get();
        
        const posts = data.posts.filter(p => p.type === this.currentTab).sort((a, b) => b.time - a.time);

        if(posts.length === 0) {
            list.innerHTML = '<div style="text-align:center; color:#999; margin-top:50px;">暂无内容，点击右下角生成</div>';
            return;
        }

        posts.forEach(p => {
            const div = document.createElement('div');
            div.className = 'ff-card';
            
            div.innerHTML = `
                <div class="ff-card-title">${p.title}</div>
                <div class="ff-card-preview">${p.content}</div>
                <div class="ff-card-meta">
                    <span>${new Date(p.time).toLocaleDateString()}</span>
                    <span>${p.content.length} 字</span>
                </div>
            `;
            
            div.onclick = () => this.openReader(p);
            
            // Long press to delete
            div.oncontextmenu = (e) => {
                e.preventDefault();
                if(confirm('删除这篇文章？')) {
                    this.store.update(d => d.posts = d.posts.filter(x => x.id !== p.id));
                    this.renderList();
                }
            };
            
            list.appendChild(div);
        });
    }

    openReader(post) {
        document.getElementById('ffReaderTitle').innerText = post.title;
        document.getElementById('ffReaderContent').innerText = post.content;
        
        // Render Comments
        const commentsDiv = document.createElement('div');
        commentsDiv.style.cssText = 'padding:20px; border-top:1px solid #eee; background:#f9f9f9;';
        commentsDiv.innerHTML = '<h3>评论</h3>';
        
        if(post.comments && post.comments.length > 0) {
            post.comments.forEach(c => {
                const cDiv = document.createElement('div');
                cDiv.style.cssText = 'margin-bottom:10px; padding:10px; background:#fff; border-radius:8px;';
                cDiv.innerHTML = `<div style="font-weight:bold; font-size:12px; color:#666;">${c.user}</div><div>${c.text}</div>`;
                commentsDiv.appendChild(cDiv);
            });
        } else {
            commentsDiv.innerHTML += '<div style="color:#999;">暂无评论</div>';
        }
        
        const readerContent = document.querySelector('.ff-reader-content');
        readerContent.innerHTML = '';
        const title = document.createElement('div');
        title.className = 'ff-reader-title';
        title.innerText = post.title;
        const content = document.createElement('div');
        content.innerText = post.content;
        readerContent.appendChild(title);
        readerContent.appendChild(content);
        readerContent.appendChild(commentsDiv);

        document.getElementById('ffReaderModal').style.display = 'flex';
    }

    openGenerator() {
        document.getElementById('ffGeneratorModal').style.display = 'flex';
        document.getElementById('ffPromptInput').value = '';
        document.getElementById('ffPromptInput').focus();
        
        // Add Batch Option if not exists
        if(!document.getElementById('ffBatchCount')) {
            const div = document.createElement('div');
            div.style.marginTop = '10px';
            div.innerHTML = `
                <label>生成数量: </label>
                <select id="ffBatchCount">
                    <option value="1">1 篇</option>
                    <option value="3">3 篇 (批量)</option>
                    <option value="5">5 篇 (批量)</option>
                </select>
            `;
            document.querySelector('.ff-modal-content').insertBefore(div, document.querySelector('.ff-modal-content').lastElementChild); // Insert before buttons? No, structure is different.
            // Just append to input group
            document.querySelector('.ff-input-group').appendChild(div);
        }
    }

    async generatePost() {
        const promptText = document.getElementById('ffPromptInput').value.trim();
        const count = parseInt(document.getElementById('ffBatchCount').value || 1);
        
        if(!promptText) return;

        const apiConfig = JSON.parse(localStorage.getItem('apiConfig') || '{}');
        if(!apiConfig.chatApiKey) return alert('请先在设置中配置 API Key');

        const btn = document.getElementById('doFfGenerate');
        btn.innerText = '生成中...';
        btn.disabled = true;

        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}');
        const user = qqData.user;
        const friend = qqData.friends.length > 0 ? qqData.friends[Math.floor(Math.random() * qqData.friends.length)] : {name: 'AI', persona: '助手'};

        let systemPrompt = '';
        
        if(this.currentTab === 'reverse') {
            systemPrompt = `你扮演 ${friend.name}。\n人设: ${friend.persona}\n请以第一人称写一篇关于你和用户(${user.name})的日记或独白。表达你的真实感情，可以包含一些生活细节和心理活动。`;
        } else if(this.currentTab === 'fanfic') {
            systemPrompt = `请写一篇关于 ${friend.name} 和 用户(${user.name}) 的同人小说。风格可以是温馨、虐心或搞笑，具体取决于用户要求。`;
        } else {
            const settings = this.store.get().settings;
            systemPrompt = `请根据以下世界观设定写一篇故事：\n${settings.customRules || '自由发挥'}\n`;
        }

        const fullPrompt = `${systemPrompt}\n\n用户要求: ${promptText}\n\n请生成 ${count} 篇不同的短文/章节。\n请严格返回JSON数组格式: [{"title": "标题", "content": "正文内容"}]`;

        try {
            const res = await window.API.callAI(fullPrompt, apiConfig);
            let results = [];
            try {
                const jsonMatch = res.match(/\[[\s\S]*\]/);
                results = JSON.parse(jsonMatch ? jsonMatch[0] : res);
            } catch(e) {
                // Fallback for single object or plain text
                try {
                    const single = JSON.parse(res);
                    results = Array.isArray(single) ? single : [single];
                } catch(e2) {
                    results = [{ title: '无题', content: res }];
                }
            }

            if(!Array.isArray(results)) results = [results];

            this.store.update(d => {
                results.forEach(r => {
                    d.posts.push({
                        id: window.Utils.generateId('ff'),
                        type: this.currentTab,
                        title: r.title || '无题',
                        content: r.content || '',
                        time: Date.now(),
                        comments: []
                    });
                });
            });

            document.getElementById('ffGeneratorModal').style.display = 'none';
            this.renderList();

            // Generate AI Comments for the first post
            if(results.length > 0) {
                // We need the ID of the first generated post. 
                // Since we just pushed them, we can find them by time or just take the last one.
                // But wait, we generated multiple. Let's comment on the last one for simplicity.
                const lastPost = this.store.get().posts[this.store.get().posts.length - 1];
                this.generateComments(lastPost.id, lastPost.content);
                
                // Random Share
                if(Math.random() > 0.7) this.sharePost(lastPost);
            }

        } catch(e) {
            alert('生成失败: ' + e.message);
            console.error(e);
        } finally {
            btn.innerText = '生成';
            btn.disabled = false;
        }
    }

    async generateComments(postId, context) {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return;
        
        const prompt = `请生成 3-5 条关于这篇同人文的评论。
        文章内容摘要: ${context.substring(0, 200)}...
        要求：
        1. 风格：同人女、激动、催更、分析剧情、嗑到了。
        2. 返回 JSON 数组: [{"user": "昵称", "text": "评论内容"}]`;
        
        try {
            const res = await window.API.callAI(prompt, apiConfig);
            const comments = JSON.parse(res);
            
            if(Array.isArray(comments)) {
                this.store.update(d => {
                    const p = d.posts.find(x => x.id === postId);
                    if(p) {
                        comments.forEach(c => p.comments.push(c));
                    }
                });
                // If reader is open, refresh comments
                if(document.getElementById('ffReaderModal').style.display !== 'none') {
                    // We need to re-open reader to refresh or manually append. 
                    // Re-opening is easier but might reset scroll.
                    // Let's just leave it for next open or if user refreshes.
                }
            }
        } catch(e) { console.error(e); }
    }

    sharePost(post) {
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
        if(qqData.friends.length === 0) return;
        
        const friend = qqData.friends[Math.floor(Math.random() * qqData.friends.length)];
        
        // Add to QQ messages
        if(!qqData.messages[friend.id]) qqData.messages[friend.id] = [];
        qqData.messages[friend.id].push({
            id: Date.now(), senderId: friend.id, senderName: friend.name, 
            content: `[分享同人] 我看到一篇超棒的文！\n《${post.title}》\n${post.content.substring(0, 30)}...`, 
            type: 'text', timestamp: Date.now(), status: 'normal'
        });
        localStorage.setItem('qq_data', JSON.stringify(qqData));
        
        if(Notification.permission === 'granted') {
            new Notification(friend.name, { body: '分享了一篇同人文给你' });
        }
    }

    openSettings() {
        const settings = this.store.get().settings;
        document.getElementById('ffCustomRules').value = settings.customRules || '';
        document.getElementById('ffSettingsModal').style.display = 'flex';
    }

    saveSettings() {
        const rules = document.getElementById('ffCustomRules').value;
        this.store.update(d => d.settings.customRules = rules);
        document.getElementById('ffSettingsModal').style.display = 'none';
    }

    exportSettings() {
        const settings = this.store.get().settings;
        const blob = new Blob([JSON.stringify(settings, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fanfic_settings.json';
        a.click();
    }

    importSettings(file) {
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const settings = JSON.parse(e.target.result);
                this.store.update(d => d.settings = settings);
                document.getElementById('ffCustomRules').value = settings.customRules || '';
                alert('导入成功');
            } catch(err) {
                alert('文件格式错误');
            }
        };
        reader.readAsText(file);
    }

}

window.FanficApp = new FanficApp();
