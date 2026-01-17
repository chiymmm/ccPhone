class InstagramStore {
    constructor() { this.init(); }
    init() {
        if(!localStorage.getItem('instagram_data')) {
            const initialData = {
                profile: { name: '我', username: 'me', bio: 'Life is good.', posts: 0, followers: 100, following: 50, avatar: '' },
                posts: [] // {id, userId, username, avatar, image, caption, likes, time, comments:[]}
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
                if(tabId === 'ig-profile') this.renderProfile();
            };
        });

        // Create Modal
        document.getElementById('closeIgCreate').onclick = () => document.getElementById('igCreateModal').style.display = 'none';
        document.getElementById('doIgPost').onclick = () => this.createPost();
        
        document.getElementById('igPhotoOption').onclick = () => document.getElementById('igPhotoInput').click();
        document.getElementById('igPhotoInput').onchange = (e) => this.handlePhotoSelect(e.target.files[0]);
        
        document.getElementById('igTextOption').onclick = () => this.toggleTextMode();

        // Initial Render
        this.renderHome();
    }

    async renderHome() {
        const list = document.getElementById('igFeed');
        list.innerHTML = '';
        
        // Render Stories
        this.renderStories(list);

        const data = this.store.get();
        const posts = data.posts.sort((a, b) => b.time - a.time);

        for(const p of posts) {
            const div = document.createElement('div');
            div.className = 'ig-post';
            
            let avatar = p.avatar;
            if(avatar && avatar.startsWith('img_')) avatar = await window.db.getImage(avatar);
            
            let postImg = p.image;
            if(postImg && postImg.startsWith('img_')) postImg = await window.db.getImage(postImg);

            div.innerHTML = `
                <div class="ig-post-header">
                    <div class="ig-avatar-small" style="background-image:url('${avatar || 'https://picsum.photos/50/50'}')"></div>
                    <div class="ig-username">${p.username}</div>
                    <i class="fas fa-ellipsis-h"></i>
                </div>
                <div class="ig-post-img" style="background-image:url('${postImg}')"></div>
                <div class="ig-post-actions">
                    <div class="ig-action-left">
                        <i class="far fa-heart ig-like-btn"></i>
                        <i class="far fa-comment"></i>
                        <i class="far fa-paper-plane"></i>
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
                this.likePost(p.id);
                const heart = document.createElement('i');
                heart.className = 'fas fa-heart';
                heart.style.cssText = 'position:absolute; top:50%; left:50%; transform:translate(-50%, -50%) scale(0); color:#fff; font-size:80px; transition:transform 0.2s; pointer-events:none; text-shadow:0 0 10px rgba(0,0,0,0.5);';
                imgDiv.appendChild(heart);
                setTimeout(() => heart.style.transform = 'translate(-50%, -50%) scale(1.2)', 50);
                setTimeout(() => heart.style.transform = 'translate(-50%, -50%) scale(0)', 800);
                setTimeout(() => heart.remove(), 1000);
            };

            div.querySelector('.ig-like-btn').onclick = () => this.likePost(p.id);

            list.appendChild(div);
        }
    }

    renderStories(container) {
        const storiesDiv = document.createElement('div');
        storiesDiv.style.cssText = 'display:flex; gap:15px; padding:15px; overflow-x:auto; border-bottom:1px solid #efefef;';
        
        // My Story
        const myStory = document.createElement('div');
        myStory.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:5px; cursor:pointer;';
        myStory.innerHTML = `
            <div style="width:60px; height:60px; border-radius:50%; background:#eee; border:2px solid #fff; outline:2px solid #dbdbdb; display:flex; justify-content:center; align-items:center; font-size:20px;">+</div>
            <span style="font-size:12px;">Your Story</span>
        `;
        storiesDiv.appendChild(myStory);

        // AI Stories
        for(let i=0; i<5; i++) {
            const s = document.createElement('div');
            s.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:5px; cursor:pointer;';
            s.innerHTML = `
                <div style="width:60px; height:60px; border-radius:50%; background:url('https://picsum.photos/60/60?random=${i+200}'); background-size:cover; border:2px solid #fff; outline:2px solid #e1306c;"></div>
                <span style="font-size:12px;">User ${i+1}</span>
            `;
            s.onclick = () => alert('查看快拍 (模拟)');
            storiesDiv.appendChild(s);
        }
        container.appendChild(storiesDiv);
    }

    likePost(postId) {
        this.store.update(d => {
            const p = d.posts.find(x => x.id === postId);
            if(p) p.likes++;
        });
        this.renderHome();
    }

    async renderSearch() {
        const grid = document.getElementById('igSearchGrid');
        grid.innerHTML = '<div style="text-align:center; padding:20px; width:100%;">Loading...</div>';
        
        const apiConfig = JSON.parse(localStorage.getItem('apiConfig') || '{}');
        let images = [];

        if(apiConfig.chatApiKey) {
            // Simulate AI generated content descriptions for placeholders
            // In a real scenario, we would generate images, but here we use placeholders with AI context
            images = Array.from({length: 12}, (_, i) => ({url: `https://picsum.photos/200/200?random=${i+500}`}));
        } else {
            images = Array.from({length: 12}, (_, i) => ({url: `https://picsum.photos/200/200?random=${i+100}`}));
        }

        grid.innerHTML = '';
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
            grid.appendChild(div);
        }

        // Edit Profile
        document.getElementById('igEditProfileBtn').onclick = () => {
            const newName = prompt('修改名称:', p.name);
            const newBio = prompt('修改简介:', p.bio);
            if(newName || newBio) {
                this.store.update(d => {
                    if(newName) d.profile.name = newName;
                    if(newBio) d.profile.bio = newBio;
                });
                this.renderProfile();
            }
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
        const caption = document.getElementById('igCreateCaption').value;
        
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
                comments: []
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
