
// ========== 推特记忆管理系统 ==========
class TwitterMemoryManager {
    constructor() {
        this.maxMemory = 50; // 最多记住50条互动
    }

    // 获取与某角色的所有互动记忆
    getMemoryWithCharacter(handle) {
        const data = JSON.parse(localStorage.getItem('twitter_data') || '{}');
        const memory = {
            tweets: [],      // 该角色的推文
            comments: [],    // 用户与该角色的评论互动
            dms: [],         // 私信记录
            likes: [],       // 点赞记录
            mentions: []     // 艾特记录
        };

        // 1. 收集该角色发的推文
        (data.tweets || []).forEach(t => {
            if(t.aiHandle === handle) {
                memory.tweets.push({
                    text: t.text,
                    time: t.time,
                    likes: t.likes,
                    id: t.id
                });
            }
        });

        // 2. 收集用户在该角色推文下的评论
        (data.tweets || []).forEach(t => {
            if(t.aiHandle === handle && t.comments) {
                t.comments.forEach(c => {
                    const acc = data.accounts?.find(a => a.id === data.currentAccountId);
                    if(c.handle === acc?.handle || c.name === acc?.name) {
                        memory.comments.push({
                            tweetText: t.text.substring(0, 50),
                            userComment: c.text,
                            time: c.time
                        });
                    }
                });
            }
        });

        // 3. 收集私信记录
        (data.dms || []).forEach(dm => {
            if(dm.participant?.handle === handle) {
                dm.messages?.forEach(m => {
                    memory.dms.push({
                        sender: m.sender,
                        text: m.text || (m.type === 'image' ? '[图片]' : m.type === 'transfer' ? `[转账¥${m.amount}]` : ''),
                        time: m.time,
                        type: m.type
                    });
                });
            }
        });

        // 4. 收集用户点赞该角色的推文
        (data.tweets || []).forEach(t => {
            if(t.aiHandle === handle && t.liked) {
                memory.likes.push({
                    tweetText: t.text.substring(0, 50),
                    time: t.time
                });
            }
        });

        // 5. 收集艾特记录
        const acc = data.accounts?.find(a => a.id === data.currentAccountId);
        (data.tweets || []).forEach(t => {
            if(t.text && t.text.includes(handle)) {
                memory.mentions.push({
                    from: t.aiHandle || acc?.handle,
                    text: t.text.substring(0, 80),
                    time: t.time
                });
            }
        });

        return memory;
    }

    // 生成记忆摘要（给AI用）
    generateMemorySummary(handle) {
        const memory = this.getMemoryWithCharacter(handle);
        const acc = JSON.parse(localStorage.getItem('twitter_data') || '{}');
        const currentAcc = acc.accounts?.find(a => a.id === acc.currentAccountId);

        let summary = '';

        // 私信摘要（最重要）
        if(memory.dms.length > 0) {
            const recentDms = memory.dms.slice(-15);
            summary += `【与用户${currentAcc?.name || ''}的私信记录】:\n`;
            recentDms.forEach(m => {
                const who = m.sender === 'me' ? currentAcc?.name : '你';
                summary += `${who}: ${m.text}\n`;
            });
            summary += '\n';
        }

        // 评论互动摘要
        if(memory.comments.length > 0) {
            const recentComments = memory.comments.slice(-5);
            summary += `【用户曾在你的推文下评论】:\n`;
            recentComments.forEach(c => {
                summary += `你发的"${c.tweetText}..." 用户评论:"${c.userComment}"\n`;
            });
            summary += '\n';
        }

        // 点赞记录
        if(memory.likes.length > 0) {
            summary += `【用户点赞过你的${memory.likes.length}条推文】\n\n`;
        }

        // 你发的最近推文
        if(memory.tweets.length > 0) {
            const recentTweets = memory.tweets.slice(-3);
            summary += `【你最近发的推文】:\n`;
            recentTweets.forEach(t => {
                summary += `- "${t.text.substring(0, 60)}..."\n`;
            });
            summary += '\n';
        }

        return summary || '【暂无互动记录，这是第一次交流】';
    }

    // 检查是否认识用户
    knowsUser(handle) {
        const memory = this.getMemoryWithCharacter(handle);
        return memory.dms.length > 0 || memory.comments.length > 0 || memory.likes.length > 3;
    }

    // 获取关系亲密度
    getIntimacyLevel(handle) {
        const memory = this.getMemoryWithCharacter(handle);
        let score = 0;

        score += memory.dms.length * 3;
        score += memory.comments.length * 2;
        score += memory.likes.length * 1;
        score += memory.mentions.length * 2;

        if(score < 5) return 'stranger';      // 陌生人
        if(score < 20) return 'acquaintance'; // 认识
        if(score < 50) return 'friend';       // 朋友
        return 'close';                        // 亲密
    }

    // 获取QQ聊天记忆（如果是绑定角色）
// 获取QQ聊天记忆（如果是绑定角色）- 修复版
getQQMemory(qqId, handle) {  // ✅ 添加 handle 参数
    const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}');
    const messages = qqData.messages?.[qqId] || [];

    let summary = '';

    if(messages.length > 0) {
        const recent = messages.slice(-20);
        summary = '【QQ聊天记录】:\n';
        recent.forEach(m => {
            const who = m.senderId === 'user' ? '用户' : '你';
            summary += `${who}: ${m.content?.substring(0, 50) || ''}\n`;
        });
    }

    // ✅ 只有传入 handle 时才整合推文互动
    if(!handle) return summary;

    const data = JSON.parse(localStorage.getItem('twitter_data') || '{}');
    const allTweets = data.tweets || [];

    // 该角色发的推文
    const theirTweets = allTweets.filter(t => t.aiHandle === handle).slice(-5);
    if(theirTweets.length > 0) {
        summary += `\n【该角色最近发的推文】:\n`;
        theirTweets.forEach(t => {
            summary += `- "${t.text.substring(0, 50)}..."\n`;
        });
    }

    // 用户在该角色推文下的评论
    const userComments = [];
    allTweets.forEach(t => {
        if(t.aiHandle === handle && t.comments) {
            t.comments.forEach(c => {
                const acc = data.accounts?.find(a => a.id === data.currentAccountId);
                if(c.handle === acc?.handle || c.name === acc?.name) {
                    userComments.push({
                        tweet: t.text.substring(0, 30),
                        comment: c.text
                    });
                }
            });
        }
    });

    if(userComments.length > 0) {
        summary += `\n【用户在该角色推文下的评论】:\n`;
        userComments.slice(-5).forEach(c => {
            summary += `推文"${c.tweet}..." 用户评论:"${c.comment}"\n`;
        });
    }

    return summary;
}

}

// 全局记忆管理器
window.TwitterMemory = new TwitterMemoryManager();

class TwitterStore {
    constructor() { this.init(); }
    init() {
        if(!localStorage.getItem('twitter_data')) {
const initialData = {
    currentAccountId: 'main',
    accounts: [
        {
            id: 'main',
            name: '我',
            handle: '@me',
            avatar: '',
            banner: '',
            bio: '',
            location: '',
            website: '',
            following: 0,
            followers: 0,
            verified: false,
            joinDate: new Date().toLocaleDateString('zh-CN', {year: 'numeric', month: 'long'})
        }
    ],
    tweets: [],
    dms: [],
    communities: [],
    notifications: [],
    events: [],
    following: [],
    followers: [],
    bookmarks: [],
    settings: {
        worldSetting: '现代社会',
        npcs: [],
        boundRoles: [],
        enabledRoles: [],
        postMemory: 0,
        memoryIsolation: true,
        accountLinks: []
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
            
    
// 确保启动时隐藏
    setTimeout(() =>
 {
        const app = document.getElementById('twitterApp'
);
        if(app) app.style.display = 'none'
;
    }, 
0
);
        this.initUI();
    }

    initUI() {
 // 在 initUI() 末尾添加
document.getElementById('twitterApp').addEventListener('click', (e) => {
    const target = e.target.closest('#dmTransferBtn');
    if(target) {
        e.preventDefault();
        e.stopPropagation();
        this.openTransferModal();
    }
});
           
// 强制隐藏应用
    const app = document.getElementById('twitterApp'
);
    if
(app) {
        app.
style.display = 'none'
;
        app.
classList.remove('active'
);
    }
               
// ===== 新增：处理打开/关闭时的dock栏 =====
    const openBtn = document.getElementById('openTwitterBtn'
);
    if
(openBtn) {
        openBtn.
onclick = () =>
 {
            document.getElementById('twitterApp').style.display = 'flex'
;
            document.body.classList.add('twitter-open'
);
        };
    } 
// 初始化当前Feed类型
    this.currentFeed = 'foryou'
;
        // Check Phone Check Mode
        if (window.System && window.System.isPhoneCheckMode) {
            if(!document.getElementById('tGenActivityBtn')) {
                const btn = document.createElement('div');
                btn.id = 'tGenActivityBtn';
                btn.className = 'ff-fab';
                btn.style.bottom = '80px';
                btn.style.background = '#1d9bf0';
                btn.innerHTML = '<i class="fas fa-magic"></i>';
                btn.onclick = () => this.generateActivity();
                document.getElementById('twitterApp').appendChild(btn);
            }
        }

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
// 艾特下拉框
if(!document.getElementById('tMentionDropdown')) {
    const dropdown = document.createElement('div');
    dropdown.id = 'tMentionDropdown';
    dropdown.className = 't-mention-dropdown';
    dropdown.style.display = 'none';
    document.getElementById('twitterApp').appendChild(dropdown);
}

if(!document.getElementById('tDmWindow')) {
    const dmWin = document.createElement('div');
    dmWin.id = 'tDmWindow';
    dmWin.className = 't-dm-window';
    dmWin.innerHTML = `
        <div class="t-dm-header">
            <div class="t-dm-back" id="closeDmWin"><i class="fas fa-arrow-left"></i></div>
            <div class="t-dm-header-info">
                <div class="t-dm-header-avatar" id="dmHeaderAvatar"></div>
                <div class="t-dm-header-text">
                    <div class="t-dm-header-name" id="dmHeaderName">Name</div>
                    <div class="t-dm-header-handle" id="dmHeaderHandle">@handle</div>
                </div>
            </div>
            <div class="t-dm-header-actions">
                <div class="t-header-icon" id="btnDmInfo"><i class="fas fa-info-circle"></i></div>
                <div class="t-header-icon" id="btnGenDmReply"><i class="fas fa-magic"></i></div>
            </div>
        </div>
        <div class="t-dm-messages" id="dmMessages"></div>
        <div class="t-dm-input-area">
            <div class="t-dm-attachments" id="dmAttachments" style="display:none;"></div>
            <div class="t-dm-input">
                <div class="t-dm-input-icons">
                    <div class="t-dm-icon" id="dmImageBtn"><i class="far fa-image"></i></div>
                    <div class="t-dm-icon" id="dmTextImageBtn"><i class="fas fa-file-alt"></i></div>
                    <div class="t-dm-icon" id="dmTransferBtn"><i class="fas fa-yen-sign"></i></div>
                </div>
                <input type="text" id="dmInput" placeholder="发送消息...">
                <div class="t-dm-send" id="dmSendBtn"><i class="fas fa-paper-plane"></i></div>
            </div>
        </div>
    `;
    document.getElementById('twitterApp').appendChild(dmWin);


    // 绑定事件
    document.getElementById('closeDmWin').onclick = () => dmWin.style.display = 'none';
    document.getElementById('btnGenDmReply').onclick = () => this.generateDMReply();
    document.getElementById('dmSendBtn').onclick = () => this.sendDM();
    document.getElementById('dmInput').onkeydown = (e) => { if(e.key === 'Enter') this.sendDM(); };

    // 新增功能按钮
    document.getElementById('dmImageBtn').onclick = () => this.sendRealImage();
    document.getElementById('dmTextImageBtn').onclick = () => this.sendTextImage();
    document.getElementById('dmTransferBtn').onclick = () => this.openTransferModal();
    document.getElementById('btnDmInfo').onclick = () => this.showDmParticipantInfo();
}


        // Tweet Detail Modal
        if(!document.getElementById('tTweetDetail')) {
            const detail = document.createElement('div');
            detail.id = 'tTweetDetail';
            detail.className = 'sub-page';
            detail.style.display = 'none';
            detail.style.zIndex = '60';
            detail.innerHTML = `
                <div class="sub-header">
                    <button class="back-btn" id="closeTweetDetail"><i class="fas fa-arrow-left"></i></button>
                    <span class="sub-title">Tweet</span>
                </div>
                <div id="tDetailContent" style="overflow-y:auto; height:calc(100% - 50px);"></div>
                <div style="padding:10px; background:white; border-top:1px solid #eee; display:flex; gap:10px;">
                    <input id="tweetReplyInput" style="flex:1; padding:8px; border:1px solid #ddd; border-radius:20px;" placeholder="Tweet your reply">
                    <button id="tweetReplyBtn" class="send-btn" style="background:#1d9bf0;border-radius:20px;">Reply</button>
                </div>
            `;
            document.getElementById('twitterApp').appendChild(detail);
            document.getElementById('closeTweetDetail').onclick = () => detail.style.display = 'none';
        }

        // Ensure Post Modal exists and has correct structure (Fix missing button issue)
        const existingPostModal = document.getElementById('tPostModal');
        if(existingPostModal) existingPostModal.remove();
        
        const postModal = document.createElement('div');
        postModal.id = 'tPostModal';
        postModal.className = 'sub-page';
        postModal.style.display = 'none';
        postModal.style.zIndex = '70'; // Higher z-index
        postModal.innerHTML = `
            <div class="sub-header" style="display:flex; justify-content:space-between; align-items:center; padding:10px;">
                <button class="back-btn" id="closeTPost" style="border:none; background:none; font-size:16px;">取消</button>
                <button class="send-btn" id="doTPost" style="background:#1d9bf0; color:white; border:none; border-radius:20px; padding:5px 15px; font-weight:bold;">发布</button>
            </div>
            <div style="padding:15px;">
                <textarea id="tPostInput" placeholder="有什么新鲜事？" style="width:100%; height:150px; border:none; outline:none; font-size:18px; resize:none; font-family:inherit;"></textarea>
            </div>
        `;
        document.getElementById('twitterApp').appendChild(postModal);
        document.getElementById('closeTPost').onclick = () => postModal.style.display = 'none';
        document.getElementById('doTPost').onclick = () => this.createPost();

        // Update Header with Gen Button
// Update Header with Gen Button
const header = document.querySelector('.t-header');
header.innerHTML = `
    <div class="t-header-back" id="twitterBackBtn"><i class="fas fa-arrow-left"></i></div>
    <div class="t-avatar-small" id="tAvatarSmall"></div>
    <div class="t-logo">𝕏</div>
    <div style="display:flex;gap:15px;margin-left:auto;">
        <div class="t-header-icon" id="tHeaderGenBtn"><i class="fas fa-sync-alt"></i></div>
        <div class="t-header-icon" id="tHeaderSettings"><i class="fas fa-cog"></i></div>
    </div>
`;

// 返回按钮 - 关闭Twitter并显示dock
// 返回按钮
document.getElementById('twitterBackBtn').onclick = () =>
 {
    this.closeApp
();
    document.body.classList.remove('twitter-open'
);

    // 显示主界面
    document.querySelectorAll('.home-screen, .main-content, .phone-content').forEach(el => {
        el.style.display = '';
    });
};

        
document.querySelectorAll('.t-nav-item').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.t-nav-item').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.t-tab-page').forEach(el => el.classList.remove('active'));
        btn.classList.add('active');
        const tabId = btn.dataset.tab;
        document.getElementById(tabId).classList.add('active');

        if(tabId === 't-home') this.renderHome();
        if(tabId === 't-search') this.renderSearch();
        if(tabId === 't-communities') this.renderCommunities();
        if(tabId === 't-notifications') this.renderNotifications();
        if(tabId === 't-messages') this.renderDMs();
    };
});


        document.getElementById('tAvatarSmall').onclick = () => this.openDrawer();
        // 绑定右上角生成按钮
document.getElementById('tHeaderGenBtn').onclick = () => this.generateTimeline();

// 绑定右上角设置按钮
document.getElementById('tHeaderSettings').onclick = () => this.openSettings();

        document.getElementById('btnProfile').onclick = () => { this.closeDrawer(); this.renderProfile('me'); };
        document.getElementById('btnSettings').onclick = () => { this.closeDrawer(); this.openSettings(); };
        
        document.getElementById('btnSwitchAccount').onclick = (e) => {
            e.stopPropagation();
            const switcher = document.getElementById('tAccountSwitcher');
            switcher.style.display = switcher.style.display === 'none' ? 'block' : 'none';
            this.renderAccountList();
        };
        document.getElementById('btnAddAccount').onclick = () => this.addAccount();

// ========== 【修复1】转账按钮 - 使用事件委托 ==========
// 找到 initUI() 方法的末尾，在 this.renderHome(); 之前添加以下代码：

// ===== 私信功能按钮事件委托（解决点击无反应问题）=====
document.getElementById('twitterApp').addEventListener('click', (e) => {
    // 转账按钮
    if(e.target.closest('#dmTransferBtn')) {
        e.preventDefault();
        e.stopPropagation();
        this.openTransferModal();
        return;
    }
    // 发送图片按钮
    if(e.target.closest('#dmImageBtn')) {
        e.preventDefault();
        e.stopPropagation();
        this.sendRealImage();
        return;
    }
    // 发送文字图片按钮
    if(e.target.closest('#dmTextImageBtn')) {
        e.preventDefault();
        e.stopPropagation();
        this.sendTextImage();
        return;
    }
    // FAB发帖按钮
    if(e.target.closest('#tFab, .t-fab')) {
        e.preventDefault();
        e.stopPropagation();
        this.openPostModal();
        return;
    }
});

// 确保主页Tab正确初始化
setTimeout(() => {
    const homeTab = document.querySelector('.t-nav-item[data-tab="t-home"]');
    if(homeTab && !homeTab.classList.contains('active')) {
        homeTab.classList.add('active');
    }

    const homePage = document.getElementById('t-home');
    if(homePage && !homePage.classList.contains('active')) {
        homePage.classList.add('active');
    }

    // 强制渲染主页
    this.renderHome();
}, 100);



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
         
if(!acc) return
;
        let avatar = acc.avatar;
        if(avatar && avatar.startsWith('img_')) avatar = await window.db.getImage(avatar);
            
if(!avatar) avatar = window.Utils.generateXDefaultAvatar
();

    const avatarEl = document.getElementById('tAvatarSmall'
);
    if
(avatarEl) {
        avatarEl.
style.backgroundImage = `url('${avatar}')`
;
    }
        document.getElementById('tAvatarSmall').style.backgroundImage = `url('${avatar || 'https://picsum.photos/50/50'}')`;

    }

async renderHome() {
    const list = document.getElementById('tweetList');
    if(!list) {
        console.error('找不到 tweetList 元素');
        return;
    }

    list.innerHTML = '<div style="padding:30px;text-align:center;"><i class="fas fa-spinner fa-spin"></i> 加载中...</div>';

    // 绑定Tab切换事件
    document.querySelectorAll('.t-home-tab').forEach(tab => {
        tab.onclick = () => {
            document.querySelectorAll('.t-home-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            this.currentFeed = tab.dataset.feed;
            this.renderHomeFeed();
        };
    });

    // 检查并显示事件
    await this.checkAndShowEvent();

    // 渲染推文
    await this.renderHomeFeed();
}

async renderHomeFeed() {
    const list = document.getElementById('tweetList');
    if(!list) {
        console.error('找不到 tweetList 元素');
        return;
    }

    list.innerHTML = '';

    const data = this.store.get();
    const currentFeed = this.currentFeed || 'foryou';

    let tweets = [];

    if(currentFeed === 'foryou') {
        tweets = [...(data.tweets || [])];
        tweets.sort((a, b) => b.time - a.time);
    } else if(currentFeed === 'following') {
        const following = data.following || [];
        const followingHandles = following.map(f => f.handle);
        const boundRoles = data.settings?.boundRoles || [];
        boundRoles.forEach(r => {
            if(!followingHandles.includes(r.twitterHandle)) {
                followingHandles.push(r.twitterHandle);
            }
        });

        tweets = (data.tweets || []).filter(t => {
            if(t.accountId === data.currentAccountId) return true;
            if(t.isAI && followingHandles.includes(t.aiHandle)) return true;
            return false;
        });
        tweets.sort((a, b) => b.time - a.time);
    }

    console.log('当前Feed:', currentFeed);
    console.log('推文数量:', tweets.length);

    if(tweets.length === 0) {
        list.innerHTML = `
            <div style="padding:40px;text-align:center;color:#999;">
                <i class="fas fa-stream" style="font-size:40px;margin-bottom:15px;display:block;"></i>
                ${currentFeed === 'following' ? '关注更多用户来查看他们的推文' : '点击右上角生成推文'}
            </div>
        `;
        return;
    }

    for(const t of tweets) {
        const div = await this.createTweetElement(t);
        list.appendChild(div);
    }

    console.log('推文渲染完成');
}


// 渲染主页推文列表
async renderHomeFeed() {
    const list = document.getElementById('tweetList');
    list.innerHTML = '';

    const data = this.store.get();
    const currentFeed = this.currentFeed || 'foryou';

    let tweets = [];

    if(currentFeed === 'foryou') {
        // 推荐：所有推文 + 事件相关推文优先
        tweets = [...data.tweets];

        // 根据用户热度调整推荐
        const userHotness = this.calculateUserHotness();
        if(userHotness > 50) {
            // 用户比较火的时候推荐中会出现更多提及用户的推文
            tweets = this.injectUserMentions(tweets);
        }

        // 按互动量和时间排序
        tweets.sort((a, b) => {
            const scoreA = (a.likes || 0) + (a.retweets || 0) * 2 + (a.replies || 0) * 3;
            const scoreB = (b.likes || 0) + (b.retweets || 0) * 2 + (b.replies || 0) * 3;
            const timeWeight = (b.time - a.time) / 3600000; // 每小时衰减
            return (scoreB - scoreA) + timeWeight;
        });

    } else if(currentFeed === 'following') {
        // 关注：只显示关注用户的推文
        const following = data.following || [];
        const followingHandles = following.map(f => f.handle);

        // 添加绑定角色
        const boundRoles = data.settings.boundRoles || [];
        boundRoles.forEach(r => {
            if(!followingHandles.includes(r.twitterHandle)) {
                followingHandles.push(r.twitterHandle);
            }
        });

        tweets = data.tweets.filter(t => {
            if(t.accountId === data.currentAccountId) return true; // 自己的推文
            if(t.isAI && followingHandles.includes(t.aiHandle)) return true;
            return false;
        });

        tweets.sort((a, b) => b.time - a.time);
    }

    if(tweets.length === 0) {
        list.innerHTML = `
            <div style="padding:40px;text-align:center;color:#999;">
                <i class="fas fa-stream" style="font-size:40px;margin-bottom:15px;display:block;"></i>
                ${currentFeed === 'following' ? '关注更多用户来查看他们的推文' : '点击右上角生成推文'}
            </div>
        `;
        return;
    }

    for(const t of tweets) {
        const div = await this.createTweetElement(t);
        list.appendChild(div);
    }
}

// 计算用户热度
calculateUserHotness() {
    const data = this.store.get();
    const acc = data.accounts.find(a => a.id === data.currentAccountId);

    let hotness = 0;

    // 根据粉丝数
    hotness += (acc.followers || 0) * 0.5;

    // 根据最近推文互动
    const recentTweets = data.tweets
        .filter(t => t.accountId === data.currentAccountId)
        .slice(0, 5);

    recentTweets.forEach(t => {
        hotness += (t.likes || 0) * 0.3;
        hotness += (t.retweets || 0) * 0.5;
        hotness += (t.replies || 0) * 0.4;
    });

    // 根据通知数量
    const recentNotifs = (data.notifications || [])
        .filter(n => Date.now() - n.time < 86400000) // 24小时内
        .length;
    hotness += recentNotifs * 2;

    return Math.min(hotness, 100);
}

// 注入提及用户的推文（用户比较火的时候）
injectUserMentions(tweets) {
    const data = this.store.get();
    const acc = data.accounts.find(a => a.id === data.currentAccountId);

    // 查找提及用户的推文
    const mentionTweets = tweets.filter(t =>
        t.text && (t.text.includes(acc.handle) || t.text.includes(acc.name))
    );

    // 将提及推文放到前面
    const otherTweets = tweets.filter(t =>
        !t.text || (!t.text.includes(acc.handle) && !t.text.includes(acc.name))
    );

    return [...mentionTweets, ...otherTweets];
}


async createTweetElement(t) {
    const div = document.createElement('div');
    div.className = 'tweet-item';

    const data = this.store.get();

    // ===== 🔴 在这里提前声明 processedText =====
    let processedText = t.text || '';
    const mentionRegex = /@(\w+)/g;
    processedText = processedText.replace(mentionRegex, '<span style="color:#1d9bf0;">$&</span>');

    // 如果是转发显示转发样式
    if(t.isRetweet && t.originalTweet) {
        const acc = data.accounts.find(a => a.id === t.accountId);
        const retweeterName = acc ? acc.name : '我';

        div.innerHTML = `
            <div style="padding:5px 15px 0 50px;color:#536471;font-size:13px;">
                <i class="fas fa-retweet" style="margin-right:8px;"></i>${retweeterName} 转发了
            </div>
            <div style="display:flex;padding:10px 15px 15px;">
                <div class="tweet-avatar" style="background-image:url('${t.originalTweet.aiAvatar || window.Utils.generateXDefaultAvatar()}')"></div>
                <div class="tweet-content">
                    <div class="tweet-header">
                        <span class="tweet-name">${t.originalTweet.aiName}</span>
                        <span class="tweet-handle">${t.originalTweet.aiHandle}</span>
                        <span class="tweet-time">${this.timeSince(t.time)}</span>
                    </div>
                    <div class="tweet-text">${t.originalTweet.text}</div>
                </div>
            </div>
        `;

        div.onclick = () => {
            const original = data.tweets.find(x => x.id === t.originalTweet.id);
            if(original) this.openTweetDetail(original);
        };

        return div;
    }

    const settings = data.settings || {};
    let account;
    let avatar;
    let avatarSource = 'x';

    // 获取账号和头像
    if(t.accountId && t.accountId !== 'ai_generated') {
        account = data.accounts.find(a => a.id === t.accountId);
        if(!account) return div;

        avatar = account.avatar;
        if(avatar && avatar.startsWith('img_')) {
            avatar = await window.db.getImage(avatar);
        }
        if(!avatar) avatar = window.Utils.generateXDefaultAvatar();

    } else if(t.isAI) {
        const boundRole = (settings.boundRoles || []).find(b => b.twitterHandle === t.aiHandle);
        const enabledRole = (settings.enabledRoles || []).find(b => b.twitterHandle === t.aiHandle);

        if(boundRole || enabledRole) {
            avatarSource = 'qq';
            const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}');
            const roleId = boundRole ? boundRole.qqId : enabledRole.qqId;
            const friend = (qqData.friends || []).find(f => f.id === roleId);

            if(friend && friend.avatar) {
                avatar = friend.avatar;
                if(avatar.startsWith('img_')) {
                    avatar = await window.db.getImage(avatar);
                }
            }
        }

        if(!avatar) {
            avatar = t.aiAvatar;
            if(avatar && avatar.startsWith('img_')) {
                avatar = await window.db.getImage(avatar);
            }
        }
        if(!avatar) avatar = window.Utils.generateXDefaultAvatar();

        account = {
            name: t.aiName,
            handle: t.aiHandle,
            avatar: avatar,
            verified: false
        };
    } else {
        return div;
    }

    // 媒体处理
    let mediaHtml = '';
    if(t.images && t.images.length > 0) {
        let gridClass = `grid-${Math.min(t.images.length, 4)}`;
        let imgs = '';
        for(let i = 0; i < Math.min(t.images.length, 4); i++) {
            let url = t.images[i];
            if(url.startsWith('img_')) url = await window.db.getImage(url);
            imgs += `<img src="${url}">`;
        }
        mediaHtml = `<div class="tweet-media ${gridClass}">${imgs}</div>`;
    }

    // 投票渲染
    let pollHtml = '';
    if(t.poll && t.poll.options && t.poll.options.length > 0) {
        const totalVotes = t.poll.totalVotes || 0;
        const hasVoted = t.poll.userVoted !== undefined;
        const isExpired = t.poll.endTime && Date.now() > t.poll.endTime;

        let optionsHtml = t.poll.options.map((opt, idx) => {
            const votes = opt.votes || 0;
            const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
            const isSelected = t.poll.userVoted === idx;

            return `
                <div class="t-poll-option ${hasVoted || isExpired ? 'voted' : ''} ${isSelected ? 'selected' : ''}"
                     data-poll-idx="${idx}" data-tweet-id="${t.id}">
                    ${(hasVoted || isExpired) ? `<div class="t-poll-option-bar" style="width:${percent}%"></div>` : ''}
                    <div class="t-poll-option-content">
                        <span class="t-poll-option-text">
                            ${isSelected ? '<i class="fas fa-check-circle" style="color:#1d9bf0;margin-right:5px;"></i>' : ''}
                            ${opt.text}
                        </span>
                        ${(hasVoted || isExpired) ? `<span class="t-poll-option-percent">${percent}%</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        const remainingTime = t.poll.endTime ? this.getPollRemainingTime(t.poll.endTime) : '';

        pollHtml = `
            <div class="t-poll-container" data-tweet-id="${t.id}">
                ${optionsHtml}
                <div class="t-poll-footer">
                    <span>${totalVotes} 票</span>
                    <span>${isExpired ? '已结束' : remainingTime}</span>
                </div>
            </div>
        `;
    }

    // 引用推文
    let quoteHtml = '';
    if(t.quoteId) {
        const q = data.tweets.find(x => x.id === t.quoteId);
        if(q) {
            let quoteAvatar = q.aiAvatar || window.Utils.generateXDefaultAvatar();
            quoteHtml = `
                <div class="tweet-quote">
                    <div class="quote-header">
                        <div class="quote-avatar" style="background-image:url('${quoteAvatar}')"></div>
                        <span class="quote-name">${q.aiName || 'User'}</span>
                        <span class="quote-handle">${q.aiHandle || '@user'}</span>
                    </div>
                    <div class="tweet-text" style="font-size:14px;margin-bottom:0;">${q.text}</div>
                </div>
            `;
        }
    }

    // 位置标签
    let locationHtml = '';
    if(t.location) {
        locationHtml = `<span class="tweet-location"><i class="fas fa-map-marker-alt"></i> ${t.location}</span>`;
    }

    div.innerHTML = `
        <div class="tweet-avatar" style="background-image:url('${avatar}')" data-handle="${account.handle}"></div>
        <div class="tweet-content">
            <div class="tweet-header">
                <span class="tweet-name">${account.name}</span>
                ${account.verified ? '<i class="fas fa-certificate" style="color:#1d9bf0; font-size:12px; margin-right:5px;"></i>' : ''}
                <span class="tweet-handle">${account.handle}</span>
                <span class="tweet-time">${this.timeSince(t.time)}</span>
                ${locationHtml}
            </div>
            <div class="tweet-text">${processedText}</div>
            ${mediaHtml}
            ${pollHtml}
            ${quoteHtml}
            <div class="tweet-actions">
                <div class="t-action-btn comment-btn"><i class="far fa-comment"></i> <span>${t.replies || 0}</span></div>
                <div class="t-action-btn retweet-btn"><i class="fas fa-retweet"></i> <span>${t.retweets || 0}</span></div>
                <div class="t-action-btn like-btn ${t.liked ? 'liked' : ''}"><i class="${t.liked ? 'fas' : 'far'} fa-heart"></i> <span>${t.likes || 0}</span></div>
                <div class="t-action-btn views-btn"><i class="far fa-eye"></i> <span>${this.formatNumber(t.views || 0)}</span></div>
                <div class="t-action-btn share-btn"><i class="fas fa-share"></i></div>
            </div>
        </div>
    `;

    // 点击事件
    div.onclick = () => this.openTweetDetail(t);

    div.querySelector('.tweet-avatar').onclick = (e) => {
        e.stopPropagation();
        if(t.isAI) {
            this.renderProfile({
                name: t.aiName,
                handle: t.aiHandle,
                avatar: avatar,
                bio: t.aiBio || '',
                qqId: account.qqId,
                source: avatarSource
            });
        } else {
            this.renderProfile('me');
        }
    };

    div.querySelector('.like-btn').onclick = (e) => {
        e.stopPropagation();
        const tweetId = t.id;
        const isLiked = t.liked;

        t.likes = isLiked ? (t.likes - 1) : (t.likes + 1);
        t.liked = !isLiked;

        this.store.update(d => {
            let tweet = d.tweets.find(x => x.id === tweetId);
            if(tweet) {
                tweet.likes = t.likes;
                tweet.liked = t.liked;
            }
        });

        const likeBtn = div.querySelector('.like-btn');
        likeBtn.classList.toggle('liked');
        likeBtn.querySelector('i').className = t.liked ? 'fas fa-heart' : 'far fa-heart';
        likeBtn.querySelector('span').innerText = t.likes;
    };

    div.querySelector('.retweet-btn').onclick = (e) => {
        e.stopPropagation();
        this.showRetweetOptions(t);
    };

    div.querySelector('.share-btn').onclick = (e) => {
        e.stopPropagation();
        this.showShareOptions(t, account);
    };

    div.querySelectorAll('.t-poll-option').forEach(opt => {
        opt.onclick = (e) => {
            e.stopPropagation();
            const tweetId = opt.dataset.tweetId;
            const optIdx = parseInt(opt.dataset.pollIdx);
            this.votePoll(tweetId, optIdx);
        };
    });

    return div;
}


// 格式化数字（如 1234 -> 1.2K）
formatNumber(num) {
    if(num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if(num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// 转发选项
showRetweetOptions(tweet) {
    const options = document.createElement('div');
    options.className = 't-action-menu';
    options.innerHTML = `
        <div class="t-action-menu-overlay"></div>
        <div class="t-action-menu-content">
            <div class="t-action-menu-item" id="doRetweet">
                <i class="fas fa-retweet"></i> 转发
            </div>
            <div class="t-action-menu-item" id="doQuote">
                <i class="fas fa-pen"></i> 引用推文
            </div>
            <div class="t-action-menu-item cancel">
                取消
            </div>
        </div>
    `;
    document.body.appendChild(options);

    options.querySelector('.t-action-menu-overlay').onclick = () => options.remove();
    options.querySelector('.cancel').onclick = () => options.remove();

options.querySelector('#doRetweet').onclick = () => {
    const data = window.TwitterApp.store.get();
    const acc = data.accounts.find(a => a.id === data.currentAccountId);

    // 增加原推文转发数
    tweet.retweets = (tweet.retweets || 0) + 1;

    // 创建转发推文（显示在主页）
    const retweetPost = {
        id: window.Utils.generateId('tweet'),
        accountId: data.currentAccountId,
        text: '',
        time: Date.now(),
        likes: 0,
        retweets: 0,
        replies: 0,
        views: 0,
        images: [],
        comments: [],
        isRetweet: true,
        originalTweet: {
            id: tweet.id,
            text: tweet.text,
            aiName: tweet.aiName || acc.name,
            aiHandle: tweet.aiHandle || acc.handle,
            aiAvatar: tweet.aiAvatar || acc.avatar
        }
    };

    window.TwitterApp.store.update(d => {
        // 更新原推文转发数
        const t = d.tweets.find(x => x.id === tweet.id);
        if(t) t.retweets = tweet.retweets;
        // 添加转发到时间线
        d.tweets.unshift(retweetPost);
    });

    options.remove();
    window.TwitterApp.renderHome();
    alert('转发成功！');
};


    options.querySelector('#doQuote').onclick = () => {
        options.remove();
        this.openQuoteModal(tweet);
    };
}

// 引用推文弹窗
openQuoteModal(originalTweet) {
    const modal = document.createElement('div');
    modal.className = 'sub-page';
    modal.id = 'tQuoteModal';
    modal.style.cssText = 'display:flex; z-index:80; flex-direction:column;';
    modal.innerHTML = `
        <div class="sub-header" style="display:flex; justify-content:space-between; align-items:center; padding:10px 15px; border-bottom:1px solid #eee;">
            <button class="back-btn" id="closeQuoteBtn" style="border:none; background:none; font-size:16px; cursor:pointer;">取消</button>
            <button class="send-btn" id="doQuotePostBtn" style="background:#333; color:white; border:none; border-radius:20px; padding:8px 20px; font-weight:bold; cursor:pointer;">发布</button>
        </div>
        <div style="flex:1; overflow-y:auto; padding:15px;">
            <textarea id="quoteInput" placeholder="添加评论..." style="width:100%; height:100px; border:none; outline:none; font-size:16px; resize:none; font-family:inherit;"></textarea>
            <div class="tweet-quote" style="margin-top:15px; border:1px solid #eee; border-radius:12px; padding:12px;">
                <div class="quote-header" style="display:flex; align-items:center; margin-bottom:8px;">
                    <div style="width:24px; height:24px; border-radius:50%; background:#ccc; background-image:url('${originalTweet.aiAvatar || ''}'); background-size:cover; margin-right:8px;"></div>
                    <span style="font-weight:700; font-size:14px; margin-right:5px;">${originalTweet.aiName || '我'}</span>
                    <span style="color:#536471; font-size:14px;">${originalTweet.aiHandle || '@me'}</span>
                </div>
                <div style="font-size:14px; color:#333; line-height:1.4;">${originalTweet.text.substring(0, 150)}${originalTweet.text.length > 150 ? '...' : ''}</div>
            </div>
        </div>
    `;
    document.getElementById('twitterApp').appendChild(modal);

// 取消按钮 - 确保能关闭
document.getElementById('closeQuoteBtn').onclick = () => {
    const modal = document.getElementById('tQuoteModal');
    if(modal) modal.remove();
};

// 点击遮罩层也能关闭
modal.onclick = (e) => {
    if(e.target === modal) modal.remove();
};


    // 发布按钮
    document.getElementById('doQuotePostBtn').onclick = () => {
        const text = document.getElementById('quoteInput').value.trim();
        if(!text) {
            alert('请输入内容');
            return;
        }

        const data = this.store.get();
        const newTweet = {
            id: window.Utils.generateId('tweet'),
            accountId: data.currentAccountId,
            text: text,
            time: Date.now(),
            likes: 0,
            retweets: 0,
            replies: 0,
            views: 0,
            images: [],
            textImages: [],
            poll: null,
            location: null,
            quoteId: originalTweet.id,
            comments: []
        };

        this.store.update(d => d.tweets.unshift(newTweet));
        modal.remove();
        this.renderHome();
        this.generateInteractions(newTweet.id, text);
    };
}






async openTweetDetail(t) {
    const tweetId = t.id;
    if(!t.comments) t.comments = [];
    const detail = document.getElementById('tTweetDetail');
    const content = document.getElementById('tDetailContent');
    content.innerHTML = '';


    // 确保 comments 数组存在
    if(!t.comments) t.comments = [];

    const mainTweet = await this.createTweetElement(t);
    mainTweet.style.borderBottom = '1px solid #eff3f4';
    content.appendChild(mainTweet);

    const commentsDiv = document.createElement('div');
    commentsDiv.id = 'tweetComments';
    commentsDiv.style.padding = '0 15px';

    // 保存当前推文ID用于闭包
    const currentTweetId = t.id;

    const renderComments = async () => {
        commentsDiv.innerHTML = '';
        // 重新获取最新数据
        const freshData = this.store.get();
const freshTweet = freshData.tweets.find(x => x.id === currentTweetId);
const comments = freshTweet?.comments || t.comments || [];


        if(comments.length > 0) {
            for(const c of comments) {
                const div = document.createElement('div');
                div.className = 'tweet-item';
                div.style.borderBottom = '1px solid #eff3f4';

                let avatar = window.Utils.generateDefaultAvatar(c.name);
                if(c.avatar) avatar = c.avatar;
                if(avatar && avatar.startsWith('img_')) avatar = await window.db.getImage(avatar);

                div.innerHTML = `
                    <div class="tweet-avatar" style="background-image:url('${avatar}')"></div>
                    <div class="tweet-content">
                        <div class="tweet-header">
                            <span class="tweet-name">${c.name}</span>
                            <span class="tweet-handle">${c.handle}</span>
                            <span class="tweet-time">${this.timeSince(c.time)}</span>
                        </div>
                        <div class="tweet-text">${c.text}</div>
                        <div class="tweet-actions" style="margin-top:8px;">
                            <div class="t-action-btn comment-reply-btn" data-comment-name="${c.name}"><i class="far fa-comment"></i></div>
                            <div class="t-action-btn"><i class="far fa-heart"></i></div>
                        </div>
                    </div>
                `;
                div.style.cursor = 'pointer';
div.onclick = (e) => {
    e.stopPropagation();
    if(!c.replies) c.replies = [];
    c._parentTweetId
 = currentTweetId;
    const fakeTweet = {
        id: c.id || Date.now(),
        text: c.text,
        aiName: c.name,
        aiHandle: c.handle,
        aiAvatar: c.avatar,
        isAI: true,
        time: c.time,
        likes: c.likes || 0,
        retweets: 0,
        replies: c.replies.length,
comments: c.replies,
_parentTweetId: currentTweetId,
_parentCommentId: c.id

    };
    this.openTweetDetail(fakeTweet);
};

                commentsDiv.appendChild(div);
// 渲染评论的回复（套娃）- 修复头像问题
if(c.replies && c.replies.length > 0) {
    for(const reply of c.replies) {
        const replyDiv = document.createElement('div');
        replyDiv.className = 'tweet-item';
        replyDiv.style.cssText = 'border-bottom:1px solid #eff3f4; margin-left:50px; border-left:2px solid #cfd9de; padding-left:15px;';

        // 正确获取头像
        let replyAvatar = reply.avatar;
        if(replyAvatar && replyAvatar.startsWith('img_')) {
            replyAvatar = await window.db.getImage(replyAvatar);
        }
        if(!replyAvatar) {
            replyAvatar = window.Utils.generateDefaultAvatar(reply.name);
        }

        replyDiv.innerHTML = `
            <div class="tweet-avatar" style="background-image:url('${replyAvatar}'); width:30px; height:30px; border-radius:50%; background-size:cover; background-position:center; flex-shrink:0; margin-right:10px;"></div>
            <div class="tweet-content">
                <div class="tweet-header">
                    <span class="tweet-name" style="font-size:13px;">${reply.name}</span>
                    <span class="tweet-handle" style="font-size:12px;">${reply.handle}</span>
                    <span class="tweet-time" style="font-size:12px;">${this.timeSince(reply.time)}</span>
                </div>
                <div class="tweet-text" style="font-size:14px;">${reply.text}</div>
                <div class="tweet-actions" style="margin-top:5px;">
                    <div class="t-action-btn"><i class="far fa-comment"></i> <span>${reply.replies?.length || 0}</span></div>
                    <div class="t-action-btn"><i class="far fa-heart"></i> <span>${reply.likes || 0}</span></div>
                </div>
            </div>
        `;

        replyDiv.style.cursor = 'pointer';
        replyDiv.onclick = (e) => {
            e.stopPropagation();
            if(!reply.replies) reply.replies = [];
            const fakeTweet = {
                id: reply.id || Date.now(),
                text: reply.text,
                aiName: reply.name,
                aiHandle: reply.handle,
                aiAvatar: replyAvatar,
                isAI: true,
                time: reply.time,
                likes: reply.likes || 0,
                retweets: 0,
                replies: reply.replies.length,
                comments: reply.replies,
                _parentTweetId: currentTweetId,
                _parentCommentId: c.id
            };
            this.openTweetDetail(fakeTweet);
        };

        commentsDiv.appendChild(replyDiv);
    }
}


            }
        } else {
            commentsDiv.innerHTML = '<div style="padding:20px;text-align:center;color:#999;">暂无评论，快来抢沙发！</div>';
        }
    };
    await renderComments();

    content.appendChild(commentsDiv);
    detail.style.display = 'flex';
    // Reply Logic - 获取元素并绑定事件
    const replyBtn = document.getElementById('tweetReplyBtn');
    const replyInput = document.getElementById('tweetReplyInput');

    // 清空输入框
    replyInput.value = '';

    // 移除旧的事件监听器，添加新的
    const newReplyBtn = replyBtn.cloneNode(true);
    replyBtn.parentNode.replaceChild(newReplyBtn, replyBtn);

    const newReplyInput = replyInput.cloneNode(true);
    replyInput.parentNode.replaceChild(newReplyInput, replyInput);

    // 获取新元素
    const finalReplyBtn = document.getElementById('tweetReplyBtn');
    const finalReplyInput = document.getElementById('tweetReplyInput');

const handleReply = async () => {
    const text = finalReplyInput.value.trim();
    if(!text) {
        alert('请输入评论内容');
        return;
    }

    const data = this.store.get();
    const acc = data.accounts.find(a => a.id === data.currentAccountId);

    if(!acc) {
        alert('账号信息获取失败');
        return;
    }

    const newComment = {
        id: window.Utils.generateId('comment'),  // ✅ 确保有唯一ID
        name: acc.name,
        handle: acc.handle,
        text: text,
        time: Date.now(),
        avatar: acc.avatar || '',
        likes: 0,
        replies: []
    };

    // ✅ 修复：使用 currentTweetId 而不是 tweetId
    this.store.update(d => {
        if(t._parentTweetId) {
            // 套娃层：回复评论
            const parentTweet = d.tweets.find(x => x.id === t._parentTweetId);
            if(parentTweet && parentTweet.comments) {
                const findAndAddReply = (comments) => {
                    for(let c of comments) {
                        if(c.id === t._parentCommentId || c.id === t.id) {
                            if(!c.replies) c.replies = [];
                            c.replies.push(newComment);
                            return true;
                        }
                        if(c.replies && findAndAddReply(c.replies)) return true;
                    }
                    return false;
                };
                findAndAddReply(parentTweet.comments || []);
            }
        } else {
            // 第一层：直接评论推文
            const tweet = d.tweets.find(x => x.id === currentTweetId);  // ✅ 使用 currentTweetId
            if(tweet) {
                if(!tweet.comments) tweet.comments = [];
                tweet.comments.push(newComment);
                tweet.replies = tweet.comments.length;
            }
        }
    });

    // 更新本地数据
    if(!t.comments) t.comments = [];
    t.comments.push(newComment);
    t.replies = (t.replies || 0) + 1;

    // 清空输入框
    finalReplyInput.value = '';

    // 重新渲染评论
    await renderComments();

    // 显示成功提示
    this.showToast('评论发送成功！');



        // AI Auto Reply - 自动生成其他用户的回复
        const apiConfig = window.API.getConfig();
        if(apiConfig.chatApiKey) {
            // 获取最新推文数据
            const latestData = this.store.get();
            const latestTweet = latestData.tweets.find(x => x.id === currentTweetId);

            const prompt = `用户回复了推文 "${latestTweet?.text || ''}"。
用户说: "${text}"。
请生成 1-10 条其他用户对这条评论的回复或原推主的回复。要求口语化、真实、符合社交媒体风格。
返回JSON数组: [{"name": "用户名", "handle": "@handle", "text": "回复内容"}]`;

            try {
                const res = await window.API.callAI(prompt, apiConfig);
                let replies = [];
                try {
                    replies = JSON.parse(res);
                } catch(e) {
                    const match = res.match(/\[[\s\S]*\]/);
                    if(match) replies = JSON.parse(match[0]);
                }

                if(Array.isArray(replies) && replies.length > 0) {
                    this.store.update(d => {
                        const tweet = d.tweets.find(x => x.id === currentTweetId);
                        if(tweet) {
                            if(!tweet.comments) tweet.comments = [];
                            replies.forEach(r => {
                                tweet.comments.push({
                                    name: r.name,
                                    handle: r.handle,
                                    text: r.text,
                                    time: Date.now(),
                                    avatar: ''
                                });
                                tweet.replies = (tweet.replies || 0) + 1;
                            });
                        }
                    });
                    await renderComments();
                }
            } catch(e) {
                console.error('AI回复生成失败:', e);
            }
        }
    };

    // 绑定点击事件
    finalReplyBtn.onclick = handleReply;

    // 绑定回车键事件
    finalReplyInput.onkeydown = (e) => {
        if(e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleReply();
        }
    };
}

// 添加 Toast 提示方法（如果不存在的话）
showToast(message) {
    // 移除已存在的toast
    const existingToast = document.querySelector('.t-toast');
    if(existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 't-toast';
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: #1d9bf0;
        color: white;
        padding: 12px 24px;
        border-radius: 20px;
        font-size: 14px;
        z-index: 9999;
        animation: fadeInUp 0.3s ease;
    `;
    toast.innerText = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}


// ========== 自动生成AI回复 ==========
async generateAutoReply(tweetId, userComment) {
    const apiConfig = window.API.getConfig();
    if (!apiConfig.chatApiKey) return;

    const data = this.store.get();
    const tweet = data.tweets.find(x => x.id === tweetId);
    if (!tweet) return;

    const prompt = `推文内容："${tweet.text.substring(0, 80)}"
用户评论："${userComment.text}"
${userComment.replyTo ? `（回复@${userComment.replyTo}）` : ''}

生成1-10条自然的回复，可以是原博主回复或其他网友回复。
口语化、真实、有网感，可以用emoji。

返回JSON数组：[{"name":"昵称","handle":"@xxx","text":"内容","replyTo":"被回复人handle或null"}]`;

    try {
        const res = await window.API.callAI(prompt, apiConfig);
        let replies = [];
        try {
            replies = JSON.parse(res);
        } catch (e) {
            const match = res.match(/\[[\s\S]*\]/);
            if (match) replies = JSON.parse(match[0]);
        }

        if (Array.isArray(replies) && replies.length > 0) {
            this.store.update(d => {
                const tw = d.tweets.find(x => x.id === tweetId);
                if (tw) {
                    replies.forEach(r => {
                        tw.comments.push({
                            id: 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                            name: r.name,
                            handle: r.handle,
                            text: r.text,
                            time: Date.now(),
                            avatar: window.Utils.generateDefaultAvatar(r.name),
                            likes: Math.floor(Math.random() * 20),
                            replyTo: r.replyTo ? r.replyTo.replace('@', '') : null
                        });
                    });
                    tw.replies = tw.comments.length;
                }
            });
        }
    } catch (e) {
        console.error('自动回复生成失败:', e);
    }
}


// ===== 新增：自动生成AI回复用户评论 =====
async generateReplyToUser(tweet, userComment) {
    const apiConfig = window.API.getConfig();
    if(!apiConfig.chatApiKey) return;

    const prompt = `用户在推文"${tweet.text.substring(0, 50)}"下评论了："${userComment.text}"
${userComment.replyTo ? `（这是回复@${userComment.replyTo}的）` : ''}

请生成1-10条其他用户的回复。可以是：
- 回复用户的评论
- 原推主的回复
- 路人的附和或反驳

要求口语化、真实、有网感。
返回JSON：[{"name":"名字","handle":"@xxx","text":"回复内容","replyTo":"@被回复者handle或null"}]`;

    try {
        const res = await window.API.callAI(prompt, apiConfig);
        let replies = [];
        try {
            replies = JSON.parse(res);
        } catch(e) {
            const match = res.match(/\[[\s\S]*\]/);
            if(match) replies = JSON.parse(match[0]);
        }

        if(Array.isArray(replies) && replies.length > 0) {
            this.store.update(d => {
                const t = d.tweets.find(x => x.id === tweet.id);
                if(t) {
                    replies.forEach(r => {
                        t.comments.push({
                            id: 'comment_' + Date.now() + '_' + Math.random().toString(36).substr(2,5),
                            name: r.name,
                            handle: r.handle,
                            text: r.text,
                            time: Date.now(),
                            avatar: window.Utils.generateDefaultAvatar(r.name),
                            likes: Math.floor(Math.random() * 10),
                            replyTo: r.replyTo ? r.replyTo.replace('@', '') : null
                        });
                    });
                    t.replies = t.comments.length;
                }
            });
        }
    } catch(e) {
        console.error('生成回复失败:', e);
    }
}


// 辅助方法 - 如果没有的话添加



focusReply() {
    document.getElementById('tweetReplyInput').focus();
}

likeTweet(tweetId) {
    this.store.update(d => {
        const t = d.tweets.find(x => x.id === tweetId);
        if(t) {
            t.liked = !t.liked;
            t.likes = t.liked ? (t.likes + 1) : (t.likes - 1);
        }
    });
    const t = this.store.get().tweets.find(x => x.id === tweetId);
    if(t) this.openTweetDetail(t);
}





// 创建评论元素
async createCommentElement(c, tweet) {
    const div = document.createElement('div');
    div.className = 't-comment-item';

    let avatar = c.avatar;
    if(avatar && avatar.startsWith('img_')) {
        avatar = await window.db.getImage(avatar);
    } else if(!avatar) {
        avatar = window.Utils.generateXDefaultAvatar();
    }

    div.innerHTML = `
        <div class="t-comment-avatar" style="background-image:url('${avatar}')"></div>
        <div class="t-comment-content">
            <div class="t-comment-header">
                <span class="t-comment-name">${c.name}</span>
                <span class="t-comment-handle">${c.handle}</span>
                <span class="t-comment-time">${this.timeSince(c.time)}</span>
            </div>
            <div class="t-comment-text">${c.text}</div>
            <div class="t-comment-actions">
                <div class="t-comment-action"><i class="far fa-comment"></i> ${c.replies?.length || 0}</div>
                <div class="t-comment-action like-btn"><i class="far fa-heart"></i> ${c.likes || 0}</div>
            </div>
        </div>
    `;

    div.querySelector('.t-comment-avatar').onclick = (e) => {
        e.stopPropagation();
        this.renderProfile({
            name: c.name,
            handle: c.handle,
            avatar: avatar,
            bio: ''
        });
    };

    div.querySelector('.like-btn').onclick = (e) => {
        e.stopPropagation();
        c.likes = (c.likes || 0) + 1;
        this.store.update(d => {
            const tw = d.tweets.find(x => x.id === tweet.id);
            if(tw) {
                const comment = tw.comments.find(x => x.id === c.id);
                if(comment) comment.likes = c.likes;
            }
        });
        e.currentTarget.innerHTML = `<i class="fas fa-heart" style="color:#ff6b6b;"></i> ${c.likes}`;
    };

    return div;
}

async generateMoreComments(tweet) {
    const apiConfig = window.API.getConfig();
    if(!apiConfig.chatApiKey) {
        alert('请先配置API');
        return;
    }

    const data = this.store.get();
    const settings = data.settings || {};
    const worldSetting = settings.worldSetting || '现代都市';

    const prompt = `【世界观】${worldSetting}

【推文内容】"${tweet.text}"

【已有评论数】${tweet.comments?.length || 0}条

【生成要求】再生成10-15条新评论

【活人感评论 - 极其重要】

1.【类型分布】
- 3条极短："哈哈""6""真的假的""？""啊这"
- 3条短评：一句话吐槽/共鸣
- 2条中等：分享自己的经历
- 2条在回复别人
- 1条杠精或阴阳人
- 1条跑题的
- 1条玩梗的

2.【禁止】
- ❌ 禁止书面语
- ❌ 禁止都很友善
- ❌ 禁止敷衍评论
- ❌ 禁止AI味

【返回格式】JSON数组
[{"name":"网名","handle":"@xx","text":"评论","likes":0-50,"replyTo":"@被回复者或null"}]`;

    try {
        const res = await window.API.callAI(prompt, apiConfig);
        let comments = [];
        try {
            comments = JSON.parse(res);
        } catch(e) {
            const match = res.match(/\[[\s\S]*\]/);
            if(match) comments = JSON.parse(match[0]);
        }

        if(Array.isArray(comments) && comments.length > 0) {
            const newComments = comments.map(c => ({
                id: window.Utils.generateId('comment'),
                name: c.name,
                handle: c.handle,
                text: c.text,
                time: Date.now() - Math.floor(Math.random() * 3600000),
                avatar: window.Utils.generateXDefaultAvatar(),
                likes: c.likes || Math.floor(Math.random() * 50),
                replyTo: c.replyTo || null,
                replies: []
            }));

            this.store.update(d => {
                const t = d.tweets.find(x => x.id === tweet.id);
                if(t) {
                    if(!t.comments) t.comments = [];
                    t.comments = t.comments.concat(newComments);
                    t.replies = t.comments.length;
                }
            });

            // 刷新详情页
            const updatedData = this.store.get();
            const updatedTweet = updatedData.tweets.find(t => t.id === tweet.id);
            if(updatedTweet) {
                this.openTweetDetail(updatedTweet);
            }
        }
    } catch(e) {
        console.error('生成评论失败:', e);
        alert('生成失败，请重试');
    }
}





// 用户评论后自动生成AI回复
async generateReplyToUserComment(tweet, userComment) {
    const apiConfig = window.API.getConfig();
    if(!apiConfig.chatApiKey) return;

    const prompt = `用户回复了推文"${tweet.text.substring(0, 50)}"。
    用户说："${userComment.text}"。
    请生成2-3条其他用户的回应（可能是回复用户也可能是新评论）。
    返回JSON数组：[{"name":"用户名","handle":"@xxx","text":"回复内容"}]`;

    try {
        const res = await window.API.callAI(prompt, apiConfig);
        const replies = JSON.parse(res);

        if(Array.isArray(replies)) {
            const newComments = replies.map(r => ({
                id: window.Utils.generateId('comment'),
                name: r.name,
                handle: r.handle,
                text: r.text,
                time: Date.now(),
                avatar: window.Utils.generateXDefaultAvatar(),
                likes: 0,
                replies: []
            }));

            this.store.update(d => {
                const t = d.tweets.find(x => x.id === tweet.id);
                if(t) {
                    t.comments.push(...newComments);
                    t.replies = t.comments.length;
                }
            });

            tweet.comments.push(...newComments);
            this.openTweetDetail(tweet);
        }
    } catch(e) {
        console.error(e);
    }
}


async generateTimeline() {
    const apiConfig = window.API.getConfig();
    if(!apiConfig.chatApiKey) return alert('请先配置 API Key');

    const btn = document.getElementById('tHeaderGenBtn');
    const originalIcon = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const data = this.store.get();
    const settings = data.settings || {};
    const worldSetting = settings.worldSetting || '现代都市';
    const acc = data.accounts.find(a => a.id === data.currentAccountId);

    const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');


    const boundRoles = settings.boundRoles || [];
    const boundContext = boundRoles.map(b => {
        const f = qqData.friends.find(fr => fr.id === b.qqId);
        if(!f) return '';
        return `【${f.name}】Twitter:${b.twitterHandle} | 人设:${f.persona || '自由发挥'} | 与用户${acc.name}关系亲密，知道用户真实身份，可能@用户或发和用户相关的内容`;
    }).filter(Boolean).join('\n');


    const enabledRoles = settings.enabledRoles || [];
    const enabledContext = enabledRoles.map(b => {
        const f = qqData.friends.find(fr => fr.id === b.qqId);
        if(!f) return '';
        return `【${f.name}】Twitter:${b.twitterHandle} | 人设:${f.persona || '自由发挥'} | ⚠️完全不认识用户，只是普通推特用户`;
    }).filter(Boolean).join('\n');

    // 用户热度
    const userHotness = this.calculateUserHotness();

    const prompt = `【世界观】
${worldSetting}

【你的任务】
生成15-20条极度真实的推特推文。每个人都是活生生的人，有自己的生活、情绪、习惯。

【特殊角色 - 必须出现】
${boundContext || '无绑定角色'}

${enabledContext || '无开启角色'}

${userHotness > 50 ? `【热度事件】用户${acc.name}(${acc.handle})目前很火(${userHotness}/100)，会有人讨论/模仿/蹭热度` : ''}

【活人感要求 - 这是最重要的】

1. 【说话方式千差万别】
   - 有人打字飞快错别字连篇："卧槽今天加班到凌晨三点老子不敢了"
   - 有人一本正经像在写公文："关于今天的会议，我有几点想法需要分享"
   - 有人全是emoji："😭😭😭救命啊啊啊啊"
   - 有人惜字如金就三个字："下班了"
   - 有人碎碎念能写一百字
   - 有人只发表情包描述"[图片：一只猫瘫在地上]"
   - 有人说话阴阳怪气："哦~原来是这样啊~懂了懂了~"
   - 有人就是在发疯没有逻辑："啊啊啊啊啊啊啊啊啊啊啊"

2. 【情绪真实不装】
   - 凌晨三点的emo："为什么我总是这样"
   - 上班摸鱼的无聊："好无聊 好想下班 还有四个小时"
   - 刚吵完架的烦躁："有些人真的是 算了不说了"
   - 突然的开心："！！！出了出了终于出了"
   - 莫名其妙的丧："活着好累"
   - 分享快乐："今天奶茶超好喝推荐"

3. 【内容杂乱真实】
   - 追星的在刷屏
   - 打游戏的在骂队友
   - 上班的在摸鱼
   - 学生在哭作业
   - 有人在吐槽外卖
   - 有人在晒猫
   - 有人在发疯文学
   - 有人在认真讨论时事
   - 有人在打广告
   - 有人在阴阳怪气

4. 【禁止事项】
   - ❌ 禁止每个人都积极向上
   - ❌ 禁止整齐的标点符号
   - ❌ 禁止"今天是美好的一天"
   - ❌ 禁止"分享一下我的"
   - ❌ 禁止教科书式的表达
   - ❌ 禁止每条都有完整主谓宾
   - ❌ 禁止AI味的总结性发言

5. 【推文长度分布】
   - 30%: 1-10字（"啊""救""？？？""下班""累死"）
   - 40%: 10-50字
   - 20%: 50-100字
   - 10%: 100字以上的长文

6. 【必须包含】
   - 至少3条有明显错别字/打字错误
   - 至少5条带emoji
   - 至少2条纯表情/颜文字
   - 至少2条在回复/引用别人
   - 至少1条是在吵架/阴阳怪气
   - 至少1条发疯文学
   - 至少1条是广告/推广

【返回格式】JSON数组：
[
  {
    "name": "用户名（创意网名如'今天也想辞职''救命我家猫又吐了'）",
    "handle": "@xxx",
    "text": "推文内容",
    "personality": "这个人的特点（暴躁/温柔/话痨/阴阳人/正经/发疯）",
    "mood": "当前情绪",
    "stats": {"views": 100-50000, "likes": 0-2000, "retweets": 0-500, "replies": 0-200},
    "location": "位置（20%填写，可以是正经地名也可以是'被窝''精神状态不稳定''火星'）",
    "comments": [
      {"name": "评论者", "handle": "@xx", "text": "评论内容（同样要活人感）", "likes": 0-100}
    ]
  }
]

每条推文必须生成2-10条评论！评论也要活人感！`;

    try {
        const res = await window.API.callAI(prompt, apiConfig);
        let tweets = [];
        try {
            tweets = JSON.parse(res);
        } catch(e) {
            const match = res.match(/\[[\s\S]*\]/);
            if(match) tweets = JSON.parse(match[0]);
        }

        if(Array.isArray(tweets) && tweets.length > 0) {
            const newTweets = [];
            for(const t of tweets) {
                let avatar = window.Utils.generateXDefaultAvatar();
                let avatarSource = 'x';


                const bound = boundRoles.find(b => b.twitterHandle === t.handle);
                const enabled = enabledRoles.find(b => b.twitterHandle === t.handle);

if(bound) {
    avatarSource = 'qq';
    const f = qqData.friends.find(fr => fr.id === bound.qqId);
    if(f && f.avatar) {
        // ✅ 检查是否需要解析
        if(f.avatar.startsWith('img_')) {
            avatar = await window.db.getImage(f.avatar) || window.Utils.generateXDefaultAvatar();
        } else {
            avatar = f.avatar;
        }
    }
}
 else if(enabled) {
                    avatarSource = 'qq';
                    const f = qqData.friends.find(fr => fr.id === enabled.qqId);
                    if(f && f.avatar) avatar = f.avatar;
                }

                const comments = (t.comments || []).map(c => ({
                    id: window.Utils.generateId('comment'),
                    name: c.name,
                    handle: c.handle,
                    text: c.text,
                    time: Date.now() - Math.floor(Math.random() * 3600000),
                    avatar: window.Utils.generateXDefaultAvatar(),
                    likes: c.likes || Math.floor(Math.random() * 50),
                    replies: []
                }));

                newTweets.push({
                    id: window.Utils.generateId('tweet'),
                    accountId: 'ai_generated',
                    isAI: true,
                    aiName: t.name,
                    aiHandle: t.handle,
                    aiAvatar: avatar,
                    aiBio: '',
                    aiPersonality: t.personality || '',
                    text: t.text,
                    location: t.location || null,
                    time: Date.now() - Math.floor(Math.random() * 7200000),
                    likes: t.stats?.likes || Math.floor(Math.random() * 500),
                    retweets: t.stats?.retweets || Math.floor(Math.random() * 100),
                    replies: comments.length,
                    views: t.stats?.views || Math.floor(Math.random() * 10000),
                    images: [],
                    quoteId: null,
                    comments: comments
                });
            }

            this.store.update(d => d.tweets.push(...newTweets));
            this.renderHome();
        }
    } catch(e) {
        console.error(e);
        alert('生成失败：' + e.message);
    } finally {
        btn.innerHTML = originalIcon;
    }
}



async renderSearch() {
    const apiConfig = window.API.getConfig();
    const container = document.getElementById('t-search');

    container.innerHTML = `
        <div class="t-search-header">
            <div class="t-search-box">
                <i class="fas fa-search" style="color:#999;margin-right:10px;"></i>
                <input type="text" class="t-search-input" id="tSearchInput" placeholder="搜索">
                <button class="t-search-btn" id="tSearchBtn">搜索</button>
            </div>
        </div>
        <div class="t-trends-list" id="tTrendsList">
            <div style="text-align:center;padding:30px;color:#999;">输入内容后点击搜索</div>
        </div>
    `;

    const input = document.getElementById('tSearchInput');
    const btn = document.getElementById('tSearchBtn');

    // 回车搜索
    input.onkeydown = (e) => {
        if(e.key === 'Enter') {
            const q = e.target.value.trim();
            if(q) this.performSearch(q);
        }
    };

    // 点击按钮搜索
    btn.onclick = () => {
        const q = input.value.trim();
        if(q) this.performSearch(q);
    };

    // 自动加载热搜
    if(apiConfig.chatApiKey) {
        document.getElementById('tTrendsList').innerHTML = '<div style="text-align:center;padding:20px;color:#999;"><i class="fas fa-spinner fa-spin"></i> 加载热搜...</div>';
        const prompt = `生成5-8个推特热搜话题包含排名、话题名称、推文数量。返回JSON: [{"rank": 1, "topic": "话题", "posts": "1.2M"}]`;
        try {
            const res = await window.API.callAI(prompt, apiConfig);
            const trends = JSON.parse(res);
            const list = document.getElementById('tTrendsList');
            list.innerHTML = '<div style="padding:15px 15px 5px;font-weight:700;font-size:18px;">热门趋势</div>';
            trends.forEach(t => {
                const div = document.createElement('div');
                div.className = 't-trend-item';
                div.style.cssText = 'padding:12px 15px;border-bottom:1px solid #f0f0f0;cursor:pointer;';
                div.innerHTML = `
                    <div style="font-size:12px;color:#666;">${t.rank} · 热门</div>
                    <div style="font-weight:700;margin:3px 0;">#${t.topic}</div>
                    <div style="font-size:12px;color:#999;">${t.posts} 帖子</div>
                `;
                div.onclick = () => this.performSearch(t.topic);
                list.appendChild(div);
            });
        } catch(e) {
            document.getElementById('tTrendsList').innerHTML = '<div style="text-align:center;padding:20px;color:#999;">热搜加载失败</div>';
        }
    }
}



async performSearch(query) {
    const apiConfig = window.API.getConfig();
    if(!apiConfig.chatApiKey) return alert('请先配置 API Key');

    const container = document.getElementById('tTrendsList') || document.getElementById('t-search');
    container.innerHTML = '<div style="padding:30px;text-align:center;"><i class="fas fa-spinner fa-spin"></i> 搜索中...</div>';

    const prompt = `搜索"${query}"生成推特搜索结果。

【活人感要求】
1. 推文内容多样：有认真讨论的、有玩梗的、有吐槽的、有跑题的
2. 回复推文要有上下文：显示是在回复谁说了什么
3. 用户资料要真实：粉丝数差异大（从几十到几十万）
4. 不要都是正面内容：有争议、有批评、有无关内容

返回JSON：{
    "tweets": [
        {"name":"用户名","handle":"@xxx","text":"推文内容","likes":100,"retweets":20,"replies":5,"views":1000}
    ],
    "replies": [
        {
            "name":"回复者用户名",
            "handle":"@xxx",
            "text":"回复内容",
            "replyTo": {"name":"原作者","handle":"@original","text":"原推文内容片段"},
            "likes":50
        }
    ],
    "users": [
        {"name":"用户名","handle":"@xxx","bio":"简介","followers":1000,"isVerified":false}
    ]
}

要求：tweets 6条以上，replies 6条以上，users 5个以上。`;

    try {
        const res = await window.API.callAI(prompt, apiConfig);
        let searchData;
        try {
            searchData = JSON.parse(res);
        } catch(e) {
            const match = res.match(/\{[\s\S]*\}/);
            if(match) searchData = JSON.parse(match[0]);
        }

        if(!searchData) {
            container.innerHTML = '<div style="padding:30px;text-align:center;color:#999;">搜索失败请重试</div>';
            return;
        }

        // 保存搜索结果供Tab切换使用
        this.currentSearchResults = searchData;
        this.currentSearchQuery = query;

        container.innerHTML = '';

        // 搜索结果Tab（三个）
        const tabs = document.createElement('div');
        tabs.className = 't-search-tabs';
        tabs.innerHTML = `
            <div class="t-search-tab active" data-tab="tweets">推荐</div>
            <div class="t-search-tab" data-tab="replies">回复</div>
            <div class="t-search-tab" data-tab="users">用户</div>
        `;
        container.appendChild(tabs);

        const content = document.createElement('div');
        content.id = 'searchResultContent';
        content.style.cssText = 'flex:1;overflow-y:auto;';
        container.appendChild(content);

// Tab切换事件
tabs.querySelectorAll('.t-search-tab').forEach(tab => {
    tab.onclick = () => {
        // ✅ 新增检查
        if(!this.currentSearchResults) {
            alert('请先执行搜索');
            return;
        }
        tabs.querySelectorAll('.t-search-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.renderSearchTab(tab.dataset.tab);
    };
});


        // 默认显示推荐
        this.renderSearchTab('tweets');

    } catch(e) {
        console.error(e);
        container.innerHTML = '<div style="padding:30px;text-align:center;color:#999;">搜索失败请重试</div>';
    }
}

// 渲染搜索结果Tab内容
async renderSearchTab(tabType) {
    const content = document.getElementById('searchResultContent');
    if(!content) return;

    content.innerHTML = '<div style="padding:20px;text-align:center;"><i class="fas fa-spinner fa-spin"></i></div>';

    const data = this.currentSearchResults;
    if(!data) {
        content.innerHTML = '<div style="padding:30px;text-align:center;color:#999;">暂无数据</div>';
        return;
    }

    content.innerHTML = '';

    if(tabType === 'tweets') {
        // 推荐推文
        const tweets = data.tweets || [];
        if(tweets.length === 0) {
            content.innerHTML = '<div style="padding:30px;text-align:center;color:#999;">暂无相关推文</div>';
            return;
        }

        for(const t of tweets) {
            const div = document.createElement('div');
            div.className = 'tweet-item';
            const avatar = window.Utils.generateXDefaultAvatar();

            div.innerHTML = `
                <div class="tweet-avatar" style="background-image:url('${avatar}')"></div>
                <div class="tweet-content">
                    <div class="tweet-header">
                        <span class="tweet-name">${t.name}</span>
                        ${t.isVerified ? '<i class="fas fa-certificate" style="color:#1d9bf0;font-size:12px;margin:0 3px;"></i>' : ''}
                        <span class="tweet-handle">${t.handle}</span>
                    </div>
                    <div class="tweet-text">${t.text}</div>
                    <div class="tweet-actions">
                        <div class="t-action-btn"><i class="far fa-comment"></i> <span>${t.replies || 0}</span></div>
                        <div class="t-action-btn"><i class="fas fa-retweet"></i> <span>${t.retweets || 0}</span></div>
                        <div class="t-action-btn"><i class="far fa-heart"></i> <span>${t.likes || 0}</span></div>
                        <div class="t-action-btn"><i class="far fa-eye"></i> <span>${this.formatNumber(t.views || 0)}</span></div>
                    </div>
                </div>
            `;

            // 点击头像查看主页
            div.querySelector('.tweet-avatar').onclick = (e) => {
                e.stopPropagation();
                this.renderProfile({
                    name: t.name,
                    handle: t.handle,
                    avatar: avatar,
                    bio: '',
                    isVerified: t.isVerified
                });
            };

            // 点击推文查看详情
            div.onclick = () => {
                this.openSearchTweetDetail(t, avatar);
            };

            content.appendChild(div);
        }

    } else if(tabType === 'replies') {
        // 回复
        const replies = data.replies || [];
        if(replies.length === 0) {
            content.innerHTML = '<div style="padding:30px;text-align:center;color:#999;">暂无相关回复</div>';
            return;
        }

        for(const r of replies) {
            const div = document.createElement('div');
            div.className = 'tweet-item t-search-reply-item';
            const avatar = window.Utils.generateXDefaultAvatar();

            // 显示回复的上下文
            let replyContextHtml = '';
            if(r.replyTo) {
                replyContextHtml = `
                    <div class="t-search-reply-context">
                        <span class="t-reply-context-label">回复</span>
                        <span class="t-reply-context-handle">${r.replyTo.handle}</span>
                    </div>
                    <div class="t-search-original-tweet">
                        <div class="t-original-tweet-text">${r.replyTo.text}</div>
                    </div>
                `;
            }

            div.innerHTML = `
                ${replyContextHtml}
                <div class="t-search-reply-main">
                    <div class="tweet-avatar" style="background-image:url('${avatar}')"></div>
                    <div class="tweet-content">
                        <div class="tweet-header">
                            <span class="tweet-name">${r.name}</span>
                            <span class="tweet-handle">${r.handle}</span>
                        </div>
                        <div class="tweet-text">${r.text}</div>
                        <div class="tweet-actions">
                            <div class="t-action-btn"><i class="far fa-comment"></i> <span>${r.replies || 0}</span></div>
                            <div class="t-action-btn"><i class="fas fa-retweet"></i> <span>${r.retweets || 0}</span></div>
                            <div class="t-action-btn"><i class="far fa-heart"></i> <span>${r.likes || 0}</span></div>
                        </div>
                    </div>
                </div>
            `;

            div.querySelector('.tweet-avatar').onclick = (e) => {
                e.stopPropagation();
                this.renderProfile({
                    name: r.name,
                    handle: r.handle,
                    avatar: avatar,
                    bio: ''
                });
            };

            content.appendChild(div);
        }

    } else if(tabType === 'users') {
        // 用户
        const users = data.users || [];
        if(users.length === 0) {
            content.innerHTML = '<div style="padding:30px;text-align:center;color:#999;">暂无相关用户</div>';
            return;
        }

        for(const u of users) {
            const div = document.createElement('div');
            div.className = 't-search-user-item';
            const avatar = window.Utils.generateXDefaultAvatar();

            // 检查是否已关注
            const storeData = this.store.get();
            const isFollowing = (storeData.following || []).some(f => f.handle === u.handle);

            div.innerHTML = `
                <div class="t-search-user-avatar" style="background-image:url('${avatar}')"></div>
                <div class="t-search-user-info">
                    <div class="t-search-user-name">
                        ${u.name}
                        ${u.isVerified ? '<i class="fas fa-certificate" style="color:#1d9bf0;font-size:12px;margin-left:3px;"></i>' : ''}
                    </div>
                    <div class="t-search-user-handle">${u.handle}</div>
                    <div class="t-search-user-bio">${u.bio || ''}</div>
                    <div class="t-search-user-followers">${this.formatNumber(u.followers || 0)} 粉丝</div>
                </div>
                <button class="t-search-user-follow ${isFollowing ? 'following' : ''}">${isFollowing ? '正在关注' : '关注'}</button>
            `;

            div.onclick = () => {
                this.renderProfile({
                    name: u.name,
                    handle: u.handle,
                    avatar: avatar,
                    bio: u.bio || '',
                    followers: u.followers || 0,
                    isVerified: u.isVerified
                });
            };

            div.querySelector('.t-search-user-follow').onclick = (e) => {
                e.stopPropagation();
                const btn = e.target;
                if(btn.classList.contains('following')) {
                    this.toggleFollow({ name: u.name, handle: u.handle, avatar: avatar, bio: u.bio });
                    btn.classList.remove('following');
                    btn.innerText = '关注';
                } else {
                    this.toggleFollow({ name: u.name, handle: u.handle, avatar: avatar, bio: u.bio });
                    btn.classList.add('following');
                    btn.innerText = '正在关注';
                }
            };

            content.appendChild(div);
        }
    }
}

// 打开搜索结果的推文详情
async openSearchTweetDetail(tweetData, avatar) {
    const apiConfig = window.API.getConfig();

    // 创建临时推文对象
    const tempTweet = {
        id: window.Utils.generateId('temp'),
        isAI: true,
        aiName: tweetData.name,
        aiHandle: tweetData.handle,
        aiAvatar: avatar,
        text: tweetData.text,
        time: Date.now() - Math.floor(Math.random() * 86400000),
        likes: tweetData.likes || 0,
        retweets: tweetData.retweets || 0,
        replies: tweetData.replies || 0,
        views: tweetData.views || 0,
        comments: []
    };

    // 生成评论
    if(apiConfig.chatApiKey && tempTweet.comments.length === 0) {
        try {
            const prompt = `为推文"${tweetData.text.substring(0, 80)}"生成8条评论。
要求：活人感、多样化立场、有长有短。
返回JSON数组：[{"name":"用户名","handle":"@xxx","text":"评论内容","likes":点赞数}]`;

            const res = await window.API.callAI(prompt, apiConfig);
            const comments = JSON.parse(res);

            if(Array.isArray(comments)) {
                tempTweet.comments = comments.map(c => ({
                    id: window.Utils.generateId('comment'),
                    name: c.name,
                    handle: c.handle,
                    text: c.text,
                    time: Date.now() - Math.floor(Math.random() * 3600000),
                    avatar: window.Utils.generateXDefaultAvatar(),
                    likes: c.likes || Math.floor(Math.random() * 30),
                    replies: []
                }));
                tempTweet.replies = tempTweet.comments.length;
            }
        } catch(e) {
            console.error(e);
        }
    }

    this.openTweetDetail(tempTweet);
}



async renderDMs() {
    const container = document.getElementById('t-messages');
    container.innerHTML = '';

    // 先获取数据！
    const data = this.store.get();

    // 创建头部
    const header = document.createElement('div');
    header.className = 't-dm-page-header';
    header.innerHTML = `
        <div class="t-dm-page-title">消息</div>
        <div class="t-dm-page-actions">
            <div class="t-header-icon" id="tNewDmBtn"><i class="fas fa-plus"></i></div>
        </div>
    `;
    container.appendChild(header);

    // 计算未读请求数（现在data已定义）
    const requestCount = (data.dms || []).filter(d =>
        (d.isFriend === false || d.isSensitive === true) &&
        d.messages && d.messages.some(m => m.sender === 'them' && !m.read)
    ).length;

    // Tab切换
    const tabs = document.createElement('div');
    tabs.className = 't-dm-tabs';
    tabs.innerHTML = `
        <div class="t-dm-tab ${this.currentDmTab === 'friends' ? 'active' : ''}" data-tab="friends">主要</div>
        <div class="t-dm-tab ${this.currentDmTab === 'requests' ? 'active' : ''}" data-tab="requests">
            请求
            ${requestCount > 0 ? `<span class="t-dm-tab-badge">${requestCount}</span>` : ''}
        </div>
    `;
    container.appendChild(tabs);

    tabs.querySelectorAll('.t-dm-tab').forEach(tab => {
        tab.onclick = () => {
            this.currentDmTab = tab.dataset.tab;
            this.renderDMs();
        };
    });

// 绑定私信功能按钮
setTimeout(() => {
    const dmImageBtn = document.getElementById('dmImageBtn');
    const dmTextImageBtn = document.getElementById('dmTextImageBtn');
    const dmTransferBtn = document.getElementById('dmTransferBtn');

    if(dmImageBtn) {
        dmImageBtn.onclick = () => this.sendRealImage();
    }
    if(dmTextImageBtn) {
        dmTextImageBtn.onclick = () => this.sendTextImage();
    }
    if(dmTransferBtn) {
        dmTransferBtn.onclick = () => this.openTransferModal();
    }
}, 100);


    // 私信列表
    const list = document.createElement('div');
    list.id = 'dmList';
    list.className = 't-dm-list';
    container.appendChild(list);

    // 继续原来的逻辑...
    let dms = [];
    if(this.currentDmTab === 'friends') {
        dms = (data.dms || []).filter(d => d.isFriend === true || d.isSensitive !== true);
    } else {
        dms = (data.dms || []).filter(d => d.isFriend === false || d.isSensitive === true);
    }


    if(dms.length === 0) {
        list.innerHTML = `
            <div class="t-empty-state">
                <i class="fas fa-envelope-open"></i>
                <div class="t-empty-state-title">${this.currentDmTab === 'friends' ? '暂无消息' : '暂无请求'}</div>
                <div class="t-empty-state-desc">${this.currentDmTab === 'friends' ? '关注的人发送的私信会出现在这里' : '陌生人的私信会出现在这里'}</div>
            </div>
        `;
        return;
    }

    for(const dm of dms) {
        const div = document.createElement('div');
        div.className = 't-dm-item';

        // ===== 修复：正确获取私信对象头像 =====
        let avatar = dm.participant.avatar;

        if(avatar && avatar.startsWith('img_')) {
            // 从数据库读取
            avatar = await window.db.getImage(avatar);
        } else if(!avatar || avatar === '') {
            // 检查是否是绑定/开启的角色
            const settings = data.settings || {};
            const boundRole = (settings.boundRoles || []).find(b => b.twitterHandle === dm.participant.handle);
            const enabledRole = (settings.enabledRoles || []).find(b => b.twitterHandle === dm.participant.handle);

            if(boundRole || enabledRole) {
                const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}');
                const roleId = boundRole ? boundRole.qqId : enabledRole.qqId;
                const friend = (qqData.friends || []).find(f => f.id === roleId);

                if(friend && friend.avatar) {
                    if(friend.avatar.startsWith('img_')) {
                        avatar = await window.db.getImage(friend.avatar);
                    } else {
                        avatar = friend.avatar;
                    }
                }
            }

            // 最后才使用默认头像
            if(!avatar) {
                avatar = window.Utils.generateXDefaultAvatar();
            }
        }
        const lastMsg = dm.messages[dm.messages.length - 1];
        // 计算未读消息数
const unreadCount = dm.messages.filter(m => m.sender === 'them' && !m.read).length;

        let lastMsgText = '开始对话';

        if(lastMsg) {
            switch(lastMsg.type) {
                case 'image':
                    lastMsgText = '[图片]';
                    break;
                case 'textImage':
                    lastMsgText = '[图片描述]';
                    break;
                case 'transfer':
                    lastMsgText = `[转账 ¥${lastMsg.amount}]`;
                    break;
                default:
                    lastMsgText = lastMsg.text || '';
            }
        }

        // 敏感消息标识
        const sensitiveTag = dm.isSensitive ? '<span class="t-dm-sensitive-tag">敏感</span>' : '';
        const messageTypeIcon = dm.messageType === 'spam' ? '<i class="fas fa-exclamation-triangle" style="color:#ff9800;margin-left:5px;font-size:12px;"></i>' : '';

        div.innerHTML = `
            <div class="t-dm-avatar" style="background-image:url('${avatar}')"></div>
            <div class="t-dm-content">
                <div class="t-dm-top">
                    <span class="t-dm-name">${dm.participant.name}</span>
                    <span class="t-dm-handle">${dm.participant.handle}</span>
                    ${messageTypeIcon}
                    <span class="t-dm-date">${lastMsg ? this.timeSince(lastMsg.time) : ''}</span>
                </div>
                <div class="t-dm-msg">${sensitiveTag}${lastMsgText}</div>
            </div>
            ${unreadCount > 0 ? `<div class="t-dm-unread">${unreadCount}</div>` : ''}
        `;


        div.onclick = () => {
            // 标记为已读
            this.store.update(d => {
                const target = d.dms.find(x => x.id === dm.id);
                if(target) {
                    target.messages.forEach(m => m.read = true);
                }
            });
            this.openDMWindow(dm.id);
        };

        list.appendChild(div);
    }
}

    
    switchDmTab(tab) {
        this.currentDmTab = tab;
        this.renderDMs();
    }

// 找到 generateNewDM 方法，替换为：

async generateNewDM() {
    const apiConfig = window.API.getConfig();
    if(!apiConfig.chatApiKey) return alert('请先配置 API Key');

    const data = this.store.get();
    const acc = data.accounts.find(a => a.id === data.currentAccountId);
    const following = data.following || [];

    const prompt = `你扮演一个推特用户，看到了用户 ${acc.name} (${acc.handle}) 的推文。
    用户简介: ${acc.bio || '暂无简介'}
    请生成一个私信对话的开头。
    返回 JSON: {
        "name": "用户名",
        "handle": "@handle",
        "message": "第一条消息",
        "isFollower": true/false (是否关注了用户),
        "messageType": "normal/spam/promo" (消息类型：正常/骚扰/推广)
    }`;

    try {
        const res = await window.API.callAI(prompt, apiConfig);
        const json = JSON.parse(res);

        // 判断是否是朋友（用户关注的人）
        const isFollowingThem = following.some(f => f.handle === json.handle);
        const isFriend = isFollowingThem || json.isFollower === true;

        // 判断是否敏感消息
        const isSensitive = !isFriend || json.messageType === 'spam' || json.messageType === 'promo';

        const id = window.Utils.generateId('dm');
        this.store.update(d => {
            d.dms.push({
                id: id,
                participant: {
                    name: json.name,
                    handle: json.handle,
                    avatar: window.Utils.generateXDefaultAvatar(),
                    isFollower: json.isFollower
                },
                messages: [{
                    id: window.Utils.generateId('msg'),
                    sender: 'them',
                    type: 'text',
                    text: json.message,
                    time: Date.now(),
                    read: false
                }],
                isFriend: isFriend,
                isSensitive: isSensitive,
                messageType: json.messageType || 'normal'
            });
        });

        this.renderDMs();

        // 如果是敏感消息，提示用户
        if(isSensitive) {
            this.addNotification({
                type: 'dm_request',
                fromName: json.name,
                fromHandle: json.handle,
                time: Date.now()
            });
        } else {
            this.openDMWindow(id);
        }
    } catch(e) {
        console.error(e);
        alert('生成失败');
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
            // 敏感消息警告
    if(dm.isSensitive && !dm.sensitiveWarningShown) {
        const warning = document.createElement('div');
        warning.className = 't-dm-sensitive-warning';
        warning.innerHTML = `
            <div class="t-dm-warning-content">
                <i class="fas fa-exclamation-circle"></i>
                <div class="t-dm-warning-text">
                    <div class="t-dm-warning-title">这是来自陌生人的消息请求</div>
                    <div class="t-dm-warning-desc">你们互不关注，请谨慎查看</div>
                </div>
            </div>
            <div class="t-dm-warning-actions">
                <button class="t-dm-warning-delete" id="dmDeleteRequest">删除</button>
                <button class="t-dm-warning-accept" id="dmAcceptRequest">接受</button>
            </div>
        `;

        const messagesContainer = document.getElementById('dmMessages');
        messagesContainer.parentNode.insertBefore(warning, messagesContainer);

        document.getElementById('dmDeleteRequest').onclick = () => {
            this.store.update(d => {
                d.dms = d.dms.filter(x => x.id !== dmId);
            });
            document.getElementById('tDmWindow').style.display = 'none';
            this.renderDMs();
        };

        document.getElementById('dmAcceptRequest').onclick = () => {
            this.store.update(d => {
                const target = d.dms.find(x => x.id === dmId);
                if(target) {
                    target.isSensitive = false;
                    target.isFriend = true;
                    target.sensitiveWarningShown = true;
                }
            });
            warning.remove();
        };
    }
// 强制绑定私信功能按钮
setTimeout(() => {
    const imgBtn = document.getElementById('dmImageBtn');
    const textImgBtn = document.getElementById('dmTextImageBtn');
    const transferBtn = document.getElementById('dmTransferBtn');

    if(imgBtn) imgBtn.onclick = () => this.sendRealImage();
    if(textImgBtn) textImgBtn.onclick = () => this.sendTextImage();
    if(transferBtn) transferBtn.onclick = () => this.openTransferModal();
}, 100);
// ===== 强制重新绑定私信功能按钮 =====
const dmImageBtn = document.getElementById('dmImageBtn');
const dmTextImageBtn = document.getElementById('dmTextImageBtn');
const dmTransferBtn = document.getElementById('dmTransferBtn');

if(dmImageBtn) {
    dmImageBtn.onclick = null;
    dmImageBtn.onclick = () => this.sendRealImage();
}
if(dmTextImageBtn) {
    dmTextImageBtn.onclick = null;
    dmTextImageBtn.onclick = () => this.sendTextImage();
}
if(dmTransferBtn) {
    dmTransferBtn.onclick = null;
    dmTransferBtn.onclick = () => this.openTransferModal();
}

        win.style.display = 'flex';
            
// ✅ 强制重新绑定，延迟确保DOM已渲染
    setTimeout(() =>
 {
        const transferBtn = document.getElementById('dmTransferBtn'
);
        if
(transferBtn) {
            transferBtn.
onclick = (e) =>
 {
                e.
preventDefault
();
                e.
stopPropagation
();
                this.openTransferModal
();
            };
        }
    }, 
100
);

    }

async renderDMMessages() {
    const data = this.store.get();
    const dm = data.dms.find(d => d.id === this.currentDmId);
    if(!dm) return;

    const list = document.getElementById('dmMessages');
    list.innerHTML = '';

    // 更新头部信息
    let avatar = dm.participant.avatar;
    if(avatar && avatar.startsWith('img_')) {
        avatar = await window.db.getImage(avatar);
    } else if(!avatar) {
        avatar = window.Utils.generateXDefaultAvatar();
    }
    document.getElementById('dmHeaderAvatar').style.backgroundImage = `url('${avatar}')`;
    document.getElementById('dmHeaderName').innerText = dm.participant.name;
    document.getElementById('dmHeaderHandle').innerText = dm.participant.handle;

    // 按日期分组
    let currentDate = '';

    for(const m of dm.messages) {
        const msgDate = new Date(m.time).toLocaleDateString();

        // 日期分隔线
        if(msgDate !== currentDate) {
            currentDate = msgDate;
            const dateLine = document.createElement('div');
            dateLine.className = 't-dm-date-line';
            dateLine.innerHTML = `<span>${msgDate}</span>`;
            list.appendChild(dateLine);
        }

        const div = document.createElement('div');
        div.className = `t-msg-wrapper ${m.sender === 'me' ? 'sent' : 'received'}`;

        let contentHtml = '';

        // 根据消息类型渲染
        switch(m.type) {
            case 'image':
                let imgSrc = m.image;
                if(imgSrc && imgSrc.startsWith('img_')) {
                    imgSrc = await window.db.getImage(imgSrc);
                }
                contentHtml = `
                    <div class="t-msg-bubble">
                        <div class="t-msg-image" style="background-image:url('${imgSrc}')"></div>
                        ${m.text ? `<div class="t-msg-text">${m.text}</div>` : ''}
                    </div>
                `;
                break;

            case 'textImage':
                contentHtml = `
                    <div class="t-msg-bubble t-msg-text-image">
                        <div class="t-msg-text-image-icon"><i class="fas fa-image"></i></div>
                        <div class="t-msg-text-image-content">
                            <div class="t-msg-text-image-label">图片</div>
                            <div class="t-msg-text-image-desc">${m.imageDescription || '无描述'}</div>
                        </div>
                    </div>
                `;
                break;

            case 'transfer':
                contentHtml = `
                    <div class="t-msg-bubble t-msg-transfer ${m.sender === 'me' ? 'sent' : 'received'}">
                        <div class="t-msg-transfer-icon"><i class="fas fa-red-envelope"></i></div>
                        <div class="t-msg-transfer-content">
                            <div class="t-msg-transfer-amount">¥${m.amount}</div>
                            <div class="t-msg-transfer-note">${m.note || '转账'}</div>
                        </div>
                        ${m.status === 'pending' && m.sender !== 'me' ? `
                            <button class="t-msg-transfer-receive" data-msg-id="${m.id}">收款</button>
                        ` : ''}
                        ${m.status === 'received' ? '<div class="t-msg-transfer-status">已收款</div>' : ''}
                    </div>
                `;
                break;

            default:
                contentHtml = `<div class="t-msg-bubble">${m.text || ''}</div>`;
        }

        div.innerHTML = `
            ${contentHtml}
            <div class="t-msg-time">${this.formatMessageTime(m.time)}</div>
        `;

        list.appendChild(div);
    }

    // 绑定收款按钮事件
    list.querySelectorAll('.t-msg-transfer-receive').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const msgId = btn.dataset.msgId;
            this.receiveTransfer(msgId);
        };
    });

    list.scrollTop = list.scrollHeight;
}

// 格式化消息时间
formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}


sendDM() {
    const input = document.getElementById('dmInput');
    const text = input.value.trim();
    if(!text) return;

    this.store.update(d => {
        const dm = d.dms.find(x => x.id === this.currentDmId);
        if(dm) {
            dm.messages.push({
                id: window.Utils.generateId('msg'),
                sender: 'me',
                type: 'text',
                text: text,
                time: Date.now()
            });
        }
    });

    input.value = '';
    this.renderDMMessages();
}


async generateDMReply() {
    const apiConfig = window.API.getConfig();
    if(!apiConfig.chatApiKey) return alert('请先配置 API Key');

    const data = this.store.get();
    const dm = data.dms.find(d => d.id === this.currentDmId);
    if(!dm) return;

    const btn = document.getElementById('btnGenDmReply');
    if(btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const settings = data.settings || {};
    const worldSetting = settings.worldSetting || '现代都市';
    const acc = data.accounts.find(a => a.id === data.currentAccountId);
    const handle = dm.participant.handle;

    // 获取记忆
    const twitterMemory = window.TwitterMemory ? window.TwitterMemory.generateMemorySummary(handle) : '';
    const intimacy = window.TwitterMemory ? window.TwitterMemory.getIntimacyLevel(handle) : 'stranger';

    // 检查是否是绑定角色
    let persona = '';
    let qqMemory = '';
    const boundRole = (settings.boundRoles || []).find(b => b.twitterHandle === handle);
    const enabledRole = (settings.enabledRoles || []).find(b => b.twitterHandle === handle);

    if(boundRole) {
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}');
        const friend = (qqData.friends || []).find(f => f.id === boundRole.qqId);
        persona = friend?.persona || '';
// ✅ 传入 handle 参数
qqMemory = window.TwitterMemory ? window.TwitterMemory.getQQMemory(boundRole.qqId, handle) : '';

    } else if(enabledRole) {
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}');
        const friend = (qqData.friends || []).find(f => f.id === enabledRole.qqId);
        persona = friend?.persona || '';
    }

    // 最近对话
    const recentMessages = dm.messages.slice(-30).map(m => {
        const who = m.sender === 'me' ? acc.name : dm.participant.name;
        let content = m.text || '';
        if(m.type === 'image') content = '[发了张图片]';
        if(m.type === 'textImage') content = `[发了张图：${m.imageDescription}]`;
        if(m.type === 'transfer') content = `[转账 ¥${m.amount}${m.note ? ' '+m.note : ''}]`;
        return `${who}: ${content}`;
    }).join('\n');

    const intimacyDesc = {
        'stranger': '刚认识，比较客气',
        'acquaintance': '认识一段时间了，比较熟',
        'friend': '好朋友，说话随意',
        'close': '非常亲密，什么都聊'
    }[intimacy] || '一般关系';

    const prompt = `【世界观】${worldSetting}

【你的身份】
你是 ${dm.participant.name} (${handle})
${persona ? `【人设】${persona}` : ''}
${boundRole ? `【重要】你认识${acc.name}，你们也在QQ聊天，知道对方真实身份` : ''}
${enabledRole ? `【重要】你不知道${acc.name}的真实身份，只知道对方是推特上的${acc.handle}` : ''}

【你们的关系】${intimacyDesc}

${twitterMemory ? `【推特互动记忆】\n${twitterMemory}` : ''}
${qqMemory ? `【QQ聊天记忆】\n${qqMemory}` : ''}

【当前对话】
${recentMessages}

【生成要求】
继续对话，生成你的回复。回复 1-20 条消息。

【活人感聊天指南 - 极其重要】

你不是AI助手，你是一个真实的人在和朋友/网友聊天：

1.【消息风格】
- 不要每条都很长，大部分就几个字
- 可以连发好几条短消息而不是一条长消息
- 会有语气词："啊""哦""嗯""哈哈哈""？？？"
- 会有表情包/emoji
- 打字可能有错别字或者漏字
- 有时候说话说一半
- 有时候会突然跑题
- 有时候会发语音消息（用[语音：内容]表示）

2.【根据亲密度调整】
- 陌生人：客气但不疏离
- 熟人：开玩笑、吐槽
- 好友：什么都聊、互怼、分享日常
- 亲密：撒娇、发脾气、说私密话题

3.【可以主动】
- 分享自己今天发生的事
- 问对方在干嘛
- 发图片（用 textImage 类型）
- 发红包（用 transfer 类型，概率5%）
- 吐槽抱怨
- 安利东西

4.【禁止事项】
- ❌ 禁止客服式回答
- ❌ 禁止每条都很完整
- ❌ 禁止"好的""明白了""没问题"这种敷衍
- ❌ 禁止AI总结性发言
- ❌ 禁止永远积极正面

【返回格式】JSON数组
[
  {"type": "text", "content": "消息内容"},
  {"type": "text", "content": "可以连发好几条"},
  {"type": "textImage", "description": "图片描述（如果要发图）"},
  {"type": "transfer", "amount": 金额, "note": "红包说明（概率5%）"},
  {"type": "voice", "content": "语音内容（如果要发语音）"}
]

记住：像真人聊天一样，自然、随意、有情绪！`;

    try {
        const res = await window.API.callAI(prompt, apiConfig);
        let replies = [];

        try {
            replies = JSON.parse(res);
        } catch(e) {
            const match = res.match(/\[[\s\S]*\]/);
            if(match) {
                replies = JSON.parse(match[0]);
            } else {
                replies = [{ type: 'text', content: res.replace(/```json|```/g, '').trim() }];
            }
        }

        if(!Array.isArray(replies)) {
            replies = [{ type: 'text', content: String(replies) }];
        }

        this.store.update(d => {
            const targetDm = d.dms.find(x => x.id === this.currentDmId);
            if(targetDm) {
                replies.forEach((r, idx) => {
                    const msg = {
                        id: window.Utils.generateId('msg'),
                        sender: 'them',
                        time: Date.now() + idx * 800,
                        read: true
                    };

                    if(r.type === 'text' || !r.type) {
                        msg.type = 'text';
                        msg.text = r.content || r.text || String(r);
                    } else if(r.type === 'textImage') {
                        msg.type = 'textImage';
                        msg.imageDescription = r.description || r.content;
                    } else if(r.type === 'transfer') {
                        msg.type = 'transfer';
                        msg.amount = r.amount || Math.floor(Math.random() * 50) + 10;
                        msg.note = r.note || '红包';
                        msg.status = 'pending';
                    } else if(r.type === 'voice') {
                        msg.type = 'text';
                        msg.text = `🎤 [语音消息] ${r.content}`;
                    } else if(r.type === 'image') {
                        msg.type = 'textImage';
                        msg.imageDescription = r.description || r.content || '一张图片';
                    }

                    targetDm.messages.push(msg);
                });
            }
        });

        this.renderDMMessages();

    } catch(e) {
        console.error('生成回复失败:', e);
        alert('生成失败，请重试');
    } finally {
        if(btn) btn.innerHTML = '<i class="fas fa-magic"></i>';
    }
}


// 转账后的反应（带记忆）
async generateTransferReactionWithMemory(amount, note) {
    const apiConfig = window.API.getConfig();
    if(!apiConfig.chatApiKey) return;

    const data = this.store.get();
    const dm = data.dms.find(d => d.id === this.currentDmId);
    if(!dm) return;

    const handle = dm.participant.handle;
    const twitterMemory = window.TwitterMemory.generateMemorySummary(handle);
    const intimacy = window.TwitterMemory.getIntimacyLevel(handle);

    const prompt = `你是 ${dm.participant.name}。
用户给你转账了 ¥${amount}${note ? `，附言："${note}"` : ''}。

【你们的关系】: ${intimacy === 'close' ? '非常亲密' : intimacy === 'friend' ? '朋友' : '一般'}

${twitterMemory}

请生成你的反应（1-3条消息），要符合你的性格和你们的关系。
可以是感谢、撒娇、惊讶、回礼等。

返回JSON数组: [{"type": "text", "content": "回复内容"}]
也可以回赠红包: [{"type": "transfer", "amount": 金额, "note": "说明"}]`;

    try {
        const res = await window.API.callAI(prompt, apiConfig);
        let replies = [];
        try {
            replies = JSON.parse(res);
        } catch(e) {
            const match = res.match(/\[[\s\S]*\]/);
            if(match) replies = JSON.parse(match[0]);
        }

        if(Array.isArray(replies) && replies.length > 0) {
            this.store.update(d => {
                const targetDm = d.dms.find(x => x.id === this.currentDmId);
                if(targetDm) {
                    replies.forEach((r, idx) => {
                        const msg = {
                            id: window.Utils.generateId('msg'),
                            sender: 'them',
                            time: Date.now() + idx * 800,
                            read: true
                        };

                        if(r.type === 'transfer') {
                            msg.type = 'transfer';
                            msg.amount = r.amount || 10;
                            msg.note = r.note || '回礼';
                            msg.status = 'pending';
                        } else {
                            msg.type = 'text';
                            msg.text = r.content || r.text || String(r);
                        }

                        targetDm.messages.push(msg);
                    });
                }
            });
            this.renderDMMessages();
        }
    } catch(e) {
        console.error('生成转账反应失败:', e);
    }
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
    

openPostModal(quoteTweet = null) {
        
// ✅ 确保初始化
    this.postImages = this.postImages
 || [];
    this.postTextImages = this.postTextImages
 || [];
    this.postPoll = this.postPoll || null
;
    this.postLocation = this.postLocation || null
;
    // 移除旧弹窗
    const old = document.getElementById('tPostModal');
    if(old) old.remove();

    // 初始化数据
    this.postImages = [];
    this.postTextImages = [];
    this.postLocation = null;

    const data = this.store.get();
    const acc = data.accounts.find(a => a.id === data.currentAccountId);

    const modal = document.createElement('div');
    modal.id = 'tPostModal';
    modal.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:white;z-index:200;display:flex;flex-direction:column;';

    modal.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 15px;border-bottom:1px solid #eee;">
            <span style="font-size:16px;cursor:pointer;padding:5px 10px;" id="postCloseBtn">取消</span>
            <button id="postSubmitBtn" style="background:#333;color:white;border:none;border-radius:20px;padding:10px 24px;font-weight:bold;cursor:pointer;">发布</button>
        </div>
        <div style="flex:1;padding:15px;overflow-y:auto;">
            <div style="display:flex;gap:12px;">
                <div id="postAvatar" style="width:44px;height:44px;border-radius:50%;background:#ddd;background-size:cover;flex-shrink:0;"></div>
                <div style="flex:1;">
                    <textarea id="postTextarea" placeholder="有什么新鲜事？" style="width:100%;min-height:150px;border:none;outline:none;font-size:18px;resize:none;font-family:inherit;"></textarea>
                    <div id="postAttachments" style="display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;"></div>
                    <div id="postLocationShow" style="display:none;margin-top:10px;padding:8px 15px;background:#f5f5f5;border-radius:20px;font-size:14px;color:#666;align-items:center;">
                        <i class="fas fa-map-marker-alt" style="color:#1d9bf0;margin-right:8px;"></i>
                        <span id="postLocationText"></span>
                        <span id="postLocationRemove" style="margin-left:10px;cursor:pointer;color:#999;">✕</span>
                    </div>
                </div>
            </div>
        </div>
        <div style="padding:12px 15px;border-top:1px solid #eee;display:flex;gap:20px;">
        <span id="postAddPoll" style="font-size:22px;color:#1d9bf0;cursor:pointer;padding:8px;"><i class="fas fa-poll"></i></span>

            <span id="postAddImage" style="font-size:22px;color:#1d9bf0;cursor:pointer;padding:8px;"><i class="far fa-image"></i></span>
            <span id="postAddTextImage" style="font-size:22px;color:#1d9bf0;cursor:pointer;padding:8px;"><i class="fas fa-file-alt"></i></span>
            <span id="postAddLocation" style="font-size:22px;color:#1d9bf0;cursor:pointer;padding:8px;"><i class="fas fa-map-marker-alt"></i></span>
        </div>

    `;

    document.getElementById('twitterApp').appendChild(modal);

    // 设置头像
    const avatarEl = document.getElementById('postAvatar');
    if(acc && acc.avatar) {
        if(acc.avatar.startsWith('img_')) {
            window.db.getImage(acc.avatar).then(url => {
                avatarEl.style.backgroundImage = `url('${url}')`;
            });
        } else {
            avatarEl.style.backgroundImage = `url('${acc.avatar}')`;
        }
    }

    // ===== 绑定事件 =====
    const self = this;

    // 关闭
    document.getElementById('postCloseBtn').onclick = function() {
        modal.remove();
    };

    // 发布
    document.getElementById('postSubmitBtn').onclick = function() {
        self.doCreatePost();
    };

    // 添加图片
    document.getElementById('postAddImage').onclick = function() {
        if(self.postImages.length >= 4) {
            alert('最多4张图片');
            return;
        }
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = function(e) {
            const file = e.target.files[0];
            if(!file) return;
            const reader = new FileReader();
            reader.onload = async function(ev) {
                const base64 = ev.target.result;
                const imgId = await window.db.saveImage(base64);
                self.postImages.push({id: imgId, base64: base64});
                self.updatePostAttachments();
            };
            reader.readAsDataURL(file);
        };
        input.click();
    };

    // 添加文字图片
    document.getElementById('postAddTextImage').onclick = function() {
        const desc = prompt('描述这张图片（AI会看到）：');
        if(desc && desc.trim()) {
            self.postTextImages.push(desc.trim());
            self.updatePostAttachments();
        }
    };

    // 添加位置
    document.getElementById('postAddLocation').onclick = function() {
        const locs = ['北京', '上海', '广州', '深圳', '成都', '杭州', '你家楼下', '火星', '被窝里', '公司摸鱼中', '网吧', '厕所', '精神状态不稳定'];
        const loc = prompt('输入位置：\n\n快速选择：' + locs.join('、'));
        if(loc && loc.trim()) {
            self.postLocation = loc.trim();
            document.getElementById('postLocationShow').style.display = 'flex';
            document.getElementById('postLocationText').innerText = loc.trim();
        }
    };
    // 添加投票
document.getElementById('postAddPoll').onclick = function() {
    self.openPollCreator();
};


    // 移除位置
    document.getElementById('postLocationRemove').onclick = function(e) {
        e.stopPropagation();
        self.postLocation = null;
        document.getElementById('postLocationShow').style.display = 'none';
    };

    // 聚焦
    setTimeout(function() {
        document.getElementById('postTextarea').focus();
    }, 100);
}

// 更新附件显示
updatePostAttachments() {
    const container = document.getElementById('postAttachments');
    if(!container) return;
    container.innerHTML = '';

    const self = this;

    // 真实图片
    this.postImages.forEach(function(img, i) {
        const div = document.createElement('div');
        div.style.cssText = 'position:relative;width:80px;height:80px;border-radius:10px;background-size:cover;background-position:center;';
        div.style.backgroundImage = 'url(' + img.base64 + ')';
        const del = document.createElement('div');
        del.style.cssText = 'position:absolute;top:-8px;right:-8px;width:22px;height:22px;background:#333;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer;';
        del.innerHTML = '✕';
        del.onclick = function(e) {
            e.stopPropagation();
            self.postImages.splice(i, 1);
            self.updatePostAttachments();
        };
        div.appendChild(del);
        container.appendChild(div);
    });

    // 文字图片
    this.postTextImages.forEach(function(desc, i) {
        const div = document.createElement('div');
        div.style.cssText = 'position:relative;width:80px;height:80px;border-radius:10px;background:#f0f7ff;display:flex;align-items:center;justify-content:center;border:2px dashed #1d9bf0;';
        div.innerHTML = '<i class="fas fa-file-image" style="color:#1d9bf0;font-size:24px;"></i>';
        div.title = desc;
        const del = document.createElement('div');
        del.style.cssText = 'position:absolute;top:-8px;right:-8px;width:22px;height:22px;background:#333;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer;';
        del.innerHTML = '✕';
        del.onclick = function(e) {
            e.stopPropagation();
            self.postTextImages.splice(i, 1);
            self.updatePostAttachments();
        };
        div.appendChild(del);
        container.appendChild(div);
    });
}

// 发布推文
async doCreatePost() {
    const textarea = document.getElementById('postTextarea');
    const text = textarea ? textarea.value.trim() : '';

    if(!text && this.postImages.length === 0 && this.postTextImages.length === 0) {
        alert('请输入内容或添加图片');
        return;
    }

    const data = this.store.get();
    const imageIds = this.postImages.map(function(img) { return img.id; });

    const newTweet = {
        id: 'tweet_' + Date.now() + '_' + Math.random().toString(36).substr(2,9),
        accountId: data.currentAccountId,
        text: text,
        time: Date.now(),
        likes: 0,
        retweets: 0,
        replies: 0,
        views: 0,
        images: imageIds,
        textImages: this.postTextImages || [],
        location: this.postLocation || null,
        comments: []
    };

    this.store.update(function(d) {
        if(!d.tweets) d.tweets = [];
        d.tweets.unshift(newTweet);
    });

    // 关闭弹窗
    const modal = document.getElementById('tPostModal');
    if(modal) modal.remove();

    // 清理
    this.postImages = [];
    this.postTextImages = [];
    this.postLocation = null;

    // 刷新
    await this.renderHome();

    // 自动生成互动
    const apiConfig = window.API ? window.API.getConfig() : null;
    if(apiConfig && apiConfig.chatApiKey) {
        const toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#333;color:white;padding:12px 24px;border-radius:25px;z-index:1000;';
        toast.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成评论中...';
        document.body.appendChild(toast);

        try {
            await this.generateInteractions(newTweet.id, text);
            toast.innerHTML = '<i class="fas fa-check"></i> 发布成功！';
            toast.style.background = '#4caf50';
        } catch(e) {
            toast.innerHTML = '<i class="fas fa-check"></i> 发布成功';
        }

        setTimeout(function() { toast.remove(); }, 2000);
    } else {
        alert('发布成功！');
    }
}


// ========== 新增：处理添加图片 ==========
handleAddImage() {
    if(!this.postImages) this.postImages = [];

    if(this.postImages.length >= 4) {
        alert('最多添加4张图片');
        return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    const self = this;
    input.onchange = async function(e) {
        const file = e.target.files[0];
        if(!file) return;

        const reader = new FileReader();
        reader.onload = async function(ev) {
            const base64 = ev.target.result;
            const imgId = await window.db.saveImage(base64);
            self.postImages.push({id: imgId, base64: base64});
            self.updateAttachmentsDisplay();
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

// ========== 新增：处理添加文字图片 ==========
handleAddTextImage() {
    if(!this.postTextImages) this.postTextImages = [];

    const desc = prompt('描述这张图片的内容（AI会看到这段描述）：');
    if(desc && desc.trim()) {
        this.postTextImages.push(desc.trim());
        this.updateAttachmentsDisplay();
    }
}

// ========== 新增：处理添加位置 ==========
handleAddLocation() {
    const locations = ['北京', '上海', '广州', '深圳', '成都', '杭州', '你家楼下', '火星', '被窝里', '公司摸鱼中', '网吧', '厕所'];

    const loc = prompt('输入位置（随便填）:\n\n快速选择：' + locations.join('、'));
    if(loc && loc.trim()) {
        this.postLocation = loc.trim();
        document.getElementById('postModalLocation').style.display = 'block';
        document.getElementById('postModalLocationText').innerText = loc.trim();
    }
}

// ========== 新增：更新附件显示 ==========
updateAttachmentsDisplay() {
    const container = document.getElementById('postModalAttachments');
    if(!container) return;

    container.innerHTML = '';
    const self = this;

    // 真实图片
    (this.postImages || []).forEach(function(img, idx) {
        const div = document.createElement('div');
        div.style.cssText = 'position:relative;width:80px;height:80px;border-radius:10px;background-size:cover;background-position:center;';
        div.style.backgroundImage = 'url(' + img.base64 + ')';

        const removeBtn = document.createElement('div');
        removeBtn.style.cssText = 'position:absolute;top:-8px;right:-8px;width:22px;height:22px;background:#333;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer;';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.onclick = function(e) {
            e.stopPropagation();
            self.postImages.splice(idx, 1);
            self.updateAttachmentsDisplay();
        };

        div.appendChild(removeBtn);
        container.appendChild(div);
    });

    // 文字图片
    (this.postTextImages || []).forEach(function(desc, idx) {
        const div = document.createElement('div');
        div.style.cssText = 'position:relative;width:80px;height:80px;border-radius:10px;background:#f0f7ff;display:flex;align-items:center;justify-content:center;border:2px dashed #1d9bf0;';
        div.innerHTML = '<i class="fas fa-file-image" style="color:#1d9bf0;font-size:24px;"></i>';
        div.title = desc;

        const removeBtn = document.createElement('div');
        removeBtn.style.cssText = 'position:absolute;top:-8px;right:-8px;width:22px;height:22px;background:#333;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer;';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.onclick = function(e) {
            e.stopPropagation();
            self.postTextImages.splice(idx, 1);
            self.updateAttachmentsDisplay();
        };

        div.appendChild(removeBtn);
        container.appendChild(div);
    });
}









// 设置发帖头像
async setPostAvatar(acc) {
    let avatar = acc.avatar;
    if(avatar && avatar.startsWith('img_')) {
        avatar = await window.db.getImage(avatar);
    } else if(!avatar) {
        avatar = window.Utils.generateXDefaultAvatar();
    }
    const avatarEl = document.querySelector('.t-post-avatar');
    if(avatarEl) avatarEl.style.backgroundImage = `url('${avatar}')`;
}

// 添加真实图片
addPostImage() {
    if(!this.postImages) this.postImages = [];

    if(this.postImages.length >= 4) {
        alert('最多添加4张图片');
        return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async (e) => {
        const files = Array.from(e.target.files).slice(0, 4 - this.postImages.length);

        for(const file of files) {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const base64 = ev.target.result;
                const imgId = await window.db.saveImage(base64);
                this.postImages.push({id: imgId, base64: base64});
                this.renderPostAttachments();
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}

// 添加文字图片（描述图片）
addPostTextImage() {
    if(!this.postTextImages) this.postTextImages = [];

    const desc = prompt('描述这张图片的内容（AI和读者会看到这段描述）：');
    if(desc && desc.trim()) {
        this.postTextImages.push(desc.trim());
        this.renderPostAttachments();
    }
}

// 渲染附件预览
renderPostAttachments() {
    const container = document.getElementById('tPostAttachments');
    if(!container) return;

    container.innerHTML = '';

    // 真实图片
    (this.postImages || []).forEach((img, idx) => {
        const div = document.createElement('div');
        div.style.cssText = 'position:relative;width:80px;height:80px;border-radius:10px;background-size:cover;background-position:center;border:1px solid #eee;';
        div.style.backgroundImage = `url('${img.base64}')`;
        div.innerHTML = `<div style="position:absolute;top:-8px;right:-8px;width:22px;height:22px;background:#333;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer;" data-type="image" data-idx="${idx}"><i class="fas fa-times"></i></div>`;
        container.appendChild(div);
    });

    // 文字图片
    (this.postTextImages || []).forEach((desc, idx) => {
        const div = document.createElement('div');
        div.style.cssText = 'position:relative;width:80px;height:80px;border-radius:10px;background:#f0f7ff;display:flex;align-items:center;justify-content:center;border:2px dashed #1d9bf0;';
        div.innerHTML = `
            <i class="fas fa-file-image" style="color:#1d9bf0;font-size:24px;"></i>
            <div style="position:absolute;top:-8px;right:-8px;width:22px;height:22px;background:#333;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer;" data-type="textImage" data-idx="${idx}"><i class="fas fa-times"></i></div>
        `;
        div.title = desc;
        container.appendChild(div);
    });

    // 绑定删除事件
    container.querySelectorAll('[data-type]').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const type = btn.dataset.type;
            const idx = parseInt(btn.dataset.idx);
            if(type === 'image') {
                this.postImages.splice(idx, 1);
            } else {
                this.postTextImages.splice(idx, 1);
            }
            this.renderPostAttachments();
        };
    });
}


// ========== 投票功能 ==========
togglePollCreator(show = null) {
    const creator = document.getElementById('tPollCreator');
    const shouldShow = show !== null ? show : creator.style.display === 'none';

    creator.style.display = shouldShow ? 'block' : 'none';

    if(!shouldShow) {
        // 清空投票
        document.getElementById('tPollOption1').value = '';
        document.getElementById('tPollOption2').value = '';
        document.getElementById('tPollExtraOptions').innerHTML = '';
        this.postPoll = null;
    }
}

addPollOption() {
    const container = document.getElementById('tPollExtraOptions');
    const optionCount = container.querySelectorAll('input').length + 2;

    if(optionCount >= 4) {
        alert('最多4个选项');
        return;
    }

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 't-poll-option-input';
    input.placeholder = `选项 ${optionCount + 1}`;
    container.appendChild(input);
}

// 获取投票数据
getPollData() {
    const creator = document.getElementById('tPollCreator');
    if(creator.style.display === 'none') return null;

    const options = [];
    const opt1 = document.getElementById('tPollOption1').value.trim();
    const opt2 = document.getElementById('tPollOption2').value.trim();

    if(opt1) options.push(opt1);
    if(opt2) options.push(opt2);

    document.getElementById('tPollExtraOptions').querySelectorAll('input').forEach(input => {
        const val = input.value.trim();
        if(val) options.push(val);
    });

    if(options.length < 2) return null;

    const days = parseInt(document.getElementById('tPollDays').value);
    const hours = parseInt(document.getElementById('tPollHours').value);

    return {
        options: options.map(text => ({ text, votes: 0, voters: [] })),
        duration: (days * 24 + hours) * 3600000,
        endTime: Date.now() + (days * 24 + hours) * 3600000,
        totalVotes: 0
    };
}

// 找到 createPost 方法，替换为以下完整代码：

async createPost() {
    const input = document.getElementById('tPostInput');
    if(!input) {
        console.error('找不到输入框');
        return;
    }

    const text = input.value.trim();

    if(!text && (!this.postImages || this.postImages.length === 0) && (!this.postTextImages || this.postTextImages.length === 0)) {
        alert('请输入内容');
        return;
    }

    console.log('开始发布推文:', text);

    const data = this.store.get();

    // 获取投票数据
const pollData = this.postPoll || null;


    // 处理图片
    let imageIds = [];
    if(this.postImages && this.postImages.length > 0) {
        for(const img of this.postImages) {
            imageIds.push(img.id);
        }
    }

    const newTweet = {
        id: window.Utils ? window.Utils.generateId('tweet') : 'tweet_' + Date.now(),
        accountId: data.currentAccountId,
        text: text,
        time: Date.now(),
        likes: 0,
        retweets: 0,
        replies: 0,
        views: 0,
        images: imageIds,
        textImages: this.postTextImages || [],
        poll: pollData,
        location: this.postLocation || null,
        quoteId: this.quoteTweetData?.id || null,
        comments: []
    };

    // 保存到数据
    this.store.update(d => d.tweets.unshift(newTweet));
    console.log('推文已保存');

    // 关闭弹窗并清理
    const modal = document.getElementById('tPostModal');
    if(modal) modal.remove();

    this.postImages = [];
    this.postTextImages = [];
    this.postPoll = null;
    this.postLocation = null;
    this.quoteTweetData = null;

    // 刷新主页
    this.renderHome();

    // 提示成功
    alert('发布成功！正在生成互动...');

// 生成互动
await this.generateInteractions(newTweet.id, text);

}



async generateInteractions(tweetId, text) {
    const apiConfig = window.API.getConfig();
    if(!apiConfig.chatApiKey) return;

    const data = this.store.get();
    const acc = data.accounts.find(a => a.id === data.currentAccountId);
    const settings = data.settings || {};
    const worldSetting = settings.worldSetting || '现代都市';
    const postMemory = settings.postMemory || 0;

    // 帖子记忆
    let previousPostsContext = '';
    if(postMemory > 0) {
        const userTweets = data.tweets
            .filter(t => t.accountId === data.currentAccountId)
            .sort((a, b) => b.time - a.time)
            .slice(1, postMemory + 1);

        if(userTweets.length > 0) {
            previousPostsContext = userTweets.map(t => `"${t.text.substring(0, 50)}"`).join('、');
        }
    }

    // 绑定角色
    const boundRoles = settings.boundRoles || [];
    const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}');
    let boundContext = '';
    if(boundRoles.length > 0) {
        boundContext = boundRoles.map(b => {
            const f = (qqData.friends || []).find(fr => fr.id === b.qqId);
            if(!f) return '';
            const intimacy = window.TwitterMemory ? window.TwitterMemory.getIntimacyLevel(b.twitterHandle) : 'friend';
            return `【${f.name}(${b.twitterHandle})】人设:${f.persona || ''} | 与用户关系:${intimacy} | 认识用户会用亲密的方式评论`;
        }).filter(Boolean).join('\n');
    }

    const prompt = `【世界观】${worldSetting}

【用户信息】
${acc.name}(${acc.handle}) 发布了推文："${text}"
${previousPostsContext ? `用户之前发过：${previousPostsContext}` : ''}

【认识用户的角色 - 必须评论1-2条】
${boundContext || '无'}

【生成要求】生成25-35条评论

【活人感评论指南 - 极其重要】

这不是在写"评论模板"，而是在模拟真实的互联网众生相：

1.【评论长度分布】
- 40%极短："哈哈""6""？""啊这""笑死""真的假的""我也是"
- 30%短评："太真实了吧""笑死我了哈哈哈哈""这不就是我吗"
- 20%中等：带点自己的故事或观点
- 10%长评：认真讨论或者情绪输出

2.【评论类型必须包含】
- 复读机（重复博主的某句话或者"复读"）
- 杠精（"可是...""但是...""不觉得..."）
- 阴阳人（"哦~是吗~""懂了懂了.jpg"）
- 表情党（纯emoji或者颜文字）
- 认真讨论的
- 共情的（"我也是""一样一样"）
- 跑题的（聊着聊着说别的）
- 玩梗的
- 求链接/求出处的
- 路人甲（就一个"."或者"来了"）

3.【禁止事项】
- ❌ 禁止每条评论都很有营养
- ❌ 禁止整齐的标点符号
- ❌ 禁止书面语
- ❌ 禁止每个人都友善
- ❌ 禁止"说得好""很有道理"这种敷衍
- ❌ 禁止AI总结性发言

4.【必须有】
- 至少5条带emoji
- 至少3条有错别字
- 至少3条是回复其他评论的（格式："回复@xxx：内容"）
- 至少2条纯表情/符号
- 至少1条杠精
- 至少1条阴阳怪气

【返回格式】JSON
{
  "views": 3000-80000,
  "likes": 50-3000,
  "retweets": 5-300,
  "comments": [
    {
      "name": "有创意的网名",
      "handle": "@xxx",
      "text": "评论内容",
      "likes": 0-100,
      "replyTo": "@被回复者handle或null"
    }
  ]
}`;

    try {
        const res = await window.API.callAI(prompt, apiConfig);
        let json;
        try {
            json = JSON.parse(res);
        } catch(e) {
            const match = res.match(/\{[\s\S]*\}/);
            if(match) json = JSON.parse(match[0]);
        }

        if(json && json.comments) {
            this.store.update(d => {
                const t = d.tweets.find(x => x.id === tweetId);
                if(t) {
                    t.views = json.views || Math.floor(Math.random() * 50000) + 3000;
                    t.likes = json.likes || Math.floor(Math.random() * 1000) + 50;
                    t.retweets = json.retweets || Math.floor(Math.random() * 100) + 5;
                    t.replies = json.comments.length;
                    t.comments = json.comments.map((c, idx) => ({
                        id: window.Utils.generateId('comment'),
                        name: c.name,
                        handle: c.handle,
                        text: c.text,
                        time: Date.now() - Math.floor(Math.random() * 3600000) - idx * 30000,
                        avatar: window.Utils.generateXDefaultAvatar(),
                        likes: c.likes || Math.floor(Math.random() * 50),
                        replyTo: c.replyTo || null,
                        replies: []
                    }));
                }
            });

            this.renderHome();
        }
    } catch(e) {
        console.error('生成互动失败:', e);
    }
}


// 快速补充评论
async generateQuickComments(tweetText, count) {
    const apiConfig = window.API.getConfig();
    if(!apiConfig.chatApiKey || count <= 0) return [];

    const prompt = `为推文"${tweetText.substring(0, 60)}"生成${count}条简短评论。
大部分1-30个字，包含：
- 表情党
- 简短感叹（6/啊这/笑死/？）
- 复读机
- 杠精

返回JSON数组: [{"name":"用户名","handle":"@xxx","text":"评论"}]`;

    try {
        const res = await window.API.callAI(prompt, apiConfig);
        let comments = [];
        try {
            comments = JSON.parse(res);
        } catch(e) {
            const match = res.match(/\[[\s\S]*\]/);
            if(match) comments = JSON.parse(match[0]);
        }
        return Array.isArray(comments) ? comments : [];
    } catch(e) {
        return [];
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
    // 移除旧的设置页面（如果存在）
    const oldPage = document.getElementById('tSettingsPage');
    if(oldPage) oldPage.remove();

    const page = document.createElement('div');
    page.id = 'tSettingsPage';
    page.className = 'sub-page';
    page.style.display = 'flex';
    page.innerHTML = `
        <div class="sub-header">
            <button class="back-btn" id="closeSettingsBtn"><i class="fas fa-arrow-left"></i></button>
            <span class="sub-title">设置</span>
        </div>
        <div class="sub-content" style="overflow-y:auto; padding:15px;">


            <div class="t-settings-section">
                <div class="t-settings-title">世界观设定</div>
                <textarea id="tWorldSetting" class="t-settings-textarea" placeholder="例如：现代社会每个人都有超能力..."></textarea>
            </div>


            <div class="t-settings-section">
                <div class="t-settings-title">帖子记忆深度</div>
                <div class="t-settings-desc">设置为 >0 时，粉丝评论会记得你之前的帖子内容</div>
                <input type="number" id="tPostMemory" class="t-settings-input" value="0" min="0" max="10">
            </div>


            <div class="t-settings-section">
                <div class="t-settings-row">
                    <div>
                        <div class="t-settings-title">记忆隔离</div>
                        <div class="t-settings-desc">开启后角色在X上的记忆与QQ中的记忆不互通</div>
                    </div>
                    <label class="t-switch">
                        <input type="checkbox" id="tMemoryIsolation">
                        <span class="t-switch-slider"></span>
                    </label>
                </div>
            </div>


            <!-- 私密账号设置 -->
            <div class="t-settings-section">
                <div class="t-settings-row">
                    <div>
                        <div class="t-settings-title">私密账号</div>
                        <div class="t-settings-desc">开启后只有粉丝能看到你的推文，他人关注需要你的批准</div>
                    </div>
                    <label class="t-switch">
                        <input type="checkbox" id="tPrivateAccount">
                        <span class="t-switch-slider"></span>
                    </label>
                </div>
            </div>

            <!-- 关注请求 -->
            <div class="t-settings-section" id="tFollowRequestsSection" style="display:none;">
                <div class="t-settings-title">待处理的关注请求</div>
                <div class="t-settings-desc">以下用户请求关注你</div>
                <div id="tFollowRequestsContainer"></div>
            </div>


            <div class="t-settings-section">
                <div class="t-settings-title">账号记忆互通</div>
                <div class="t-settings-desc">设置多个账号之间的记忆互通关系互通的账号在同一个推特环境中由同一主人控制</div>
                <div id="tAccountLinksContainer"></div>
                <button class="t-settings-btn secondary" id="tAddAccountLinkBtn">
                    <i class="fas fa-plus"></i> 添加互通账号
                </button>
            </div>


            <div class="t-settings-section">
                <div class="t-settings-title">记忆互通</div>
                <div class="t-settings-desc">这些角色知道你是谁记得QQ聊天内容使用QQ头像</div>
                <div id="tBoundRolesContainer"></div>
                <button class="t-settings-btn secondary" id="tAddBoundRoleBtn">
                    <i class="fas fa-link"></i> 绑定QQ角色
                </button>
            </div>


            <div class="t-settings-section">
                <div class="t-settings-title">记忆隔离</div>
                <div class="t-settings-desc">这些角色不认识你只把你当路人/粉丝使用QQ头像但不知道你真实身份</div>
                <div id="tEnabledRolesContainer"></div>
                <button class="t-settings-btn secondary" id="tAddEnabledRoleBtn">
                    <i class="fas fa-user-secret"></i> 开启QQ角色
                </button>
            </div>


            <div class="t-settings-section">
                <div class="t-settings-title">专属角色（NPC）</div>
                <div class="t-settings-desc">只存在于X上的角色使用X默认头像</div>
                <div id="tNpcsContainer"></div>
                <button class="t-settings-btn secondary" id="tAddNpcBtn">
                    <i class="fas fa-user-plus"></i> 创建NPC
                </button>
            </div>


            <button class="t-settings-btn primary" id="tSaveSettingsBtn">
                <i class="fas fa-save"></i> 保存设置
            </button>

        </div>
    `;
    document.getElementById('twitterApp').appendChild(page);

    // 加载当前设置
    this.loadSettingsData();

    // 绑定事件
    document.getElementById('closeSettingsBtn').onclick = () => page.remove();
    document.getElementById('tAddAccountLinkBtn').onclick = () => this.addAccountLink();
    document.getElementById('tAddBoundRoleBtn').onclick = () => this.addBoundRole();
    document.getElementById('tAddEnabledRoleBtn').onclick = () => this.addEnabledRole();
    document.getElementById('tAddNpcBtn').onclick = () => this.createNPC();
    document.getElementById('tSaveSettingsBtn').onclick = () => this.saveSettings();
}

// 加载设置数据
loadSettingsData() {
    const data = this.store.get();
    const settings = data.settings || {};

    // 世界观
    document.getElementById('tWorldSetting').value = settings.worldSetting || '现代社会';

    // 帖子记忆
    document.getElementById('tPostMemory').value = settings.postMemory || 0;

    // 记忆隔离开关
    document.getElementById('tMemoryIsolation').checked = settings.memoryIsolation !== false;

    // 渲染账号互通列表
    this.renderAccountLinks();

    // 渲染绑定角色列表
    this.renderBoundRoles();

    // 渲染开启角色列表
    this.renderEnabledRoles();

    // 渲染NPC列表
    this.renderNpcs();
        // 私密账号
    const isPrivate = data.accounts.find(a => a.id === data.currentAccountId)?.isPrivate || false;
    document.getElementById('tPrivateAccount').checked = isPrivate;

    // 监听私密账号切换
    document.getElementById('tPrivateAccount').onchange = (e) => {
        this.store.update(d => {
            const acc = d.accounts.find(a => a.id === d.currentAccountId);
            if(acc) acc.isPrivate = e.target.checked;
        });
        this.renderFollowRequests();
    };

    // 渲染关注请求
    this.renderFollowRequests();

}

// 保存设置
saveSettings() {
    const worldSetting = document.getElementById('tWorldSetting').value.trim();
    const postMemory = parseInt(document.getElementById('tPostMemory').value) || 0;
    const memoryIsolation = document.getElementById('tMemoryIsolation').checked;
    if(!worldSettingEl || !postMemoryEl || !memoryIsolationEl) {
        alert('设置页面加载异常，请重试');
        return;
    }
    this.store.update(d => {
        d.settings.worldSetting = worldSetting;
        d.settings.postMemory = postMemory;
        d.settings.memoryIsolation = memoryIsolation;
    });

    alert('设置已保存');
    document.getElementById('tSettingsPage').remove();
}


    renderAccountList() {
        const list = document.getElementById('tAccountList');
        list.innerHTML = '';
        const data = this.store.get();
        
        data.accounts.forEach(acc => {
            const div = document.createElement('div');
            div.style.cssText = 'padding:10px; display:flex; align-items:center; cursor:pointer; hover:bg-gray-100;';
            if(acc.id === data.currentAccountId) div.style.background = '#f7f9f9';
            
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
        const bindList = document.getElementById('tBindList');
        const enableList = document.getElementById('tEnableList');
        bindList.innerHTML = '';
        enableList.innerHTML = '';
        
        const settings = this.store.get().settings;
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}');
        
        (settings.boundRoles || []).forEach(b => {
            const friend = qqData.friends.find(f => f.id === b.qqId);
            const name = friend ? friend.name : 'Unknown';
            const div = document.createElement('div');
            div.innerHTML = `${name} <-> ${b.twitterHandle} <button onclick="window.TwitterApp.deleteRole('bound', '${b.qqId}')">x</button>`;
            bindList.appendChild(div);
        });

        (settings.enabledRoles || []).forEach(b => {
            const friend = qqData.friends.find(f => f.id === b.qqId);
            const name = friend ? friend.name : 'Unknown';
            const div = document.createElement('div');
            div.innerHTML = `${name} <-> ${b.twitterHandle} <button onclick="window.TwitterApp.deleteRole('enabled', '${b.qqId}')">x</button>`;
            enableList.appendChild(div);
        });
    }

    bindRole(type) {
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
                    if(type === 'bound') {
                        if(!d.settings.boundRoles) d.settings.boundRoles = [];
                        d.settings.boundRoles.push({qqId: friend.id, twitterHandle: handle});
                    } else {
                        if(!d.settings.enabledRoles) d.settings.enabledRoles = [];
                        d.settings.enabledRoles.push({qqId: friend.id, twitterHandle: handle});
                    }
                });
                this.renderBindList();
            }
        }
    }

    deleteRole(type, qqId) {
        this.store.update(d => {
            if(type === 'bound') d.settings.boundRoles = d.settings.boundRoles.filter(b => b.qqId !== qqId);
            else d.settings.enabledRoles = d.settings.enabledRoles.filter(b => b.qqId !== qqId);
        });
        this.renderBindList();
    }

async renderProfile(target) {
    const detail = document.getElementById('tTweetDetail');
    const content = document.getElementById('tDetailContent');
    content.innerHTML = '';

    const data = this.store.get();
        // 检查是否有缓存的资料
    if(typeof target === 'object' && target.handle) {
        const cached = data.cachedProfiles?.[target.handle];
        if(cached) {
            // 合并缓存数据
            target = { ...cached, ...target };
        }
    }

    const settings = data.settings || {};
    let profileData = {};
    let isMe = false;
    let avatarSource = 'x';

    if(target === 'me') {
        isMe = true;
        profileData = data.accounts.find(a => a.id === data.currentAccountId);
    } else {
        profileData = target;
        // 检查是否是QQ绑定角色
        if(target.qqId || target.source === 'qq') {
            avatarSource = 'qq';
        }
    }

    
// ===== 修复：正确获取头像 =====
    let avatar = profileData.avatar
;

    if(avatar && avatar.startsWith('img_'
)) {
        // 从IndexedDB读取
        avatar = 
await window.db.getImage
(avatar);
    } 
else if(avatar && avatar.startsWith('data:'
)) {
        // Base64格式直接使用
        avatar = avatar;
    } 
else if(!avatar || avatar === ''
) {
        // 检查是否是QQ角色
        if(avatarSource === 'qq' || profileData.qqId
) {
            const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}'
);
            const friend = (qqData.friends || []).find(f => f.id === profileData.qqId
);

            if(friend && friend.avatar
) {
                if(friend.avatar.startsWith('img_'
)) {
                    avatar = 
await window.db.getImage(friend.avatar
);
                } 
else
 {
                    avatar = friend.
avatar
;
                }
            }
        }

        // 最终默认值
        if
(!avatar) {
            avatar = 
window.Utils.generateXDefaultAvatar
();
        }
    }
    // 获取背景图
    let banner = profileData.banner;
    if(banner && banner.startsWith('img_')) {
        banner = await window.db.getImage(banner);
    }
    const bannerStyle = banner ? `background-image:url('${banner}');background-size:cover;background-position:center;` : 'background:#333;';

    // 判断是否已关注
    const followingList = data.following || [];
    const isFollowing = followingList.some(f => f.handle === profileData.handle);

    const header = document.createElement('div');
    header.innerHTML = `
        <div class="t-profile-banner" style="${bannerStyle}">
            ${isMe ? '<div class="t-profile-banner-edit"><i class="fas fa-camera"></i></div>' : ''}
        </div>
        <div class="t-profile-header">
            <div class="t-profile-avatar-wrapper">
                <div class="t-profile-avatar" style="background-image:url('${avatar}')"></div>
                ${isMe ? '<div class="t-profile-avatar-edit"><i class="fas fa-camera"></i></div>' : ''}
            </div>
            <div class="t-profile-actions">
                ${isMe ? `
                    <button class="t-profile-edit-btn" id="tEditProfileBtn">编辑资料</button>
                ` : `
                    <button class="t-profile-follow-btn ${isFollowing ? 'following' : ''}" id="tFollowBtn">
                        ${isFollowing ? '正在关注' : '关注'}
                    </button>
                    <button class="t-profile-dm-btn" id="tProfileDmBtn"><i class="fas fa-envelope"></i></button>
                `}
            </div>
        </div>
        <div class="t-profile-info">
            <div class="t-profile-name">${profileData.name}</div>
            <div class="t-profile-handle">${profileData.handle}</div>
            <div class="t-profile-bio">${profileData.bio || ''}</div>
            <div class="t-profile-meta">
                <span><i class="far fa-calendar-alt"></i> 加入时间 ${profileData.joinDate || '2024年1月'}</span>
            </div>
            <div class="t-profile-stats">
                <span class="t-profile-stat" id="tFollowingCount"><b>${profileData.following || 0}</b> 正在关注</span>
                <span class="t-profile-stat" id="tFollowersCount"><b>${profileData.followers || 0}</b> 粉丝</span>
            </div>
        </div>
        <div class="t-profile-tabs">
            <div class="t-profile-tab active" data-tab="tweets">推文</div>
            <div class="t-profile-tab" data-tab="replies">回复</div>
            <div class="t-profile-tab" data-tab="media">媒体</div>
            <div class="t-profile-tab" data-tab="likes">喜欢</div>
        </div>
        <div id="tProfileContent"></div>
    `;
    content.appendChild(header);

    // 绑定事件

    // 编辑资料按钮
    if(isMe) {
        document.getElementById('tEditProfileBtn').onclick = () => this.openEditProfileModal(profileData);

        // 编辑头像
        header.querySelector('.t-profile-avatar-edit').onclick = (e) => {
            e.stopPropagation();
            this.changeAvatar('profile');
        };

        // 编辑背景
        header.querySelector('.t-profile-banner-edit').onclick = (e) => {
            e.stopPropagation();
            this.changeBanner();
        };
    } else {
        // 关注按钮
document.getElementById('tFollowBtn').onclick = () => {
    const currentData = this.store.get();
    const followingList = currentData.following || [];
    const currentlyFollowing = followingList.some(f => f.handle === profileData.handle);

    const btn = document.getElementById('tFollowBtn');
    const countEl = document.getElementById('tFollowersCount').querySelector('b');

    if(currentlyFollowing) {
        // 取消关注
        this.toggleFollow(profileData);
        btn.classList.remove('following');
        btn.innerText = '关注';
        countEl.innerText = Math.max(0, parseInt(countEl.innerText) - 1);
    } else {
        // 检查是否私密账号
        if(profileData.isPrivate) {
            // 发送关注请求
            this.sendFollowRequest(profileData);
            btn.innerText = '请求已发送';
            btn.disabled = true;
            btn.style.opacity = '0.6';
        } else {
            // 直接关注
            this.toggleFollow(profileData);
            btn.classList.add('following');
            btn.innerText = '正在关注';
            countEl.innerText = parseInt(countEl.innerText) + 1;
        }
    }
};


        // 私信按钮
        document.getElementById('tProfileDmBtn').onclick = () => {
            this.startDMFromProfile(profileData);
        };
    }

    // 关注/粉丝列表点击
    document.getElementById('tFollowingCount').onclick = () => this.showFollowList(profileData, 'following');
    document.getElementById('tFollowersCount').onclick = () => this.showFollowList(profileData, 'followers');

    // Tab切换
    const renderTab = async (tab) => {
        const container = document.getElementById('tProfileContent');
        container.innerHTML = '<div style="padding:20px;text-align:center;"><i class="fas fa-spinner fa-spin"></i></div>';

        let tweets = [];

        if(tab === 'tweets') {
            if(isMe) {
                tweets = data.tweets.filter(t => t.accountId === data.currentAccountId);
            } else {
                // 查找该角色的推文
                tweets = data.tweets.filter(t => t.isAI && t.aiHandle === profileData.handle);

                // 如果没有推文则自动生成
                if(tweets.length === 0) {
                    await this.generateProfileTweets(profileData);
                    const newData = this.store.get();
                    tweets = newData.tweets.filter(t => t.isAI && t.aiHandle === profileData.handle);
                }
            }
        } else if(tab === 'replies') {
            tweets = data.tweets.filter(t => {
                if(isMe) return t.accountId === data.currentAccountId && t.replies > 0;
                return t.isAI && t.aiHandle === profileData.handle && t.replies > 0;
            });
        } else if(tab === 'media') {
            tweets = data.tweets.filter(t => {
                if(isMe) return t.accountId === data.currentAccountId && t.images && t.images.length > 0;
                return t.isAI && t.aiHandle === profileData.handle && t.images && t.images.length > 0;
            });
        } else if(tab === 'likes') {
            // 显示喜欢的推文
            const likedIds = profileData.likedTweets || [];
            tweets = data.tweets.filter(t => likedIds.includes(t.id) || t.likes > 50).slice(0, 10);
        }

        tweets.sort((a, b) => b.time - a.time);
        container.innerHTML = '';

        if(tweets.length === 0) {
            container.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">暂无内容</div>';
        } else {
            for(const t of tweets) {
                const div = await this.createTweetElement(t);
                container.appendChild(div);
            }
        }
    };

    header.querySelectorAll('.t-profile-tab').forEach(tab => {
        tab.onclick = () => {
            header.querySelectorAll('.t-profile-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderTab(tab.dataset.tab);
        };
    });
// 如果是AI用户且没有推文，自动生成
if(!isMe && typeof target === 'object') {
    const existingTweets = data.tweets.filter(t => t.isAI && t.aiHandle === profileData.handle);
    if(existingTweets.length === 0) {
        // 自动生成推文
        await this.generateProfileTweets(profileData);
    }
}

    renderTab('tweets');
    detail.style.display = 'flex';
}

// 编辑资料弹窗
openEditProfileModal(profileData) {
    const modal = document.createElement('div');
    modal.className = 'sub-page';
    modal.id = 'tEditProfileModal';
    modal.style.cssText = 'display:flex; z-index:80;';
    modal.innerHTML = `
        <div class="sub-header" style="display:flex; justify-content:space-between; align-items:center; padding:10px;">
            <div style="display:flex;align-items:center;gap:15px;">
                <button class="back-btn" style="border:none; background:none; font-size:18px;"><i class="fas fa-times"></i></button>
                <span style="font-weight:bold;font-size:18px;">编辑资料</span>
            </div>
            <button class="send-btn" id="doSaveProfile" style="background:#333; color:white; border:none; border-radius:20px; padding:8px 18px; font-weight:bold;">保存</button>
        </div>
        <div style="overflow-y:auto; flex:1;">
            <div class="t-edit-banner" style="height:120px;background:#333;position:relative;">
                <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);display:flex;gap:20px;">
                    <div class="t-edit-icon" id="editBannerBtn"><i class="fas fa-camera"></i></div>
                    <div class="t-edit-icon" id="removeBannerBtn"><i class="fas fa-times"></i></div>
                </div>
            </div>
            <div style="padding:0 15px;position:relative;">
                <div class="t-edit-avatar" style="width:70px;height:70px;border-radius:50%;background:#ccc;position:absolute;top:-35px;border:4px solid white;">
                    <div class="t-edit-icon" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);" id="editAvatarBtn"><i class="fas fa-camera"></i></div>
                </div>
            </div>
            <div style="padding:60px 15px 20px;">
                <div class="t-edit-field">
                    <label>名称</label>
                    <input type="text" id="editName" value="${profileData.name || ''}">
                </div>
                <div class="t-edit-field">
                    <label>简介</label>
                    <textarea id="editBio" rows="3">${profileData.bio || ''}</textarea>
                </div>
                <div class="t-edit-field">
                    <label>位置</label>
                    <input type="text" id="editLocation" value="${profileData.location || ''}">
                </div>
                <div class="t-edit-field">
                    <label>网站</label>
                    <input type="text" id="editWebsite" value="${profileData.website || ''}">
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('.back-btn').onclick = () => modal.remove();

    document.getElementById('editAvatarBtn').onclick = () => this.changeAvatar('edit');
    document.getElementById('editBannerBtn').onclick = () => this.changeBanner();

    document.getElementById('doSaveProfile').onclick = () => {
        const name = document.getElementById('editName').value.trim();
        const bio = document.getElementById('editBio').value.trim();
        const location = document.getElementById('editLocation').value.trim();
        const website = document.getElementById('editWebsite').value.trim();

        this.store.update(d => {
            const acc = d.accounts.find(a => a.id === d.currentAccountId);
            if(acc) {
                acc.name = name || acc.name;
                acc.bio = bio;
                acc.location = location;
                acc.website = website;
            }
        });

        modal.remove();
        this.renderProfile('me');
        this.updateHeaderAvatar();
    };
}

// 更换头像
async changeAvatar(source) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if(!file) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            const base64 = ev.target.result;
            const imgId = await window.db.saveImage(base64);

            this.store.update(d => {
                const acc = d.accounts.find(a => a.id === d.currentAccountId);
                if(acc) acc.avatar = imgId;
            });

            if(source === 'profile') {
                this.renderProfile('me');
            }
            this.updateHeaderAvatar();
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

// 更换背景
async changeBanner() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if(!file) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            const base64 = ev.target.result;
            const imgId = await window.db.saveImage(base64);

            this.store.update(d => {
                const acc = d.accounts.find(a => a.id === d.currentAccountId);
                if(acc) acc.banner = imgId;
            });

            this.renderProfile('me');
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

// 关注/取关
toggleFollow(profileData) {
    this.store.update(d => {
        if(!d.following) d.following = [];

        const idx = d.following.findIndex(f => f.handle === profileData.handle);
        if(idx >= 0) {
            // 取关
            d.following.splice(idx, 1);
            // 更新自己的关注数
            const acc = d.accounts.find(a => a.id === d.currentAccountId);
            if(acc) acc.following = Math.max(0, (acc.following || 0) - 1);
        } else {
            // 关注
            d.following.push({
                name: profileData.name,
                handle: profileData.handle,
                avatar: profileData.avatar,
                bio: profileData.bio
            });
            // 更新自己的关注数
            const acc = d.accounts.find(a => a.id === d.currentAccountId);
            if(acc) acc.following = (acc.following || 0) + 1;

            // 添加关注通知
            this.addNotification({
                type: 'follow',
                fromName: '你',
                fromHandle: '@me',
                toName: profileData.name,
                toHandle: profileData.handle
            });
        }
    });
}

// 从主页发起私信
startDMFromProfile(profileData) {
    const data = this.store.get();
    let dm = data.dms.find(d => d.participant.handle === profileData.handle);

    if(!dm) {
        const id = window.Utils.generateId('dm');
        this.store.update(d => {
            d.dms.push({
                id: id,
                participant: {
                    name: profileData.name,
                    handle: profileData.handle,
                    avatar: profileData.avatar || ''
                },
                messages: [],
                isFriend: true
            });
        });
        this.openDMWindow(id);
    } else {
        this.openDMWindow(dm.id);
    }

    document.getElementById('tTweetDetail').style.display = 'none';
}

// 显示关注/粉丝列表
async showFollowList(profileData, type) {
    const apiConfig = window.API.getConfig();
    const data = this.store.get();

    const modal = document.createElement('div');
    modal.className = 'sub-page';
    modal.style.cssText = 'display:flex; z-index:85;';
    modal.innerHTML = `
        <div class="sub-header">
            <button class="back-btn"><i class="fas fa-arrow-left"></i></button>
            <span class="sub-title">${type === 'following' ? '正在关注' : '粉丝'}</span>
        </div>
        <div class="sub-content" id="followListContent">
            <div style="padding:20px;text-align:center;"><i class="fas fa-spinner fa-spin"></i> 加载中...</div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('.back-btn').onclick = () => modal.remove();

    const container = document.getElementById('followListContent');

    // 如果是自己则显示真实数据
    if(profileData.id && profileData.id === data.currentAccountId) {
        const list = type === 'following' ? (data.following || []) : (data.followers || []);

        if(list.length === 0) {
            container.innerHTML = `<div style="padding:40px;text-align:center;color:#999;">暂无${type === 'following' ? '关注' : '粉丝'}</div>`;
            return;
        }

        container.innerHTML = '';
        for(const user of list) {
            let avatar = user.avatar;
            if(avatar && avatar.startsWith('img_')) avatar = await window.db.getImage(avatar);
            else if(!avatar) avatar = window.Utils.generateXDefaultAvatar();

            const div = document.createElement('div');
            div.className = 't-follow-item';
            div.innerHTML = `
                <div class="t-follow-avatar" style="background-image:url('${avatar}')"></div>
                <div class="t-follow-info">
                    <div class="t-follow-name">${user.name}</div>
                    <div class="t-follow-handle">${user.handle}</div>
                    <div class="t-follow-bio">${user.bio || ''}</div>
                </div>
            `;
            div.onclick = () => {
                modal.remove();
                this.renderProfile(user);
            };
            container.appendChild(div);
        }
        return;
    }

    // 否则调用API生成
    if(!apiConfig.chatApiKey) {
        container.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">请先配置API Key</div>';
        return;
    }

    const prompt = `生成${profileData.name}的${type === 'following' ? '关注列表' : '粉丝列表'}中的5个用户。
    返回JSON数组: [{"name": "用户名", "handle": "@handle", "bio": "简介"}]`;

    try {
        const res = await window.API.callAI(prompt, apiConfig);
        const users = JSON.parse(res);

        container.innerHTML = '';
        for(const user of users) {
            const avatar = window.Utils.generateXDefaultAvatar();
            const div = document.createElement('div');
            div.className = 't-follow-item';
            div.innerHTML = `
                <div class="t-follow-avatar" style="background-image:url('${avatar}')"></div>
                <div class="t-follow-info">
                    <div class="t-follow-name">${user.name}</div>
                    <div class="t-follow-handle">${user.handle}</div>
                    <div class="t-follow-bio">${user.bio || ''}</div>
                </div>
            `;
            div.onclick = () => {
                modal.remove();
                this.renderProfile({...user, avatar: avatar});
            };
            container.appendChild(div);
        }
    } catch(e) {
        container.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">加载失败</div>';
    }
}

// 自动生成角色主页推文
async generateProfileTweets(profileData) {
    const apiConfig = window.API.getConfig();
    if(!apiConfig.chatApiKey) return;

    const data = this.store.get();
    const settings = data.settings || {};
    const worldSetting = settings.worldSetting || '现代都市';

    // 检查是否是绑定/开启角色
    let persona = '';
    const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}');
    const boundRole = (settings.boundRoles || []).find(b => b.twitterHandle === profileData.handle);
    const enabledRole = (settings.enabledRoles || []).find(b => b.twitterHandle === profileData.handle);

    if(boundRole) {
        const friend = (qqData.friends || []).find(f => f.id === boundRole.qqId);
        persona = friend?.persona || '';
    } else if(enabledRole) {
        const friend = (qqData.friends || []).find(f => f.id === enabledRole.qqId);
        persona = friend?.persona || '';
    }

    const prompt = `【世界观】${worldSetting}

【角色信息】
用户名：${profileData.name}
Twitter：${profileData.handle}
${persona ? `【人设】${persona}` : '【注意】没有预设人设，根据名字和handle推断性格，自由发挥'}

【生成要求】
生成这个用户最近的8-12条推文，展现ta的真实生活。

【活人感主页指南】

这是一个真实用户的推特主页，ta的推文应该：

1.【时间跨度】
- 有今天刚发的
- 有昨天的
- 有几天前的
- 有一周前的
- 时间分布自然

2.【内容类型多样】
- 日常碎碎念（今天好累/下班了/吃了个xx）
- 情绪输出（开心/丧/烦躁/无聊）
- 分享爱好（游戏/追星/美食/宠物）
- 吐槽抱怨
- 转发评论别人
- 互动帖（问问题/求推荐）
- 深夜emo
- 无意义发疯

3.【风格一致但有变化】
- 同一个人不同时候情绪不同
- 有几条获得很多互动
- 有几条没人理
- 不是每条都精心编辑

4.【必须有】
- 至少2条很短（1-10字）
- 至少1条比较长
- 至少2条带emoji
- 至少1条有点丧或者烦躁
- 互动数据差异大（有的几千赞有的个位数）

【返回格式】JSON数组
[
  {
    "text": "推文内容",
    "mood": "发这条时的情绪",
    "daysAgo": 0-7（几天前发的）,
    "stats": {"views": 100-50000, "likes": 0-2000, "retweets": 0-500, "replies": 0-200}
  }
]`;

    try {
        const res = await window.API.callAI(prompt, apiConfig);
        let tweets = [];
        try {
            tweets = JSON.parse(res);
        } catch(e) {
            const match = res.match(/\[[\s\S]*\]/);
            if(match) tweets = JSON.parse(match[0]);
        }

        if(Array.isArray(tweets) && tweets.length > 0) {
            const newTweets = tweets.map((t, i) => ({
                id: window.Utils.generateId('tweet'),
                accountId: 'ai_generated',
                isAI: true,
                aiName: profileData.name,
                aiHandle: profileData.handle,
                aiAvatar: profileData.avatar || window.Utils.generateXDefaultAvatar(),
                text: t.text || t.content,
                time: Date.now() - (t.daysAgo || i) * 86400000 - Math.floor(Math.random() * 43200000),
                likes: t.stats?.likes || Math.floor(Math.random() * 300),
                retweets: t.stats?.retweets || Math.floor(Math.random() * 50),
                replies: t.stats?.replies || Math.floor(Math.random() * 20),
                views: t.stats?.views || Math.floor(Math.random() * 5000),
                images: [],
                comments: []
            }));

// ===== 🔴 使用AI生成完整的角色资料 =====
let profileDetails = {
    bio: '',
    location: '',
    website: '',
    followers: Math.floor(Math.random() * 5000) + 100,
    following: Math.floor(Math.random() * 500) + 50,
    joinDate: this.generateRandomJoinDate()
};

// 如果有API Key，生成更真实的资料
if(apiConfig.chatApiKey) {
    const profilePrompt = `为推特用户 ${profileData.name} (${profileData.handle}) 生成完整的个人资料。
${persona ? `人设：${persona}` : '根据用户名自由发挥'}

生成要求：
1. 简介（bio）- 一句话介绍自己要有个性，不要太正经
2. 位置（location）- 城市或有趣的位置描述
3. 网站（website）- 可选如果符合人设
4. 粉丝数（followers）- 100-50000之间的真实数字
5. 关注数（following）- 50-2000之间
6. 加入时间（joinYear）- 2015-2023之间

返回JSON：
{
    "bio": "简介",
    "location": "位置",
    "website": "网站（可选）",
    "followers": 粉丝数,
    "following": 关注数,
    "joinYear": 加入年份
}`;

    try {
        const profileRes = await window.API.callAI(profilePrompt, apiConfig);
        const profileJSON = JSON.parse(profileRes);

        profileDetails = {
            bio: profileJSON.bio || '',
            location: profileJSON.location || '',
            website: profileJSON.website || '',
            followers: profileJSON.followers || profileDetails.followers,
            following: profileJSON.following || profileDetails.following,
            joinDate: profileJSON.joinYear ? `${profileJSON.joinYear}年` : profileDetails.joinDate
        };
    } catch(e) {
        console.error('生成资料失败使用默认值:', e);
    }
}

// 保存推文和完整资料
this.store.update(d => {
    d.tweets.push(...newTweets);

    // 缓存完整的角色资料
    if(!d.cachedProfiles) d.cachedProfiles = {};
    d.cachedProfiles[profileData.handle] = {
        name: profileData.name,
        handle: profileData.handle,
        avatar: profileData.avatar,
        bio: profileDetails.bio,
        location: profileDetails.location,
        website: profileDetails.website,
        followers: profileDetails.followers,
        following: profileDetails.following,
        joinDate: profileDetails.joinDate,
        verified: Math.random() > 0.85, // 15%概率认证
        lastUpdated: Date.now()
    };
});

        }
    } catch(e) {
        console.error('生成角色推文失败:', e);
    }
}



// ========== 社群功能 ==========
async renderCommunities() {
    const container = document.getElementById('tCommunityList');
    container.innerHTML = '';

    const data = this.store.get();
    const communities = data.communities || [];

    if(communities.length === 0) {
        container.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">暂无社群<br>点击上方按钮生成</div>';
        return;
    }

    for(const c of communities) {
        const div = document.createElement('div');
        div.className = 't-community-item';
        div.innerHTML = `
            <div class="t-community-icon" style="background:${c.color || '#1d9bf0'};">
                <i class="fas fa-${c.icon || 'users'}"></i>
            </div>
            <div class="t-community-info">
                <div class="t-community-name">${c.name}</div>
                <div class="t-community-members">${c.members || 0} 成员</div>
                <div class="t-community-desc">${c.description || ''}</div>
            </div>
        `;
        div.onclick = () => this.openCommunity(c.id);
        container.appendChild(div);
    }

    // 绑定生成按钮
    document.getElementById('tGenCommunityBtn').onclick = () => this.generateCommunities();

    // 绑定搜索
    document.getElementById('tCommunitySearchInput').onkeydown = (e) => {
        if(e.key === 'Enter') this.searchCommunity(e.target.value);
    };
}

async generateCommunities() {
    const apiConfig = window.API.getConfig();
    if(!apiConfig.chatApiKey) return alert('请先配置 API Key');

    const btn = document.getElementById('tGenCommunityBtn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';
    btn.disabled = true;

    const settings = this.store.get().settings || {};
    const worldSetting = settings.worldSetting || '现代社会';

    const prompt = `基于世界观"${worldSetting}"，生成5个推特社群。
    要求：
    1. 社群主题多样化（兴趣/地区/职业/粉丝群等）
    2. 每个社群有独特的名称和描述
    3. 成员数量真实（100-50000不等）
    返回JSON数组：
    [
        {
            "name": "社群名称",
            "description": "社群简介",
            "members": 1234,
            "icon": "fontawesome图标名(如gamepad/music/code/heart/star)",
            "color": "主题色(如#ff6b6b)"
        }
    ]`;

    try {
        const res = await window.API.callAI(prompt, apiConfig);
        let communities = [];
        try {
            communities = JSON.parse(res);
        } catch(e) {
            const match = res.match(/\[[\s\S]*\]/);
            if(match) communities = JSON.parse(match[0]);
        }

        if(Array.isArray(communities)) {
            this.store.update(d => {
                if(!d.communities) d.communities = [];
                communities.forEach(c => {
                    c.id = window.Utils.generateId('community');
                    c.tweets = [];
                    d.communities.push(c);
                });
            });
            this.renderCommunities();
        }
    } catch(e) {
        console.error(e);
        alert('生成失败');
    } finally {
        btn.innerHTML = '<i class="fas fa-magic"></i> 生成社群';
        btn.disabled = false;
    }
}

async searchCommunity(query) {
    if(!query.trim()) return;

    const apiConfig = window.API.getConfig();
    if(!apiConfig.chatApiKey) return alert('请先配置 API Key');

    const container = document.getElementById('tCommunityList');
    container.innerHTML = '<div style="padding:20px;text-align:center;">搜索中...</div>';

    const prompt = `搜索关于"${query}"的推特社群生成3个相关社群。返回JSON数组（格式同上）。`;

    try {
        const res = await window.API.callAI(prompt, apiConfig);
        const communities = JSON.parse(res);

        if(Array.isArray(communities)) {
            this.store.update(d => {
                if(!d.communities) d.communities = [];
                communities.forEach(c => {
                    c.id = window.Utils.generateId('community');
                    c.tweets = [];
                    d.communities.push(c);
                });
            });
            this.renderCommunities();
        }
    } catch(e) {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:#999;">搜索失败</div>';
    }
}

async openCommunity(communityId) {
    const data = this.store.get();
    const community = (data.communities || []).find(c => c.id === communityId);
    if(!community) return;

    this.currentCommunityId = communityId;

    const detail = document.getElementById('tTweetDetail');
    const content = document.getElementById('tDetailContent');
    content.innerHTML = '';

    // 社群头部
    const header = document.createElement('div');
    header.className = 't-community-detail-header';
    header.innerHTML = `
        <div class="t-community-banner" style="background:${community.color || '#1d9bf0'};height:100px;display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-${community.icon || 'users'}" style="font-size:40px;color:white;"></i>
        </div>
        <div style="padding:15px;">
            <h2 style="margin:0 0 5px 0;">${community.name}</h2>
            <div style="color:#536471;margin-bottom:10px;">${community.members} 成员</div>
            <div style="margin-bottom:15px;">${community.description}</div>
            <button class="t-community-join-btn" id="tJoinCommunityBtn">加入社群</button>
        </div>
        <div class="t-community-tabs">
            <div class="t-community-tab active" data-tab="recommended">推荐</div>
            <div class="t-community-tab" data-tab="replies">回复</div>
        </div>
        // 找到 openCommunity 方法中的这段：
// <button class="t-community-gen-tweets-btn" id="tGenCommunityTweetsBtn">
// 替换为：

        <div style="padding:10px;border-bottom:1px solid #eff3f4;display:flex;gap:10px;">
            <button class="t-community-post-btn" id="tCommunityPostBtn" style="flex:1;">
                <i class="fas fa-pen"></i> 发帖
            </button>
            <button class="t-community-gen-tweets-btn" id="tGenCommunityTweetsBtn" style="flex:1;">
                <i class="fas fa-magic"></i> 生成推文
            </button>
        </div>

        <div id="tCommunityTweets"></div>
    `;
    content.appendChild(header);

    // 渲染社群推文
    await this.renderCommunityTweets(community);

    // 绑定事件
    document.getElementById('tGenCommunityTweetsBtn').onclick = () => this.generateCommunityTweets(communityId);
    document.getElementById('tJoinCommunityBtn').onclick = () => {
        alert('已加入社群');
        this.store.update(d => {
            const c = d.communities.find(x => x.id === communityId);
            if(c) c.joined = true;
        });
    };
    // 社群内发帖按钮
    document.getElementById('tCommunityPostBtn').onclick = () => this.openCommunityPostModal(communityId, community);

    detail.style.display = 'flex';
}

async renderCommunityTweets(community) {
    const container = document.getElementById('tCommunityTweets');
    container.innerHTML = '';

    if(!community.tweets || community.tweets.length === 0) {
        container.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">暂无推文<br>点击生成按钮</div>';
        return;
    }

    for(const t of community.tweets) {
        const div = await this.createTweetElement(t);
        container.appendChild(div);
    }
}

async generateCommunityTweets(communityId) {
    const apiConfig = window.API.getConfig();
    if(!apiConfig.chatApiKey) return alert('请先配置 API Key');

    const data = this.store.get();
    const community = (data.communities || []).find(c => c.id === communityId);
    if(!community) return;

    const btn = document.getElementById('tGenCommunityTweetsBtn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';
    btn.disabled = true;

    const prompt = `在"${community.name}"社群中生成6条推文讨论。
    社群简介：${community.description}
    要求：
    1. 推文内容符合社群主题
    2. 不同用户发言风格各异
    3. 包含互动（有人提问/有人回答/有人吐槽）
    4. 生成真实的数据（浏览量/点赞/评论/转发）
    5. 每条推文生成2-3条评论
    返回JSON数组（格式同普通推文生成）。`;

    try {
        const res = await window.API.callAI(prompt, apiConfig);
        let tweets = [];
        try {
            tweets = JSON.parse(res);
        } catch(e) {
            const match = res.match(/\[[\s\S]*\]/);
            if(match) tweets = JSON.parse(match[0]);
        }

        if(Array.isArray(tweets)) {
            const newTweets = tweets.map(t => ({
                id: window.Utils.generateId('tweet'),
                accountId: 'ai_generated',
                isAI: true,
                aiName: t.name,
                aiHandle: t.handle,
                aiAvatar: window.Utils.generateDefaultAvatar(t.name),
                text: t.text,
                time: Date.now() - Math.floor(Math.random() * 3600000),
                likes: t.stats?.likes || Math.floor(Math.random() * 200),
                retweets: t.stats?.retweets || Math.floor(Math.random() * 50),
                replies: t.stats?.replies || Math.floor(Math.random() * 30),
                views: t.stats?.views || Math.floor(Math.random() * 3000),
                images: [],
                comments: (t.comments || []).map(c => ({
                    ...c,
                    time: Date.now() - Math.floor(Math.random() * 1800000),
                    avatar: window.Utils.generateDefaultAvatar(c.name)
                }))
            }));

            this.store.update(d => {
                const c = d.communities.find(x => x.id === communityId);
                if(c) {
                    if(!c.tweets) c.tweets = [];
                    c.tweets.push(...newTweets);
                }
            });

            const updatedData = this.store.get();
            const updatedCommunity = updatedData.communities.find(c => c.id === communityId);
            await this.renderCommunityTweets(updatedCommunity);
        }
    } catch(e) {
        console.error(e);
        alert('生成失败');
    } finally {
        btn.innerHTML = '<i class="fas fa-magic"></i> 生成推文';
        btn.disabled = false;
    }
}
// ========== 通知功能 ==========
async renderNotifications() {
    const container = document.getElementById('tNotificationList');
    container.innerHTML = '';

    const data = this.store.get();
    const notifications = data.notifications || [];

    // 绑定tab切换
    document.querySelectorAll('.t-notif-tab').forEach(tab => {
        tab.onclick = () => {
            document.querySelectorAll('.t-notif-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            this.filterNotifications(tab.dataset.type);
        };
    });

    if(notifications.length === 0) {
        container.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">暂无通知<br>当有人点赞/评论/关注你时会显示在这里</div>';
        return;
    }

    // 按时间倒序
    const sorted = [...notifications].sort((a, b) => b.time - a.time);

    for(const n of sorted) {
        const div = await this.createNotificationElement(n);
        container.appendChild(div);
    }
}


async createNotificationElement(n) {
    const div = document.createElement('div');
    div.className = 't-notification-item';
    div.dataset.type = n.type;

    let avatar = n.fromAvatar;
    if(avatar && avatar.startsWith('img_')) avatar = await window.db.getImage(avatar);
    else if(!avatar) avatar = window.Utils.generateDefaultAvatar(n.fromName);

    let icon = '';
    let iconColor = '';
    let content = '';

    switch(n.type) {
        case 'like':
            icon = 'heart';
            iconColor = '#f91880';
            content = `<b>${n.fromName}</b> 赞了你的推文`;
            break;
        case 'retweet':
            icon = 'retweet';
            iconColor = '#00ba7c';
            content = `<b>${n.fromName}</b> 转发了你的推文`;
            break;
        case 'comment':
            icon = 'comment';
            iconColor = '#1d9bf0';
            content = `<b>${n.fromName}</b> 评论了你的推文: "${n.commentText || ''}"`;
            break;
        case 'follow':
            icon = 'user-plus';
            iconColor = '#1d9bf0';
            content = `<b>${n.fromName}</b> 关注了你`;
            break;
        case 'mention':
            icon = 'at';
            iconColor = '#1d9bf0';
            content = `<b>${n.fromName}</b> 在推文中提到了你`;
            break;
        case 'quote':
            icon = 'quote-right';
            iconColor = '#1d9bf0';
            content = `<b>${n.fromName}</b> 引用了你的推文`;
            break;
        default:
            icon = 'bell';
            iconColor = '#536471';
            content = n.text || '新通知';
    }

    div.innerHTML = `
        <div class="t-notif-icon" style="color:${iconColor};">
            <i class="fas fa-${icon}"></i>
        </div>
        <div class="t-notif-avatar" style="background-image:url('${avatar}')"></div>
        <div class="t-notif-content">
            <div class="t-notif-text">${content}</div>
            ${n.tweetText ? `<div class="t-notif-tweet">${n.tweetText.substring(0, 50)}...</div>` : ''}
            <div class="t-notif-time">${this.timeSince(n.time)}</div>
        </div>
    `;

    div.onclick = () => {
        if(n.tweetId) {
            const data = this.store.get();
            const tweet = data.tweets.find(t => t.id === n.tweetId);
            if(tweet) this.openTweetDetail(tweet);
        } else if(n.type === 'follow') {
            this.renderProfile({
                name: n.fromName,
                handle: n.fromHandle,
                avatar: n.fromAvatar,
                bio: ''
            });
        }
    };

    return div;
}

filterNotifications(type) {
    const items = document.querySelectorAll('.t-notification-item');
    items.forEach(item => {
        if(type === 'all') {
            item.style.display = 'flex';
        } else if(type === 'mentions') {
            item.style.display = (item.dataset.type === 'mention' || item.dataset.type === 'quote') ? 'flex' : 'none';
        }
    });
}

// 添加通知的方法（供其他功能调用）
addNotification(notification) {
    this.store.update(d => {
        if(!d.notifications) d.notifications = [];
        d.notifications.unshift({
            id: window.Utils.generateId('notif'),
            time: Date.now(),
            ...notification
        });
        // 最多保留100条
        if(d.notifications.length > 100) {
            d.notifications = d.notifications.slice(0, 100);
        }
    });
}
// 分享选项
showShareOptions(tweet, account) {
    const menu = document.createElement('div');
    menu.className = 't-share-menu';
    menu.innerHTML = `
        <div class="t-action-menu-overlay"></div>
        <div class="t-share-menu-content">
            <div class="t-share-title">分享推文</div>
            <div class="t-share-options">
                <div class="t-share-option" id="shareCopyLink">
                    <div class="t-share-icon"><i class="fas fa-link"></i></div>
                    <div class="t-share-label">复制链接</div>
                </div>
                <div class="t-share-option" id="shareToQQ">
                    <div class="t-share-icon" style="background:#12b7f5;color:white;"><i class="fab fa-qq"></i></div>
                    <div class="t-share-label">发给好友</div>
                </div>
                <div class="t-share-option" id="shareToMoment">
                    <div class="t-share-icon" style="background:#333;color:white;"><i class="fas fa-stream"></i></div>
                    <div class="t-share-label">发到动态</div>
                </div>
                <div class="t-share-option" id="shareBookmark">
                    <div class="t-share-icon"><i class="far fa-bookmark"></i></div>
                    <div class="t-share-label">收藏</div>
                </div>
            </div>
            <div class="t-action-menu-item cancel">取消</div>
        </div>
    `;
    document.body.appendChild(menu);

    menu.querySelector('.t-action-menu-overlay').onclick = () => menu.remove();
    menu.querySelector('.cancel').onclick = () => menu.remove();

    // 复制链接
    menu.querySelector('#shareCopyLink').onclick = () => {
        const fakeLink = `https://x.com/${account.handle}/status/${tweet.id}`;
        navigator.clipboard.writeText(fakeLink).then(() => {
            alert('链接已复制');
        }).catch(() => {
            alert('复制失败');
        });
        menu.remove();
    };

    // 分享给QQ好友
    menu.querySelector('#shareToQQ').onclick = () => {
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
        if(qqData.friends.length === 0) {
            alert('暂无QQ好友');
            menu.remove();
            return;
        }

        const names = qqData.friends.map((f, i) => `${i + 1}. ${f.name}`).join('\n');
        const choice = prompt(`选择好友:\n${names}`);
        const idx = parseInt(choice) - 1;

        if(idx >= 0 && idx < qqData.friends.length) {
            const friend = qqData.friends[idx];
            if(!qqData.messages) qqData.messages = {};
            if(!qqData.messages[friend.id]) qqData.messages[friend.id] = [];

            qqData.messages[friend.id].push({
                id: Date.now(),
                senderId: 'user',
                senderName: '我',
                content: `[分享推文]\n${account.name}: ${tweet.text.substring(0, 80)}${tweet.text.length > 80 ? '...' : ''}`,
                type: 'text',
                timestamp: Date.now(),
                status: 'normal'
            });
            localStorage.setItem('qq_data', JSON.stringify(qqData));
            alert('分享成功');
        }
        menu.remove();
    };

    // 发到QQ动态
    menu.querySelector('#shareToMoment').onclick = () => {
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}');
        if(!qqData.moments) qqData.moments = [];

        qqData.moments.unshift({
            id: Date.now(),
            userId: 'user',
            name: qqData.user?.name || '我',
            avatar: qqData.user?.avatar || '',
            text: `分享推文 @${account.handle}:\n${tweet.text}`,
            timestamp: Date.now(),
            comments: [],
            likes: []
        });
        localStorage.setItem('qq_data', JSON.stringify(qqData));
        alert('已发布到动态');
        menu.remove();
    };

    // 收藏
    menu.querySelector('#shareBookmark').onclick = () => {
        this.store.update(d => {
            if(!d.bookmarks) d.bookmarks = [];
            const exists = d.bookmarks.some(b => b.id === tweet.id);
            if(!exists) {
                d.bookmarks.push({
                    id: tweet.id,
                    time: Date.now()
                });
            }
        });
        alert('已收藏');
        menu.remove();
    };
}
// ========== 账号互通功能 ==========

// 渲染账号互通列表
renderAccountLinks() {
    const container = document.getElementById('tAccountLinksContainer');
    container.innerHTML = '';

    const data = this.store.get();
    const accountLinks = data.settings.accountLinks || [];
    const currentAccountId = data.currentAccountId;

    // 当前账号的互通设置
    const currentLinks = accountLinks.filter(link => link.fromAccountId === currentAccountId);

    if(currentLinks.length === 0) {
        container.innerHTML = '<div class="t-settings-empty">暂无互通账号</div>';
        return;
    }

    currentLinks.forEach((link, idx) => {
        const targetAccount = data.accounts.find(a => a.id === link.toAccountId);
        if(!targetAccount) return;

        const div = document.createElement('div');
        div.className = 't-settings-item';
        div.innerHTML = `
            <div class="t-settings-item-info">
                <div class="t-settings-item-name">${targetAccount.name}</div>
                <div class="t-settings-item-detail">${targetAccount.handle}</div>
            </div>
            <button class="t-settings-item-delete" data-idx="${idx}">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(div);
    });

    // 绑定删除事件
    container.querySelectorAll('.t-settings-item-delete').forEach(btn => {
        btn.onclick = (e) => {
            const idx = parseInt(e.currentTarget.dataset.idx);
            this.removeAccountLink(idx);
        };
    });
}

// 添加账号互通
addAccountLink() {
    const data = this.store.get();
    const currentAccountId = data.currentAccountId;

    // 获取可选账号（排除当前账号和已互通的账号）
    const existingLinks = (data.settings.accountLinks || [])
        .filter(link => link.fromAccountId === currentAccountId)
        .map(link => link.toAccountId);

    const availableAccounts = data.accounts.filter(a =>
        a.id !== currentAccountId && !existingLinks.includes(a.id)
    );

    if(availableAccounts.length === 0) {
        alert('没有可互通的账号请先添加新账号');
        return;
    }

    const names = availableAccounts.map((a, i) => `${i + 1}. ${a.name} (${a.handle})`).join('\n');
    const choice = prompt(`选择要互通的账号:\n${names}`);
    const idx = parseInt(choice) - 1;

    if(idx >= 0 && idx < availableAccounts.length) {
        const targetAccount = availableAccounts[idx];

        this.store.update(d => {
            if(!d.settings.accountLinks) d.settings.accountLinks = [];

            // 双向互通
            d.settings.accountLinks.push({
                fromAccountId: currentAccountId,
                toAccountId: targetAccount.id
            });
            d.settings.accountLinks.push({
                fromAccountId: targetAccount.id,
                toAccountId: currentAccountId
            });
        });

        this.renderAccountLinks();
    }
}

// 移除账号互通
removeAccountLink(idx) {
    const data = this.store.get();
    const currentAccountId = data.currentAccountId;
    const currentLinks = (data.settings.accountLinks || [])
        .filter(link => link.fromAccountId === currentAccountId);

    if(idx >= 0 && idx < currentLinks.length) {
        const linkToRemove = currentLinks[idx];

        this.store.update(d => {
            // 移除双向互通
            d.settings.accountLinks = d.settings.accountLinks.filter(link =>
                !(link.fromAccountId === currentAccountId && link.toAccountId === linkToRemove.toAccountId) &&
                !(link.fromAccountId === linkToRemove.toAccountId && link.toAccountId === currentAccountId)
            );
        });

        this.renderAccountLinks();
    }
}

// 检查两个账号是否互通
areAccountsLinked(accountId1, accountId2) {
    const data = this.store.get();
    const links = data.settings.accountLinks || [];
    return links.some(link =>
        (link.fromAccountId === accountId1 && link.toAccountId === accountId2) ||
        (link.fromAccountId === accountId2 && link.toAccountId === accountId1)
    );
}

// 获取与当前账号互通的所有账号ID
getLinkedAccountIds() {
    const data = this.store.get();
    const currentAccountId = data.currentAccountId;
    const links = data.settings.accountLinks || [];

    return links
        .filter(link => link.fromAccountId === currentAccountId)
        .map(link => link.toAccountId);
}
// ========== 绑定角色功能 ==========

// 渲染绑定角色列表
renderBoundRoles() {
    const container = document.getElementById('tBoundRolesContainer');
    container.innerHTML = '';

    const data = this.store.get();
    const boundRoles = data.settings.boundRoles || [];
    const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}');

    if(boundRoles.length === 0) {
        container.innerHTML = '<div class="t-settings-empty">暂无绑定角色</div>';
        return;
    }

    boundRoles.forEach((role, idx) => {
        const friend = (qqData.friends || []).find(f => f.id === role.qqId);
        const name = friend ? friend.name : '未知角色';

        const div = document.createElement('div');
        div.className = 't-settings-item';
        div.innerHTML = `
            <div class="t-settings-item-icon bound">
                <i class="fas fa-link"></i>
            </div>
            <div class="t-settings-item-info">
                <div class="t-settings-item-name">${name}</div>
                <div class="t-settings-item-detail">${role.twitterHandle}</div>
            </div>
            <button class="t-settings-item-delete" data-type="bound" data-idx="${idx}">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(div);
    });

    // 绑定删除事件
    container.querySelectorAll('.t-settings-item-delete').forEach(btn => {
        btn.onclick = (e) => {
            const idx = parseInt(e.currentTarget.dataset.idx);
            this.removeBoundRole(idx);
        };
    });
}

// 添加绑定角色
addBoundRole() {
    const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}');
    const friends = qqData.friends || [];

    if(friends.length === 0) {
        alert('暂无QQ好友可绑定');
        return;
    }

    // 排除已绑定的角色
    const data = this.store.get();
    const boundIds = (data.settings.boundRoles || []).map(r => r.qqId);
    const enabledIds = (data.settings.enabledRoles || []).map(r => r.qqId);
    const existingIds = [...boundIds, ...enabledIds];

    const availableFriends = friends.filter(f => !existingIds.includes(f.id));

    if(availableFriends.length === 0) {
        alert('所有QQ好友已被绑定或开启');
        return;
    }

    const names = availableFriends.map((f, i) => `${i + 1}. ${f.name}`).join('\n');
    const choice = prompt(`选择要绑定的QQ好友:\n${names}`);
    const idx = parseInt(choice) - 1;

    if(idx >= 0 && idx < availableFriends.length) {
        const friend = availableFriends[idx];
        const handle = prompt(`为 ${friend.name} 设置X用户名 (例如 @${friend.name.toLowerCase()}):`);

        if(handle) {
            const finalHandle = handle.startsWith('@') ? handle : '@' + handle;

            this.store.update(d => {
                if(!d.settings.boundRoles) d.settings.boundRoles = [];
                d.settings.boundRoles.push({
                    qqId: friend.id,
                    twitterHandle: finalHandle,
                    name: friend.name
                });
            });

            this.renderBoundRoles();
        }
    }
}

// 移除绑定角色
removeBoundRole(idx) {
    this.store.update(d => {
        if(d.settings.boundRoles && d.settings.boundRoles[idx]) {
            d.settings.boundRoles.splice(idx, 1);
        }
    });
    this.renderBoundRoles();
}

// ========== 开启角色功能 ==========

// 渲染开启角色列表
renderEnabledRoles() {
    const container = document.getElementById('tEnabledRolesContainer');
    container.innerHTML = '';

    const data = this.store.get();
    const enabledRoles = data.settings.enabledRoles || [];
    const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}');

    if(enabledRoles.length === 0) {
        container.innerHTML = '<div class="t-settings-empty">暂无开启角色</div>';
        return;
    }

    enabledRoles.forEach((role, idx) => {
        const friend = (qqData.friends || []).find(f => f.id === role.qqId);
        const name = friend ? friend.name : '未知角色';

        const div = document.createElement('div');
        div.className = 't-settings-item';
        div.innerHTML = `
            <div class="t-settings-item-icon enabled">
                <i class="fas fa-user-secret"></i>
            </div>
            <div class="t-settings-item-info">
                <div class="t-settings-item-name">${name}</div>
                <div class="t-settings-item-detail">${role.twitterHandle} (不认识你)</div>
            </div>
            <button class="t-settings-item-delete" data-type="enabled" data-idx="${idx}">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(div);
    });

    // 绑定删除事件
    container.querySelectorAll('.t-settings-item-delete').forEach(btn => {
        btn.onclick = (e) => {
            const idx = parseInt(e.currentTarget.dataset.idx);
            this.removeEnabledRole(idx);
        };
    });
}

// 添加开启角色
addEnabledRole() {
    const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}');
    const friends = qqData.friends || [];

    if(friends.length === 0) {
        alert('暂无QQ好友可开启');
        return;
    }

    // 排除已绑定/开启的角色
    const data = this.store.get();
    const boundIds = (data.settings.boundRoles || []).map(r => r.qqId);
    const enabledIds = (data.settings.enabledRoles || []).map(r => r.qqId);
    const existingIds = [...boundIds, ...enabledIds];

    const availableFriends = friends.filter(f => !existingIds.includes(f.id));

    if(availableFriends.length === 0) {
        alert('所有QQ好友已被绑定或开启');
        return;
    }

    const names = availableFriends.map((f, i) => `${i + 1}. ${f.name}`).join('\n');
    const choice = prompt(`选择要开启的QQ好友（记忆隔离）:\n${names}`);
    const idx = parseInt(choice) - 1;

    if(idx >= 0 && idx < availableFriends.length) {
        const friend = availableFriends[idx];
        const handle = prompt(`为 ${friend.name} 设置X用户名 (例如 @${friend.name.toLowerCase()}):`);

        if(handle) {
            const finalHandle = handle.startsWith('@') ? handle : '@' + handle;

            this.store.update(d => {
                if(!d.settings.enabledRoles) d.settings.enabledRoles = [];
                d.settings.enabledRoles.push({
                    qqId: friend.id,
                    twitterHandle: finalHandle,
                    name: friend.name
                });
            });

            this.renderEnabledRoles();
        }
    }
}

// 移除开启角色
removeEnabledRole(idx) {
    this.store.update(d => {
        if(d.settings.enabledRoles && d.settings.enabledRoles[idx]) {
            d.settings.enabledRoles.splice(idx, 1);
        }
    });
    this.renderEnabledRoles();
}
// ========== NPC管理功能 ==========

// 渲染NPC列表
renderNpcs() {
    const container = document.getElementById('tNpcsContainer');
    container.innerHTML = '';

    const data = this.store.get();
    const npcs = data.settings.npcs || [];

    if(npcs.length === 0) {
        container.innerHTML = '<div class="t-settings-empty">暂无X专属角色</div>';
        return;
    }

    npcs.forEach((npc, idx) => {
        const div = document.createElement('div');
        div.className = 't-settings-item';
        div.innerHTML = `
            <div class="t-settings-item-icon npc">
                <i class="fas fa-robot"></i>
            </div>
            <div class="t-settings-item-info">
                <div class="t-settings-item-name">${npc.name}</div>
                <div class="t-settings-item-detail">${npc.handle}</div>
                <div class="t-settings-item-bio">${npc.bio || '无简介'}</div>
            </div>
            <div class="t-settings-item-actions">
                <button class="t-settings-item-edit" data-idx="${idx}">
                    <i class="fas fa-pen"></i>
                </button>
                <button class="t-settings-item-delete" data-idx="${idx}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        container.appendChild(div);
    });

    // 绑定编辑事件
    container.querySelectorAll('.t-settings-item-edit').forEach(btn => {
        btn.onclick = (e) => {
            const idx = parseInt(e.currentTarget.dataset.idx);
            this.editNpc(idx);
        };
    });

    // 绑定删除事件
    container.querySelectorAll('.t-settings-item-delete').forEach(btn => {
        btn.onclick = (e) => {
            const idx = parseInt(e.currentTarget.dataset.idx);
            this.deleteNpc(idx);
        };
    });
}

// 创建NPC
createNPC() {
    const modal = document.createElement('div');
    modal.className = 'sub-page';
    modal.id = 'tNpcModal';
    modal.style.cssText = 'display:flex; z-index:90;';
    modal.innerHTML = `
        <div class="sub-header" style="display:flex; justify-content:space-between; align-items:center; padding:10px;">
            <div style="display:flex;align-items:center;gap:15px;">
                <button class="back-btn" style="border:none; background:none; font-size:18px;"><i class="fas fa-times"></i></button>
                <span style="font-weight:bold;font-size:18px;">创建X专属角色</span>
            </div>
            <button class="send-btn" id="doCreateNpc" style="background:#333; color:white; border:none; border-radius:20px; padding:8px 18px; font-weight:bold;">创建</button>
        </div>
        <div style="overflow-y:auto; flex:1; padding:15px;">
            <div class="t-edit-field">
                <label>角色名称 *</label>
                <input type="text" id="npcName" placeholder="例如：小明">
            </div>
            <div class="t-edit-field">
                <label>用户名 *</label>
                <input type="text" id="npcHandle" placeholder="例如：@xiaoming">
            </div>
            <div class="t-edit-field">
                <label>简介</label>
                <textarea id="npcBio" rows="3" placeholder="这个角色的背景介绍..."></textarea>
            </div>
            <div class="t-edit-field">
                <label>人设详情</label>
                <textarea id="npcPersona" rows="5" placeholder="详细的性格、爱好、说话方式等..."></textarea>
            </div>
            <div class="t-edit-field">
                <label>与用户的关系</label>
                <input type="text" id="npcRelation" placeholder="例如：陌生人/网友/粉丝">
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('.back-btn').onclick = () => modal.remove();

    document.getElementById('doCreateNpc').onclick = () => {
        const name = document.getElementById('npcName').value.trim();
        const handle = document.getElementById('npcHandle').value.trim();
        const bio = document.getElementById('npcBio').value.trim();
        const persona = document.getElementById('npcPersona').value.trim();
        const relation = document.getElementById('npcRelation').value.trim();

        if(!name) {
            alert('请输入角色名称');
            return;
        }
        if(!handle) {
            alert('请输入用户名');
            return;
        }

        const finalHandle = handle.startsWith('@') ? handle : '@' + handle;

        this.store.update(d => {
            if(!d.settings.npcs) d.settings.npcs = [];
            d.settings.npcs.push({
                id: window.Utils.generateId('npc'),
                name: name,
                handle: finalHandle,
                bio: bio,
                persona: persona,
                relation: relation,
                avatar: window.Utils.generateXDefaultAvatar(),
                createdAt: Date.now()
            });
        });

        modal.remove();
        this.renderNpcs();
    };
}

// 编辑NPC
editNpc(idx) {
    const data = this.store.get();
    const npc = data.settings.npcs[idx];
    if(!npc) return;

    const modal = document.createElement('div');
    modal.className = 'sub-page';
    modal.id = 'tNpcEditModal';
    modal.style.cssText = 'display:flex; z-index:90;';
    modal.innerHTML = `
        <div class="sub-header" style="display:flex; justify-content:space-between; align-items:center; padding:10px;">
            <div style="display:flex;align-items:center;gap:15px;">
                <button class="back-btn" style="border:none; background:none; font-size:18px;"><i class="fas fa-times"></i></button>
                <span style="font-weight:bold;font-size:18px;">编辑角色</span>
            </div>
            <button class="send-btn" id="doUpdateNpc" style="background:#333; color:white; border:none; border-radius:20px; padding:8px 18px; font-weight:bold;">保存</button>
        </div>
        <div style="overflow-y:auto; flex:1; padding:15px;">
            <div class="t-edit-field">
                <label>角色名称 *</label>
                <input type="text" id="editNpcName" value="${npc.name}">
            </div>
            <div class="t-edit-field">
                <label>用户名 *</label>
                <input type="text" id="editNpcHandle" value="${npc.handle}">
            </div>
            <div class="t-edit-field">
                <label>简介</label>
                <textarea id="editNpcBio" rows="3">${npc.bio || ''}</textarea>
            </div>
            <div class="t-edit-field">
                <label>人设详情</label>
                <textarea id="editNpcPersona" rows="5">${npc.persona || ''}</textarea>
            </div>
            <div class="t-edit-field">
                <label>与用户的关系</label>
                <input type="text" id="editNpcRelation" value="${npc.relation || ''}">
            </div>
            <div class="t-edit-field">
                <label>更换头像</label>
                <button class="t-settings-btn secondary" id="changeNpcAvatar" style="width:auto;">
                    <i class="fas fa-camera"></i> 选择图片
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('.back-btn').onclick = () => modal.remove();

    // 更换头像
    document.getElementById('changeNpcAvatar').onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if(!file) return;

            const reader = new FileReader();
            reader.onload = async (ev) => {
                const base64 = ev.target.result;
                const imgId = await window.db.saveImage(base64);

                this.store.update(d => {
                    if(d.settings.npcs[idx]) {
                        d.settings.npcs[idx].avatar = imgId;
                    }
                });
                alert('头像已更新');
            };
            reader.readAsDataURL(file);
        };
        input.click();
    };

    // 保存修改
    document.getElementById('doUpdateNpc').onclick = () => {
        const name = document.getElementById('editNpcName').value.trim();
        const handle = document.getElementById('editNpcHandle').value.trim();
        const bio = document.getElementById('editNpcBio').value.trim();
        const persona = document.getElementById('editNpcPersona').value.trim();
        const relation = document.getElementById('editNpcRelation').value.trim();

        if(!name || !handle) {
            alert('名称和用户名不能为空');
            return;
        }

        const finalHandle = handle.startsWith('@') ? handle : '@' + handle;

        this.store.update(d => {
            if(d.settings.npcs[idx]) {
                d.settings.npcs[idx].name = name;
                d.settings.npcs[idx].handle = finalHandle;
                d.settings.npcs[idx].bio = bio;
                d.settings.npcs[idx].persona = persona;
                d.settings.npcs[idx].relation = relation;
            }
        });

        modal.remove();
        this.renderNpcs();
    };
}

// 删除NPC（覆盖原来的方法）
deleteNpc(idx) {
    if(confirm('确定删除这个角色吗？')) {
        this.store.update(d => {
            if(d.settings.npcs && d.settings.npcs[idx]) {
                d.settings.npcs.splice(idx, 1);
            }
        });
        this.renderNpcs();
    }
}
// ========== 事件系统 ==========

// 检查并显示事件
async checkAndShowEvent() {
    const data = this.store.get();
    const events = data.events || [];

    // 获取当前活跃事件
    const activeEvent = events.find(e => e.active && Date.now() - e.time < 86400000);

    if(activeEvent) {
        this.showEventBanner(activeEvent);
    } else {
        document.getElementById('tEventBanner').style.display = 'none';
    }
}

// 显示事件横幅
showEventBanner(event) {
    const banner = document.getElementById('tEventBanner');
    document.getElementById('tEventTitle').innerText = event.title;
    document.getElementById('tEventDesc').innerText = event.description;
    banner.style.display = 'flex';

    // 根据事件类型设置图标和颜色
    const icon = banner.querySelector('.t-event-icon i');
    if(event.type === 'trending') {
        icon.className = 'fas fa-fire';
        banner.style.background = 'linear-gradient(135deg, #ff6b6b, #ffa500)';
    } else if(event.type === 'drama') {
        icon.className = 'fas fa-bolt';
        banner.style.background = 'linear-gradient(135deg, #9c27b0, #673ab7)';
    } else if(event.type === 'viral') {
        icon.className = 'fas fa-rocket';
        banner.style.background = 'linear-gradient(135deg, #1d9bf0, #00bcd4)';
    }

    document.getElementById('tEventClose').onclick = () => {
        banner.style.display = 'none';
    };

    banner.onclick = (e) => {
        if(e.target.closest('.t-event-close')) return;
        this.openEventDetail(event);
    };
}

// 打开事件详情
async openEventDetail(event) {
    const detail = document.getElementById('tTweetDetail');
    const content = document.getElementById('tDetailContent');
    content.innerHTML = '';

    const header = document.createElement('div');
    header.innerHTML = `
        <div class="t-event-detail-header" style="background:linear-gradient(135deg, #333, #555);padding:20px;color:white;">
            <div style="font-size:24px;font-weight:bold;margin-bottom:10px;">${event.title}</div>
            <div style="opacity:0.8;">${event.description}</div>
            <div style="margin-top:15px;font-size:14px;opacity:0.6;">
                <i class="fas fa-clock"></i> ${this.timeSince(event.time)}
            </div>
        </div>
        <div style="padding:15px;border-bottom:1px solid #eee;">
            <button class="t-settings-btn secondary" id="tGenEventTweets">
                <i class="fas fa-magic"></i> 生成相关推文
            </button>
        </div>
        <div id="tEventTweets"></div>
    `;
    content.appendChild(header);

    // 显示相关推文
    const data = this.store.get();
    const relatedTweets = data.tweets.filter(t =>
        t.eventId === event.id ||
        (t.text && event.keywords && event.keywords.some(k => t.text.includes(k)))
    );

    const tweetsContainer = document.getElementById('tEventTweets');
    if(relatedTweets.length === 0) {
        tweetsContainer.innerHTML = '<div style="padding:30px;text-align:center;color:#999;">暂无相关推文点击上方按钮生成</div>';
    } else {
        for(const t of relatedTweets) {
            const div = await this.createTweetElement(t);
            tweetsContainer.appendChild(div);
        }
    }

    document.getElementById('tGenEventTweets').onclick = () => this.generateEventTweets(event);

    detail.style.display = 'flex';
}

// 生成事件相关推文
async generateEventTweets(event) {
    const apiConfig = window.API.getConfig();
    if(!apiConfig.chatApiKey) return alert('请先配置 API Key');

    const btn = document.getElementById('tGenEventTweets');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';
    btn.disabled = true;

    const data = this.store.get();
    const acc = data.accounts.find(a => a.id === data.currentAccountId);
    const settings = data.settings || {};

    // 判断用户是否与事件有关
    const userInvolved = event.involvedUsers && event.involvedUsers.includes(acc.handle);

    const prompt = `关于事件"${event.title}"生成8条推特推文。
    事件描述：${event.description}
    ${userInvolved ? `用户 ${acc.name} (${acc.handle}) 是事件当事人部分推文应该提及或讨论用户。` : ''}

    要求：
    1. 不同立场的用户（支持/反对/吃瓜/调侃）
    2. 极度拟人化符合真实推特氛围
    3. 包含话题标签
    4. 生成真实互动数据

    返回JSON数组（格式同普通推文）。`;

    try {
        const res = await window.API.callAI(prompt, apiConfig);
        let tweets = [];
        try {
            tweets = JSON.parse(res);
        } catch(e) {
            const match = res.match(/\[[\s\S]*\]/);
            if(match) tweets = JSON.parse(match[0]);
        }

        if(Array.isArray(tweets)) {
            const newTweets = tweets.map(t => ({
                id: window.Utils.generateId('tweet'),
                accountId: 'ai_generated',
                isAI: true,
                aiName: t.name,
                aiHandle: t.handle,
                aiAvatar: window.Utils.generateXDefaultAvatar(),
                text: t.text,
                time: Date.now() - Math.floor(Math.random() * 3600000),
                likes: t.stats?.likes || Math.floor(Math.random() * 500),
                retweets: t.stats?.retweets || Math.floor(Math.random() * 100),
                replies: t.stats?.replies || Math.floor(Math.random() * 50),
                views: t.stats?.views || Math.floor(Math.random() * 10000),
                images: [],
                eventId: event.id,
                comments: (t.comments || []).map(c => ({
                    ...c,
                    time: Date.now() - Math.floor(Math.random() * 1800000),
                    avatar: window.Utils.generateXDefaultAvatar()
                }))
            }));

            this.store.update(d => d.tweets.push(...newTweets));

            // 刷新事件详情
            this.openEventDetail(event);
        }
    } catch(e) {
        console.error(e);
        alert('生成失败');
    } finally {
        btn.innerHTML = '<i class="fas fa-magic"></i> 生成相关推文';
        btn.disabled = false;
    }
}

// 创建新事件
async createEvent(type, title, description, keywords = [], involvedUsers = []) {
    const event = {
        id: window.Utils.generateId('event'),
        type: type, // trending / drama / viral
        title: title,
        description: description,
        keywords: keywords,
        involvedUsers: involvedUsers,
        time: Date.now(),
        active: true
    };

    this.store.update(d => {
        if(!d.events) d.events = [];
        // 同时只保留一个活跃事件
        d.events.forEach(e => e.active = false);
        d.events.unshift(event);
    });

    return event;
}

// 自动生成事件（基于用户活动）
async autoGenerateEvent() {
    const apiConfig = window.API.getConfig();
    if(!apiConfig.chatApiKey) return;

    const data = this.store.get();
    const acc = data.accounts.find(a => a.id === data.currentAccountId);
    const settings = data.settings || {};
    const userHotness = this.calculateUserHotness();

    // 只有用户有一定热度才会生成相关事件
    if(userHotness < 30) return;

    // 获取用户最近的推文
    const recentTweets = data.tweets
        .filter(t => t.accountId === data.currentAccountId)
        .slice(0, 3)
        .map(t => t.text)
        .join('\n');

    const prompt = `基于用户 ${acc.name} (${acc.handle}) 的最近活动生成一个推特热门事件。
    用户简介：${acc.bio}
    用户热度：${userHotness}/100
    最近推文：
    ${recentTweets}

    可能的事件类型：
    - trending: 用户因为某事上了热搜
    - drama: 用户卷入了某个争议
    - viral: 用户的某条推文爆了

    返回JSON：{
        "type": "trending/drama/viral",
        "title": "事件标题",
        "description": "事件描述",
        "keywords": ["相关关键词"],
        "userInvolved": true/false
    }`;

    try {
        const res = await window.API.callAI(prompt, apiConfig);
        const eventData = JSON.parse(res);

        if(eventData && eventData.title) {
            const event = await this.createEvent(
                eventData.type,
                eventData.title,
                eventData.description,
                eventData.keywords,
                eventData.userInvolved ? [acc.handle] : []
            );

            this.checkAndShowEvent();

            if(Notification.permission === 'granted') {
                new Notification('X 热门', { body: eventData.title });
            }
        }
    } catch(e) {
        console.error('Auto event generation failed', e);
    }
}
// 注入事件相关推文到主时间线
async injectEventTweets(event, count = 2) {
    const apiConfig = window.API.getConfig();
    if(!apiConfig.chatApiKey) return;

    const prompt = `关于事件"${event.title}"生成${count}条路人推文。
    事件：${event.description}
    要求：简短、口语化、像真实网友反应。
    返回JSON数组：[{"name":"用户名","handle":"@xxx","text":"推文内容"}]`;

    try {
        const res = await window.API.callAI(prompt, apiConfig);
        const tweets = JSON.parse(res);

        if(Array.isArray(tweets)) {
            const newTweets = tweets.map(t => ({
                id: window.Utils.generateId('tweet'),
                accountId: 'ai_generated',
                isAI: true,
                aiName: t.name,
                aiHandle: t.handle,
                aiAvatar: window.Utils.generateXDefaultAvatar(),
                text: t.text,
                time: Date.now() - Math.floor(Math.random() * 1800000),
                likes: Math.floor(Math.random() * 200),
                retweets: Math.floor(Math.random() * 50),
                replies: Math.floor(Math.random() * 30),
                views: Math.floor(Math.random() * 5000),
                images: [],
                eventId: event.id,
                comments: []
            }));

            this.store.update(d => d.tweets.push(...newTweets));
        }
    } catch(e) {
        console.error('Inject event tweets failed', e);
    }
}

// 手动触发事件（可在控制台调用测试）
async triggerEvent(type = 'trending') {
    const apiConfig = window.API.getConfig();
    if(!apiConfig.chatApiKey) return alert('请先配置 API Key');

    const data = this.store.get();
    const acc = data.accounts.find(a => a.id === data.currentAccountId);
    const settings = data.settings || {};

    const typeDesc = {
        'trending': '热搜事件',
        'drama': '争议/八卦事件',
        'viral': '病毒式传播事件'
    };

    const prompt = `为推特用户 ${acc.name} (${acc.handle}) 生成一个${typeDesc[type]}。
    用户简介：${acc.bio || '普通用户'}
    世界观：${settings.worldSetting || '现代社会'}

    返回JSON：{
        "title": "事件标题（简短有冲击力）",
        "description": "事件描述（一句话）",
        "keywords": ["相关话题标签"],
        "userInvolved": true表示用户是当事人
    }`;

    try {
        const res = await window.API.callAI(prompt, apiConfig);
        const eventData = JSON.parse(res);

        if(eventData && eventData.title) {
            const event = await this.createEvent(
                type,
                eventData.title,
                eventData.description,
                eventData.keywords || [],
                eventData.userInvolved ? [acc.handle] : []
            );

            // 立即生成事件相关推文
            await this.generateEventTweets(event);

            this.checkAndShowEvent();
            this.renderHome();

            alert(`事件已触发：${eventData.title}`);
        }
    } catch(e) {
        console.error(e);
        alert('事件生成失败');
    }
}
// ========== 私信发送图片功能 ==========

// 发送真实图片
sendRealImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if(!file) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            const base64 = ev.target.result;
            const imgId = await window.db.saveImage(base64);

            const caption = prompt('添加图片说明（可选）:') || '';

            this.store.update(d => {
                const dm = d.dms.find(x => x.id === this.currentDmId);
                if(dm) {
                    dm.messages.push({
                        id: window.Utils.generateId('msg'),
                        sender: 'me',
                        type: 'image',
                        image: imgId,
                        text: caption,
                        time: Date.now()
                    });
                }
            });

            this.renderDMMessages();
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

// 发送文字图片（描述图片）
sendTextImage() {
    const modal = document.createElement('div');
    modal.className = 'sub-page';
    modal.style.cssText = 'display:flex; z-index:90;';
    modal.innerHTML = `
        <div class="sub-header" style="display:flex; justify-content:space-between; align-items:center; padding:10px;">
            <div style="display:flex;align-items:center;gap:15px;">
                <button class="back-btn" style="border:none; background:none; font-size:18px;"><i class="fas fa-times"></i></button>
                <span style="font-weight:bold;font-size:18px;">发送图片描述</span>
            </div>
            <button class="send-btn" id="doSendTextImage" style="background:#333; color:white; border:none; border-radius:20px; padding:8px 18px; font-weight:bold;">发送</button>
        </div>
        <div style="overflow-y:auto; flex:1; padding:15px;">
            <div class="t-text-image-preview">
                <i class="fas fa-image"></i>
            </div>
            <div class="t-edit-field">
                <label>图片描述 *</label>
                <textarea id="textImageDesc" rows="4" placeholder="描述这张图片的内容例如：一只可爱的猫咪躺在沙发上..."></textarea>
            </div>
            <div class="t-settings-desc" style="margin-top:10px;">
                <i class="fas fa-info-circle"></i> 文字图片会发送为图片描述对方可以想象图片内容
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('.back-btn').onclick = () => modal.remove();

    document.getElementById('doSendTextImage').onclick = () => {
        const description = document.getElementById('textImageDesc').value.trim();
        if(!description) {
            alert('请输入图片描述');
            return;
        }

        this.store.update(d => {
            const dm = d.dms.find(x => x.id === this.currentDmId);
            if(dm) {
                dm.messages.push({
                    id: window.Utils.generateId('msg'),
                    sender: 'me',
                    type: 'textImage',
                    imageDescription: description,
                    time: Date.now()
                });
            }
        });

        modal.remove();
        this.renderDMMessages();
    };
}
// 打开转账弹窗 - 修复版
openTransferModal() {
    if(!this.currentDmId) {
        alert('请先打开一个私信对话');
        return;
    }

    const data = this.store.get();
    const dm = data.dms.find(d => d.id === this.currentDmId);
    if(!dm) {
        alert('找不到当前对话');
        return;
    }

    // 获取QQ余额
    const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}');
    if(!qqData.wallet) qqData.wallet = { balance: 1000 }; // 默认1000
    const balance = qqData.wallet.balance || 0;

    // 移除已有弹窗
    const old = document.getElementById('tTransferModal');
    if(old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'tTransferModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;display:flex;flex-direction:column;background:white;';
    modal.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:15px;border-bottom:1px solid #eee;">
            <button id="closeTransferBtn" style="border:none;background:none;font-size:16px;cursor:pointer;">取消</button>
            <span style="font-weight:bold;font-size:16px;">转账给 ${dm.participant.name}</span>
            <div style="width:40px;"></div>
        </div>
        <div style="flex:1;overflow-y:auto;padding:20px;">
            <div style="text-align:center;padding:20px;background:#f5f5f5;border-radius:12px;margin-bottom:25px;">
                <div style="font-size:14px;color:#666;margin-bottom:5px;">QQ钱包余额</div>
                <div style="font-size:28px;font-weight:bold;color:#333;">¥${balance.toFixed(2)}</div>
            </div>
            <div style="display:flex;align-items:center;justify-content:center;padding:20px;background:white;border:2px solid #333;border-radius:12px;">
                <span style="font-size:36px;font-weight:300;color:#333;margin-right:5px;">¥</span>
                <input type="number" id="transferAmountInput" placeholder="0.00" min="0.01" step="0.01" style="font-size:42px;font-weight:bold;border:none;outline:none;width:150px;text-align:left;">
            </div>
            <div style="margin-top:15px;">
                <label style="display:block;font-size:14px;color:#666;margin-bottom:8px;">转账说明（可选）</label>
                <input type="text" id="transferNoteInput" placeholder="例如：请你喝奶茶" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:15px;outline:none;">
            </div>
            <div style="display:flex;gap:10px;margin-top:20px;justify-content:center;">
                <button class="quick-amount-btn" data-amount="10" style="padding:10px 20px;background:#f5f5f5;border:1px solid #ddd;border-radius:20px;font-size:14px;font-weight:600;cursor:pointer;">¥10</button>
                <button class="quick-amount-btn" data-amount="50" style="padding:10px 20px;background:#f5f5f5;border:1px solid #ddd;border-radius:20px;font-size:14px;font-weight:600;cursor:pointer;">¥50</button>
                <button class="quick-amount-btn" data-amount="100" style="padding:10px 20px;background:#f5f5f5;border:1px solid #ddd;border-radius:20px;font-size:14px;font-weight:600;cursor:pointer;">¥100</button>
                <button class="quick-amount-btn" data-amount="200" style="padding:10px 20px;background:#f5f5f5;border:1px solid #ddd;border-radius:20px;font-size:14px;font-weight:600;cursor:pointer;">¥200</button>
            </div>
            <button id="doTransferBtn" style="width:100%;padding:15px;background:#333;color:white;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;margin-top:25px;display:flex;align-items:center;justify-content:center;gap:8px;">
                <i class="fas fa-paper-plane"></i> 确认转账
            </button>
        </div>
    `;
    document.body.appendChild(modal);

    const self = this;

    // 关闭按钮
    document.getElementById('closeTransferBtn').onclick = function() {
        modal.remove();
    };

    // 快捷金额按钮
    modal.querySelectorAll('.quick-amount-btn').forEach(function(btn) {
        btn.onclick = function() {
            document.getElementById('transferAmountInput').value = btn.dataset.amount;
        };
    });

    // 确认转账
document.getElementById('doTransferBtn').onclick = async function() {
    const amountInput = document.getElementById('transferAmountInput');
    const noteInput = document.getElementById('transferNoteInput');

    const amount = parseFloat(amountInput.value);
    const note = noteInput ? noteInput.value.trim() : '';

    if(!amount || amount <= 0 || isNaN(amount)) {
        alert('请输入有效金额');
        return;
    }

    // 获取最新QQ余额
    const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}');
    if(!qqData.wallet) qqData.wallet = { balance: 1000 };
    const currentBalance = qqData.wallet.balance || 0;

    if(amount > currentBalance) {
        alert('余额不足！当前余额：¥' + currentBalance.toFixed(2));
        return;
    }

    // 扣除余额
    qqData.wallet.balance = currentBalance - amount;
    localStorage.setItem('qq_data', JSON.stringify(qqData));

    // 添加转账消息到私信
    const currentDmId = self.currentDmId;
    self.store.update(function(d) {
        const targetDm = d.dms.find(function(x) { return x.id === currentDmId; });
        if(targetDm) {
            targetDm.messages.push({
                id: window.Utils.generateId('msg'),
                sender: 'me',
                type: 'transfer',
                amount: amount,
                note: note || '转账',
                status: 'sent',
                time: Date.now()
            });
        }
    });

    modal.remove();
    self.renderDMMessages();

    // 提示成功
    alert('转账成功！已扣除 ¥' + amount.toFixed(2) + '\n剩余余额：¥' + (currentBalance - amount).toFixed(2));

    // 生成对方反应
    setTimeout(function() {
        self.generateTransferReactionWithMemory(amount, note);
    }, 1500);
};

}



// 生成转账反应
async generateTransferReaction(amount, note) {
    const apiConfig = window.API.getConfig();
    if(!apiConfig.chatApiKey) return;

    const data = this.store.get();
    const dm = data.dms.find(d => d.id === this.currentDmId);
    if(!dm) return;

    const prompt = `用户给 ${dm.participant.name} 转账了 ¥${amount}${note ? `附言："${note}"` : ''}。
    请生成对方的反应（1-2条消息简短口语化）。
    返回JSON数组：[{"text": "消息内容"}]`;

    try {
        const res = await window.API.callAI(prompt, apiConfig);
        const messages = JSON.parse(res);

        if(Array.isArray(messages)) {
            this.store.update(d => {
                const dm = d.dms.find(x => x.id === this.currentDmId);
                if(dm) {
                    messages.forEach((m, i) => {
                        dm.messages.push({
                            id: window.Utils.generateId('msg'),
                            sender: 'them',
                            type: 'text',
                            text: m.text,
                            time: Date.now() + i * 1000
                        });
                    });
                }
            });
            this.renderDMMessages();
        }
    } catch(e) {
        console.error(e);
    }
}

// 接收转账
receiveTransfer(msgId) {
    this.store.update(d => {
        const dm = d.dms.find(x => x.id === this.currentDmId);
        if(dm) {
            const msg = dm.messages.find(m => m.id === msgId);
            if(msg && msg.type === 'transfer' && msg.status === 'pending') {
                msg.status = 'received';

                // 增加QQ余额
                const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}');
                if(!qqData.wallet) qqData.wallet = { balance: 0 };
                qqData.wallet.balance += msg.amount;
                localStorage.setItem('qq_data', JSON.stringify(qqData));
            }
        }
    });
    this.renderDMMessages();
    alert('已收款');
}

// 显示私信对象信息
async showDmParticipantInfo() {
    const data = this.store.get();
    const dm = data.dms.find(d => d.id === this.currentDmId);
    if(!dm) return;

    let avatar = dm.participant.avatar;
    if(avatar && avatar.startsWith('img_')) {
        avatar = await window.db.getImage(avatar);
    } else if(!avatar) {
        avatar = window.Utils.generateXDefaultAvatar();
    }

    const modal = document.createElement('div');
    modal.className = 'sub-page';
    modal.style.cssText = 'display:flex; z-index:90;';
    modal.innerHTML = `
        <div class="sub-header">
            <button class="back-btn"><i class="fas fa-arrow-left"></i></button>
            <span class="sub-title">对话信息</span>
        </div>
        <div style="overflow-y:auto; flex:1; padding:20px;">
            <div class="t-dm-info-profile">
                <div class="t-dm-info-avatar" style="background-image:url('${avatar}')"></div>
                <div class="t-dm-info-name">${dm.participant.name}</div>
                <div class="t-dm-info-handle">${dm.participant.handle}</div>
            </div>
            <div class="t-dm-info-actions">
                <button class="t-dm-info-action" id="dmViewProfile">
                    <i class="fas fa-user"></i>
                    <span>查看主页</span>
                </button>
                <button class="t-dm-info-action" id="dmToggleFriend">
                    <i class="fas fa-${dm.isFriend ? 'user-minus' : 'user-plus'}"></i>
                    <span>${dm.isFriend ? '移至请求' : '添加好友'}</span>
                </button>
                <button class="t-dm-info-action danger" id="dmDeleteConvo">
                    <i class="fas fa-trash"></i>
                    <span>删除对话</span>
                </button>
            </div>
            <div class="t-dm-info-stats">
                <div class="t-dm-info-stat">
                    <div class="t-dm-info-stat-value">${dm.messages.length}</div>
                    <div class="t-dm-info-stat-label">消息数</div>
                </div>
                <div class="t-dm-info-stat">
                    <div class="t-dm-info-stat-value">${dm.messages.filter(m => m.type === 'image').length}</div>
                    <div class="t-dm-info-stat-label">图片</div>
                </div>
                <div class="t-dm-info-stat">
                    <div class="t-dm-info-stat-value">${dm.messages.filter(m => m.type === 'transfer').length}</div>
                    <div class="t-dm-info-stat-label">转账</div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('.back-btn').onclick = () => modal.remove();

    document.getElementById('dmViewProfile').onclick = () => {
        modal.remove();
        document.getElementById('tDmWindow').style.display = 'none';
        this.renderProfile({
            name: dm.participant.name,
            handle: dm.participant.handle,
            avatar: dm.participant.avatar,
            bio: ''
        });
    };

    document.getElementById('dmToggleFriend').onclick = () => {
        this.store.update(d => {
            const target = d.dms.find(x => x.id === this.currentDmId);
            if(target) target.isFriend = !target.isFriend;
        });
        modal.remove();
        alert(dm.isFriend ? '已移至请求' : '已添加好友');
    };

    document.getElementById('dmDeleteConvo').onclick = () => {
        if(confirm('确定删除这个对话吗？')) {
            this.store.update(d => {
                d.dms = d.dms.filter(x => x.id !== this.currentDmId);
            });
            modal.remove();
            document.getElementById('tDmWindow').style.display = 'none';
            this.renderDMs();
        }
    };
}
// ========== 艾特自动补全 ==========
handleMentionInput(e) {
    const input = e.target;
    const text = input.value;
    const cursorPos = input.selectionStart;

    // 查找光标前的@符号
    const beforeCursor = text.slice(0, cursorPos);
    const atMatch = beforeCursor.match(/@(\w*)$/);

    if(atMatch) {
        const searchTerm = atMatch[1].toLowerCase();
        this.showMentionDropdown(searchTerm, input);
    } else {
        this.hideMentionDropdown();
    }
}

async showMentionDropdown(searchTerm, inputEl) {
    const dropdown = document.getElementById('tMentionDropdown');
    dropdown.innerHTML = '';

    // 收集可艾特的用户
    const users = [];
    const data = this.store.get();
    const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}');
    const settings = data.settings || {};

    // 添加绑定角色
    (settings.boundRoles || []).forEach(role => {
        const friend = (qqData.friends || []).find(f => f.id === role.qqId);
        if(friend) {
            users.push({
                name: friend.name,
                handle: role.twitterHandle,
                avatar: friend.avatar,
                source: 'qq'
            });
        }
    });

    // 添加开启角色
    (settings.enabledRoles || []).forEach(role => {
        const friend = (qqData.friends || []).find(f => f.id === role.qqId);
        if(friend) {
            users.push({
                name: friend.name,
                handle: role.twitterHandle,
                avatar: friend.avatar,
                source: 'qq'
            });
        }
    });

    // 添加NPC
    (settings.npcs || []).forEach(npc => {
        users.push({
            name: npc.name,
            handle: npc.handle,
            avatar: npc.avatar,
            source: 'x'
        });
    });

    // 添加关注的人
    (data.following || []).forEach(f => {
        if(!users.some(u => u.handle === f.handle)) {
            users.push({
                name: f.name,
                handle: f.handle,
                avatar: f.avatar,
                source: 'x'
            });
        }
    });

    // 过滤
    const filtered = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm) ||
        u.handle.toLowerCase().includes(searchTerm)
    ).slice(0, 5);

    if(filtered.length === 0) {
        this.hideMentionDropdown();
        return;
    }

    for(const user of filtered) {
        let avatar = user.avatar;
        if(avatar && avatar.startsWith('img_')) {
            avatar = await window.db.getImage(avatar);
        } else if(!avatar) {
            avatar = user.source === 'qq'
                ? await window.Utils.getCharacterAvatar(user, 'qq')
                : window.Utils.generateXDefaultAvatar();
        }

        const item = document.createElement('div');
        item.className = 't-mention-item';
        item.innerHTML = `
            <div class="t-mention-avatar" style="background-image:url('${avatar}')"></div>
            <div class="t-mention-info">
                <div class="t-mention-name">${user.name}</div>
                <div class="t-mention-handle">${user.handle}</div>
            </div>
        `;
        item.onclick = () => this.insertMentionUser(user, inputEl);
        dropdown.appendChild(item);
    }

    // 定位下拉框
    dropdown.style.display = 'block';
}

hideMentionDropdown() {
    const dropdown = document.getElementById('tMentionDropdown');
    if(dropdown) dropdown.style.display = 'none';
}

insertMentionUser(user, inputEl) {
    const text = inputEl.value;
    const cursorPos = inputEl.selectionStart;

    // 找到@开始的位置
    const beforeCursor = text.slice(0, cursorPos);
    const atIndex = beforeCursor.lastIndexOf('@');

    if(atIndex >= 0) {
        const newText = text.slice(0, atIndex) + user.handle + ' ' + text.slice(cursorPos);
        inputEl.value = newText;

        // 移动光标
        const newPos = atIndex + user.handle.length + 1;
        inputEl.setSelectionRange(newPos, newPos);
        inputEl.focus();
    }

    this.hideMentionDropdown();
}

insertMention() {
    const input = document.getElementById('tPostInput');
    const cursorPos = input.selectionStart;
    const text = input.value;

    input.value = text.slice(0, cursorPos) + '@' + text.slice(cursorPos);
    input.setSelectionRange(cursorPos + 1, cursorPos + 1);
    input.focus();

    this.showMentionDropdown('', input);
}

addLocation() {
    const suggestions = [
        '北京', '上海', '广州', '深圳', '成都', '杭州',
        '你家楼下', '火星', '被窝里', '公司摸鱼中', '梦里',
        '网吧', '厕所', '不想上班', '精神状态：不稳定'
    ];

    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:300;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);"></div>
        <div style="position:relative;width:90%;max-width:350px;background:white;border-radius:16px;overflow:hidden;">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:15px;border-bottom:1px solid #eee;">
                <span style="font-weight:600;font-size:16px;">添加位置</span>
                <i class="fas fa-times" id="closeLocModal" style="cursor:pointer;color:#666;padding:5px;"></i>
            </div>
            <div style="padding:15px;">
                <div style="display:flex;align-items:center;background:#f5f5f5;border-radius:10px;padding:12px 15px;gap:10px;">
                    <i class="fas fa-map-marker-alt" style="color:#999;"></i>
                    <input type="text" id="locInput" placeholder="随便写点什么..." style="flex:1;border:none;background:transparent;font-size:15px;outline:none;" maxlength="30">
                </div>
                <div style="margin-top:15px;">
                    <div style="font-size:13px;color:#666;margin-bottom:10px;">快速选择</div>
                    <div id="locSuggestions" style="display:flex;flex-wrap:wrap;gap:8px;max-height:120px;overflow-y:auto;"></div>
                </div>
            </div>
            <div style="display:flex;gap:10px;padding:15px;border-top:1px solid #eee;">
                <button id="clearLocBtn" style="flex:1;padding:12px;background:#f5f5f5;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;">不填了</button>
                <button id="confirmLocBtn" style="flex:1;padding:12px;background:#333;color:white;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;">确定</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // 渲染建议
    const suggestionsContainer = document.getElementById('locSuggestions');
    suggestions.forEach(loc => {
        const tag = document.createElement('span');
        tag.style.cssText = 'display:inline-block;padding:6px 12px;background:#f0f0f0;border-radius:15px;font-size:13px;color:#333;cursor:pointer;';
        tag.innerText = loc;
        tag.onclick = () => {
            document.getElementById('locInput').value = loc;
        };
        suggestionsContainer.appendChild(tag);
    });

    // 关闭
    document.getElementById('closeLocModal').onclick = () => modal.remove();
    modal.querySelector('div').onclick = (e) => {
        if(e.target === modal.querySelector('div')) modal.remove();
    };

    // 清除
    document.getElementById('clearLocBtn').onclick = () => {
        this.postLocation = null;
        document.getElementById('tLocationDisplay').style.display = 'none';
        modal.remove();
    };

    // 确认
    document.getElementById('confirmLocBtn').onclick = () => {
        const loc = document.getElementById('locInput').value.trim();
        if(loc) {
            this.postLocation = loc;
            const display = document.getElementById('tLocationDisplay');
            if(display) {
                display.style.display = 'flex';
                document.getElementById('tLocationText').innerText = loc;
            }
        }
        modal.remove();
    };
}


// 更新位置显示
updateLocationDisplay() {
    const locationBtn = document.getElementById('tPostLocation');
    if(!locationBtn) return;

    if(this.postLocation) {
        locationBtn.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${this.postLocation}`;
        locationBtn.classList.add('has-location');
    } else {
        locationBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
        locationBtn.classList.remove('has-location');
    }
}

closeApp() {
    const app = document.getElementById('twitterApp');
    if(app) {
        app.classList.remove('active');
        app.style.display = 'none';
    }

    // 恢复主界面
    document.querySelectorAll('.home-screen, .dock-bar').forEach(el => {
        if(el) el.style.display = '';
    });

    document.body.classList.remove('twitter-open');
}

// 投票方法
votePoll(tweetId, optionIndex) {
    this.store.update(d => {
        const tweet = d.tweets.find(t => t.id === tweetId);
        if(!tweet || !tweet.poll) return;

        // 检查是否已投票或已过期
        if(tweet.poll.userVoted !== undefined) {
            alert('你已经投过票了');
            return;
        }
        if(tweet.poll.endTime && Date.now() > tweet.poll.endTime) {
            alert('投票已结束');
            return;
        }

        // 投票
        tweet.poll.options[optionIndex].votes = (tweet.poll.options[optionIndex].votes || 0) + 1;
        tweet.poll.totalVotes = (tweet.poll.totalVotes || 0) + 1;
        tweet.poll.userVoted = optionIndex;
    });

    this.renderHome();
}

// 计算投票剩余时间
getPollRemainingTime(endTime) {
    const remaining = endTime - Date.now();
    if(remaining <= 0) return '已结束';

    const days = Math.floor(remaining / 86400000);
    const hours = Math.floor((remaining % 86400000) / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);

    if(days > 0) return `${days}天${hours}小时后结束`;
    if(hours > 0) return `${hours}小时${minutes}分钟后结束`;
    return `${minutes}分钟后结束`;
}
// 社群内发帖弹窗
openCommunityPostModal(communityId, community) {
    const modal = document.createElement('div');
    modal.className = 'sub-page';
    modal.id = 'tCommunityPostModal';
    modal.style.cssText = 'display:flex; z-index:80;';
    modal.innerHTML = `
        <div class="sub-header" style="display:flex; justify-content:space-between; align-items:center; padding:10px 15px;">
            <button class="back-btn" style="border:none; background:none; font-size:16px; color:#333;">取消</button>
            <span style="font-weight:600;">发布到 ${community.name}</span>
            <button class="send-btn" id="doCommunityPost" style="background:#333; color:white; border:none; border-radius:20px; padding:8px 20px; font-weight:bold;">发布</button>
        </div>
        <div style="flex:1; overflow-y:auto; padding:15px;">
            <textarea id="communityPostInput" placeholder="分享你的想法..." style="width:100%; min-height:150px; border:none; outline:none; font-size:16px; resize:none; font-family:inherit; line-height:1.5;"></textarea>
        </div>
    `;
    document.getElementById('twitterApp').appendChild(modal);

    modal.querySelector('.back-btn').onclick = () => modal.remove();

    document.getElementById('doCommunityPost').onclick = async () => {
        const text = document.getElementById('communityPostInput').value.trim();
        if(!text) {
            alert('请输入内容');
            return;
        }

        const data = this.store.get();
        const acc = data.accounts.find(a => a.id === data.currentAccountId);

        const newTweet = {
            id: window.Utils.generateId('tweet'),
            accountId: data.currentAccountId,
            communityId: communityId,
            text: text,
            time: Date.now(),
            likes: 0,
            retweets: 0,
            replies: 0,
            views: 0,
            images: [],
            comments: []
        };

        this.store.update(d => {
            // 添加到推文列表
            d.tweets.unshift(newTweet);
            // 添加到社群推文
            const c = d.communities.find(x => x.id === communityId);
            if(c) {
                if(!c.tweets) c.tweets = [];
                c.tweets.unshift(newTweet);
            }
        });

        modal.remove();

        // 刷新社群页面
        const updatedData = this.store.get();
        const updatedCommunity = updatedData.communities.find(c => c.id === communityId);
        await this.renderCommunityTweets(updatedCommunity);

        // 生成社群成员对用户帖子的回应
        this.generateCommunityReactions(communityId, newTweet.id, text, community.name);
    };
}

// 生成社群成员对用户帖子的反应
async generateCommunityReactions(communityId, tweetId, text, communityName) {
    const apiConfig = window.API.getConfig();
    if(!apiConfig.chatApiKey) return;

    const prompt = `用户在"${communityName}"社群发帖："${text}"
生成社群成员的反应（评论+点赞+浏览）。

【活人感要求】
1. 社群成员都是对这个主题感兴趣的人
2. 有支持有反对有补充有提问有跑题
3. 风格多样：认真讨论/玩梗/杠精/热心帮忙
4. 评论数8-15条

返回JSON: {
    "views": 浏览量,
    "likes": 点赞数,
    "comments": [{"name": "用户名", "handle": "@xxx", "text": "评论内容"}]
}`;

    try {
        const res = await window.API.callAI(prompt, apiConfig);
        const json = JSON.parse(res);

        this.store.update(d => {
            const tweet = d.tweets.find(t => t.id === tweetId);
            if(tweet) {
                tweet.views = json.views || Math.floor(Math.random() * 500);
                tweet.likes = json.likes || Math.floor(Math.random() * 50);
                tweet.comments = (json.comments || []).map(c => ({
                    id: window.Utils.generateId('comment'),
                    name: c.name,
                    handle: c.handle,
                    text: c.text,
                    time: Date.now() - Math.floor(Math.random() * 1800000),
                    avatar: window.Utils.generateXDefaultAvatar(),
                    likes: Math.floor(Math.random() * 20),
                    replies: []
                }));
                tweet.replies = tweet.comments.length;
            }

            // 同步到社群
            const community = d.communities.find(c => c.id === communityId);
            if(community && community.tweets) {
                const cTweet = community.tweets.find(t => t.id === tweetId);
                if(cTweet) {
                    Object.assign(cTweet, tweet);
                }
            }
        });

        // 刷新显示
        const data = this.store.get();
        const community = data.communities.find(c => c.id === communityId);
        if(community) {
            this.renderCommunityTweets(community);
        }
    } catch(e) {
        console.error(e);
    }
}
// 在 TwitterApp 类中新增
showQuotePreview(quoteTweet) {
    const preview = document.getElementById('tQuotePreview');
    if(!preview || !quoteTweet) return;

    preview.style.display = 'block';
    preview.innerHTML = `
        <div class="tweet-quote" style="margin-top:15px;">
            <div class="quote-header">
                <div class="quote-avatar" style="background-image:url('${quoteTweet.aiAvatar || window.Utils.generateXDefaultAvatar()}');width:20px;height:20px;border-radius:50%;background-size:cover;margin-right:8px;"></div>
                <span class="quote-name" style="font-weight:700;font-size:14px;margin-right:4px;">${quoteTweet.aiName || '用户'}</span>
                <span class="quote-handle" style="color:#536471;font-size:14px;">${quoteTweet.aiHandle || '@user'}</span>
            </div>
            <div style="font-size:14px;color:#333;margin-top:8px;line-height:1.4;">${quoteTweet.text.substring(0, 100)}${quoteTweet.text.length > 100 ? '...' : ''}</div>
        </div>
    `;
}
// 渲染关注请求列表
renderFollowRequests() {
    const data = this.store.get();
    const acc = data.accounts.find(a => a.id === data.currentAccountId);
    const section = document.getElementById('tFollowRequestsSection');
    const container = document.getElementById('tFollowRequestsContainer');

    if(!acc || !acc.isPrivate) {
        if(section) section.style.display = 'none';
        return;
    }

    const requests = acc.followRequests || [];
    if(section) section.style.display = 'block';

    if(!container) return;

    if(requests.length === 0) {
        container.innerHTML = '<div class="t-settings-empty">暂无关注请求</div>';
        return;
    }

    container.innerHTML = '';
    requests.forEach((req, idx) => {
        const div = document.createElement('div');
        div.className = 't-follow-request-item';
        div.innerHTML = `
            <div class="t-follow-request-avatar" style="background-image:url('${req.avatar || window.Utils.generateXDefaultAvatar()}')"></div>
            <div class="t-follow-request-info">
                <div class="t-follow-request-name">${req.name}</div>
                <div class="t-follow-request-handle">${req.handle}</div>
            </div>
            <div class="t-follow-request-actions">
                <button class="t-follow-request-accept" data-idx="${idx}">
                    <i class="fas fa-check"></i>
                </button>
                <button class="t-follow-request-reject" data-idx="${idx}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        container.appendChild(div);
    });

    // 绑定接受/拒绝事件
    container.querySelectorAll('.t-follow-request-accept').forEach(btn => {
        btn.onclick = () => this.handleFollowRequest(parseInt(btn.dataset.idx), true);
    });
    container.querySelectorAll('.t-follow-request-reject').forEach(btn => {
        btn.onclick = () => this.handleFollowRequest(parseInt(btn.dataset.idx), false);
    });
}

// 处理关注请求
handleFollowRequest(idx, accept) {
    this.store.update(d => {
        const acc = d.accounts.find(a => a.id === d.currentAccountId);
        if(!acc || !acc.followRequests) return;

        const request = acc.followRequests[idx];
        if(!request) return;

        if(accept) {
            // 添加到粉丝列表
            if(!d.followers) d.followers = [];
            d.followers.push({
                name: request.name,
                handle: request.handle,
                avatar: request.avatar,
                bio: request.bio || '',
                followedAt: Date.now()
            });

            // 更新粉丝数
            acc.followers = (acc.followers || 0) + 1;

            // 添加通知
            if(!d.notifications) d.notifications = [];
            d.notifications.unshift({
                id: window.Utils.generateId('notif'),
                type: 'follow',
                fromName: request.name,
                fromHandle: request.handle,
                fromAvatar: request.avatar,
                time: Date.now()
            });
        }

        // 从请求列表移除
        acc.followRequests.splice(idx, 1);
    });

    this.renderFollowRequests();

    if(accept) {
        alert('已接受关注请求');
    } else {
        alert('已拒绝关注请求');
    }
}

// 请求关注私密账号（修改原有的toggleFollow方法）
requestFollow(profileData) {
    const data = this.store.get();

    // 检查目标是否是私密账号
    // 这里假设如果是AI生成的角色，根据设定判断
    const isPrivateTarget = profileData.isPrivate || false;

    if(isPrivateTarget) {
        // 发送关注请求
        alert(`已向 ${profileData.name} 发送关注请求，等待对方批准`);

        // 添加到对方的请求列表（模拟）
        this.addNotification({
            type: 'follow_request_sent',
            toName: profileData.name,
            toHandle: profileData.handle
        });

        return false; // 表示未立即关注成功
    }

    return true; // 可以直接关注
}
// 发送关注请求
sendFollowRequest(targetProfile) {
    const data = this.store.get();
    const acc = data.accounts.find(a => a.id === data.currentAccountId);

    // 记录已发送的请求
    this.store.update(d => {
        if(!d.sentFollowRequests) d.sentFollowRequests = [];
        d.sentFollowRequests.push({
            toHandle: targetProfile.handle,
            toName: targetProfile.name,
            time: Date.now()
        });
    });

    // 添加通知提示
    this.addNotification({
        type: 'follow_request_sent',
        toName: targetProfile.name,
        toHandle: targetProfile.handle,
        time: Date.now()
    });
}
// 打开投票创建器
openPollCreator() {
    if(this.postPoll) {
        // 已有投票，询问是否删除
        if(confirm('已有投票，是否删除？')) {
            this.postPoll = null;
            alert('投票已删除');
        }
        return;
    }

    const modal = document.createElement('div');
    modal.id = 'tPollCreatorModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:300;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);"></div>
        <div style="position:relative;width:90%;max-width:350px;background:white;border-radius:16px;overflow:hidden;">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:15px;border-bottom:1px solid #eee;">
                <span style="font-weight:600;font-size:16px;">创建投票</span>
                <i class="fas fa-times" id="closePollModal" style="cursor:pointer;color:#666;padding:5px;"></i>
            </div>
            <div style="padding:15px;">
                <input type="text" id="pollOpt1" placeholder="选项 1" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;margin-bottom:10px;font-size:15px;outline:none;">
                <input type="text" id="pollOpt2" placeholder="选项 2" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;margin-bottom:10px;font-size:15px;outline:none;">
                <div id="pollExtraOpts"></div>
                <div id="addPollOptBtn" style="color:#1d9bf0;font-size:14px;cursor:pointer;padding:10px 0;"><i class="fas fa-plus"></i> 添加选项</div>
                <div style="display:flex;gap:10px;margin-top:15px;">
                    <select id="pollDays" style="flex:1;padding:10px;border:1px solid #ddd;border-radius:8px;">
                        <option value="1">1 天</option>
                        <option value="3">3 天</option>
                        <option value="7">7 天</option>
                    </select>
                    <select id="pollHours" style="flex:1;padding:10px;border:1px solid #ddd;border-radius:8px;">
                        <option value="0">0 小时</option>
                        <option value="6">6 小时</option>
                        <option value="12">12 小时</option>
                    </select>
                </div>
            </div>
            <div style="display:flex;gap:10px;padding:15px;border-top:1px solid #eee;">
                <button id="cancelPollBtn" style="flex:1;padding:12px;background:#f5f5f5;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;">取消</button>
                <button id="confirmPollBtn" style="flex:1;padding:12px;background:#333;color:white;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;">确定</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const self = this;
    let extraCount = 0;

    document.getElementById('closePollModal').onclick = function() { modal.remove(); };
    document.getElementById('cancelPollBtn').onclick = function() { modal.remove(); };

    document.getElementById('addPollOptBtn').onclick = function() {
        if(extraCount >= 2) {
            alert('最多4个选项');
            return;
        }
        extraCount++;
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = '选项 ' + (extraCount + 2);
        input.className = 'pollExtraInput';
        input.style.cssText = 'width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;margin-bottom:10px;font-size:15px;outline:none;';
        document.getElementById('pollExtraOpts').appendChild(input);
    };

    document.getElementById('confirmPollBtn').onclick = function() {
        const opts = [];
        const o1 = document.getElementById('pollOpt1').value.trim();
        const o2 = document.getElementById('pollOpt2').value.trim();
        if(o1) opts.push(o1);
        if(o2) opts.push(o2);
        document.querySelectorAll('.pollExtraInput').forEach(function(inp) {
            const v = inp.value.trim();
            if(v) opts.push(v);
        });

        if(opts.length < 2) {
            alert('至少需要2个选项');
            return;
        }

        const days = parseInt(document.getElementById('pollDays').value);
        const hours = parseInt(document.getElementById('pollHours').value);
        const duration = (days * 24 + hours) * 3600000;

        self.postPoll = {
            options: opts.map(function(text) { return { text: text, votes: 0 }; }),
            endTime: Date.now() + duration,
            totalVotes: 0
        };

        modal.remove();
        alert('投票已添加');
    };
}

// 检查用户对某角色的关注状态
getFollowStatus(handle) {
    const data = this.store.get();
    const following = data.following || [];
    const sentRequests = data.sentFollowRequests || [];

    if(following.some(f => f.handle === handle)) {
        return 'following';
    }
    if(sentRequests.some(r => r.toHandle === handle)) {
        return 'requested';
    }
    return 'none';
}
// 生成随机加入时间
generateRandomJoinDate() {
    const year = 2015 + Math.floor(Math.random() * 9); // 2015-2023
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const month = months[Math.floor(Math.random() * 12)];
    return `${year}年${month}`;
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
                d.tweets.push({
                    id: window.Utils.generateId('tweet'),
                    accountId: d.currentAccountId, 
                    text: tweet.text,
                    time: Date.now(),
                    likes: 0,
                    retweets: 0,
                    replies: 0,
                    images: images,
                    quoteId: null,
                    comments: []
                });
            });
            
            this.renderHome();
            alert('已发布新推文');
            
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
// ===== 强制绑定生成按钮 =====
document.addEventListener('click', function(e) {
    // 右上角生成按钮
    const genBtn = e.target.closest('#tHeaderGenBtn');
    if(genBtn && window.TwitterApp) {
        e.preventDefault();
        e.stopPropagation();
        console.log('点击了生成按钮');
        window.TwitterApp.generateTimeline();
        return;
    }

    // 转账按钮
    const transferBtn = e.target.closest('#dmTransferBtn');
    if(transferBtn && window.TwitterApp) {
        e.preventDefault();
        e.stopPropagation();
        console.log('点击了转账按钮');
        window.TwitterApp.openTransferModal();
        return;
    }

    // 发送图片按钮
    const imageBtn = e.target.closest('#dmImageBtn');
    if(imageBtn && window.TwitterApp) {
        e.preventDefault();
        e.stopPropagation();
        window.TwitterApp.sendRealImage();
        return;
    }

    // 发送文字图片按钮
    const textImageBtn = e.target.closest('#dmTextImageBtn');
    if(textImageBtn && window.TwitterApp) {
        e.preventDefault();
        e.stopPropagation();
        window.TwitterApp.sendTextImage();
        return;
    }

    // 社群生成按钮
    const communityGenBtn = e.target.closest('#tGenCommunityBtn');
    if(communityGenBtn && window.TwitterApp) {
        e.preventDefault();
        e.stopPropagation();
        window.TwitterApp.generateCommunities();
        return;
    }

    // 搜索按钮
    const searchBtn = e.target.closest('#tSearchBtn');
    if(searchBtn && window.TwitterApp) {
        e.preventDefault();
        e.stopPropagation();
        const query = document.getElementById('tSearchInput').value.trim();
        if(query) {
            window.TwitterApp.performSearch(query);
        } else {
            alert('请输入搜索内容');
        }
        return;
    }
});

console.log('Twitter按钮事件已绑定');

// ===== 强制控制dock栏 =====
(function() {
    const dockBar = document.querySelector('.dock-bar');
    const twitterApp = document.getElementById('twitterApp');
    const openBtn = document.getElementById('openTwitterBtn');

    if(openBtn) {
        openBtn.addEventListener('click', function() {
            twitterApp.style.display = 'flex';
            dockBar.style.display = 'none';
        });
    }

    // 监听返回按钮
    const observer = new MutationObserver(function() {
        const backBtn = document.getElementById('twitterBackBtn');
        if(backBtn && !backBtn.hasAttribute('data-bindClose')) {
            backBtn.setAttribute('data-bindClose', 'true');
            backBtn.addEventListener('click', function() {
                twitterApp.style.display = 'none';
                dockBar.style.display = '';
            });
        }
    });

    observer.observe(document.body, {childList: true, subtree: true});
})();

