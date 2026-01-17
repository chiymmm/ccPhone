class BirthdayApp {
    constructor() {
        this.initUI();
        this.checkBirthday();
    }

    initUI() {
        const closeBtn = document.getElementById('closeBirthdayApp');
        if(closeBtn) closeBtn.onclick = () => window.showPage('homeScreen');

        document.getElementById('saveBirthdayBtn').onclick = () => {
            const date = document.getElementById('birthdayInput').value;
            if(date) {
                localStorage.setItem('birthday_date', date);
                this.checkBirthday();
            }
        };

        document.getElementById('startPartyBtn').onclick = () => this.startParty();
        document.getElementById('skipCakeBtn').onclick = () => {
            document.getElementById('cakeSection').style.display = 'none';
            document.getElementById('friendSelectSection').style.display = 'block';
            this.renderFriendSelector();
        };
        
        document.getElementById('startCelebrationBtn').onclick = () => this.startCelebration();
        document.getElementById('openGiftBtn').onclick = () => this.openGift();
    }

    checkBirthday() {
        const bdayStr = localStorage.getItem('birthday_date');
        if(!bdayStr) {
            this.showPage('birthdaySetup');
            return;
        }

        const today = new Date();
        const bday = new Date(bdayStr);
        
        // Check if today is birthday (ignore year)
        if(today.getMonth() === bday.getMonth() && today.getDate() === bday.getDate()) {
            this.showPage('birthdayParty');
            this.initParty();
        } else {
            this.showPage('birthdayCountdown');
            this.startCountdown(bday);
        }
    }

    showPage(id) {
        document.querySelectorAll('.birthday-page').forEach(el => el.style.display = 'none');
        document.getElementById(id).style.display = 'flex';
    }

    startCountdown(bday) {
        const update = () => {
            const now = new Date();
            let nextBday = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
            if(now > nextBday) nextBday.setFullYear(now.getFullYear() + 1);
            
            const diff = nextBday - now;
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
            
            document.getElementById('countdownDays').innerText = days;
        };
        update();
        // Simple check every minute
        setInterval(update, 60000);
    }

    initParty() {
        // Play song (simulated)
        console.log('Playing Happy Birthday Song...');
        // Generate Letter
        this.generateLetter();
    }

    async generateLetter() {
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}');
        const friends = qqData.friends || [];
        if(friends.length === 0) return;

        // Find most chatted friend (simplified: random or first)
        const bestFriend = friends[0]; 
        
        const prompt = `你扮演 ${bestFriend.name}。\n人设: ${bestFriend.persona}\n今天是用户的生日，请写一封感人的生日信给用户。`;
        const apiConfig = JSON.parse(localStorage.getItem('apiConfig') || '{}');
        
        if(apiConfig.chatApiKey) {
            try {
                const letter = await window.QQApp.callAI(prompt, apiConfig);
                document.getElementById('birthdayLetter').innerText = letter;
                document.getElementById('letterSection').style.display = 'block';
            } catch(e) {
                console.error(e);
                document.getElementById('birthdayLetter').innerText = "生日快乐！(AI 生成失败)";
            }
        } else {
            document.getElementById('birthdayLetter').innerText = "生日快乐！请配置 API Key 以获取 AI 的祝福。";
            document.getElementById('letterSection').style.display = 'block';
        }
    }

    startParty() {
        document.getElementById('letterSection').style.display = 'none';
        document.getElementById('cakeSection').style.display = 'flex';
        
        // Cake Game Logic
        const cake = document.getElementById('cakeBase');
        const flame = document.getElementById('candleFlame');
        let clicks = 0;
        cake.onclick = () => {
            clicks++;
            if(clicks >= 5) {
                flame.classList.add('lit');
                setTimeout(() => {
                    alert('蜡烛点燃了！许个愿吧！');
                    setTimeout(() => {
                        document.getElementById('cakeSection').style.display = 'none';
                        document.getElementById('friendSelectSection').style.display = 'block';
                        this.renderFriendSelector();
                    }, 1000);
                }, 500);
            }
        };
    }

    renderFriendSelector() {
        const list = document.getElementById('friendSelector');
        list.innerHTML = '';
        const friends = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}').friends;
        
        friends.forEach(f => {
            const div = document.createElement('div');
            div.className = 'select-item';
            div.innerHTML = `<div class="select-avatar" style="background-image:url('${f.avatar}')"></div><span>${f.name}</span>`;
            div.onclick = () => {
                div.classList.toggle('selected');
                if(div.classList.contains('selected')) div.dataset.selected = 'true';
                else delete div.dataset.selected;
            };
            div.dataset.id = f.id;
            list.appendChild(div);
        });
    }

    async startCelebration() {
        const selectedEls = document.querySelectorAll('.select-item.selected');
        const selectedIds = Array.from(selectedEls).map(el => el.dataset.id);
        
        if(selectedIds.length === 0) return alert('请至少选择一个好友');

        document.getElementById('friendSelectSection').style.display = 'none';
        document.getElementById('dialogueSection').style.display = 'block';
        
        const dialogueBox = document.getElementById('birthdayDialogue');
        dialogueBox.innerHTML = '正在生成对话...';

        const qqData = JSON.parse(localStorage.getItem('qq_data'));
        const friends = qqData.friends.filter(f => selectedIds.includes(f.id));
        
        const roles = friends.map(f => `${f.name}(${f.persona})`).join('\n');
        const prompt = `今天是用户的生日。\n参与角色:\n${roles}\n请生成一段这些角色为用户庆祝生日的对话。可以是温馨的祝福，也可以是修罗场（如果角色性格冲突）。请用剧本格式输出。`;
        
        const apiConfig = JSON.parse(localStorage.getItem('apiConfig') || '{}');
        if(apiConfig.chatApiKey) {
            try {
                const dialogue = await window.QQApp.callAI(prompt, apiConfig);
                dialogueBox.innerText = dialogue;
                document.getElementById('giftSection').style.display = 'block';
            } catch(e) {
                dialogueBox.innerText = "生成失败";
            }
        } else {
            dialogueBox.innerText = "请配置 API Key";
            document.getElementById('giftSection').style.display = 'block';
        }
    }

    openGift() {
        const giftBox = document.getElementById('giftBox');
        giftBox.style.animation = 'none';
        // Simple open animation
        giftBox.querySelector('.gift-lid').style.transform = 'translateY(-50px) rotate(-20deg)';
        
        // Confetti
        for(let i=0; i<50; i++) {
            const c = document.createElement('div');
            c.className = 'confetti';
            c.style.left = Math.random() * 100 + '%';
            c.style.backgroundColor = `hsl(${Math.random()*360}, 100%, 50%)`;
            c.style.animationDuration = (Math.random() * 2 + 1) + 's';
            document.getElementById('birthdayParty').appendChild(c);
        }

        setTimeout(() => {
            alert('生日快乐！礼物是... 满满的爱！(虚拟礼物功能待完善)');
            window.showPage('homeScreen');
        }, 2000);
    }
}

window.BirthdayApp = new BirthdayApp();
