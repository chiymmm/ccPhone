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
        // Clear previous comments if any (simple way: re-render content)
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
    }

    async generatePost() {
        const promptText = document.getElementById('ffPromptInput').value.trim();
        if(!promptText) return;

        const apiConfig = JSON.parse(localStorage.getItem('apiConfig') || '{}');
        if(!apiConfig.chatApiKey) return alert('请先在设置中配置 API Key');

        const btn = document.getElementById('doFfGenerate');
        btn.innerText = '生成中...';
        btn.disabled = true;

        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}');
        const user = qqData.user;
        const friend = qqData.friends[0] || {name: 'AI', persona: '助手'};

        let systemPrompt = '';
        if(this.currentTab === 'reverse') {
            systemPrompt = `你扮演 ${friend.name}。\n人设: ${friend.persona}\n请以第一人称写一篇关于你和用户(${user.name})的日记或独白。表达你的真实感情。`;
        } else if(this.currentTab === 'fanfic') {
            systemPrompt = `请写一篇关于 ${friend.name} 和 用户(${user.name}) 的同人小说。`;
        } else {
            const settings = this.store.get().settings;
            systemPrompt = `请根据以下世界观设定写一篇故事：\n${settings.customRules}\n`;
        }

        const fullPrompt = `${systemPrompt}\n\n用户要求: ${promptText}\n\n请返回JSON格式: {"title": "标题", "content": "正文内容"}`;

        try {
            const res = await window.QQApp.callAI(fullPrompt, apiConfig);
            let result;
            try {
                result = JSON.parse(res);
            } catch(e) {
                result = { title: '无题', content: res };
            }

            const postId = window.Utils.generateId('ff');
            this.store.update(d => {
                d.posts.push({
                    id: postId,
                    type: this.currentTab,
                    title: result.title,
                    content: result.content,
                    time: Date.now(),
                    comments: []
                });
            });

            document.getElementById('ffGeneratorModal').style.display = 'none';
            this.renderList();

            // Generate AI Comments
            this.generateComments(postId, result.content);

        } catch(e) {
            alert('生成失败: ' + e.message);
        } finally {
            btn.innerText = '开始生成';
            btn.disabled = false;
        }
    }

    async generateComments(postId, context) {
        const apiConfig = JSON.parse(localStorage.getItem('apiConfig') || '{}');
        if(!apiConfig.chatApiKey) return;

        const prompt = `基于以下文章内容，生成 3 条简短的读者评论。
        文章摘要: ${context.substring(0, 500)}...
        返回 JSON 数组: [{"user": "用户名", "text": "评论内容"}]`;

        try {
            const res = await window.QQApp.callAI(prompt, apiConfig);
            const comments = JSON.parse(res);
            if(Array.isArray(comments)) {
                this.store.update(d => {
                    const p = d.posts.find(x => x.id === postId);
                    if(p) p.comments = comments;
                });
                // If reader is open, refresh it? No, let user re-open or refresh manually for now to avoid complexity
            }
        } catch(e) {
            console.error('Comment generation failed', e);
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
