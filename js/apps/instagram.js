class InstagramStore {
    constructor() { this.init(); }
    init() {
        if(!localStorage.getItem('instagram_data')) {
            const initialData = {
                profile: { name: '我', username: 'me', bio: 'Life is good.', posts: 0, followers: 100, following: 50, avatar: '' },
                posts: [] // {id, userId, username, avatar, image, caption, likes, time, comments:[], filter: ''}
            };
            localStorage.setItem('instagram_data', JSON.stringify(initialData));
        }
    }
    get() { return JSON.parse(localStorage.getItem('instagram_data')); }
    set(data) { localStorage.setItem('instagram_data', JSON.stringify(data)); }
    update(fn) { const data = this.get(); fn(data); this.set(data); }
}

class InstagramApp {
    constructor() {
        this.store = new InstagramStore();
        this.initUI();
    }

    initUI() {
        // Tab Switching
        document.querySelectorAll('.ig-nav-item').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.ig-nav-item').forEach(el => el.classList.remove('active'));
                document.querySelectorAll('.ig-tab-page').forEach(el => el.classList.remove('active'));
                btn.classList.add('active');
                const tabId = btn.dataset.tab;
                
                if(tabId === 'ig-create') {
                    this.openCreateModal();
                    // Revert active state to previous or home
                    document.querySelector('[data-tab="ig-home"]').click();
                    return;
                }

                document.getElementById(tabId).classList.add('active');
                
                if(tabId === 'ig-home') this.renderHome();
                if(tabId === 'ig-search') this.renderSearch();
                if(tabId === 'ig-likes') this.renderLikes();
                if(tabId === 'ig-profile') this.renderProfile();
            };
        });

        // Create Modal
        document.getElementById('closeIgCreate').onclick = () => document.getElementById('igCreateModal').style.display = 'none';
        document.getElementById('doIgPost').onclick = () => this.createPost();
        
        document.getElementById('igPhotoOption').onclick = () => document.getElementById('igPhotoInput').click();
        document.getElementById('igPhotoInput').onchange = (e) => this.handlePhotoSelect(e.target.files[0]);
        
        document.getElementById('igTextOption').onclick = () => this.toggleTextMode();

        // Story Viewer (Dynamic)
        if(!document.getElementById('igStoryViewer')) {
            const viewer = document.createElement('div');
            viewer.id = 'igStoryViewer';
            viewer.className = 'modal';
            viewer.style.display = 'none';
            viewer.style.background = '#000';
            viewer.innerHTML = `
                <div style="width:100%; height:100%; position:relative; display:flex; flex-direction:column;">
                    <div style="height:4px; background:rgba(255,255,255,0.3); margin:10px; border-radius:2px;">
                        <div id="storyProgress" style="height:100%; width:0%; background:#fff; border-radius:2px; transition:width 0.1s linear;"></div>
                    </div>
                    <div style="padding:0 15px; display:flex; align-items:center; color:#fff;">
                        <div id="storyAvatar" style="width:32px; height:32px; border-radius:50%; background:#ccc; margin-right:10px; background-size:cover;"></div>
                        <span id="storyUser" style="font-weight:bold;">User</span>
                        <i class="fas fa-times" style="margin-left:auto; cursor:pointer;" onclick="document.getElementById('igStoryViewer').style.display='none'"></i>
                    </div>
                    <div id="storyContent" style="flex:1; background-size:contain; background-repeat:no-repeat; background-position:center;"></div>
                </div>
            `;
            document.body.appendChild(viewer);
        }

        // Initial Render
        this.renderHome();
    }

    async renderHome() {
        const list = document.getElementById('igFeed');
        list.innerHTML = '';
        
        // Render Stories
        this.renderStories(list);

        const data = this.store.get();
        
        // Mix in QQ Friends' Moments (only those with images)
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"moments":[], "friends":[]}');
        const friendPosts = [];
        
        for(const m of qqData.moments) {
            if(m.image) { // Only moments with images
                friendPosts.push({
                    id: m.id,
                    userId: m.userId,
                    username: m.name,
                    avatar: m.avatar,
                    image: m.image,
                    caption: m.text,
                    likes: m.likes ? m.likes.length : 0,
                    time: m.timestamp,
                    filter: 'none',
                    isFriend: true
                });
            }
        }

        const posts = [...data.posts, ...friendPosts].sort((a, b) => b.time - a.time);

        for(const p of posts) {
            const div = document.createElement('div');
            div.className = 'ig-post';
            
            let avatar = p.avatar;
            if(avatar && avatar.startsWith('img_')) avatar = await window.db.getImage(avatar);
            
            let postImg = p.image;
            if(postImg && postImg.startsWith('img_')) postImg = await window.db.getImage(postImg);

            div.innerHTML = `
                <div class="ig-post-header">
                    <div class="ig-avatar-small" style="background-image:url('${avatar || window.Utils.generateDefaultAvatar(p.username)}')"></div>
                    <div class="ig-username">${p.username}</div>
                    <i class="fas fa-ellipsis-h"></i>
                </div>
                <div class="ig-post-img" style="background-image:url('${postImg}'); filter:${p.filter || 'none'};"></div>
                <div class="ig-post-actions">
                    <div class="ig-action-left">
                        <i class="far fa-heart ig-like-btn"></i>
                        <i class="far fa-comment"></i>
                        <i class="far fa-paper-plane ig-share-btn"></i>
                    </div>
                    <i class="far fa-bookmark"></i>
                </div>
                <div class="ig-likes">${p.likes} likes</div>
                <div class="ig-caption"><span>${p.username}</span> ${p.caption}</div>
                <div class="ig-time">${this.timeSince(p.time)} AGO</div>
            `;

            // Double click like
            const imgDiv = div.querySelector('.ig-post-img');
            imgDiv.ondblclick = () => {
                this.likePost(p.id, p.isFriend);
                const heart = document.createElement('i');
                heart.className = 'fas fa-heart';
                heart.style.cssText = 'position:absolute; top:50%; left:50%; transform:translate(-50%, -50%) scale(0); color:#fff; font-size:80px; transition:transform 0.2s; pointer-events:none; text-shadow:0 0 10px rgba(0,0,0,0.5);';
                imgDiv.appendChild(heart);
                setTimeout(() => heart.style.transform = 'translate(-50%, -50%) scale(1.2)', 50);
                setTimeout(() => heart.style.transform = 'translate(-50%, -50%) scale(0)', 800);
                setTimeout(() => heart.remove(), 1000);
            };

            div.querySelector('.ig-like-btn').onclick = () => this.likePost(p.id, p.isFriend);
            div.querySelector('.ig-share-btn').onclick = () => this.sharePost(p);

            list.appendChild(div);
        }
    }

    sharePost(post) {
        // Share to QQ Friend
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
        if(qqData.friends.length === 0) return alert('暂无好友可分享');
        
        // Simple selector
        const names = qqData.friends.map((f, i) => `${i+1}. ${f.name}`).join('\n');
        const choice = prompt(`分享给谁？(输入序号)\n${names}`);
        const idx = parseInt(choice) - 1;
        
        if(idx >= 0 && idx < qqData.friends.length) {
            const friend = qqData.friends[idx];
            const msg = `[分享帖子] ${post.username}: ${post.caption}`;
            
            // Add to QQ messages
            if(!qqData.messages[friend.id]) qqData.messages[friend.id] = [];
            qqData.messages[friend.id].push({
                id: Date.now(), senderId: 'user', senderName: qqData.user.name, content: msg, type: 'text', timestamp: Date.now(), status: 'normal'
            });
            localStorage.setItem('qq_data', JSON.stringify(qqData));
            alert(`已分享给 ${friend.name}`);
        }
    }

    async renderLikes() {
        let likesPage = document.getElementById('ig-likes');
        if(!likesPage) {
            likesPage = document.createElement('div');
            likesPage.id = 'ig-likes';
            likesPage.className = 'ig-tab-page';
            const content = document.querySelector('.ig-content');
            if(content) content.appendChild(likesPage);
        }
        
        likesPage.innerHTML = '<div style="padding:15px; font-weight:bold; border-bottom:1px solid #eee;">Activity</div>';
        
        // Simulate some activity
        const activities = [
            { user: 'friend1', action: 'liked your photo', time: '2m' },
            { user: 'friend2', action: 'started following you', time: '1h' },
            { user: 'friend3', action: 'commented: "Nice!"', time: '3h' }
        ];
        
        activities.forEach(a => {
            const div = document.createElement('div');
            div.style.cssText = 'padding:15px; display:flex; align-items:center; border-bottom:1px solid #eee;';
            div.innerHTML = `
                <div style="width:40px; height:40px; background:#ccc; border-radius:50%; margin-right:10px;"></div>
                <div style="font-size:14px;"><span style="font-weight:bold;">${a.user}</span> ${a.action} <span style="color:#999;">${a.time}</span></div>
            `;
            likesPage.appendChild(div);
        });
    }

    async renderStories(container) {
        const storiesDiv = document.createElement('div');
        storiesDiv.style.cssText = 'display:flex; gap:15px; padding:15px; overflow-x:auto; border-bottom:1px solid #efefef; scrollbar-width: none; -ms-overflow-style: none;';
        // Hide scrollbar for Webkit
        const style = document.createElement('style');
        style.innerHTML = `#${container.id} > div::-webkit-scrollbar { display: none; }`;
        container.appendChild(style);
        
        // My Story
        const myStory = document.createElement('div');
        myStory.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:5px; cursor:pointer;';
        myStory.innerHTML = `
            <div style="width:60px; height:60px; border-radius:50%; background:#eee; border:2px solid #fff; outline:2px solid #dbdbdb; display:flex; justify-content:center; align-items:center; font-size:20px;">+</div>
            <span style="font-size:12px;">Your Story</span>
        `;
        storiesDiv.appendChild(myStory);

        // Friend Stories (Simulated)
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
        for(const f of qqData.friends) {
            let avatar = f.avatar;
            if(avatar && avatar.startsWith('img_')) avatar = await window.db.getImage(avatar);

            const s = document.createElement('div');
            s.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:5px; cursor:pointer;';
            s.innerHTML = `
                <div style="width:60px; height:60px; border-radius:50%; background:url('${avatar}'); background-size:cover; border:2px solid #fff; outline:2px solid #e1306c;"></div>
                <span style="font-size:12px;">${f.name}</span>
            `;
            // Simulate story content
            const storyImg = window.Utils.generateDefaultImage(`Story by ${f.name}`);
            s.onclick = () => this.openStoryViewer(f.name, avatar, storyImg);
            storiesDiv.appendChild(s);
        }
        container.appendChild(storiesDiv);
    }

    openStoryViewer(user, avatar, image) {
        const viewer = document.getElementById('igStoryViewer');
        document.getElementById('storyUser').innerText = user;
        document.getElementById('storyAvatar').style.backgroundImage = `url('${avatar}')`;
        document.getElementById('storyContent').style.backgroundImage = `url('${image}')`;
        viewer.style.display = 'flex';
        
        const progress = document.getElementById('storyProgress');
        progress.style.width = '0%';
        
        // Simple animation
        let width = 0;
        const interval = setInterval(() => {
            if(viewer.style.display === 'none') {
                clearInterval(interval);
                return;
            }
            width += 1;
            progress.style.width = width + '%';
            if(width >= 100) {
                clearInterval(interval);
                viewer.style.display = 'none';
            }
        }, 30); // 3 seconds
    }

    likePost(postId, isFriend) {
        if(isFriend) {
            const qq = JSON.parse(localStorage.getItem('qq_data'));
            const m = qq.moments.find(x => x.id === postId);
            if(m) {
                if(!m.likes) m.likes = [];
                m.likes.push({userId: 'user', name: qq.user.name});
                localStorage.setItem('qq_data', JSON.stringify(qq));
                this.renderHome();
            }
        } else {
            this.store.update(d => {
                const p = d.posts.find(x => x.id === postId);
                if(p) p.likes++;
            });
            this.renderHome();
        }
    }

    async renderSearch() {
        const grid = document.getElementById('igSearchGrid');
        grid.innerHTML = '';
        
        // Generate some default images
        const images = Array.from({length: 12}, (_, i) => ({
            url: window.Utils.generateDefaultImage(`Explore ${i+1}`)
        }));

        images.forEach(img => {
            const div = document.createElement('div');
            div.className = 'ig-grid-item';
            div.style.backgroundImage = `url('${img.url}')`;
            grid.appendChild(div);
        });
    }

    async renderProfile() {
        const data = this.store.get();
        const p = data.profile;
        
        let avatar = p.avatar;
        if(avatar && avatar.startsWith('img_')) avatar = await window.db.getImage(avatar);
        
        document.getElementById('igProfileAvatar').style.backgroundImage = `url('${avatar || 'https://picsum.photos/100/100'}')`;
        document.getElementById('igProfileName').innerText = p.name;
        document.getElementById('igProfileBio').innerText = p.bio;
        document.getElementById('igStatPosts').innerText = data.posts.filter(x => x.userId === 'me').length;
        document.getElementById('igStatFollowers').innerText = p.followers;
        document.getElementById('igStatFollowing').innerText = p.following;

        // Profile Grid
        const grid = document.getElementById('igProfileGrid');
        grid.innerHTML = '';
        const myPosts = data.posts.filter(x => x.userId === 'me').sort((a, b) => b.time - a.time);
        
        for(const post of myPosts) {
            let postImg = post.image;
            if(postImg && postImg.startsWith('img_')) postImg = await window.db.getImage(postImg);
            
            const div = document.createElement('div');
            div.className = 'ig-grid-item';
            div.style.backgroundImage = `url('${postImg}')`;
            div.style.filter = post.filter || 'none';
            grid.appendChild(div);
        }

        // Edit Profile
        document.getElementById('igEditProfileBtn').onclick = () => {
            // Create a modal for editing profile
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'flex';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>编辑资料</h3>
                    <div class="form-group"><label>名称</label><input id="igEditName" value="${p.name}"></div>
                    <div class="form-group"><label>用户名 (ID)</label><input id="igEditUsername" value="${p.username}"></div>
                    <div class="form-group"><label>人称代词</label><input id="igEditPronouns" value="${p.pronouns || ''}"></div>
                    <div class="form-group"><label>性别</label><input id="igEditGender" value="${p.gender || ''}"></div>
                    <div class="form-group"><label>简介</label><textarea id="igEditBio">${p.bio}</textarea></div>
                    <div style="display:flex; gap:10px; margin-top:20px;">
                        <button class="action-btn secondary" onclick="this.closest('.modal').remove()">取消</button>
                        <button class="action-btn" id="igSaveProfile">保存</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            document.getElementById('igSaveProfile').onclick = () => {
                this.store.update(d => {
                    d.profile.name = document.getElementById('igEditName').value;
                    d.profile.username = document.getElementById('igEditUsername').value;
                    d.profile.pronouns = document.getElementById('igEditPronouns').value;
                    d.profile.gender = document.getElementById('igEditGender').value;
                    d.profile.bio = document.getElementById('igEditBio').value;
                });
                this.renderProfile();
                modal.remove();
            };
        };
        
        document.getElementById('igProfileAvatar').onclick = () => {
            const input = document.createElement('input'); input.type='file';
            input.onchange = async (e) => {
                if(e.target.files[0]) {
                    const id = await window.db.saveImage(e.target.files[0]);
                    this.store.update(d => d.profile.avatar = id);
                    this.renderProfile();
                }
            };
            input.click();
        };
    }

    openCreateModal() {
        document.getElementById('igCreateModal').style.display = 'flex';
        this.resetCreateModal();
    }

    resetCreateModal() {
        this.currentImageId = null;
        this.isTextMode = false;
        this.currentFilter = '';
        document.getElementById('igCreatePreview').innerHTML = '<i class="fas fa-image"></i>';
        document.getElementById('igCreatePreview').style.backgroundImage = '';
        document.getElementById('igCreatePreview').style.filter = '';
        document.getElementById('igCreateCaption').value = '';
        
        // Add filter buttons if not exist
        if(!document.getElementById('igFilters')) {
            const filterContainer = document.createElement('div');
            filterContainer.id = 'igFilters';
            filterContainer.style.cssText = 'display:flex; gap:10px; padding:10px; overflow-x:auto;';
            const filters = ['none', 'grayscale(100%)', 'sepia(50%)', 'contrast(150%)', 'brightness(120%)', 'blur(1px)'];
            filters.forEach(f => {
                const btn = document.createElement('div');
                btn.style.cssText = 'width:50px; height:50px; background:#eee; flex-shrink:0; cursor:pointer; border-radius:4px;';
                btn.style.filter = f;
                btn.onclick = () => {
                    this.currentFilter = f;
                    document.getElementById('igCreatePreview').style.filter = f;
                };
                filterContainer.appendChild(btn);
            });
            const modal = document.getElementById('igCreateModal');
            modal.insertBefore(filterContainer, document.getElementById('igCreateCaption'));
        }
    }

    async handlePhotoSelect(file) {
        if(!file) return;
        this.isTextMode = false;
        const id = await window.db.saveImage(file);
        this.currentImageId = id;
        const url = await window.db.getImage(id);
        document.getElementById('igCreatePreview').style.backgroundImage = `url('${url}')`;
        document.getElementById('igCreatePreview').innerHTML = '';
    }

    toggleTextMode() {
        this.isTextMode = true;
        this.currentImageId = null;
        document.getElementById('igCreatePreview').style.backgroundImage = '';
        document.getElementById('igCreatePreview').innerHTML = `
            <div class="ig-text-mode" contenteditable="true">输入文字...</div>
        `;
    }

    async createPost() {
        let caption = document.getElementById('igCreateCaption').value;
        
        // Handle Mentions (@Friend)
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
        const mentions = caption.match(/@(\S+)/g);
        if(mentions) {
            mentions.forEach(m => {
                const name = m.substring(1);
                const friend = qqData.friends.find(f => f.name === name);
                if(friend) {
                    // Notify friend (Simulated by adding a system message in QQ)
                    if(!qqData.messages[friend.id]) qqData.messages[friend.id] = [];
                    qqData.messages[friend.id].push({
                        id: Date.now(), senderId: 'sys', senderName: 'Instagram', 
                        content: `你在 Instagram 上被提及了: "${caption}"`, type: 'text', timestamp: Date.now(), status: 'normal'
                    });
                    localStorage.setItem('qq_data', JSON.stringify(qqData));
                }
            });
        }

        if(this.isTextMode) {
            // Convert text div to image (simplified: just save text as image data url via canvas)
            const textDiv = document.querySelector('.ig-text-mode');
            const text = textDiv.innerText;
            const canvas = document.createElement('canvas');
            canvas.width = 600; canvas.height = 600;
            const ctx = canvas.getContext('2d');
            
            // Gradient bg
            const grd = ctx.createLinearGradient(0, 0, 600, 600);
            grd.addColorStop(0, "#f09433");
            grd.addColorStop(1, "#bc1888");
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, 600, 600);
            
            // Text
            ctx.fillStyle = "white";
            ctx.font = "bold 40px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(text, 300, 300);
            
            const url = canvas.toDataURL('image/jpeg');
            this.currentImageId = await window.db.saveImage(url);
        }

        if(!this.currentImageId) return alert('请先选择图片或输入文字');

        const profile = this.store.get().profile;
        
        this.store.update(d => {
            d.posts.push({
                id: window.Utils.generateId('ig'),
                userId: 'me',
                username: profile.username,
                avatar: profile.avatar,
                image: this.currentImageId,
                caption: caption,
                likes: 0,
                time: Date.now(),
                comments: [],
                filter: this.currentFilter || 'none'
            });
        });

        document.getElementById('igCreateModal').style.display = 'none';
        this.renderHome();
    }

    timeSince(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "m";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m";
        return Math.floor(seconds) + "s";
    }
}

window.InstagramApp = new InstagramApp();
