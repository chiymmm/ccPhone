class CoupleStore {
    constructor() { this.init(); }
    init() {
        if(!localStorage.getItem('couple_data')) {
            const initialData = {
                partnerId: null,
                startDate: null,
                photos: [], // {id, url_id}
                notes: [], // {id, senderId, content, time}
                diaries: [], // {id, senderId, content, time, mood}
                tasks: [
                    {id: 1, text: '一起看一次日出', completed: false},
                    {id: 2, text: '互换头像一天', completed: false},
                    {id: 3, text: '为对方写一首诗', completed: false}
                ]
            };
            localStorage.setItem('couple_data', JSON.stringify(initialData));
        }
    }
    get() { return JSON.parse(localStorage.getItem('couple_data')); }
    set(data) { localStorage.setItem('couple_data', JSON.stringify(data)); }
    update(fn) { const data = this.get(); fn(data); this.set(data); }
}

class CoupleApp {
    constructor() {
        this.store = new CoupleStore();
        this.initUI();
    }

    initUI() {
        // Bind UI events
        const closeCoupleApp = document.getElementById('closeCoupleApp');
        if(closeCoupleApp) closeCoupleApp.onclick = () => window.showPage('homeScreen');

        // Sub pages
        document.getElementById('closePhotoWall').onclick = () => this.showSubPage('coupleHome');
        document.getElementById('closeNoteBoard').onclick = () => this.showSubPage('coupleHome');
        document.getElementById('closeDiary').onclick = () => this.showSubPage('coupleHome');

        document.getElementById('btnPhotoWall').onclick = () => { this.renderPhotoWall(); this.showSubPage('photoWallPage'); };
        document.getElementById('btnNoteBoard').onclick = () => { this.renderNotes(); this.showSubPage('noteBoardPage'); };
        document.getElementById('btnDiary').onclick = () => { this.renderDiaries(); this.showSubPage('diaryPage'); };

        // Actions
        document.getElementById('addPhotoBtn').onclick = () => document.getElementById('photoInput').click();
        document.getElementById('photoInput').onchange = (e) => this.uploadPhoto(e.target.files[0]);

        document.getElementById('sendNoteBtn').onclick = () => this.sendNote();
        document.getElementById('writeDiaryBtn').onclick = () => this.writeDiary();
    }

    showSubPage(id) {
        document.querySelectorAll('.couple-page').forEach(el => el.style.display = 'none');
        document.getElementById(id).style.display = 'flex';
    }

    render() {
        const data = this.store.get();
        if(!data.partnerId) {
            this.renderBindPage();
        } else {
            this.renderHome();
        }
    }

    renderBindPage() {
        this.showSubPage('coupleBindPage');
        const list = document.getElementById('bindList');
        list.innerHTML = '';
        const friends = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}').friends;
        
        friends.forEach(f => {
            const div = document.createElement('div');
            div.className = 'bind-item';
            div.innerHTML = `
                <div class="contact-avatar" style="background-image:url('${f.avatar}')"></div>
                <span>${f.name}</span>
            `;
            div.onclick = () => {
                if(confirm(`确定要和 ${f.name} 绑定情侣关系吗？`)) {
                    this.store.update(d => {
                        d.partnerId = f.id;
                        d.startDate = Date.now();
                    });
                    this.renderHome();
                }
            };
            list.appendChild(div);
        });
    }

    async renderHome() {
        this.showSubPage('coupleHome');
        const data = this.store.get();
        const qqData = JSON.parse(localStorage.getItem('qq_data'));
        const partner = qqData.friends.find(f => f.id === data.partnerId);
        const user = qqData.user;

        // Avatars
        let uAvatar = user.avatar;
        if(uAvatar && uAvatar.startsWith('img_')) uAvatar = await window.db.getImage(uAvatar);
        document.getElementById('cUserAvatar').style.backgroundImage = `url('${uAvatar}')`;

        let pAvatar = partner ? partner.avatar : '';
        if(pAvatar && pAvatar.startsWith('img_')) pAvatar = await window.db.getImage(pAvatar);
        document.getElementById('cPartnerAvatar').style.backgroundImage = `url('${pAvatar}')`;

        // Days
        const days = Math.floor((Date.now() - data.startDate) / (1000 * 60 * 60 * 24)) + 1;
        document.getElementById('daysCount').innerText = days;

        // Anniversary Check
        if (days % 100 === 0 || days === 365 || days === 520) {
            alert(`🎉 恭喜！今天是你们在一起的第 ${days} 天纪念日！`);
        }

        // Render Tasks Preview (Simplified)
        if(!document.getElementById('taskPreview')) {
            const taskDiv = document.createElement('div');
            taskDiv.id = 'taskPreview';
            taskDiv.style.cssText = 'padding:20px; background:#fff; margin:20px; border-radius:15px; box-shadow:0 2px 10px rgba(0,0,0,0.05);';
            taskDiv.innerHTML = '<h3>甜蜜打卡</h3><ul id="taskList" style="list-style:none; margin-top:10px;"></ul>';
            document.querySelector('.couple-menu').after(taskDiv);
        }
        this.renderTasks();
    }

    renderTasks() {
        const list = document.getElementById('taskList');
        if(!list) return;
        list.innerHTML = '';
        const tasks = this.store.get().tasks || [];
        
        tasks.forEach(t => {
            const li = document.createElement('li');
            li.style.cssText = 'display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid #eee;';
            li.innerHTML = `
                <input type="checkbox" ${t.completed ? 'checked' : ''}>
                <span style="${t.completed ? 'text-decoration:line-through;color:#999;' : ''}">${t.text}</span>
            `;
            li.querySelector('input').onchange = () => {
                this.store.update(d => {
                    const task = d.tasks.find(x => x.id === t.id);
                    if(task) task.completed = !task.completed;
                });
                this.renderTasks();
            };
            list.appendChild(li);
        });
        
        // Add Task Button
        const addBtn = document.createElement('button');
        addBtn.innerText = '+ 添加任务';
        addBtn.style.cssText = 'margin-top:10px; border:none; background:none; color:#ff4d4f; cursor:pointer;';
        addBtn.onclick = () => {
            const text = prompt('输入新任务:');
            if(text) {
                this.store.update(d => {
                    if(!d.tasks) d.tasks = [];
                    d.tasks.push({id: Date.now(), text, completed: false});
                });
                this.renderTasks();
            }
        };
        list.appendChild(addBtn);
    }

    async renderPhotoWall() {
        const list = document.getElementById('photoList');
        list.innerHTML = '<div class="photo-item add-photo" id="addPhotoBtnInner"><i class="fas fa-plus"></i></div>';
        document.getElementById('addPhotoBtnInner').onclick = () => document.getElementById('photoInput').click();

        const photos = this.store.get().photos;
        for(const p of photos) {
            const url = await window.db.getImage(p.url_id);
            const div = document.createElement('div');
            div.className = 'photo-item';
            div.style.backgroundImage = `url('${url}')`;
            div.onclick = () => {
                // View large image logic here
            };
            list.appendChild(div);
        }
    }

    async uploadPhoto(file) {
        if(!file) return;
        const id = await window.db.saveImage(file);
        this.store.update(d => d.photos.push({id: Date.now(), url_id: id}));
        this.renderPhotoWall();
    }

    async renderNotes() {
        const list = document.getElementById('noteList');
        list.innerHTML = '';
        const notes = this.store.get().notes;
        const qqData = JSON.parse(localStorage.getItem('qq_data'));
        const partner = qqData.friends.find(f => f.id === this.store.get().partnerId);

        for(const n of notes) {
            const isMe = n.senderId === 'user';
            const name = isMe ? qqData.user.name : partner.name;
            let avatar = isMe ? qqData.user.avatar : partner.avatar;
            if(avatar && avatar.startsWith('img_')) avatar = await window.db.getImage(avatar);

            const div = document.createElement('div');
            div.className = 'note-card';
            div.innerHTML = `
                <div class="note-header">
                    <div class="note-avatar" style="background-image:url('${avatar}')"></div>
                    <span style="font-weight:bold;font-size:12px;">${name}</span>
                    <span class="note-time">${window.Utils.formatTime(n.time)}</span>
                </div>
                <div class="note-content">${n.content}</div>
            `;
            list.appendChild(div);
        }
    }

    sendNote() {
        const input = document.getElementById('noteInput');
        const text = input.value.trim();
        if(text) {
            this.store.update(d => d.notes.unshift({
                id: Date.now(),
                senderId: 'user',
                content: text,
                time: Date.now()
            }));
            input.value = '';
            this.renderNotes();
        }
    }

    renderDiaries() {
        const list = document.getElementById('diaryList');
        list.innerHTML = '';
        const diaries = this.store.get().diaries;
        
        diaries.forEach(d => {
            const div = document.createElement('div');
            div.className = 'diary-item';
            div.innerHTML = `
                <div class="diary-date">${new Date(d.time).toLocaleString()}</div>
                <div class="diary-preview">${d.content}</div>
            `;
            list.appendChild(div);
        });
    }

    writeDiary() {
        const content = prompt('写下今天的心情...');
        if(content) {
            this.store.update(d => d.diaries.unshift({
                id: Date.now(),
                senderId: 'user',
                content: content,
                time: Date.now()
            }));
            this.renderDiaries();
        }
    }
}

window.CoupleApp = new CoupleApp();
