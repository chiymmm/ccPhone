class DiaryStore {
    constructor() { this.init(); }
    init() {
        if(!localStorage.getItem('diary_data')) {
            const initialData = {
                notes: [] // {id, title, content, time}
            };
            localStorage.setItem('diary_data', JSON.stringify(initialData));
        }
    }
    get() { return JSON.parse(localStorage.getItem('diary_data')); }
    set(data) { localStorage.setItem('diary_data', JSON.stringify(data)); }
    update(fn) { const data = this.get(); fn(data); this.set(data); }
}

class DiaryApp {
    constructor() {
        this.store = new DiaryStore();
        // No initUI here, rendered by PhoneCheckApp or direct call
    }

    render() {
        const container = document.getElementById('fanficApp'); // Reusing container
        container.innerHTML = `
            <div class="diary-header" style="background:#f2f2f7; padding:15px; border-bottom:1px solid #e5e5ea; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:bold; font-size:18px;">备忘录</span>
                <i class="fas fa-plus" id="diaryGenBtn" style="color:#e0a23b; cursor:pointer; font-size:20px;"></i>
            </div>
            <div id="diaryList" style="background:#fff; padding:0 15px;"></div>
        `;
        
        document.getElementById('diaryGenBtn').onclick = () => this.generateNote();
        this.renderList();
    }

    renderList() {
        const list = document.getElementById('diaryList');
        list.innerHTML = '';
        const data = this.store.get();
        
        if(data.notes.length === 0) {
            list.innerHTML = '<div style="padding:20px; text-align:center; color:#999;">无备忘录</div>';
            return;
        }

        data.notes.sort((a, b) => b.time - a.time).forEach(note => {
            const div = document.createElement('div');
            div.style.cssText = 'padding:15px 0; border-bottom:1px solid #e5e5ea; cursor:pointer;';
            div.innerHTML = `
                <div style="font-weight:bold; margin-bottom:5px;">${note.title}</div>
                <div style="color:#8e8e93; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    ${new Date(note.time).toLocaleDateString()}  ${note.content}
                </div>
            `;
            div.onclick = () => this.openNote(note);
            list.appendChild(div);
        });
    }

    openNote(note) {
        const modal = document.createElement('div');
        modal.className = 'sub-page';
        modal.style.display = 'flex';
        modal.style.background = '#fff';
        modal.innerHTML = `
            <div class="sub-header" style="background:#f2f2f7; border-bottom:1px solid #e5e5ea;">
                <button class="back-btn" onclick="this.closest('.sub-page').remove()" style="color:#e0a23b;"><i class="fas fa-chevron-left"></i> 备忘录</button>
                <div></div>
            </div>
            <div style="padding:20px; flex:1; overflow-y:auto;">
                <h2 style="margin-top:0;">${note.title}</h2>
                <div style="color:#999; font-size:12px; margin-bottom:20px;">${new Date(note.time).toLocaleString()}</div>
                <div style="line-height:1.6; white-space:pre-wrap;">${note.content}</div>
            </div>
        `;
        document.getElementById('fanficApp').appendChild(modal);
    }

    async generateNote() {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');
        
        const btn = document.getElementById('diaryGenBtn');
        btn.className = 'fas fa-spinner fa-spin';
        
        const char = window.System.currentCheckedFriend;
        if(!char) return alert('请先选择角色');
        
        const prompt = `你扮演 ${char.name}。\n人设: ${char.persona}\n请写一篇手机备忘录。\n内容可以是日记、待办事项、灵感记录或内心独白。\n返回 JSON: {"title": "标题", "content": "内容"}`;
        
        try {
            const res = await window.API.callAI(prompt, apiConfig);
            const note = JSON.parse(res);
            
            this.store.update(d => {
                d.notes.unshift({
                    id: Date.now(),
                    title: note.title,
                    content: note.content,
                    time: Date.now()
                });
            });
            this.renderList();
        } catch(e) { alert('生成失败'); }
        finally { btn.className = 'fas fa-plus'; }
    }
}

window.DiaryApp = new DiaryApp();
