class DiaryApp {
    constructor() {
        this.initUI();
    }

    initUI() {
        // Create Diary App Container if not exists
        if (!document.getElementById('diaryAppContainer')) {
            const div = document.createElement('div');
            div.id = 'diaryAppContainer';
            div.className = 'app-container';
            div.style.display = 'none';
            div.style.backgroundColor = '#f2f2f7'; // iOS Notes background color
            div.innerHTML = `
                <div class="diary-header" style="padding: 15px; display: flex; justify-content: space-between; align-items: center; background: #fff; border-bottom: 1px solid #e5e5ea;">
                    <div style="font-size: 24px; font-weight: bold;">备忘录</div>
                    <div id="diaryGenBtn" style="color: #e0a238; font-size: 24px; cursor: pointer;"><i class="fas fa-magic"></i></div>
                </div>
                <div id="diaryList" style="padding: 15px; overflow-y: auto; flex: 1;"></div>
                <div class="home-indicator-area" onclick="window.showPage('homeScreen')"><div class="home-indicator"></div></div>
            `;
            document.querySelector('.phone-container').appendChild(div);
            
            document.getElementById('diaryGenBtn').onclick = () => this.generateDiary();
        }
    }

    render() {
        window.showPage('diaryAppContainer');
        this.renderList();
    }

    renderList() {
        const list = document.getElementById('diaryList');
        list.innerHTML = '';
        
        // Get data from fanfic_data (which is used for diary in phone check mode)
        // In Phone Check Mode, fanfic_data is the character's diary data
        const data = JSON.parse(localStorage.getItem('fanfic_data') || '{"posts":[]}');
        const posts = data.posts.sort((a, b) => b.time - a.time);

        if (posts.length === 0) {
            list.innerHTML = '<div style="text-align:center; color:#999; margin-top:50px;">暂无备忘录</div>';
            return;
        }

        posts.forEach(p => {
            const div = document.createElement('div');
            div.style.cssText = 'background: #fff; border-radius: 10px; padding: 15px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);';
            
            const date = new Date(p.time);
            const dateStr = `${date.getMonth() + 1}月${date.getDate()}日`;
            const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

            div.innerHTML = `
                <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px; color: #000;">${p.title}</div>
                <div style="display: flex; gap: 10px; font-size: 14px; color: #8e8e93;">
                    <span>${dateStr} ${timeStr}</span>
                    <span style="color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">${p.content.substring(0, 20)}...</span>
                </div>
            `;
            
            div.onclick = () => this.openDetail(p);
            list.appendChild(div);
        });
    }

    openDetail(post) {
        // Create detail view
        let detail = document.getElementById('diaryDetail');
        if (!detail) {
            detail = document.createElement('div');
            detail.id = 'diaryDetail';
            detail.className = 'sub-page';
            detail.style.backgroundColor = '#fff';
            detail.innerHTML = `
                <div class="sub-header" style="background: #fff; border-bottom: none;">
                    <button class="back-btn" id="closeDiaryDetail" style="color: #e0a238;"><i class="fas fa-chevron-left"></i> 备忘录</button>
                </div>
                <div class="sub-content" style="padding: 20px;">
                    <div id="diaryDetailDate" style="color: #8e8e93; text-align: center; margin-bottom: 20px; font-size: 12px;"></div>
                    <div id="diaryDetailContent" style="font-size: 18px; line-height: 1.6; color: #333; white-space: pre-wrap;"></div>
                </div>
            `;
            document.getElementById('diaryAppContainer').appendChild(detail);
            document.getElementById('closeDiaryDetail').onclick = () => detail.style.display = 'none';
        }
        
        document.getElementById('diaryDetailDate').innerText = new Date(post.time).toLocaleString();
        document.getElementById('diaryDetailContent').innerText = post.content;
        detail.style.display = 'flex';
    }

    async generateDiary() {
        const apiConfig = JSON.parse(localStorage.getItem('apiConfig') || '{}');
        if (!apiConfig.chatApiKey) return alert('请先配置 API Key');

        const char = window.System.currentCheckedFriend;
        if (!char) return;

        const btn = document.getElementById('diaryGenBtn');
        const originalIcon = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const prompt = `你扮演 ${char.name}。\n人设: ${char.persona}\n请生成一篇新的备忘录日记，反映你此刻的心情、正在做的事情或者对某人的想法。\n风格：iOS备忘录风格，随性、真实、第一人称。\n返回 JSON: {"title": "标题(可选，如无则用第一句)", "content": "日记内容"}`;

        try {
            const res = await window.API.callAI(prompt, apiConfig);
            let result;
            try {
                result = JSON.parse(res);
            } catch (e) {
                result = { title: '无题', content: res };
            }

            const data = JSON.parse(localStorage.getItem('fanfic_data') || '{"posts":[]}');
            data.posts.push({
                id: Date.now(),
                type: 'diary',
                title: result.title || new Date().toLocaleDateString(),
                content: result.content,
                time: Date.now(),
                comments: []
            });
            localStorage.setItem('fanfic_data', JSON.stringify(data));
            
            this.renderList();
            alert('已生成新日记');

        } catch (e) {
            console.error(e);
            alert('生成失败');
        } finally {
            btn.innerHTML = originalIcon;
        }
    }
}

window.DiaryApp = new DiaryApp();
