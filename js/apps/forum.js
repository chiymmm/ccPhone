class ForumStore {
    constructor() { this.init(); }
    init() {
        if(!localStorage.getItem('forum_data')) {
            const initialData = {
                posts: [], // {id, boardId, title, content, author, time, comments:[]}
                boards: [
                    {id: 'chat', name: '闲聊灌水'},
                    {id: 'tech', name: '技术交流'},
                    {id: 'game', name: '游戏讨论'},
                    {id: 'market', name: '二手交易'}
                ],
                marketItems: [], // {id, title, price, seller, desc, comments:[]}
                settings: { worldSetting: '现代网络社区' }
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
        // Check Phone Check Mode
        if (window.System && window.System.isPhoneCheckMode) {
            // Add Generate Activity Button
            if(!document.getElementById('forumGenActivityBtn')) {
                const btn = document.createElement('div');
                btn.id = 'forumGenActivityBtn';
                btn.className = 'ff-fab'; // Reuse fanfic fab style
                btn.style.bottom = '80px';
                btn.style.background = '#6c5ce7';
                btn.innerHTML = '<i class="fas fa-magic"></i>';
                btn.onclick = () => this.generateActivity();
                document.getElementById('forumApp').appendChild(btn);
            }
        }

        document.querySelectorAll('.forum-nav-item').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.forum-nav-item').forEach(el => el.classList.remove('active'));
                btn.classList.add('active');
                this.currentTab = btn.dataset.tab;
                this.render();
            };
        });

        // Search
        const searchInput = document.getElementById('forumSearchInput');
        if(searchInput) {
            searchInput.onkeydown = (e) => {
                if(e.key === 'Enter') this.search(e.target.value);
            };
        }

        // Generate
        const genBtn = document.getElementById('forumGenBtn');
        if(genBtn) genBtn.onclick = () => this.generateContent();

        // Settings
        const settingsBtn = document.querySelector('.forum-header .fa-cog');
        if(settingsBtn) {
            settingsBtn.onclick = () => this.openSettings();
        }
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

    async renderHome() {
        const list = document.getElementById('forumHomeList');
        list.innerHTML = '';
        const data = this.store.get();
        
        // Show latest posts from all boards
        const posts = data.posts.sort((a, b) => b.time - a.time).slice(0, 10);
        
        if(posts.length === 0) {
            list.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">暂无帖子，点击右上角生成</div>';
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
                    <span><i class="far fa-thumbs-up"></i> ${Math.floor(Math.random()*50)}</span>
                </div>
            `;
            div.onclick = () => this.openPost(p);
            list.appendChild(div);
        });
    }

    renderBoards() {
        const list = document.getElementById('forumBoardList');
        list.innerHTML = '';
        const data = this.store.get();

        if(this.currentBoardId) {
            // Render Board Posts
            const posts = data.posts.filter(p => p.boardId === this.currentBoardId).sort((a, b) => b.time - a.time);
            
            // Back button
            const backDiv = document.createElement('div');
            backDiv.style.padding = '10px';
            backDiv.style.cursor = 'pointer';
            backDiv.innerHTML = '<i class="fas fa-arrow-left"></i> 返回板块列表';
            backDiv.onclick = () => { this.currentBoardId = null; this.renderBoards(); };
            list.appendChild(backDiv);

            // Add Generate Button for Board
            const genBtn = document.createElement('button');
            genBtn.className = 'shop-btn';
            genBtn.style.margin = '10px auto';
            genBtn.style.display = 'block';
            genBtn.innerText = '生成新帖子';
            genBtn.onclick = () => this.generateContent();
            list.appendChild(genBtn);

            if(posts.length === 0) {
                const emptyDiv = document.createElement('div');
                emptyDiv.style.textAlign = 'center';
                emptyDiv.style.padding = '20px';
                emptyDiv.style.color = '#999';
                emptyDiv.innerHTML = '本板块暂无帖子';
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
            // Render Boards List
            data.boards.forEach(b => {
                const div = document.createElement('div');
                div.className = 'forum-board-item';
                div.innerHTML = `<span>${b.name}</span> <i class="fas fa-chevron-right" style="color:#ccc;"></i>`;
                div.onclick = () => {
                    this.currentBoardId = b.id;
                    this.renderBoards();
                };
                list.appendChild(div);
            });
        }
    }

    async renderMarket() {
        const list = document.getElementById('forumMarketList');
        list.innerHTML = '';
        const data = this.store.get();
        
        if(data.marketItems.length === 0) {
            list.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">暂无闲置物品，点击右上角生成</div>';
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

    renderMe() {
        const qqData = JSON.parse(localStorage.getItem('qq_data'));
        document.getElementById('forumMeName').innerText = qqData.user.name;
        // ... more stats
    }

    async generateContent() {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');

        const btn = document.getElementById('forumGenBtn');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const settings = this.store.get().settings;
        let prompt = '';
        let type = '';

        if(this.currentTab === 'market') {
            type = 'market';
            prompt = `基于世界观"${settings.worldSetting}"，生成 3 个二手交易市场的闲置物品帖子。
            要求：
            1. 物品符合世界观设定（例如如果是魔法世界，可以是魔杖、药水）。
            2. 包含物品名称、价格、卖家名称、物品描述。
            返回 JSON 数组: [{"title": "物品名", "price": 50, "seller": "卖家名", "desc": "描述"}]`;
        } else {
            type = 'post';
            const boardName = this.currentBoardId ? this.store.get().boards.find(b=>b.id===this.currentBoardId).name : '综合';
            prompt = `基于世界观"${settings.worldSetting}"，在"${boardName}"板块生成 3 个论坛帖子。
            要求：
            1. 内容符合板块主题和世界观。
            2. 包含标题、正文、发帖人昵称。
            3. 风格多样：吐槽、求助、分享、讨论。
            返回 JSON 数组: [{"title": "标题", "content": "正文", "author": "昵称"}]`;
        }

        try {
            const res = await window.API.callAI(prompt, apiConfig);
            const items = JSON.parse(res);
            
            if(Array.isArray(items)) {
                this.store.update(d => {
                    if(type === 'market') {
                        items.forEach(i => d.marketItems.push({...i, id: Date.now()+Math.random(), comments: []}));
                    } else {
                        items.forEach(i => d.posts.push({
                            ...i, 
                            id: Date.now()+Math.random(), 
                            boardId: this.currentBoardId || 'chat', 
                            time: Date.now(), 
                            comments: []
                        }));
                    }
                });
                this.render();
            }
        } catch(e) {
            console.error(e);
            alert('生成失败');
        } finally {
            btn.innerHTML = '<i class="fas fa-magic"></i>';
        }
    }

    openPost(post) {
        // Create modal for post detail
        const modal = document.createElement('div');
        modal.className = 'forum-detail-modal';
        modal.innerHTML = `
            <div class="forum-header">
                <i class="fas fa-arrow-left" style="cursor:pointer;" id="closePostDetail"></i>
                <span>帖子详情</span>
                <div></div>
            </div>
            <div class="forum-content" style="padding:15px; background:white;">
                <h2 style="margin-top:0;">${post.title}</h2>
                <div style="color:#999; font-size:12px; margin-bottom:15px;">${post.author} · ${new Date(post.time).toLocaleString()}</div>
                <div style="line-height:1.6;">${post.content}</div>
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
        
        modal.querySelector('#postCommentBtn').onclick = async () => {
            const input = modal.querySelector('#postCommentInput');
            const text = input.value.trim();
            if(!text) return;
            
            const qqData = JSON.parse(localStorage.getItem('qq_data'));
            const newComment = { author: qqData.user.name, content: text, time: Date.now() };
            
            this.store.update(d => {
                const p = d.posts.find(x => x.id === post.id);
                if(p) p.comments.push(newComment);
            });
            post.comments.push(newComment); // Update local ref
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
            
            // Auto message seller
            this.startChatWithUser(item.seller);
            const data = this.store.get();
            const chat = data.chats.find(c => c.userName === item.seller);
            if(chat) {
                chat.messages.push({sender: 'user', content: `你好，我拍下了你的 ${item.title}`, time: Date.now()});
                this.store.set(data);
                // If chat window is open, refresh it? 
                // Actually startChatWithUser opens it. But we pushed message after opening.
                // Let's re-open or just let user see it next time.
                // Better: close and reopen to refresh
                const existingModal = document.querySelector('.sub-page'); 
                if(existingModal && existingModal.querySelector('.sub-title').innerText === item.seller) {
                    existingModal.remove();
                    this.openChat(chat);
                }
            }
        }
    }
    
    openMarketItem(item) {
        // Similar to openPost but for market item details
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
            // Add Generate Button
            const genBtn = document.createElement('button');
            genBtn.className = 'shop-btn';
            genBtn.style.margin = '10px auto';
            genBtn.style.display = 'block';
            genBtn.innerText = '生成私信';
            genBtn.onclick = () => this.generateChat();
            list.appendChild(genBtn);
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

    async generateChat() {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');
        
        const prompt = `生成一个论坛私信对话。\n返回 JSON: {"userName": "用户名", "message": "第一条消息内容"}`;
        try {
            const res = await window.API.callAI(prompt, apiConfig);
            const json = JSON.parse(res);
            this.startChatWithUser(json.userName);
            const data = this.store.get();
            const chat = data.chats.find(c => c.userName === json.userName);
            chat.messages.push({sender: 'other', content: json.message, time: Date.now()});
            this.store.set(data);
            // Re-open to refresh
            document.querySelector('.sub-page').remove();
            this.openChat(chat);
        } catch(e) { alert('生成失败'); }
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

    async generateActivity() {
        const apiConfig = JSON.parse(localStorage.getItem('apiConfig') || '{}');
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');

        const char = window.System.currentCheckedFriend;
        if(!char) return;

        const btn = document.getElementById('forumGenActivityBtn');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const prompt = `你扮演 ${char.name}。\n人设: ${char.persona}\n请生成一个你在论坛上的活动。\n可以是发布新帖子或回复帖子。\n返回 JSON: {"type": "post/reply", "title": "帖子标题(如果是发帖)", "content": "内容"}`;

        try {
            const res = await window.API.callAI(prompt, apiConfig);
            const activity = JSON.parse(res);
            
            if(activity.type === 'post') {
                this.store.update(d => {
                    d.posts.unshift({
                        id: Date.now(),
                        boardId: 'chat', // Default to chat board
                        title: activity.title,
                        content: activity.content,
                        author: char.name,
                        time: Date.now(),
                        comments: []
                    });
                });
                alert('已发布新帖子');
                if(this.currentTab === 'home' || this.currentTab === 'boards') this.render();
            } else {
                // Reply (Simulated by adding a comment to a random post)
                const data = this.store.get();
                if(data.posts.length > 0) {
                    const randomPost = data.posts[Math.floor(Math.random() * data.posts.length)];
                    this.store.update(d => {
                        const p = d.posts.find(x => x.id === randomPost.id);
                        if(p) {
                            p.comments.push({
                                author: char.name,
                                content: activity.content,
                                time: Date.now()
                            });
                        }
                    });
                    alert(`已回复帖子: ${randomPost.title}`);
                } else {
                    alert('暂无帖子可回复，已自动转为发帖');
                    // Fallback to post
                    this.store.update(d => {
                        d.posts.unshift({
                            id: Date.now(),
                            boardId: 'chat',
                            title: '无题',
                            content: activity.content,
                            author: char.name,
                            time: Date.now(),
                            comments: []
                        });
                    });
                    this.render();
                }
            }
            
            // Sync Activity
            if(Math.random() > 0.5) {
                if(Notification.permission === 'granted') {
                    new Notification(char.name, { body: '在论坛有了新动态' });
                }
            }

        } catch(e) {
            console.error(e);
            alert('生成失败');
        } finally {
            btn.innerHTML = '<i class="fas fa-magic"></i>';
        }
    }
}

window.ForumApp = new ForumApp();
