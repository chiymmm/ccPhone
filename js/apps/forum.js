class ForumStore {
    constructor() { this.init(); }
    init() {
        if(!localStorage.getItem('forum_data')) {
            const initialData = {
                posts: [], // {id, boardId, title, content, author, authorAvatar, time, comments:[], likes:0}
                boards: [], // {id, name, desc, icon}
                marketItems: [], // {id, title, price, seller, sellerAvatar, desc, comments:[]}
                chats: [], // {userName, messages:[]}
                user: {
                    name: '我',
                    avatar: '',
                    signature: '这个人很懒，什么都没写',
                    bgImage: '',
                    stats: { posts: 0, replies: 0, likes: 0 },
                    history: { posts: [], replies: [], favorites: [], viewed: [] }
                },
                settings: { worldSetting: '现代网络社区', rules: '友好交流，禁止谩骂' }
            };
            localStorage.setItem('forum_data', JSON.stringify(initialData));
        }
    }
    get() { return JSON.parse(localStorage.getItem('forum_data')); }
    set(data) { localStorage.setItem('forum_data', JSON.stringify(data)); }
    update(fn) { const data = this.get(); fn(data); this.set(data); }
}

class ForumApp {
    constructor() {
        this.store = new ForumStore();
        this.currentTab = 'home';
        this.currentBoardId = null;
        this.initUI();
    }

    initUI() {
        // Update Header
        const header = document.querySelector('.forum-header');
        // Use SVG for icons to ensure they display
        const svgSearch = `<svg viewBox="0 0 24 24" width="16" height="16" fill="#999"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`;
        const svgPlus = `<svg viewBox="0 0 24 24" width="20" height="20" fill="#333"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`;
        const svgCog = `<svg viewBox="0 0 24 24" width="20" height="20" fill="#333"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>`;

        header.innerHTML = `
            <div class="forum-title">论坛</div>
            <div class="forum-search-bar" style="display:flex;align-items:center;background:#f5f5f5;border-radius:20px;padding:5px 10px;">
                <div id="forumSearchBtn" style="cursor:pointer;display:flex;">${svgSearch}</div>
                <input type="text" id="forumSearchInput" placeholder="搜索帖子" style="border:none;background:transparent;outline:none;margin-left:5px;width:100%;">
            </div>
            <div style="display:flex;gap:10px;margin-left:10px;align-items:center;">
                <div id="forumGenBtn" style="cursor:pointer;display:flex;" title="生成内容">${svgPlus}</div>
                <div id="forumSettingsBtn" style="cursor:pointer;display:flex;">${svgCog}</div>
            </div>
        `;
        document.getElementById('forumSettingsBtn').onclick = () => this.openSettings();
        document.getElementById('forumGenBtn').onclick = () => this.handleGenerate();

        document.querySelectorAll('.forum-nav-item').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.forum-nav-item').forEach(el => el.classList.remove('active'));
                btn.classList.add('active');
                this.currentTab = btn.dataset.tab;
                this.render();
            };
        });

        const searchInput = document.getElementById('forumSearchInput');
        const searchBtn = document.getElementById('forumSearchBtn');
        
        const doSearch = () => this.search(searchInput.value);
        
        if(searchInput) {
            searchInput.onkeydown = (e) => {
                if(e.key === 'Enter') doSearch();
            };
        }
        if(searchBtn) {
            searchBtn.onclick = doSearch;
        }
    }

    async search(query) {
        if(!query) {
            this.render();
            return;
        }
        
        // Switch to home to show results
        this.currentTab = 'home';
        document.querySelectorAll('.forum-nav-item').forEach(el => el.classList.remove('active'));
        document.querySelector('.forum-nav-item[data-tab="home"]').classList.add('active');
        
        document.querySelectorAll('.forum-page').forEach(el => el.style.display = 'none');
        document.getElementById('forum-home').style.display = 'block';

        const list = document.getElementById('forumHomeList');
        list.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">搜索中...</div>';
        
        const data = this.store.get();
        const posts = data.posts.filter(p => 
            p.title.toLowerCase().includes(query.toLowerCase()) || 
            p.content.toLowerCase().includes(query.toLowerCase())
        );

        if(posts.length === 0) {
            // If local search fails, try API generation
            const apiConfig = window.API.getConfig();
            if(apiConfig.chatApiKey) {
                list.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">本地未找到，正在尝试生成相关内容...</div>';
                await this.generatePosts(null, query);
                return;
            }
            
            list.innerHTML = `<div style="text-align:center;padding:20px;color:#999;">未找到包含 "${query}" 的帖子</div>`;
            return;
        }

        list.innerHTML = '';
        posts.forEach(p => {
            const div = document.createElement('div');
            div.className = 'forum-post';
            div.innerHTML = `
                <div class="forum-post-title">${p.title}</div>
                <div class="forum-post-meta">
                    <span>${p.author}</span>
                    <span>${new Date(p.time).toLocaleDateString()}</span>
                </div>
                <div class="forum-post-meta" style="margin-top:5px;">
                    <span><i class="far fa-comment"></i> ${p.comments.length}</span>
                    <span><i class="far fa-thumbs-up"></i> ${p.likes || 0}</span>
                </div>
            `;
            div.onclick = () => this.openPost(p);
            list.appendChild(div);
        });
    }

    render() {
        document.querySelectorAll('.forum-page').forEach(el => el.style.display = 'none');
        document.getElementById(`forum-${this.currentTab}`).style.display = 'block';

        if(this.currentTab === 'home') this.renderHome();
        if(this.currentTab === 'boards') this.renderBoards();
        if(this.currentTab === 'market') this.renderMarket();
        if(this.currentTab === 'chat') this.renderChatList();
        if(this.currentTab === 'me') this.renderMe();
    }

    handleGenerate() {
        if(this.currentTab === 'home') {
            this.generatePosts(null);
        } else if(this.currentTab === 'boards') {
            if(this.currentBoardId) this.generatePosts(this.currentBoardId);
            else this.generateBoards();
        } else if(this.currentTab === 'market') {
            this.generateMarketItems();
        } else if(this.currentTab === 'chat') {
            this.generateNewChat();
        }
    }

    async renderHome() {
        const list = document.getElementById('forumHomeList');
        list.innerHTML = '';
        const data = this.store.get();
        
        const posts = data.posts.sort((a, b) => b.time - a.time).slice(0, 20);
        
        if(posts.length === 0) {
            list.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">暂无帖子，点击右上角 + 生成</div>';
            return;
        }

        posts.forEach(p => {
            const div = document.createElement('div');
            div.className = 'forum-post';
            div.innerHTML = `
                <div class="forum-post-title">${p.title}</div>
                <div class="forum-post-meta">
                    <span>${p.author}</span>
                    <span>${new Date(p.time).toLocaleDateString()}</span>
                </div>
                <div class="forum-post-meta" style="margin-top:5px;">
                    <span><i class="far fa-comment"></i> ${p.comments.length}</span>
                    <span><i class="far fa-thumbs-up"></i> ${p.likes || 0}</span>
                </div>
            `;
            div.onclick = () => this.openPost(p);
            list.appendChild(div);
        });
    }

    async generatePosts(boardId, query = null) {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');

        const btn = document.getElementById('forumGenBtn');
        // SVG rotation animation class if needed, or just opacity
        if(btn) btn.style.opacity = '0.5';

        const settings = this.store.get().settings;
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
        const friends = qqData.friends;
        
        const boardName = boardId ? (this.store.get().boards.find(b => b.id === boardId)?.name || '未知板块') : '综合区';

        let prompt = `基于世界观"${settings.worldSetting}"，在"${boardName}"板块生成 3-5 个论坛帖子。`;
        if(query) prompt += `\n帖子内容必须与关键词 "${query}" 相关。`;
        
        prompt += `
        要求：
        1. 标题吸引人，内容符合板块主题。
        2. 作者可以是路人，也可以是QQ好友（${friends.map(f => f.name).join(', ')}）。
        3. 每个帖子包含 2-3 条初始评论。
        4. 返回 JSON 数组：
        [
            {
                "title": "标题", "content": "正文", "author": "作者名", "likes": 10,
                "comments": [{"author": "评论人", "content": "评论内容"}]
            }
        ]`;

        try {
            const res = await window.API.callAI(prompt, apiConfig);
            let newPosts = [];
            try {
                newPosts = JSON.parse(res);
            } catch(e) {
                const match = res.match(/\[[\s\S]*\]/);
                if(match) newPosts = JSON.parse(match[0]);
            }

            if(Array.isArray(newPosts)) {
                this.store.update(d => {
                    newPosts.forEach(p => {
                        let avatar = '';
                        const friend = friends.find(f => f.name === p.author);
                        if(friend) avatar = friend.avatar;
                        else avatar = window.Utils.generateDefaultAvatar(p.author);

                        d.posts.unshift({
                            id: window.Utils.generateId('post'),
                            boardId: boardId || 'general',
                            title: p.title,
                            content: p.content,
                            author: p.author,
                            authorAvatar: avatar,
                            time: Date.now(),
                            likes: p.likes || 0,
                            comments: (p.comments || []).map(c => ({
                                author: c.author,
                                content: c.content,
                                time: Date.now()
                            }))
                        });
                    });
                });
                this.render();
            }
        } catch(e) {
            console.error(e);
            alert('生成失败: ' + e.message);
        } finally {
            if(btn) btn.style.opacity = '1';
        }
    }

    async generateBoards() {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');
        
        const btn = document.getElementById('forumGenBtn');
        btn.className = 'fas fa-spinner fa-spin';
        
        const settings = this.store.get().settings;
        const prompt = `基于世界观"${settings.worldSetting}"，生成 4-6 个论坛板块。
        返回 JSON 数组: [{"name": "板块名", "desc": "简介", "icon": "Emoji图标"}]`;
        
        try {
            const res = await window.API.callAI(prompt, apiConfig);
            const boards = JSON.parse(res);
            if(Array.isArray(boards)) {
                this.store.update(d => {
                    boards.forEach(b => {
                        if(!d.boards.find(x => x.name === b.name)) {
                            d.boards.push({
                                id: window.Utils.generateId('board'),
                                name: b.name,
                                desc: b.desc,
                                icon: b.icon
                            });
                        }
                    });
                });
                this.renderBoards();
            }
        } catch(e) { alert('生成失败'); }
        finally { btn.className = 'fas fa-plus'; }
    }

    renderBoards() {
        const list = document.getElementById('forumBoardList');
        list.innerHTML = '';
        const data = this.store.get();

        if(this.currentBoardId) {
            const board = data.boards.find(b => b.id === this.currentBoardId);
            const posts = data.posts.filter(p => p.boardId === this.currentBoardId).sort((a, b) => b.time - a.time);
            
            const headerDiv = document.createElement('div');
            headerDiv.style.padding = '10px';
            headerDiv.style.background = '#fff';
            headerDiv.style.marginBottom = '10px';
            headerDiv.innerHTML = `
                <div style="display:flex;align-items:center;gap:10px;">
                    <i class="fas fa-arrow-left" style="cursor:pointer;" id="backToBoards"></i>
                    <h3 style="margin:0;">${board.name}</h3>
                </div>
                <p style="color:#666;font-size:12px;margin-top:5px;">${board.desc}</p>
            `;
            list.appendChild(headerDiv);
            headerDiv.querySelector('#backToBoards').onclick = () => { this.currentBoardId = null; this.renderBoards(); };

            if(posts.length === 0) {
                const emptyDiv = document.createElement('div');
                emptyDiv.style.textAlign = 'center';
                emptyDiv.style.padding = '20px';
                emptyDiv.style.color = '#999';
                emptyDiv.innerHTML = '本板块暂无帖子，点击右上角 + 生成';
                list.appendChild(emptyDiv);
            }

            posts.forEach(p => {
                const div = document.createElement('div');
                div.className = 'forum-post';
                div.innerHTML = `
                    <div class="forum-post-title">${p.title}</div>
                    <div class="forum-post-meta">
                        <span>${p.author}</span>
                        <span>${new Date(p.time).toLocaleDateString()}</span>
                    </div>
                `;
                div.onclick = () => this.openPost(p);
                list.appendChild(div);
            });

        } else {
            if (data.boards.length === 0) {
                list.innerHTML = `
                    <div style="text-align:center;padding:50px;color:#999;">
                        <p>暂无板块，点击右上角 + 生成</p>
                    </div>
                `;
                return;
            }

            data.boards.forEach(b => {
                const div = document.createElement('div');
                div.className = 'forum-board-item';
                div.innerHTML = `
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:40px;height:40px;background:#f5f5f5;border-radius:12px;display:flex;justify-content:center;align-items:center;font-size:20px;">${b.icon || '📁'}</div>
                        <div>
                            <div style="font-weight:bold;">${b.name}</div>
                            <div style="font-size:12px;color:#999;">${b.desc}</div>
                        </div>
                    </div>
                    <i class="fas fa-chevron-right" style="color:#ccc;"></i>
                `;
                div.onclick = () => {
                    this.currentBoardId = b.id;
                    this.renderBoards();
                };
                list.appendChild(div);
            });
        }
    }

    async generateMarketItems() {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');
        
        const btn = document.getElementById('forumGenBtn');
        btn.className = 'fas fa-spinner fa-spin';
        
        const settings = this.store.get().settings;
        const prompt = `基于世界观"${settings.worldSetting}"，生成 3-5 个闲置交易商品。
        要求：
        1. 物品奇特有趣，符合世界观。
        2. 卖家可以是路人。
        3. 返回 JSON 数组: [{"title": "商品名", "price": 99.9, "seller": "卖家名", "desc": "描述"}]`;
        
        try {
            const res = await window.API.callAI(prompt, apiConfig);
            const items = JSON.parse(res);
            if(Array.isArray(items)) {
                this.store.update(d => {
                    items.forEach(i => {
                        d.marketItems.unshift({
                            id: window.Utils.generateId('item'),
                            title: i.title,
                            price: i.price,
                            seller: i.seller,
                            sellerAvatar: window.Utils.generateDefaultAvatar(i.seller),
                            desc: i.desc,
                            comments: []
                        });
                    });
                });
                this.renderMarket();
            }
        } catch(e) { alert('生成失败'); }
        finally { btn.className = 'fas fa-plus'; }
    }

    async renderMarket() {
        const list = document.getElementById('forumMarketList');
        list.innerHTML = '';
        const data = this.store.get();
        
        if(data.marketItems.length === 0) {
            list.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">暂无闲置物品，点击右上角 + 生成</div>';
            return;
        }

        for(const item of data.marketItems) {
            const div = document.createElement('div');
            div.className = 'forum-market-item';
            
            let imgUrl = window.Utils.generateDefaultImage(item.title);
            
            div.innerHTML = `
                <div class="forum-market-img" style="background-image:url('${imgUrl}')"></div>
                <div style="flex:1;">
                    <div style="font-weight:bold;">${item.title}</div>
                    <div style="color:#ff5000;font-weight:bold;">¥${item.price}</div>
                    <div style="font-size:12px;color:#999;">卖家: ${item.seller}</div>
                </div>
                <button class="shop-btn buy" style="height:fit-content;align-self:center;">购买</button>
            `;
            
            div.querySelector('.buy').onclick = () => this.buyMarketItem(item);
            div.onclick = (e) => {
                if(e.target.tagName !== 'BUTTON') this.openMarketItem(item);
            };
            
            list.appendChild(div);
        }
    }

    async generateNewChat() {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');
        
        const btn = document.getElementById('forumGenBtn');
        btn.className = 'fas fa-spinner fa-spin';
        
        const prompt = `生成一个论坛私信对话的开头。
        返回 JSON: {"userName": "用户名", "message": "第一条消息"}`;
        
        try {
            const res = await window.API.callAI(prompt, apiConfig);
            const json = JSON.parse(res);
            
            this.startChatWithUser(json.userName);
            const data = this.store.get();
            const chat = data.chats.find(c => c.userName === json.userName);
            if(chat) {
                chat.messages.push({sender: 'other', content: json.message, time: Date.now()});
                this.store.set(data);
                this.renderChatList();
                // If chat modal is open, refresh it? No, startChatWithUser opens it.
                // But startChatWithUser opens it before we add message.
                // So we need to refresh.
                const existingModal = document.querySelector('.sub-page');
                if(existingModal && existingModal.querySelector('.sub-title').innerText === json.userName) {
                    existingModal.remove();
                    this.openChat(chat);
                }
            }
        } catch(e) { alert('生成失败'); }
        finally { btn.className = 'fas fa-plus'; }
    }

    async renderMe() {
        const data = this.store.get();
        const user = data.user;
        const container = document.getElementById('forum-me');
        container.innerHTML = ''; // Clear previous

        // Header
        const header = document.createElement('div');
        header.style.cssText = `background:#333;color:#fff;padding:30px 20px;text-align:center;position:relative;`;
        if(user.bgImage) header.style.backgroundImage = `url('${user.bgImage}')`;
        
        let avatarUrl = user.avatar || '';
        if(avatarUrl.startsWith('img_')) {
            const blob = await window.db.getImage(avatarUrl);
            if(blob) avatarUrl = blob;
        }

        header.innerHTML = `
            <div style="width:80px;height:80px;background:#fff;border-radius:50%;margin:0 auto;background-image:url('${avatarUrl}');background-size:cover;border:2px solid #fff;"></div>
            <h2 style="margin:10px 0 5px;">${user.name}</h2>
            <p style="opacity:0.8;font-size:12px;">${user.signature}</p>
            <button id="editProfileBtn" style="position:absolute;top:10px;right:10px;background:transparent;border:1px solid #fff;color:#fff;border-radius:15px;padding:2px 10px;font-size:12px;">编辑</button>
        `;
        container.appendChild(header);

        // Stats
        const stats = document.createElement('div');
        stats.style.cssText = 'display:flex;justify-content:space-around;padding:15px;background:#fff;margin-bottom:10px;';
        stats.innerHTML = `
            <div style="text-align:center;"><div style="font-weight:bold;">${user.stats.posts}</div><div style="font-size:12px;color:#999;">发帖</div></div>
            <div style="text-align:center;"><div style="font-weight:bold;">${user.stats.replies}</div><div style="font-size:12px;color:#999;">回帖</div></div>
            <div style="text-align:center;"><div style="font-weight:bold;">${user.stats.likes}</div><div style="font-size:12px;color:#999;">获赞</div></div>
        `;
        container.appendChild(stats);

        // Menu
        const menu = document.createElement('div');
        menu.style.background = '#fff';
        const items = [
            {icon: 'fa-file-alt', text: '我的帖子', action: () => this.showMyPosts()},
            {icon: 'fa-comment-dots', text: '我的回复', action: () => this.showMyReplies()},
            {icon: 'fa-star', text: '我的收藏', action: () => this.showMyFavorites()},
            {icon: 'fa-history', text: '浏览历史', action: () => this.showHistory()}
        ];
        
        items.forEach(item => {
            const div = document.createElement('div');
            div.style.cssText = 'padding:15px;border-bottom:1px solid #eee;display:flex;align-items:center;cursor:pointer;';
            div.innerHTML = `<i class="fas ${item.icon}" style="width:30px;color:#333;"></i><span>${item.text}</span><i class="fas fa-chevron-right" style="margin-left:auto;color:#ccc;"></i>`;
            div.onclick = item.action;
            menu.appendChild(div);
        });
        container.appendChild(menu);

        // Edit Profile Logic
        header.querySelector('#editProfileBtn').onclick = () => {
            const newName = prompt('修改昵称:', user.name);
            if(newName) {
                const newSig = prompt('修改签名:', user.signature);
                this.store.update(d => {
                    d.user.name = newName;
                    if(newSig) d.user.signature = newSig;
                });
                this.renderMe();
            }
        };
    }

    showMyPosts() {
        alert('功能开发中: 显示我的帖子列表');
    }
    showMyReplies() {
        alert('功能开发中: 显示我的回复列表');
    }
    showMyFavorites() {
        alert('功能开发中: 显示我的收藏列表');
    }
    showHistory() {
        alert('功能开发中: 显示浏览历史');
    }

    openPost(post) {
        // Add to history
        this.store.update(d => {
            if(!d.user.history.viewed.includes(post.id)) d.user.history.viewed.push(post.id);
        });

        const modal = document.createElement('div');
        modal.className = 'forum-detail-modal';
        
        let avatar = post.authorAvatar;
        if(avatar && avatar.startsWith('img_')) {
            window.db.getImage(avatar).then(url => {
                modal.querySelector('.post-avatar').style.backgroundImage = `url('${url}')`;
            });
        } else {
            avatar = window.Utils.generateDefaultAvatar(post.author);
        }

        modal.innerHTML = `
            <div class="forum-header">
                <i class="fas fa-arrow-left" style="cursor:pointer;" id="closePostDetail"></i>
                <span>帖子详情</span>
                <div></div>
            </div>
            <div class="forum-content" style="padding:15px; background:white;">
                <h2 style="margin-top:0;">${post.title}</h2>
                <div style="display:flex;align-items:center;margin-bottom:15px;">
                    <div class="post-avatar" style="width:30px;height:30px;border-radius:50%;background-image:url('${avatar}');background-size:cover;margin-right:10px;"></div>
                    <div style="color:#999; font-size:12px;">${post.author} · ${new Date(post.time).toLocaleString()}</div>
                </div>
                <div style="line-height:1.6;">${post.content}</div>
                <div style="margin-top:20px;display:flex;gap:15px;">
                    <span id="likeBtn" style="cursor:pointer;color:${false?'red':'#666'}"><i class="far fa-thumbs-up"></i> ${post.likes||0}</span>
                    <span id="favBtn" style="cursor:pointer;color:#666"><i class="far fa-star"></i> 收藏</span>
                </div>
                <div style="margin-top:20px; border-top:1px solid #eee; padding-top:10px;">
                    <h3>评论</h3>
                    <div id="postComments"></div>
                </div>
            </div>
            <div style="padding:10px; background:white; border-top:1px solid #eee; display:flex; gap:10px;">
                <input id="postCommentInput" style="flex:1; padding:8px; border:1px solid #ddd; border-radius:4px;" placeholder="发表评论...">
                <button id="postCommentBtn" class="shop-btn buy">发送</button>
            </div>
        `;
        document.getElementById('forumApp').appendChild(modal);
        
        const renderComments = () => {
            const list = modal.querySelector('#postComments');
            list.innerHTML = '';
            if(post.comments.length === 0) list.innerHTML = '<div style="color:#999;">暂无评论</div>';
            post.comments.forEach(c => {
                const div = document.createElement('div');
                div.className = 'forum-comment';
                div.innerHTML = `<div style="font-weight:bold;font-size:12px;">${c.author}</div><div>${c.content}</div>`;
                list.appendChild(div);
            });
        };
        renderComments();

        modal.querySelector('#closePostDetail').onclick = () => modal.remove();
        
        modal.querySelector('#likeBtn').onclick = () => {
            this.store.update(d => {
                const p = d.posts.find(x => x.id === post.id);
                if(p) { p.likes = (p.likes||0) + 1; d.user.stats.likes++; }
            });
            post.likes = (post.likes||0) + 1;
            modal.querySelector('#likeBtn').innerHTML = `<i class="fas fa-thumbs-up"></i> ${post.likes}`;
        };

        modal.querySelector('#postCommentBtn').onclick = async () => {
            const input = modal.querySelector('#postCommentInput');
            const text = input.value.trim();
            if(!text) return;
            
            const data = this.store.get();
            const newComment = { author: data.user.name, content: text, time: Date.now() };
            
            this.store.update(d => {
                const p = d.posts.find(x => x.id === post.id);
                if(p) p.comments.push(newComment);
                d.user.stats.replies++;
                d.user.history.replies.push(post.id);
            });
            post.comments.push(newComment);
            input.value = '';
            renderComments();

            // AI Reply
            const apiConfig = window.API.getConfig();
            if(apiConfig.chatApiKey) {
                const prompt = `用户在论坛帖子"${post.title}"下评论: "${text}"。\n请生成 1-2 条其他用户的回复。返回JSON数组: [{"author": "昵称", "content": "回复"}]`;
                try {
                    const res = await window.API.callAI(prompt, apiConfig);
                    const replies = JSON.parse(res);
                    if(Array.isArray(replies)) {
                        this.store.update(d => {
                            const p = d.posts.find(x => x.id === post.id);
                            if(p) replies.forEach(r => p.comments.push(r));
                        });
                        replies.forEach(r => post.comments.push(r));
                        renderComments();
                    }
                } catch(e) {}
            }
        };
    }

    buyMarketItem(item) {
        const qqData = JSON.parse(localStorage.getItem('qq_data'));
        if(parseFloat(qqData.wallet.balance) < item.price) return alert('余额不足');
        
        if(confirm(`确认支付 ¥${item.price} 购买 ${item.title}?`)) {
            qqData.wallet.balance = (parseFloat(qqData.wallet.balance) - parseFloat(item.price)).toFixed(2);
            qqData.wallet.history.unshift({date: new Date().toLocaleString(), amount: `-${item.price}`, reason: `论坛交易: ${item.title}`});
            localStorage.setItem('qq_data', JSON.stringify(qqData));
            
            this.store.update(d => d.marketItems = d.marketItems.filter(x => x.id !== item.id));
            this.renderMarket();
            alert('购买成功');
            
            this.startChatWithUser(item.seller);
            const data = this.store.get();
            const chat = data.chats.find(c => c.userName === item.seller);
            if(chat) {
                chat.messages.push({sender: 'user', content: `你好，我拍下了你的 ${item.title}`, time: Date.now()});
                this.store.set(data);
                const existingModal = document.querySelector('.sub-page'); 
                if(existingModal && existingModal.querySelector('.sub-title').innerText === item.seller) {
                    existingModal.remove();
                    this.openChat(chat);
                }
            }
        }
    }
    
    openMarketItem(item) {
        if(confirm(`卖家: ${item.seller}\n描述: ${item.desc}\n\n要私信卖家吗？`)) {
            this.startChatWithUser(item.seller);
        }
    }

    renderChatList() {
        const list = document.getElementById('forumChatList');
        list.innerHTML = '';
        const data = this.store.get();
        const chats = data.chats || [];

        if(chats.length === 0) {
            list.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">暂无私信</div>';
            return;
        }

        chats.forEach(chat => {
            const div = document.createElement('div');
            div.className = 'chat-item';
            div.innerHTML = `
                <div class="chat-avatar" style="background:#6c5ce7;color:#fff;display:flex;justify-content:center;align-items:center;"><i class="fas fa-user"></i></div>
                <div class="chat-info">
                    <div class="chat-top"><span class="chat-name">${chat.userName}</span></div>
                    <div class="chat-msg">${chat.messages[chat.messages.length-1]?.content || ''}</div>
                </div>
            `;
            div.onclick = () => this.openChat(chat);
            list.appendChild(div);
        });
    }

    openChat(chat) {
        const modal = document.createElement('div');
        modal.className = 'sub-page';
        modal.style.display = 'flex';
        modal.style.zIndex = '100';
        modal.innerHTML = `
            <div class="sub-header">
                <button class="back-btn" id="closeForumChat"><i class="fas fa-chevron-left"></i></button>
                <span class="sub-title">${chat.userName}</span>
            </div>
            <div class="chat-messages" id="forumChatMessages" style="flex:1;overflow-y:auto;padding:10px;"></div>
            <div class="chat-input-area">
                <input id="forumChatInput" placeholder="发送消息...">
                <button class="send-btn" id="forumChatSend">发送</button>
                <button class="chat-reply-btn" id="forumChatReply" style="margin-left:5px;">回复</button>
            </div>
        `;
        document.getElementById('forumApp').appendChild(modal);

        const renderMsgs = () => {
            const container = modal.querySelector('#forumChatMessages');
            container.innerHTML = '';
            chat.messages.forEach(m => {
                const div = document.createElement('div');
                div.className = `message-row ${m.sender === 'user' ? 'self' : ''}`;
                div.innerHTML = `<div class="msg-content"><div class="msg-bubble">${m.content}</div></div>`;
                container.appendChild(div);
            });
            container.scrollTop = container.scrollHeight;
        };
        renderMsgs();

        modal.querySelector('#closeForumChat').onclick = () => modal.remove();
        
        const sendMsg = async (isReply = false) => {
            const input = modal.querySelector('#forumChatInput');
            const text = input.value.trim();
            if(!text && !isReply) return;
            
            if(!isReply) {
                chat.messages.push({sender: 'user', content: text, time: Date.now()});
                this.store.set(this.store.get());
                renderMsgs();
                input.value = '';
            }

            if(isReply) {
                 const apiConfig = window.API.getConfig();
                 if(apiConfig.chatApiKey) {
                     const prompt = `你扮演论坛用户 "${chat.userName}"。\n用户说: "${chat.messages[chat.messages.length-1].content}"。\n请回复用户。`;
                     try {
                         const reply = await window.API.callAI(prompt, apiConfig);
                         chat.messages.push({sender: 'other', content: reply, time: Date.now()});
                         this.store.set(this.store.get());
                         renderMsgs();
                     } catch(e) { alert('生成失败'); }
                 }
            }
        };

        modal.querySelector('#forumChatSend').onclick = () => sendMsg(false);
        modal.querySelector('#forumChatReply').onclick = () => sendMsg(true);
    }

    startChatWithUser(userName) {
        const data = this.store.get();
        if(!data.chats) data.chats = [];
        let chat = data.chats.find(c => c.userName === userName);
        if(!chat) {
            chat = { userName, messages: [] };
            data.chats.push(chat);
            this.store.set(data);
        }
        this.openChat(chat);
    }

    openSettings() {
        const settings = this.store.get().settings;
        const modal = document.createElement('div');
        modal.className = 'sub-page';
        modal.style.display = 'flex';
        modal.style.zIndex = '100';
        modal.innerHTML = `
            <div class="sub-header">
                <button class="back-btn" onclick="this.closest('.sub-page').remove()"><i class="fas fa-chevron-left"></i></button>
                <span class="sub-title">论坛设置</span>
            </div>
            <div class="sub-content form-content">
                <div class="form-group">
                    <label>世界观设定</label>
                    <textarea id="forumWorldSetting" style="height:100px;">${settings.worldSetting || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>论坛规则</label>
                    <textarea id="forumRules" style="height:100px;">${settings.rules || ''}</textarea>
                </div>
                <button class="action-btn" id="saveForumSettings">保存</button>
                <div style="margin-top:20px;display:flex;gap:10px;">
                    <button class="action-btn secondary" id="exportForumSettings">导出设定</button>
                    <button class="action-btn secondary" id="importForumSettings">导入设定</button>
                    <input type="file" id="importForumInput" hidden accept=".json">
                </div>
            </div>
        `;
        document.getElementById('forumApp').appendChild(modal);

        modal.querySelector('#saveForumSettings').onclick = () => {
            this.store.update(d => {
                d.settings.worldSetting = document.getElementById('forumWorldSetting').value;
                d.settings.rules = document.getElementById('forumRules').value;
            });
            alert('保存成功');
            modal.remove();
        };

        modal.querySelector('#exportForumSettings').onclick = () => {
            const s = this.store.get().settings;
            const blob = new Blob([JSON.stringify(s, null, 2)], {type: 'application/json'});
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'forum_settings.json'; a.click();
        };

        modal.querySelector('#importForumSettings').onclick = () => document.getElementById('importForumInput').click();
        modal.querySelector('#importForumInput').onchange = (e) => {
            const file = e.target.files[0];
            if(file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    try {
                        const s = JSON.parse(evt.target.result);
                        this.store.update(d => d.settings = s);
                        alert('导入成功');
                        modal.remove();
                    } catch(err) { alert('格式错误'); }
                };
                reader.readAsText(file);
            }
        };
    }
}

window.ForumApp = new ForumApp();
