class TwitterStore {
    constructor() { this.init(); }
    init() {
        if(!localStorage.getItem('twitter_data')) {
            const initialData = {
                currentAccountId: 'main',
                accounts: [
                    { id: 'main', name: '我', handle: '@me', avatar: '', bio: 'Hello World', following: 10, followers: 5, verified: false }
                ],
                tweets: [], // {id, accountId, text, time, likes, retweets, replies, isAI, aiName, aiHandle, aiAvatar}
                dms: [], // {id, participants:[], messages:[]}
                settings: {
                    worldSetting: '现代社会',
                    npcs: [], // {id, name, handle, avatar, bio}
                    boundRoles: [], // {qqId, twitterHandle}
                    postMemory: 0 // 0: off, >0: number of posts to remember
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
        this.initUI();
    }

    initUI() {
        // Tab Switching
        document.querySelectorAll('.t-nav-item').forEach(btn => {
            btn.onclick = () => {
                if(btn.id === 'tProfileLink') return; // Handled separately
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

        // FAB
        document.getElementById('tFab').onclick = () => this.openPostModal();
        
        // Account Switcher
        document.getElementById('tAvatarSmall').onclick = (e) => {
            e.stopPropagation();
            const switcher = document.getElementById('accountSwitcher');
            if(switcher.style.display === 'block') switcher.style.display = 'none';
            else {
                this.renderAccountSwitcher();
                switcher.style.display = 'block';
            }
        };
        document.addEventListener('click', () => document.getElementById('accountSwitcher').style.display = 'none');

        // Settings
        const settingsBtn = document.querySelector('.t-header-icon');
        if(settingsBtn) settingsBtn.onclick = () => this.openSettings();

        // Profile
        document.getElementById('tProfileLink').onclick = () => this.renderProfile();
        document.getElementById('closeTProfile').onclick = () => document.getElementById('tProfilePage').style.display = 'none';

        // Post Modal
        document.getElementById('closeTPost').onclick = () => document.getElementById('tPostModal').style.display = 'none';
        document.getElementById('doTPost').onclick = () => this.postTweet();

        // Tweet Detail Page (Dynamic creation)
        if(!document.getElementById('tDetailPage')) {
            const detailPage = document.createElement('div');
            detailPage.id = 'tDetailPage';
            detailPage.className = 'sub-page';
            detailPage.style.display = 'none';
            detailPage.style.zIndex = '40';
            detailPage.innerHTML = `
                <div class="sub-header">
                    <button class="back-btn" onclick="document.getElementById('tDetailPage').style.display='none'"><i class="fas fa-arrow-left"></i></button>
                    <span class="sub-title">推文</span>
                    <div style="width:40px;"></div>
                </div>
                <div class="sub-content tweet-detail" id="tDetailContent"></div>
            `;
            document.getElementById('twitterApp').appendChild(detailPage);
        }

        // Settings Page (Dynamic)
        if(!document.getElementById('tSettingsPage')) {
            const settingsPage = document.createElement('div');
            settingsPage.id = 'tSettingsPage';
            settingsPage.className = 'sub-page';
            settingsPage.style.display = 'none';
            settingsPage.style.zIndex = '50';
            settingsPage.innerHTML = `
                <div class="sub-header">
                    <button class="back-btn" onclick="document.getElementById('tSettingsPage').style.display='none'"><i class="fas fa-arrow-left"></i></button>
                    <span class="sub-title">设置</span>
                    <div style="width:40px;"></div>
                </div>
                <div class="sub-content form-content" id="tSettingsContent"></div>
            `;
            document.getElementById('twitterApp').appendChild(settingsPage);
        }

        // Initial Render
        this.renderHome();
        this.updateHeaderAvatar();
    }

    getCurrentAccount() {
        const data = this.store.get();
        return data.accounts.find(a => a.id === data.currentAccountId);
    }

    async updateHeaderAvatar() {
        const account = this.getCurrentAccount();
        let avatar = account.avatar;
        if(avatar && avatar.startsWith('img_')) avatar = await window.db.getImage(avatar);
        document.getElementById('tAvatarSmall').style.backgroundImage = `url('${avatar || 'https://picsum.photos/50/50'}')`;
    }

    renderAccountSwitcher() {
        const list = document.getElementById('accountList');
        list.innerHTML = '';
        const data = this.store.get();
        
        data.accounts.forEach(async acc => {
            const div = document.createElement('div');
            div.className = `account-item ${acc.id === data.currentAccountId ? 'active' : ''}`;
            
            let avatar = acc.avatar;
            if(avatar && avatar.startsWith('img_')) avatar = await window.db.getImage(avatar);
            
            div.innerHTML = `
                <div class="t-avatar-small" style="background-image:url('${avatar || 'https://picsum.photos/50/50'}'); margin-right:10px;"></div>
                <div style="display:flex; flex-direction:column;">
                    <span style="font-weight:bold;">${acc.name}</span>
                    <span style="font-size:12px; color:#536471;">${acc.handle}</span>
                </div>
                ${acc.id === data.currentAccountId ? '<i class="fas fa-check"></i>' : ''}
            `;
            div.onclick = () => {
                this.store.update(d => d.currentAccountId = acc.id);
                this.updateHeaderAvatar();
                this.renderHome();
            };
            list.appendChild(div);
        });

        const addBtn = document.createElement('div');
        addBtn.className = 'account-item';
        addBtn.innerHTML = '<i class="fas fa-plus" style="margin:0 10px 0 5px;"></i> <span>创建新账号</span>';
        addBtn.onclick = () => this.createNewAccount();
        list.appendChild(addBtn);
    }

    createNewAccount() {
        const name = prompt('输入新账号名称:');
        if(!name) return;
        const handle = prompt('输入 Handle (例如 @user):');
        if(!handle) return;
        
        this.store.update(d => {
            d.accounts.push({
                id: window.Utils.generateId('acc'),
                name,
                handle,
                avatar: '',
                bio: '',
                following: 0,
                followers: 0,
                verified: false
            });
        });
        alert('账号创建成功');
    }

    openSettings() {
        const page = document.getElementById('tSettingsPage');
        const content = document.getElementById('tSettingsContent');
        page.style.display = 'flex';
        
        const settings = this.store.get().settings || {};
        
        content.innerHTML = `
            <div class="form-group"><label>世界观设定</label><textarea id="tWorldSetting">${settings.worldSetting || ''}</textarea></div>
            <div class="form-group"><label>帖子记忆 (条数)</label><input type="number" id="tPostMemory" value="${settings.postMemory || 0}"></div>
            
            <div class="sub-section">
                <label>NPC 管理</label>
                <button class="action-btn secondary" id="tCreateNPC">创建 NPC</button>
                <div id="tNPCList" style="margin-top:10px;"></div>
            </div>

            <div class="sub-section">
                <label>角色绑定 (QQ好友)</label>
                <div id="tBindList"></div>
            </div>

            <button class="action-btn" id="tSaveSettings">保存设置</button>
        `;

        // Render NPCs
        const renderNPCs = () => {
            const list = document.getElementById('tNPCList');
            list.innerHTML = '';
            (this.store.get().settings.npcs || []).forEach((npc, idx) => {
                const div = document.createElement('div');
                div.style.cssText = 'padding:5px; border:1px solid #eee; margin-bottom:5px; display:flex; justify-content:space-between;';
                div.innerHTML = `<span>${npc.name} (${npc.handle})</span> <span style="color:red;cursor:pointer;" onclick="window.TwitterApp.deleteNPC(${idx})">删除</span>`;
                list.appendChild(div);
            });
        };
        renderNPCs();

        // Render Bindings
        const renderBindings = () => {
            const list = document.getElementById('tBindList');
            list.innerHTML = '';
            const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
            const boundRoles = this.store.get().settings.boundRoles || [];
            
            qqData.friends.forEach(f => {
                const isBound = boundRoles.includes(f.id);
                const div = document.createElement('div');
                div.style.cssText = 'padding:5px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #eee;';
                div.innerHTML = `<span>${f.name}</span> <input type="checkbox" ${isBound ? 'checked' : ''} data-id="${f.id}">`;
                list.appendChild(div);
            });
        };
        renderBindings();

        document.getElementById('tCreateNPC').onclick = () => {
            const name = prompt('NPC 名称:');
            const handle = prompt('NPC Handle (@...):');
            if(name && handle) {
                this.store.update(d => {
                    if(!d.settings.npcs) d.settings.npcs = [];
                    d.settings.npcs.push({id: window.Utils.generateId('npc'), name, handle, avatar: '', bio: ''});
                });
                renderNPCs();
            }
        };

        document.getElementById('tSaveSettings').onclick = () => {
            const worldSetting = document.getElementById('tWorldSetting').value;
            const postMemory = parseInt(document.getElementById('tPostMemory').value);
            const boundCheckboxes = document.querySelectorAll('#tBindList input[type="checkbox"]:checked');
            const boundRoles = Array.from(boundCheckboxes).map(cb => cb.dataset.id);

            this.store.update(d => {
                d.settings.worldSetting = worldSetting;
                d.settings.postMemory = postMemory;
                d.settings.boundRoles = boundRoles;
            });
            alert('设置已保存');
            page.style.display = 'none';
        };
    }

    deleteNPC(idx) {
        this.store.update(d => d.settings.npcs.splice(idx, 1));
        this.openSettings(); // Refresh
    }

    async renderHome() {
        const list = document.getElementById('tweetList');
        list.innerHTML = '';
        const data = this.store.get();
        
        let tweets = [...data.tweets].sort((a, b) => b.time - a.time);

        // AI Recommendation Injection
        if (tweets.length < 5) {
            await this.generateRecommendedTweets();
            tweets = [...this.store.get().tweets].sort((a, b) => b.time - a.time);
        }

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
            
            const processedText = t.text.replace(/#(\w+)/g, '<span class="hashtag" style="color:#1d9bf0;cursor:pointer;">#$1</span>');

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
                    <div class="tweet-actions">
                        <div class="t-action-btn"><i class="far fa-comment"></i> <span>${t.replies || 0}</span></div>
                        <div class="t-action-btn retweet-btn"><i class="fas fa-retweet"></i> <span>${t.retweets || 0}</span></div>
                        <div class="t-action-btn like-btn"><i class="far fa-heart"></i> <span>${t.likes || 0}</span></div>
                        <div class="t-action-btn"><i class="fas fa-share"></i></div>
                    </div>
                </div>
            `;
            
            div.onclick = () => this.renderTweetDetail(t, account, avatar);

            div.querySelectorAll('.hashtag').forEach(el => {
                el.onclick = (e) => {
                    e.stopPropagation();
                    document.querySelector('.t-search-input').value = el.innerText;
                    document.querySelector('[data-tab="t-search"]').click();
                };
            });

            div.querySelector('.like-btn').onclick = (e) => {
                e.stopPropagation();
                t.likes = (t.likes || 0) + 1;
                this.store.set(data);
                this.renderHome();
            };

            div.querySelector('.retweet-btn').onclick = (e) => {
                e.stopPropagation();
                this.retweet(t);
            };

            list.appendChild(div);
        }
    }

    async renderTweetDetail(t, account, avatar) {
        const page = document.getElementById('tDetailPage');
        const content = document.getElementById('tDetailContent');
        page.style.display = 'flex';
        
        const processedText = t.text.replace(/#(\w+)/g, '<span class="hashtag" style="color:#1d9bf0;">#$1</span>');

        content.innerHTML = `
            <div class="td-header">
                <div class="td-avatar" style="background-image:url('${avatar}')"></div>
                <div class="td-user-info">
                    <span class="td-name">${account.name}</span>
                    <span class="td-handle">${account.handle}</span>
                </div>
            </div>
            <div class="td-text">${processedText}</div>
            <div class="td-meta">${new Date(t.time).toLocaleString()} · Twitter for iPhone</div>
            <div class="td-stats">
                <div class="td-stat-item"><span>${t.retweets || 0}</span> 转推</div>
                <div class="td-stat-item"><span>${t.likes || 0}</span> 喜欢</div>
            </div>
            <div class="td-actions">
                <i class="far fa-comment"></i>
                <i class="fas fa-retweet"></i>
                <i class="far fa-heart"></i>
                <i class="fas fa-share"></i>
            </div>
            <div style="padding:15px 0; border-bottom:1px solid #eff3f4; font-weight:bold;">评论</div>
            <div id="tdComments">
                <div style="text-align:center; padding:20px; color:#999;">加载评论中...</div>
            </div>
        `;

        // Generate AI Comments with Memory
        const apiConfig = JSON.parse(localStorage.getItem('apiConfig') || '{}');
        if(apiConfig.chatApiKey) {
            const settings = this.store.get().settings || {};
            let memoryContext = '';
            
            if(settings.postMemory > 0) {
                const pastTweets = this.store.get().tweets
                    .filter(pt => pt.accountId === t.accountId && pt.id !== t.id)
                    .slice(-settings.postMemory)
                    .map(pt => pt.text)
                    .join('; ');
                if(pastTweets) memoryContext = `\n用户过往推文参考: ${pastTweets}`;
            }

            const prompt = `为这条推文生成 3 条评论。推文内容: "${t.text}"。${memoryContext}\n返回 JSON 数组: [{"name": "user", "handle": "@user", "text": "comment"}]`;
            try {
                const res = await window.QQApp.callAI(prompt, apiConfig);
                const comments = JSON.parse(res);
                const commentsDiv = document.getElementById('tdComments');
                commentsDiv.innerHTML = '';
                comments.forEach(c => {
                    const div = document.createElement('div');
                    div.className = 'tweet-item';
                    div.innerHTML = `
                        <div class="tweet-avatar" style="background-image:url('https://picsum.photos/50/50?random=${Math.random()}')"></div>
                        <div class="tweet-content">
                            <div class="tweet-header">
                                <span class="tweet-name">${c.name}</span>
                                <span class="tweet-handle">${c.handle}</span>
                            </div>
                            <div class="tweet-text">${c.text}</div>
                        </div>
                    `;
                    commentsDiv.appendChild(div);
                });
            } catch(e) {
                console.error(e);
            }
        }
    }

    async generateRecommendedTweets() {
        const apiConfig = JSON.parse(localStorage.getItem('apiConfig') || '{}');
        if(!apiConfig.chatApiKey) return;

        const settings = this.store.get().settings || {};
        const worldSetting = settings.worldSetting || '现代社会';

        const prompt = `基于世界观"${worldSetting}"，生成 2 条推特推文。内容随机（科技、生活、搞笑）。
        返回 JSON 数组: [{"name": "用户名", "handle": "@handle", "text": "内容", "avatar": "https://picsum.photos/50/50?random=1"}]`;
        
        try {
            const res = await window.QQApp.callAI(prompt, apiConfig);
            const tweets = JSON.parse(res);
            if(Array.isArray(tweets)) {
                this.store.update(d => {
                    tweets.forEach(t => {
                        d.tweets.push({
                            id: window.Utils.generateId('tweet'),
                            accountId: 'ai_generated',
                            isAI: true,
                            aiName: t.name,
                            aiHandle: t.handle,
                            aiAvatar: t.avatar,
                            text: t.text,
                            time: Date.now(),
                            likes: Math.floor(Math.random() * 100),
                            retweets: Math.floor(Math.random() * 20),
                            replies: Math.floor(Math.random() * 10)
                        });
                    });
                });
            }
        } catch(e) { console.error(e); }
    }

    retweet(originalTweet) {
        const currentId = this.store.get().currentAccountId;
        this.store.update(d => {
            d.tweets.push({
                id: window.Utils.generateId('tweet'),
                accountId: currentId,
                text: `RT @${originalTweet.aiHandle || 'user'}: ${originalTweet.text}`,
                time: Date.now(),
                likes: 0,
                retweets: 0,
                replies: 0
            });
            // Update original tweet count
            const ot = d.tweets.find(t => t.id === originalTweet.id);
            if(ot) ot.retweets = (ot.retweets || 0) + 1;
        });
        this.renderHome();
    }

    openPostModal() {
        const modal = document.getElementById('tPostModal');
        modal.style.display = 'flex';
        document.getElementById('tPostInput').focus();
        
        // Add Live Button if not exists
        if(!document.getElementById('btnLive')) {
            const btnLive = document.createElement('button');
            btnLive.id = 'btnLive';
            btnLive.className = 'action-btn secondary';
            btnLive.style.cssText = 'position:absolute; bottom:15px; left:15px; width:auto; padding:5px 15px; font-size:12px;';
            btnLive.innerHTML = '<i class="fas fa-video"></i> 直播';
            btnLive.onclick = () => this.startLive();
            modal.querySelector('.sub-header').after(btnLive); // Insert somewhere appropriate or just append to modal content
            // Actually better to put it in the modal content area
            const content = modal.querySelector('div[style*="padding:15px;"]');
            content.appendChild(btnLive);
        }
    }

    startLive() {
        const type = confirm('开启语音直播吗？(取消则为视频直播)') ? '语音直播' : '视频直播';
        alert(`正在开启 ${type}... (模拟)`);
        document.getElementById('tPostModal').style.display = 'none';
        
        // Create a live tweet
        const currentId = this.store.get().currentAccountId;
        this.store.update(d => {
            d.tweets.push({
                id: window.Utils.generateId('tweet'),
                accountId: currentId,
                text: `🔴 正在 ${type}，快来围观！`,
                time: Date.now(),
                likes: 0,
                retweets: 0,
                replies: 0
            });
        });
        this.renderHome();
    }

    postTweet() {
        const text = document.getElementById('tPostInput').value.trim();
        if(!text) return;
        
        const currentId = this.store.get().currentAccountId;
        this.store.update(d => {
            d.tweets.push({
                id: window.Utils.generateId('tweet'),
                accountId: currentId,
                text,
                time: Date.now(),
                likes: 0,
                retweets: 0,
                replies: 0
            });
        });
        
        document.getElementById('tPostInput').value = '';
        document.getElementById('tPostModal').style.display = 'none';
        this.renderHome();
    }

    async renderProfile() {
        const page = document.getElementById('tProfilePage');
        page.style.display = 'block';
        const account = this.getCurrentAccount();
        
        let avatar = account.avatar;
        if(avatar && avatar.startsWith('img_')) avatar = await window.db.getImage(avatar);
        
        document.getElementById('tpAvatar').style.backgroundImage = `url('${avatar || 'https://picsum.photos/100/100'}')`;
        document.getElementById('tpName').innerText = account.name;
        document.getElementById('tpHandle').innerText = account.handle;
        document.getElementById('tpBio').innerText = account.bio;
        document.getElementById('tpFollowing').innerText = account.following;
        document.getElementById('tpFollowers').innerText = account.followers;

        // Edit Profile Logic (Simplified)
        document.getElementById('tpEditBtn').onclick = () => {
            const newName = prompt('修改名称:', account.name);
            if(newName) {
                this.store.update(d => {
                    const acc = d.accounts.find(a => a.id === account.id);
                    acc.name = newName;
                });
                this.renderProfile();
                this.renderHome(); // Update tweets name
            }
        };
        
        // Avatar upload
        document.getElementById('tpAvatar').onclick = () => {
            const input = document.createElement('input'); input.type='file';
            input.onchange = async (e) => {
                if(e.target.files[0]) {
                    const id = await window.db.saveImage(e.target.files[0]);
                    this.store.update(d => {
                        const acc = d.accounts.find(a => a.id === account.id);
                        acc.avatar = id;
                    });
                    this.renderProfile();
                    this.updateHeaderAvatar();
                }
            };
            input.click();
        };
    }

    async renderSearch() {
        const list = document.getElementById('trendList');
        list.innerHTML = '<div style="text-align:center; padding:20px;">正在获取热搜...</div>';
        
        const apiConfig = JSON.parse(localStorage.getItem('apiConfig') || '{}');
        let trends = [];

        if(apiConfig.chatApiKey) {
            const settings = this.store.get().settings || {};
            const worldSetting = settings.worldSetting || '现代社会';
            const prompt = `基于世界观"${worldSetting}"，生成 5 个推特热搜话题。格式 JSON: [{"category": "分类", "title": "话题", "posts": "推文数"}]`;
            try {
                const res = await window.QQApp.callAI(prompt, apiConfig);
                trends = JSON.parse(res);
            } catch(e) {
                console.error(e);
            }
        }

        if(trends.length === 0) {
            trends = [
                { category: '科技 · 趋势', title: '#AI手机', posts: '10.5K' },
                { category: '娱乐 · 热门', title: '#新剧上映', posts: '52.1K' },
                { category: '生活 · 推荐', title: '今天吃什么', posts: '8.2K' },
                { category: '游戏 · 趋势', title: '新版本更新', posts: '21K' },
                { category: '世界 · 新闻', title: '全球气候变暖', posts: '102K' }
            ];
        }
        
        list.innerHTML = '';
        trends.forEach(t => {
            const div = document.createElement('div');
            div.className = 't-trend-item';
            div.innerHTML = `
                <div class="t-trend-meta">${t.category}</div>
                <div class="t-trend-title">${t.title}</div>
                <div class="t-trend-meta">${t.posts} 推文</div>
            `;
            div.onclick = () => {
                document.querySelector('.t-search-input').value = t.title;
                // TODO: Implement actual search filtering
            };
            list.appendChild(div);
        });
    }

    async renderDMs() {
        const list = document.getElementById('dmList');
        list.innerHTML = '';
        
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
        const friends = qqData.friends;
        const settings = this.store.get().settings || {};
        const boundRoles = settings.boundRoles || [];

        // Separate friends (bound roles) and fans (others/NPCs)
        // Actually, requirement says: "Friends' DMs in default box, Fans' DMs in sensitive box"
        // Assuming QQ Friends are "Friends".
        
        const friendSection = document.createElement('div');
        friendSection.innerHTML = '<div style="padding:10px; font-weight:bold; background:#f5f5f5;">朋友</div>';
        
        const fanSection = document.createElement('div');
        fanSection.innerHTML = '<div style="padding:10px; font-weight:bold; background:#f5f5f5; margin-top:10px;">粉丝 (敏感内容)</div>';
        fanSection.style.display = 'none'; // Hidden by default? Or toggle? Requirement: "Fans in sensitive box, can choose to view"
        
        const fanToggle = document.createElement('div');
        fanToggle.innerHTML = '查看粉丝私信';
        fanToggle.style.cssText = 'padding:10px; text-align:center; color:#1d9bf0; cursor:pointer; border-top:1px solid #eee;';
        fanToggle.onclick = () => {
            fanSection.style.display = fanSection.style.display === 'none' ? 'block' : 'none';
        };

        if(friends.length === 0) {
            list.innerHTML = '<div style="padding:20px; text-align:center; color:#536471;">暂无私信</div>';
            return;
        }

        for(const f of friends) {
            const div = document.createElement('div');
            div.className = 't-dm-item';
            
            let avatar = f.avatar;
            if(avatar && avatar.startsWith('img_')) avatar = await window.db.getImage(avatar);

            const msgs = qqData.messages[f.id] || [];
            const lastMsg = msgs.length > 0 ? msgs[msgs.length-1].content : '开始聊天';

            div.innerHTML = `
                <div class="tweet-avatar" style="background-image:url('${avatar}')"></div>
                <div class="t-dm-content">
                    <div class="t-dm-top">
                        <span style="font-weight:bold;">${f.name}</span>
                        <span style="font-size:12px; color:#536471;">@${f.name}</span>
                    </div>
                    <div class="t-dm-msg">${lastMsg}</div>
                </div>
            `;
            
            div.onclick = () => {
                window.showPage('qqApp');
                if(window.QQApp) {
                    window.QQApp.currentChatId = f.id;
                    window.QQApp.currentChatType = 'friend';
                    document.getElementById('chatTitle').textContent = f.name;
                    document.getElementById('chatWindow').style.display = 'flex';
                    window.QQApp.renderMessages();
                }
            };
            
            // Logic: If bound, it's a friend. If not bound, it's a fan (in sensitive box).
            // If no roles are bound, treat all as friends for convenience, or strictly as fans?
            // Let's say if boundRoles is empty, all are friends. If not empty, only bound are friends.
            const isBound = boundRoles.includes(f.id);
            if (boundRoles.length === 0 || isBound) {
                friendSection.appendChild(div);
            } else {
                fanSection.appendChild(div);
            }
        }
        
        list.appendChild(friendSection);
        list.appendChild(fanToggle);
        list.appendChild(fanSection);
    }

    timeSince(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "年";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "月";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "天";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "小时";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "分";
        return Math.floor(seconds) + "秒";
    }
}

window.TwitterApp = new TwitterApp();
