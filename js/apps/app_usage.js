class AppUsageApp {
    constructor() {
        this.initUI();
    }

    initUI() {
        // Create App Usage Container if not exists
        if (!document.getElementById('appUsageContainer')) {
            const div = document.createElement('div');
            div.id = 'appUsageContainer';
            div.className = 'app-container';
            div.style.display = 'none';
            div.style.backgroundColor = '#f5f5f5';
            div.innerHTML = `
                <div class="birthday-page" style="display:flex; flex-direction:column; padding:20px; overflow-y:auto; height:100%;">
                    <div style="font-size:24px; font-weight:bold; margin-bottom:20px;">APP 使用记录</div>
                    <div id="appUsageList" style="display:flex; flex-direction:column; gap:15px;"></div>
                    <div id="appUsageGenBtn" class="ff-fab" style="bottom: 80px; background: #ff9f43;"><i class="fas fa-magic"></i></div>
                </div>
                <div class="home-indicator-area" onclick="window.showPage('homeScreen')"><div class="home-indicator"></div></div>
            `;
            document.querySelector('.phone-container').appendChild(div);
            
            document.getElementById('appUsageGenBtn').onclick = () => this.generateAppUsage();
        }
    }

    render() {
        window.showPage('appUsageContainer');
        const list = document.getElementById('appUsageList');
        if (list.children.length === 0) {
            list.innerHTML = '<div style="text-align:center; color:#999;">点击右下角生成今日记录</div>';
        }
    }

    async generateAppUsage() {
        const apiConfig = JSON.parse(localStorage.getItem('apiConfig') || '{}');
        if (!apiConfig.chatApiKey) return alert('请先配置 API Key');

        const char = window.System.currentCheckedFriend;
        if (!char) return;

        const btn = document.getElementById('appUsageGenBtn');
        const originalIcon = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const prompt = `你扮演 ${char.name}。\n人设: ${char.persona}\n请生成你今天使用手机 APP 的记录。\n列出 3-5 个 APP，并为每个 APP 写一段不少于 30 字的解释（你在看什么、做什么、想什么）。\n返回 JSON 数组: [{"appName": "APP名称", "desc": "解释内容"}]`;
        
        try {
            const res = await window.API.callAI(prompt, apiConfig);
            const items = JSON.parse(res);
            
            if (Array.isArray(items)) {
                const list = document.getElementById('appUsageList');
                list.innerHTML = '';
                
                items.forEach(item => {
                    const div = document.createElement('div');
                    div.style.cssText = 'background:#fff; padding:15px; border-radius:10px; box-shadow:0 2px 5px rgba(0,0,0,0.05); cursor:pointer;';
                    div.innerHTML = `
                        <div style="font-weight:bold; margin-bottom:5px; display:flex; align-items:center; gap:10px;">
                            <div style="width:30px; height:30px; background:#eee; border-radius:8px; display:flex; justify-content:center; align-items:center;">📱</div>
                            ${item.appName}
                        </div>
                        <div style="font-size:14px; color:#666; display:none; line-height:1.4;" class="usage-desc">${item.desc}</div>
                    `;
                    div.onclick = () => {
                        const desc = div.querySelector('.usage-desc');
                        desc.style.display = desc.style.display === 'none' ? 'block' : 'none';
                    };
                    list.appendChild(div);
                });
                alert('已生成使用记录');
            }
        } catch (e) {
            console.error(e);
            alert('生成失败');
        } finally {
            btn.innerHTML = originalIcon;
        }
    }
}

window.AppUsageApp = new AppUsageApp();
