class TwitterStore {
    constructor() { this.init(); }
    init() {
        if(!localStorage.getItem('twitter_data')) {
            const initialData = {
                currentAccountId: 'main',
                accounts: [
                    { id: 'main', name: '我', handle: '@me', avatar: '', bio: 'Hello World', following: 10, followers: 5, verified: false }
                ],
                tweets: [], // {id, accountId, text, time, likes, retweets, replies}
                dms: [] // {id, participants:[], messages:[]}
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

        // Profile
        document.getElementById('tProfileLink').onclick = () => this.renderProfile();
        document.getElementById('closeTProfile').onclick = () => document.getElementById('tProfilePage').style.display = 'none';

        // Post Modal
        document.getElementById('closeTPost').onclick = () => document.getElementById('tPostModal').style.display = 'none';
        document.getElementById('doTPost').onclick = () => this.postTweet();

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

    async renderHome() {
        const list = document.getElementById('tweetList');
        list.innerHTML = '';
        const data = this.store.get();
        let tweets = data.tweets.sort((a, b) => b.time - a.time);

        // AI Recommendation Injection
        if (tweets.length < 5) {
            await this.generateRecommendedTweets();
            tweets = this.store.get().tweets.sort((a, b) => b.time - a.time);
        }

        for(const t of tweets) {
            let account = data.accounts.find(a => a.id === t.accountId);
            // Handle AI generated accounts
            if (!account && t.isAI) {
                account = { name: t.aiName, handle: t.aiHandle, avatar: t.aiAvatar, verified: false };
            }
            if(!account) continue;

            let avatar = account.avatar;
            if(avatar && avatar.startsWith('img_')) avatar = await window.db.getImage(avatar);
            else if (!avatar) avatar = 'https://picsum.photos/50/50';

            const div = document.createElement('div');
            div.className = 'tweet-item';
            
            // Process hashtags
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
            
            // Bind events
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

    async generateRecommendedTweets() {
        const apiConfig = JSON.parse(localStorage.getItem('apiConfig') || '{}');
        if(!apiConfig.chatApiKey) return;

        const prompt = `生成 2 条推特推文。内容随机（科技、生活、搞笑）。
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
        document.getElementById('tPostModal').style.display = 'flex';
        document.getElementById('tPostInput').focus();
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
            const prompt = `生成 5 个推特热搜话题。格式 JSON: [{"category": "分类", "title": "话题", "posts": "推文数"}]`;
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

    renderDMs() {
        const list = document.getElementById('dmList');
        list.innerHTML = '<div style="padding:20px; text-align:center; color:#536471;">暂无私信</div>';
        // TODO: Implement DM logic
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
