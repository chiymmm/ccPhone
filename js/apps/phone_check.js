class PhoneCheckApp {
    constructor() {
        this.initUI();
    }

    initUI() {
        // No specific UI init needed for now, rendered on open
    }

    async render() {
        const list = document.getElementById('pcList');
        list.innerHTML = '';
        
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
        
        if(qqData.friends.length === 0) {
            list.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#666;">暂无角色，请先在QQ添加好友</div>';
            return;
        }

        for(const f of qqData.friends) {
            const div = document.createElement('div');
            div.className = 'pc-item';
            
            let avatar = f.avatar;
            if(avatar && avatar.startsWith('img_')) avatar = await window.db.getImage(avatar);
            
            div.innerHTML = `
                <div class="pc-avatar" style="background-image:url('${avatar}')"></div>
                <div class="pc-name">${f.name}</div>
            `;
            
            div.onclick = () => this.enterPhone(f);
            list.appendChild(div);
        }
    }

    enterPhone(friend) {
        const loading = document.getElementById('pcLoading');
        loading.style.display = 'flex';
        
        // Simulate hacking/entering
        setTimeout(() => {
            loading.style.display = 'none';
            
            // Switch Context
            window.System.switchContext(friend);
            
            // Force refresh all apps
            if(window.QQApp) { window.QQApp.store.init(); window.QQApp.renderChatList(); }
            if(window.TwitterApp) { window.TwitterApp.store.init(); window.TwitterApp.renderHome(); }
            if(window.InstagramApp) { window.InstagramApp.store.init(); window.InstagramApp.renderHome(); }
            if(window.CoupleApp) { window.CoupleApp.store.init(); window.CoupleApp.render(); }
            
            // Override Icons for Phone Check Mode
            this.overrideIcons();

            // Go to Home Screen (of the friend)
            window.showPage('homeScreen');
            
            // Show a toast
            alert(`已进入 ${friend.name} 的手机`);
            
            // Add an exit button overlay
            this.showExitButton();
            
        }, 1500);
    }

    overrideIcons() {
        // Override Fanfic -> Diary
        const fanficIcon = document.getElementById('openFanficBtn');
        if(fanficIcon) {
            fanficIcon.querySelector('span').textContent = '备忘录';
            fanficIcon.querySelector('i').className = 'fas fa-book-medical';
            // Store original onclick
            if(!fanficIcon._originalOnClick) fanficIcon._originalOnClick = fanficIcon.onclick;
            fanficIcon.onclick = (e) => {
                e.stopPropagation();
                if(window.DiaryApp) window.DiaryApp.render();
            };
        }

        // Override Birthday -> App Usage
        const birthdayIcon = document.getElementById('openBirthdayBtn');
        if(birthdayIcon) {
            birthdayIcon.querySelector('span').textContent = 'APP记录';
            birthdayIcon.querySelector('i').className = 'fas fa-chart-bar';
            // Store original onclick
            if(!birthdayIcon._originalOnClick) birthdayIcon._originalOnClick = birthdayIcon.onclick;
            birthdayIcon.onclick = (e) => {
                e.stopPropagation();
                if(window.AppUsageApp) window.AppUsageApp.render();
            };
        }
    }

    restoreIcons() {
        // Restore Fanfic
        const fanficIcon = document.getElementById('openFanficBtn');
        if(fanficIcon) {
            fanficIcon.querySelector('span').textContent = '同人墙';
            fanficIcon.querySelector('i').className = 'fas fa-pen-nib';
            if(fanficIcon._originalOnClick) fanficIcon.onclick = fanficIcon._originalOnClick;
        }

        // Restore Birthday
        const birthdayIcon = document.getElementById('openBirthdayBtn');
        if(birthdayIcon) {
            birthdayIcon.querySelector('span').textContent = '生日快乐';
            birthdayIcon.querySelector('i').className = 'fas fa-birthday-cake';
            if(birthdayIcon._originalOnClick) birthdayIcon.onclick = birthdayIcon._originalOnClick;
        }
    }

    showExitButton() {
        if(document.getElementById('pcExitBtn')) return;
        
        const btn = document.createElement('div');
        btn.id = 'pcExitBtn';
        btn.style.cssText = 'position:fixed; top:50px; right:10px; background:rgba(255,0,0,0.8); color:white; padding:5px 10px; border-radius:20px; font-size:12px; z-index:9999; cursor:pointer;';
        btn.innerHTML = '<i class="fas fa-sign-out-alt"></i> 退出查看';
        btn.onclick = () => {
            window.System.resetContext();
            this.restoreIcons();
            btn.remove();
            window.showPage('phoneCheckApp');
            alert('已返回我的手机');
        };
        document.body.appendChild(btn);
    }
}

window.PhoneCheckApp = new PhoneCheckApp();
