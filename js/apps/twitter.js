class TwitterStore {
    constructor() { this.init(); }
    init() {
        if(!localStorage.getItem('twitter_data')) {
            const initialData = {
                currentAccountId: 'main',
                accounts: [
                    { id: 'main', name: '我', handle: '@me', avatar: '', bio: 'Hello World', following: 10, followers: 5, verified: false }
                ],
                tweets: [], // {id, accountId, text, time, likes, retweets, replies, isAI, aiName, aiHandle, aiAvatar, images:[], quoteId:null}
                dms: [], // {id, participant: {name, handle, avatar}, messages: [{sender:'me'|'them', text, time}], isFriend: false}
                settings: {
                    worldSetting: '现代社会',
                    npcs: [], // {id, name, handle, avatar, bio}
                    boundRoles: [], // {qqId, twitterHandle}
                    postMemory: 0
                }
            };
            localStorage.setItem('twitter_data', JSON.stringify(initialData));
        }
    }
    get() { return JSON.parse(localStorage.getItem('twitter_data')); }
    set(data) { localStorage.setItem('twitter_data', JSON.stringify(data)); }
    update(fn) { const data = this.get(); fn(data); this.set(data); }
}

class TwitterApp {
    constructor() {
        this.store = new TwitterStore();
        this.currentDmTab = 'friends'; // friends, requests
        this.initUI();
    }

    initUI() {
        // Check Phone Check Mode
        if (window.System && window.System.isPhoneCheckMode) {
            // Add Generate Activity Button
            if(!document.getElementById('tGenActivityBtn')) {
                const btn = document.createElement('div');
                btn.id = 'tGenActivityBtn';
                btn.className = 'ff-fab'; // Reuse fanfic fab style
                btn.style.bottom = '80px';
                btn.style.background = '#1d9bf0';
                btn.innerHTML = '<i class="fas fa-magic"></i>';
                btn.onclick = () => this.generateActivity();
                document.getElementById('twitterApp').appendChild(btn);
            }
        }

        // Inject Drawer HTML
        if(!document.querySelector('.t-drawer')) {
            const drawer = document.createElement('div');
            drawer.className = 't-drawer';
            drawer.id = 'tDrawer';
            drawer.innerHTML = `
                <div class="t-drawer-header">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div class="t-drawer-avatar" id="drawerAvatar"></div>
                        <div class="t-account-switcher-icon" id="btnSwitchAccount"><i class="fas fa-ellipsis-v"></i></div>
                    </div>
                    <div class="t-drawer-name" id="drawerName">Name</div>
                    <div class="t-drawer-handle" id="drawerHandle">@handle</div>
                    <div class="t-drawer-stats">
                        <span><b id="drawerFollowing">0</b> Following</span>
                        <span><b id="drawerFollowers">0</b> Followers</span>
                    </div>
                </div>
                <div class="t-drawer-menu">
                    <div class="t-drawer-item" id="btnProfile"><i class="far fa-user"></i> Profile</div>
                    <div class="t-drawer-item"><i class="fas fa-list"></i> Lists</div>
                    <div class="t-drawer-item"><i class="far fa-bookmark"></i> Bookmarks</div>
                    <div class="t-drawer-item" id="btnSettings"><i class="fas fa-cog"></i> Settings</div>
                </div>
                <div class="t-drawer-footer">
                    <i class="fas fa-lightbulb"></i>
                    <i class="fas fa-qrcode"></i>
                </div>
                
                <!-- Account Switcher Overlay inside Drawer -->
                <div id="tAccountSwitcher" style="display:none; position:absolute; top:60px; right:10px; background:white; border:1px solid #eee; border-radius:10px; box-shadow:0 2px 10px rgba(0,0,0,0.1); width:200px; z-index:10;">
                    <div id="tAccountList" style="max-height:200px; overflow-y:auto;"></div>
                    <div class="t-drawer-item" id="btnAddAccount" style="border-top:1px solid #eee;"><i class="fas fa-plus"></i> Add existing account</div>
                </div>
            `;
            const overlay = document.createElement('div');
            overlay.className = 't-drawer-overlay';
            overlay.id = 'tDrawerOverlay';
            overlay.onclick = () => this.closeDrawer();
            
            document.getElementById('twitterApp').appendChild(overlay);
            document.getElementById('twitterApp').appendChild(drawer);
        }

        // Inject DM Window HTML
        if(!document.getElementById('tDmWindow')) {
            const dmWin = document.createElement('div');
            dmWin.id = 'tDmWindow';
            dmWin.className = 't-dm-window';
            dmWin.innerHTML = `
                <div class="t-dm-header">
                    <div class="t-dm-back" id="closeDmWin"><i class="fas fa-arrow-left"></i></div>
                    <div class="t-dm-header-info">
                        <div class="t-dm-header-name" id="dmHeaderName">Name</div>
                        <div class="t-dm-header-handle" id="dmHeaderHandle">@handle</div>
                    </div>
                    <div class="t-header-icon" id="btnGenDm"><i class="fas fa-magic"></i></div>
                </div>
                <div class="t-dm-messages" id="dmMessages"></div>
                <div class="t-dm-input">
                    <i class="far fa-image" style="color:#1d9bf0;font-size:20px;"></i>
                    <input type="text" id="dmInput" placeholder="Start a message">
                    <div class="t-dm-send" id="dmSendBtn"><i class="fas fa-paper-plane"></i></div>
                </div>
            `;
            document.getElementById('twitterApp').appendChild(dmWin);
            
            document.getElementById('closeDmWin').onclick = () => dmWin.style.display = 'none';
            document.getElementById('btnGenDm').onclick = () => this.generateDMConversation();
            document.getElementById('dmSendBtn').onclick = () => this.sendDM();
            document.getElementById('dmInput').onkeydown = (e) => { if(e.key === 'Enter') this.sendDM(); };
        }

        // Tab Switching
        document.querySelectorAll('.t-nav-item').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.t-nav-item').forEach(el => el.classList.remove('active'));
                document.querySelectorAll('.t-tab-page').forEach(el => el.classList.remove('active'));
                btn.classList.add('active');
                const tabId = btn.dataset.tab;
                document.getElementById(tabId).classList.add('active');
                
                if(tabId === 't-home') this.renderHome();
                if(tabId === 't-search') this.renderSearch();
                if(tabId === 't-messages') this.renderDMs();
            };
        });

        // Header Avatar -> Drawer
        document.getElementById('tAvatarSmall').onclick = () => this.openDrawer();
        
        // Drawer Actions
        document.getElementById('btnProfile').onclick = () => { this.closeDrawer(); this.renderProfile(); };
        document.getElementById('btnSettings').onclick = () => { this.closeDrawer(); this.openSettings(); };
        
        // Account Switcher
        document.getElementById('btnSwitchAccount').onclick = (e) => {
            e.stopPropagation();
            const switcher = document.getElementById('tAccountSwitcher');
            switcher.style.display = switcher.style.display === 'none' ? 'block' : 'none';
            this.renderAccountList();
        };
        document.getElementById('btnAddAccount').onclick = () => this.addAccount();

        // FAB
        document.getElementById('tFab').onclick = () => this.openPostModal();
        
        // Refresh Timeline Button
        if(!document.getElementById('btnRefreshTimeline')) {
            const btn = document.createElement('div');
            btn.id = 'btnRefreshTimeline';
            btn.className = 't-refresh-btn';
            btn.innerHTML = '<i class="fas fa-sync-alt"></i> 刷新时间线 (AI 生成)';
            btn.onclick = () => this.generateTimeline();
            document.getElementById('t-home').insertBefore(btn, document.getElementById('tweetList'));
        }

        // Initial Render
        this.renderHome();
        this.updateHeaderAvatar();
    }

    openDrawer() {
        const data = this.store.get();
        const acc = data.accounts.find(a => a.id === data.currentAccountId);
        
        document.getElementById('drawerName').innerText = acc.name;
        document.getElementById('drawerHandle').innerText = acc.handle;
        document.getElementById('drawerFollowing').innerText = acc.following;
        document.getElementById('drawerFollowers').innerText = acc.followers;
        
        window.db.getImage(acc.avatar).then(url => {
            document.getElementById('drawerAvatar').style.backgroundImage = `url('${url || 'https://picsum.photos/100/100'}')`;
        });

        document.getElementById('tDrawer').classList.add('open');
        document.getElementById('tDrawerOverlay').classList.add('open');
    }

    closeDrawer() {
        document.getElementById('tDrawer').classList.remove('open');
        document.getElementById('tDrawerOverlay').classList.remove('open');
    }

    async updateHeaderAvatar() {
        const data = this.store.get();
        const acc = data.accounts.find(a => a.id === data.currentAccountId);
        let avatar = acc.avatar;
        if(avatar && avatar.startsWith('img_')) avatar = await window.db.getImage(avatar);
        document.getElementById('tAvatarSmall').style.backgroundImage = `url('${avatar || 'https://picsum.photos/50/50'}')`;
    }

    async renderHome() {
        const list = document.getElementById('tweetList');
        list.innerHTML = '';
        const data = this.store.get();
        
        let tweets = [...data.tweets].sort((a, b) => b.time - a.time);

        for(const t of tweets) {
            let account;
            let avatar;

            account = data.accounts.find(a => a.id === t.accountId);
            if (!account && t.isAI) {
                account = { name: t.aiName, handle: t.aiHandle, avatar: t.aiAvatar, verified: false };
            }
            if(!account) continue;
            
            avatar = account.avatar;
            if(avatar && avatar.startsWith('img_')) avatar = await window.db.getImage(avatar);
            else if (!avatar) avatar = window.Utils.generateDefaultAvatar(account.name);

            const div = document.createElement('div');
            div.className = 'tweet-item';
            
            // Process text (hashtags, mentions)
            const processedText = t.text.replace(/([#@]\w+)/g, '<span style="color:#1d9bf0;">$1</span>');

            // Images Grid
            let mediaHtml = '';
            if(t.images && t.images.length > 0) {
                let gridClass = `grid-${Math.min(t.images.length, 4)}`;
                let imgs = '';
                for(let i=0; i<Math.min(t.images.length, 4); i++) {
                    let url = t.images[i];
                    if(url.startsWith('img_')) url = await window.db.getImage(url);
                    imgs += `<img src="${url}">`;
                }
                mediaHtml = `<div class="tweet-media ${gridClass}">${imgs}</div>`;
            }

            // Quote Tweet
            let quoteHtml = '';
            if(t.quoteId) {
                const q = data.tweets.find(x => x.id === t.quoteId);
                if(q) {
                    quoteHtml = `
                        <div class="tweet-quote">
                            <div class="quote-header">
                                <div class="quote-avatar" style="background-image:url('${q.aiAvatar || ''}')"></div>
                                <span class="quote-name">${q.aiName || 'User'}</span>
                                <span class="quote-handle">${q.aiHandle || '@user'}</span>
                            </div>
                            <div class="tweet-text" style="font-size:14px;margin-bottom:0;">${q.text}</div>
                        </div>
                    `;
                }
            }

            div.innerHTML = `
                <div class="tweet-avatar" style="background-image:url('${avatar}')"></div>
                <div class="tweet-content">
                    <div class="tweet-header">
                        <span class="tweet-name">${account.name}</span>
                        ${account.verified ? '<i class="fas fa-certificate" style="color:#1d9bf0; font-size:12px; margin-right:5px;"></i>' : ''}
                        <span class="tweet-handle">${account.handle}</span>
                        <span class="tweet-time">${this.timeSince(t.time)}</span>
                    </div>
                    <div class="tweet-text">${processedText}</div>
                    ${mediaHtml}
                    ${quoteHtml}
                    <div class="tweet-actions">
                        <div class="t-action-btn"><i class="far fa-comment"></i> <span>${t.replies || 0}</span></div>
                        <div class="t-action-btn retweet-btn"><i class="fas fa-retweet"></i> <span>${t.retweets || 0}</span></div>
                        <div class="t-action-btn like-btn"><i class="far fa-heart"></i> <span>${t.likes || 0}</span></div>
                        <div class="t-action-btn"><i class="fas fa-share"></i></div>
                    </div>
                </div>
            `;
            
            div.querySelector('.like-btn').onclick = (e) => {
                e.stopPropagation();
                t.likes = (t.likes || 0) + 1;
                this.store.set(data);
                div.querySelector('.like-btn span').innerText = t.likes;
                div.querySelector('.like-btn').classList.add('liked');
                div.querySelector('.like-btn i').className = 'fas fa-heart';
            };

            list.appendChild(div);
        }
    }

    async generateTimeline() {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');

        const btn = document.getElementById('btnRefreshTimeline');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';

        const settings = this.store.get().settings || {};
        const worldSetting = settings.worldSetting || '现代社会';
        
        // Get Friends for context
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
        const friends = qqData.friends.slice(0, 5); // Take up to 5 friends
        const friendContext = friends.map(f => `${f.name} (人设:${f.persona})`).join('; ');

        const prompt = `基于世界观"${worldSetting}"，生成 3-5 条推特推文。
        要求：
        1. 极度拟人化：使用口语、缩写、网络梗、Emoji、情绪发泄、日常琐事。严禁 AI 味。
        2. 包含不同类型：纯文字、带图（提供图片描述）、引用推文（模拟）。
        3. 角色来源：可以是路人，也可以是以下好友：${friendContext}。
        4. 互动数据：生成真实的浏览量(views)、点赞(likes)、转发(retweets)、评论(replies)数量。
        5. 返回 JSON 数组：
        [
            {
                "name": "用户名", "handle": "@handle", "text": "推文内容", 
                "imagePrompt": "图片描述(可选)", 
                "isQuote": false,
                "stats": {"views": 1000, "likes": 10, "retweets": 5, "replies": 2}
            }
        ]`;

        try {
            const res = await window.API.callAI(prompt, apiConfig);
            let tweets = [];
            try {
                tweets = JSON.parse(res);
            } catch(e) {
                // Try to extract JSON from text
                const match = res.match(/\[[\s\S]*\]/);
                if(match) tweets = JSON.parse(match[0]);
            }
            
            if(Array.isArray(tweets)) {
                const newTweets = [];
                for(const t of tweets) {
                    let images = [];
                    if(t.imagePrompt && apiConfig.imageApiKey) {
                        try {
                            const imgBase64 = await window.API.generateImage(t.imagePrompt, apiConfig);
                            const imgId = await window.db.saveImage(imgBase64);
                            images.push(imgId);
                        } catch(e) { console.error('Image gen failed', e); }
                    }
                    
                    // Check if it's a friend
                    let avatar = window.Utils.generateDefaultAvatar(t.name);
                    const friend = friends.find(f => f.name === t.name);
                    if(friend) avatar = friend.avatar;

                    newTweets.push({
                        id: window.Utils.generateId('tweet'),
                        accountId: 'ai_generated',
                        isAI: true,
                        aiName: t.name,
                        aiHandle: t.handle,
                        aiAvatar: avatar,
                        text: t.text,
                        time: Date.now(),
                        likes: t.stats?.likes || Math.floor(Math.random() * 500),
                        retweets: t.stats?.retweets || Math.floor(Math.random() * 100),
                        replies: t.stats?.replies || Math.floor(Math.random() * 50),
                        views: t.stats?.views || Math.floor(Math.random() * 5000),
                        images: images,
                        quoteId: null
                    });
                }

                this.store.update(d => d.tweets.push(...newTweets));
                this.renderHome();
            }
        } catch(e) {
            console.error(e);
            alert('生成失败');
        } finally {
            btn.innerHTML = '<i class="fas fa-sync-alt"></i> 刷新时间线 (AI 生成)';
        }
    }

    async renderSearch() {
        const container = document.getElementById('t-search');
        container.innerHTML = `
            <div class="t-search-header">
                <input type="text" class="t-search-input" placeholder="搜索 X">
            </div>
            <div class="t-trends-list" id="tTrendsList"></div>
        `;
        
        const list = document.getElementById('tTrendsList');
        
        // Mock Trends
        const trends = [
            { rank: 1, topic: 'AI手机', posts: '1.2M' },
            { rank: 2, topic: '今天吃什么', posts: '500K' },
            { rank: 3, topic: '猫咪', posts: '300K' },
            { rank: 4, topic: '周五', posts: '200K' },
            { rank: 5, topic: '新游戏发售', posts: '150K' }
        ];
        
        trends.forEach(t => {
            const div = document.createElement('div');
            div.className = 't-trend-item';
            div.style.cssText = 'padding:15px; border-bottom:1px solid #eff3f4; cursor:pointer;';
            div.innerHTML = `
                <div style="font-size:12px; color:#536471;">${t.rank} · Trending</div>
                <div style="font-weight:bold; margin:2px 0;">#${t.topic}</div>
                <div style="font-size:12px; color:#536471;">${t.posts} posts</div>
            `;
            list.appendChild(div);
        });
    }

    async renderDMs() {
        const list = document.getElementById('dmList');
        list.innerHTML = '';
        const data = this.store.get();
        
        // Tabs for DMs
        const tabs = document.createElement('div');
        tabs.style.cssText = 'display:flex; border-bottom:1px solid #eff3f4;';
        tabs.innerHTML = `
            <div class="t-dm-tab ${this.currentDmTab==='friends'?'active':''}" style="flex:1; text-align:center; padding:15px; cursor:pointer; font-weight:bold; border-bottom:${this.currentDmTab==='friends'?'3px solid #1d9bf0':'none'};" onclick="window.TwitterApp.switchDmTab('friends')">消息</div>
            <div class="t-dm-tab ${this.currentDmTab==='requests'?'active':''}" style="flex:1; text-align:center; padding:15px; cursor:pointer; font-weight:bold; border-bottom:${this.currentDmTab==='requests'?'3px solid #1d9bf0':'none'};" onclick="window.TwitterApp.switchDmTab('requests')">请求</div>
        `;
        list.appendChild(tabs);
        
        // Add "New Message" button
        const newBtn = document.createElement('div');
        newBtn.style.cssText = 'padding:15px; text-align:center; color:#1d9bf0; cursor:pointer; font-weight:bold; border-bottom:1px solid #eff3f4;';
        newBtn.innerHTML = '<i class="fas fa-plus"></i> 新私信 (创建 NPC)';
        newBtn.onclick = () => this.createNPC();
        list.appendChild(newBtn);

        const dms = data.dms.filter(d => this.currentDmTab === 'friends' ? d.isFriend !== false : d.isFriend === false);

        if(dms.length === 0) {
            list.innerHTML += '<div style="padding:20px; text-align:center; color:#536471;">暂无私信</div>';
            return;
        }

        for(const dm of dms) {
            const div = document.createElement('div');
            div.className = 't-dm-item';
            
            let avatar = dm.participant.avatar;
            if(avatar && avatar.startsWith('img_')) avatar = await window.db.getImage(avatar);
            else avatar = window.Utils.generateDefaultAvatar(dm.participant.name);

            const lastMsg = dm.messages[dm.messages.length-1];

            div.innerHTML = `
                <div class="t-dm-avatar" style="background-image:url('${avatar}')"></div>
                <div class="t-dm-content">
                    <div class="t-dm-top">
                        <span class="t-dm-name">${dm.participant.name}</span>
                        <span class="t-dm-date">${lastMsg ? this.timeSince(lastMsg.time) : ''}</span>
                    </div>
                    <div class="t-dm-msg">${lastMsg ? lastMsg.text : '开始对话'}</div>
                </div>
            `;
            
            div.onclick = () => this.openDMWindow(dm.id);
            list.appendChild(div);
        }
    }
    
    switchDmTab(tab) {
        this.currentDmTab = tab;
        this.renderDMs();
    }

    createNPC() {
        const name = prompt('NPC 名称:');
        const handle = prompt('NPC Handle (@...):');
        if(name && handle) {
            const id = window.Utils.generateId('dm');
            this.store.update(d => {
                d.dms.push({
                    id: id,
                    participant: { name, handle, avatar: '' },
                    messages: [],
                    isFriend: true // Default to friend
                });
            });
            this.renderDMs();
        }
    }

    async openDMWindow(dmId) {
        const data = this.store.get();
        const dm = data.dms.find(d => d.id === dmId);
        if(!dm) return;

        this.currentDmId = dmId;
        const win = document.getElementById('tDmWindow');
        document.getElementById('dmHeaderName').innerText = dm.participant.name;
        document.getElementById('dmHeaderHandle').innerText = dm.participant.handle;
        
        this.renderDMMessages();
        win.style.display = 'flex';
    }

    renderDMMessages() {
        const data = this.store.get();
        const dm = data.dms.find(d => d.id === this.currentDmId);
        const list = document.getElementById('dmMessages');
        list.innerHTML = '';
        
        dm.messages.forEach(m => {
            const div = document.createElement('div');
            div.className = `t-msg-bubble ${m.sender === 'me' ? 'sent' : 'received'}`;
            div.innerText = m.text;
            list.appendChild(div);
        });
        list.scrollTop = list.scrollHeight;
    }

    sendDM() {
        const input = document.getElementById('dmInput');
        const text = input.value.trim();
        if(!text) return;
        
        this.store.update(d => {
            const dm = d.dms.find(x => x.id === this.currentDmId);
            dm.messages.push({ sender: 'me', text, time: Date.now() });
        });
        input.value = '';
        this.renderDMMessages();
    }

    async generateDMConversation() {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');

        const data = this.store.get();
        const dm = data.dms.find(d => d.id === this.currentDmId);
        
        const prompt = `你扮演 ${dm.participant.name} (${dm.participant.handle})。\n请生成一段你和用户的私信对话。\n要求：口语化、真实、符合人设。\n返回 JSON 数组: [{"sender": "them", "text": "内容"}, {"sender": "me", "text": "内容"}]`;
        
        try {
            const res = await window.API.callAI(prompt, apiConfig);
            const msgs = JSON.parse(res);
            if(Array.isArray(msgs)) {
                this.store.update(d => {
                    const target = d.dms.find(x => x.id === this.currentDmId);
                    msgs.forEach(m => target.messages.push({ ...m, time: Date.now() }));
                });
                this.renderDMMessages();
            }
        } catch(e) { console.error(e); }
    }

    timeSince(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m";
        return Math.floor(seconds) + "s";
    }
    
    openPostModal() {
        // Check if we want to start a live stream
        if(confirm('发布推文 (确定) 还是 开启直播 (取消)?')) {
            document.getElementById('tPostModal').style.display = 'flex';
        } else {
            this.startLive();
        }
    }
    
    startLive() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.style.background = '#000';
        modal.innerHTML = `
            <div style="width:100%;height:100%;display:flex;flex-direction:column;color:white;">
                <div style="padding:20px;display:flex;justify-content:space-between;">
                    <span style="background:red;padding:2px 5px;border-radius:3px;">LIVE</span>
                    <i class="fas fa-times" style="cursor:pointer;" onclick="this.closest('.modal').remove()"></i>
                </div>
                <div style="flex:1;display:flex;justify-content:center;align-items:center;flex-direction:column;">
                    <div style="width:100px;height:100px;background:#333;border-radius:50%;margin-bottom:20px;display:flex;justify-content:center;align-items:center;">
                        <i class="fas fa-microphone" style="font-size:40px;"></i>
                    </div>
                    <h3>正在直播中...</h3>
                    <p style="color:#999;">0 观众</p>
                </div>
                <div style="padding:20px;">
                    <input placeholder="说点什么..." style="width:100%;padding:10px;border-radius:20px;border:none;background:#333;color:white;">
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    openSettings() {
        // Create Settings Page if not exists
        if(!document.getElementById('tSettingsPage')) {
            const page = document.createElement('div');
            page.id = 'tSettingsPage';
            page.className = 'sub-page';
            page.style.display = 'none';
            page.innerHTML = `
                <div class="sub-header">
                    <button class="back-btn" onclick="document.getElementById('tSettingsPage').style.display='none'"><i class="fas fa-arrow-left"></i></button>
                    <span class="sub-title">Settings</span>
                </div>
                <div class="sub-content form-content">
                    <div class="form-group">
                        <label>世界观设定</label>
                        <textarea id="tWorldSetting" placeholder="例如：现代社会，每个人都有超能力..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>帖子记忆 (条数)</label>
                        <input type="number" id="tPostMemory" value="0">
                        <span style="font-size:12px;color:#999;">>0 时，粉丝评论会记得之前的帖子内容</span>
                    </div>
                    <div class="sub-section">
                        <label>NPC 管理</label>
                        <div id="tNpcList"></div>
                        <button class="action-btn secondary" id="tAddNpcBtn">创建 NPC</button>
                    </div>
                    <div class="sub-section">
                        <label>角色绑定 (QQ好友)</label>
                        <div id="tBindList"></div>
                        <button class="action-btn secondary" id="tAddBindBtn">绑定角色</button>
                    </div>
                    <button class="action-btn" id="tSaveSettings">保存</button>
                </div>
            `;
            document.getElementById('twitterApp').appendChild(page);
            
            document.getElementById('tAddNpcBtn').onclick = () => this.createNPC();
            document.getElementById('tAddBindBtn').onclick = () => this.bindRole();
            document.getElementById('tSaveSettings').onclick = () => {
                this.store.update(d => {
                    d.settings.worldSetting = document.getElementById('tWorldSetting').value;
                    d.settings.postMemory = parseInt(document.getElementById('tPostMemory').value);
                });
                alert('设置已保存');
                document.getElementById('tSettingsPage').style.display = 'none';
            };
        }
        
        const settings = this.store.get().settings;
        document.getElementById('tWorldSetting').value = settings.worldSetting || '现代社会';
        document.getElementById('tPostMemory').value = settings.postMemory || 0;
        this.renderNpcList();
        this.renderBindList();
        
        document.getElementById('tSettingsPage').style.display = 'flex';
    }

    renderAccountList() {
        const list = document.getElementById('tAccountList');
        list.innerHTML = '';
        const data = this.store.get();
        
        data.accounts.forEach(acc => {
            const div = document.createElement('div');
            div.style.cssText = 'padding:10px; display:flex; align-items:center; cursor:pointer; hover:bg-gray-100;';
            if(acc.id === data.currentAccountId) div.style.background = '#f7f9f9';
            
            // Async avatar load
            window.db.getImage(acc.avatar).then(url => {
                div.innerHTML = `
                    <div style="width:30px; height:30px; border-radius:50%; background:url('${url || 'https://picsum.photos/30/30'}') center/cover; margin-right:10px;"></div>
                    <div style="flex:1;">
                        <div style="font-weight:bold; font-size:14px;">${acc.name}</div>
                        <div style="color:#536471; font-size:12px;">${acc.handle}</div>
                    </div>
                    ${acc.id === data.currentAccountId ? '<i class="fas fa-check" style="color:#1d9bf0;"></i>' : ''}
                `;
            });
            
            div.onclick = () => {
                this.store.update(d => d.currentAccountId = acc.id);
                this.updateHeaderAvatar();
                this.renderHome();
                this.closeDrawer();
                document.getElementById('tAccountSwitcher').style.display = 'none';
            };
            list.appendChild(div);
        });
    }

    addAccount() {
        const name = prompt('Account Name:');
        const handle = prompt('Handle (@...):');
        if(name && handle) {
            const id = window.Utils.generateId('acc');
            this.store.update(d => {
                d.accounts.push({
                    id, name, handle, avatar: '', bio: '', following: 0, followers: 0, verified: false
                });
                d.currentAccountId = id;
            });
            this.updateHeaderAvatar();
            this.renderHome();
            this.closeDrawer();
        }
    }

    renderNpcList() {
        const list = document.getElementById('tNpcList');
        list.innerHTML = '';
        const npcs = this.store.get().settings.npcs || [];
        npcs.forEach(npc => {
            const div = document.createElement('div');
            div.innerHTML = `${npc.name} (${npc.handle}) <button onclick="window.TwitterApp.deleteNpc('${npc.id}')">x</button>`;
            list.appendChild(div);
        });
    }

    deleteNpc(id) {
        this.store.update(d => d.settings.npcs = d.settings.npcs.filter(n => n.id !== id));
        this.renderNpcList();
    }

    renderBindList() {
        const list = document.getElementById('tBindList');
        list.innerHTML = '';
        const bounds = this.store.get().settings.boundRoles || [];
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}');
        
        bounds.forEach(b => {
            const friend = qqData.friends.find(f => f.id === b.qqId);
            const name = friend ? friend.name : 'Unknown';
            const div = document.createElement('div');
            div.innerHTML = `${name} <-> ${b.twitterHandle} <button onclick="window.TwitterApp.deleteBind('${b.qqId}')">x</button>`;
            list.appendChild(div);
        });
    }

    bindRole() {
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}');
        if(qqData.friends.length === 0) return alert('No QQ friends to bind');
        
        const names = qqData.friends.map((f, i) => `${i+1}. ${f.name}`).join('\n');
        const choice = prompt(`Select QQ Friend:\n${names}`);
        const idx = parseInt(choice) - 1;
        
        if(idx >= 0 && idx < qqData.friends.length) {
            const friend = qqData.friends[idx];
            const handle = prompt('Enter Twitter Handle (e.g. @ai_waifu):');
            if(handle) {
                this.store.update(d => {
                    if(!d.settings.boundRoles) d.settings.boundRoles = [];
                    d.settings.boundRoles.push({qqId: friend.id, twitterHandle: handle});
                });
                this.renderBindList();
            }
        }
    }

    deleteBind(qqId) {
        this.store.update(d => d.settings.boundRoles = d.settings.boundRoles.filter(b => b.qqId !== qqId));
        this.renderBindList();
    }

    async generateActivity() {
        const apiConfig = JSON.parse(localStorage.getItem('apiConfig') || '{}');
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');

        const char = window.System.currentCheckedFriend;
        if(!char) return;

        const btn = document.getElementById('tGenActivityBtn');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const prompt = `你扮演 ${char.name}。\n人设: ${char.persona}\n请生成一条你在 Twitter (X) 上的推文。\n要求：极度拟人化，符合人设，可以是日常吐槽、分享生活或回复他人。\n返回 JSON: {"text": "推文内容", "imagePrompt": "图片描述(可选)"}`;

        try {
            const res = await window.API.callAI(prompt, apiConfig);
            const tweet = JSON.parse(res);
            
            let images = [];
            if(tweet.imagePrompt && apiConfig.imageApiKey) {
                try {
                    const imgBase64 = await window.API.generateImage(tweet.imagePrompt, apiConfig);
                    const imgId = await window.db.saveImage(imgBase64);
                    images.push(imgId);
                } catch(e) { console.error('Image gen failed', e); }
            }

            this.store.update(d => {
                // In Phone Check Mode, we are "me" (the character)
                // But we need to make sure the account exists or use a mock one
                // Let's assume the main account is the character in this context
                d.tweets.push({
                    id: window.Utils.generateId('tweet'),
                    accountId: d.currentAccountId, // The character's account
                    text: tweet.text,
                    time: Date.now(),
                    likes: 0,
                    retweets: 0,
                    replies: 0,
                    images: images,
                    quoteId: null
                });
            });
            
            this.renderHome();
            alert('已发布新推文');
            
            // Sync Activity
            if(Math.random() > 0.5) {
                if(Notification.permission === 'granted') {
                    new Notification(char.name, { body: '发布了一条新推文' });
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

window.TwitterApp = new TwitterApp();
