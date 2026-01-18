class ShopStore {
    constructor() { this.init(); }
    init() {
        if(!localStorage.getItem('shop_data')) {
            const initialData = {
                cart: [], // {id, title, price, image, sellerId}
                orders: [], // {id, title, price, time, status, type: 'buy'|'takeout', receiverId}
                chats: [] // {sellerId, messages:[]}
            };
            localStorage.setItem('shop_data', JSON.stringify(initialData));
        }
    }
    get() { return JSON.parse(localStorage.getItem('shop_data')); }
    set(data) { localStorage.setItem('shop_data', JSON.stringify(data)); }
    update(fn) { const data = this.get(); fn(data); this.set(data); }
}

class ShopApp {
    constructor() {
        this.store = new ShopStore();
        this.currentTab = 'home'; // home, cart, chat, me
        this.currentMode = 'shopping'; // shopping, takeout
        this.targetReceiverId = null; // For takeout
        this.initUI();
    }

    initUI() {
        // Check Phone Check Mode
        if (window.System && window.System.isPhoneCheckMode) {
            // Add Generate Activity Button
            if(!document.getElementById('shopGenActivityBtn')) {
                const btn = document.createElement('div');
                btn.id = 'shopGenActivityBtn';
                btn.className = 'ff-fab'; // Reuse fanfic fab style
                btn.style.bottom = '80px';
                btn.style.background = '#ff5000';
                btn.innerHTML = '<i class="fas fa-magic"></i>';
                btn.onclick = () => this.generateActivity();
                document.getElementById('shopApp').appendChild(btn);
            }
        }

        // Nav
        document.querySelectorAll('.shop-nav-item').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.shop-nav-item').forEach(el => el.classList.remove('active'));
                btn.classList.add('active');
                this.currentTab = btn.dataset.tab;
                this.render();
            };
        });

        // Mode Tabs (Shopping vs Takeout)
        document.querySelectorAll('.shop-tab').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.shop-tab').forEach(el => el.classList.remove('active'));
                btn.classList.add('active');
                this.currentMode = btn.dataset.mode;
                this.renderHome();
            };
        });

        // Search
        const searchInput = document.getElementById('shopSearchInput');
        if(searchInput) {
            searchInput.onkeydown = (e) => {
                if(e.key === 'Enter') this.search(e.target.value);
            };
        }

        // Generate Button
        const genBtn = document.getElementById('shopGenBtn');
        if(genBtn) genBtn.onclick = () => this.generateItems();
    }

    switchToTakeout(receiverId) {
        this.currentMode = 'takeout';
        this.targetReceiverId = receiverId;
        this.currentTab = 'home';
        
        // Update UI
        document.querySelectorAll('.shop-nav-item').forEach(el => el.classList.remove('active'));
        document.querySelector('.shop-nav-item[data-tab="home"]').classList.add('active');
        
        document.querySelectorAll('.shop-tab').forEach(el => el.classList.remove('active'));
        document.querySelector('.shop-tab[data-mode="takeout"]').classList.add('active');
        
        this.render();
        alert(`已切换到外卖模式，正在为 ${receiverId ? '好友' : '自己'} 点餐`);
    }

    render() {
        document.querySelectorAll('.shop-page').forEach(el => el.style.display = 'none');
        document.getElementById(`shop-${this.currentTab}`).style.display = 'block';

        if(this.currentTab === 'home') this.renderHome();
        if(this.currentTab === 'cart') this.renderCart();
        if(this.currentTab === 'chat') this.renderChatList();
        if(this.currentTab === 'me') this.renderMe();
    }

    async renderHome() {
        const grid = document.getElementById('shopGrid');
        grid.innerHTML = '';
        
        // If empty, generate some default items
        if(grid.children.length === 0) {
            await this.generateItems(true);
        }
    }

    async generateItems(isInit = false) {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey && !isInit) return alert('请先配置 API Key');

        const grid = document.getElementById('shopGrid');
        if(!isInit) grid.innerHTML = '<div style="text-align:center;width:100%;padding:20px;">生成中...</div>';

        const type = this.currentMode === 'shopping' ? '商品' : '外卖美食';
        const prompt = `生成 6 个${type}列表。
        要求：
        1. 包含名称、价格(数字)、图片描述。
        2. 返回 JSON 数组: [{"title": "名称", "price": 99.9, "imagePrompt": "描述"}]`;

        try {
            let items = [];
            if(apiConfig.chatApiKey) {
                const res = await window.API.callAI(prompt, apiConfig);
                items = JSON.parse(res);
            } else {
                // Fallback defaults
                if(this.currentMode === 'shopping') {
                    items = [
                        {title: '可爱抱枕', price: 45.0, imagePrompt: 'cute pillow'},
                        {title: '复古台灯', price: 128.0, imagePrompt: 'retro lamp'},
                        {title: '手账本套装', price: 68.0, imagePrompt: 'notebook set'},
                        {title: '蓝牙耳机', price: 299.0, imagePrompt: 'bluetooth headphones'}
                    ];
                } else {
                    items = [
                        {title: '炸鸡套餐', price: 35.0, imagePrompt: 'fried chicken'},
                        {title: '麻辣烫', price: 28.0, imagePrompt: 'spicy hot pot'},
                        {title: '珍珠奶茶', price: 18.0, imagePrompt: 'bubble tea'},
                        {title: '寿司拼盘', price: 88.0, imagePrompt: 'sushi platter'}
                    ];
                }
            }

            grid.innerHTML = '';
            for(const item of items) {
                let imgUrl = window.Utils.generateDefaultImage(item.title);
                // If API key exists, try to gen image (optional, maybe too slow for 6 items)
                // Let's stick to default for speed, or load async
                
                const div = document.createElement('div');
                div.className = 'shop-item';
                div.innerHTML = `
                    <div class="shop-item-img" style="background-image:url('${imgUrl}')"></div>
                    <div class="shop-item-info">
                        <div class="shop-item-title">${item.title}</div>
                        <div class="shop-item-price">¥${item.price}</div>
                        <div class="shop-item-actions">
                            ${this.currentMode === 'shopping' ? `<button class="shop-btn cart">加入购物车</button>` : ''}
                            <button class="shop-btn buy">${this.currentMode === 'shopping' ? '购买' : '立即下单'}</button>
                        </div>
                    </div>
                `;
                
                if(this.currentMode === 'shopping') {
                    div.querySelector('.cart').onclick = () => this.addToCart(item, imgUrl);
                }
                div.querySelector('.buy').onclick = () => this.buyNow(item);
                
                // Add Chat with Seller button
                const chatBtn = document.createElement('button');
                chatBtn.className = 'shop-btn';
                chatBtn.style.background = '#333';
                chatBtn.style.marginTop = '5px';
                chatBtn.innerText = '私聊';
                chatBtn.onclick = () => this.startChatWithSeller(item.seller || '官方旗舰店');
                div.querySelector('.shop-item-actions').appendChild(chatBtn);
                
                grid.appendChild(div);
            }

        } catch(e) {
            console.error(e);
            grid.innerHTML = '生成失败';
        }
    }

    addToCart(item, imgUrl) {
        this.store.update(d => d.cart.push({...item, image: imgUrl, id: Date.now()}));
        alert('已加入购物车');
    }

    buyNow(item) {
        if(this.currentMode === 'takeout') {
            // Takeout Logic
            const qqData = JSON.parse(localStorage.getItem('qq_data'));
            const wallet = qqData.wallet;
            
            if(parseFloat(wallet.balance) < item.price) return alert('余额不足');
            
            if(confirm(`确定支付 ¥${item.price} 购买 ${item.title} 吗？`)) {
                // Deduct
                wallet.balance = (parseFloat(wallet.balance) - parseFloat(item.price)).toFixed(2);
                wallet.history.unshift({date: new Date().toLocaleString(), amount: `-${item.price}`, reason: `外卖: ${item.title}`});
                localStorage.setItem('qq_data', JSON.stringify(qqData));
                
                // Notify AI if target set
                if(this.targetReceiverId) {
                    const friend = qqData.friends.find(f => f.id === this.targetReceiverId);
                    if(friend) {
                        if(!qqData.messages[friend.id]) qqData.messages[friend.id] = [];
                        qqData.messages[friend.id].push({
                            id: Date.now(), senderId: 'sys', senderName: 'System', 
                            content: `我给你点了份外卖: ${item.title}`, type: 'system_card', subType: 'food', data: item.price,
                            timestamp: Date.now(), status: 'normal'
                        });
                        localStorage.setItem('qq_data', JSON.stringify(qqData));
                        alert(`已下单并通知 ${friend.name}`);
                    }
                } else {
                    alert('下单成功！');
                    // Simulate Delivery Process for Self
                    this.simulateDelivery(item.title);
                }
            }
        } else {
            // Direct Buy Shopping
            // ... similar logic
            alert('购买成功');
        }
    }

    renderCart() {
        const list = document.getElementById('shopCartList');
        list.innerHTML = '';
        const data = this.store.get();
        
        if(data.cart.length === 0) {
            list.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">购物车空空如也</div>';
            return;
        }

        let total = 0;
        data.cart.forEach((item, index) => {
            total += parseFloat(item.price);
            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <div class="cart-item-img" style="background-image:url('${item.image}')"></div>
                <div class="cart-item-info">
                    <div>${item.title}</div>
                    <div style="color:#ff5000;font-weight:bold;">¥${item.price}</div>
                </div>
                <button class="shop-btn" style="background:#ccc;">删除</button>
            `;
            div.querySelector('button').onclick = () => {
                this.store.update(d => d.cart.splice(index, 1));
                this.renderCart();
            };
            list.appendChild(div);
        });

        document.getElementById('cartTotal').innerText = total.toFixed(2);
        
        document.getElementById('btnCartPay').onclick = () => {
            const qqData = JSON.parse(localStorage.getItem('qq_data'));
            if(parseFloat(qqData.wallet.balance) < total) return alert('余额不足');
            
            if(confirm(`确认支付 ¥${total.toFixed(2)}?`)) {
                qqData.wallet.balance = (parseFloat(qqData.wallet.balance) - total).toFixed(2);
                qqData.wallet.history.unshift({date: new Date().toLocaleString(), amount: `-${total.toFixed(2)}`, reason: `商城购物`});
                localStorage.setItem('qq_data', JSON.stringify(qqData));
                
                this.store.update(d => {
                    d.cart = [];
                    d.orders.push({id: Date.now(), price: total, items: data.cart, time: Date.now()});
                });
                this.renderCart();
                alert('支付成功');
            }
        };
        
        document.getElementById('btnCartPayForMe').onclick = () => {
            // Share to QQ Friend for payment
            const qqData = JSON.parse(localStorage.getItem('qq_data'));
            if(qqData.friends.length === 0) return alert('没有好友可以代付');
            
            const names = qqData.friends.map((f, i) => `${i+1}. ${f.name}`).join('\n');
            const choice = prompt(`找谁代付？(输入序号)\n${names}`);
            const idx = parseInt(choice) - 1;
            
            if(idx >= 0 && idx < qqData.friends.length) {
                const friend = qqData.friends[idx];
                if(!qqData.messages[friend.id]) qqData.messages[friend.id] = [];
                qqData.messages[friend.id].push({
                    id: Date.now(), senderId: 'sys', senderName: 'System', 
                    content: `请帮我清空购物车，总计 ¥${total.toFixed(2)}`, type: 'system_card', subType: 'payforme', data: total.toFixed(2),
                    timestamp: Date.now(), status: 'normal'
                });
                localStorage.setItem('qq_data', JSON.stringify(qqData));
                alert(`已发送代付请求给 ${friend.name}`);
            }
        };
    }

    renderChatList() {
        const list = document.getElementById('shopChatList');
        list.innerHTML = '';
        const data = this.store.get();
        
        if(data.chats.length === 0) {
            list.innerHTML = '<div style="padding:20px;text-align:center;color:#999;">暂无商家消息</div>';
            return;
        }

        data.chats.forEach(chat => {
            const div = document.createElement('div');
            div.className = 'chat-item';
            div.innerHTML = `
                <div class="chat-avatar" style="background:#ff5000;color:#fff;display:flex;justify-content:center;align-items:center;"><i class="fas fa-store"></i></div>
                <div class="chat-info">
                    <div class="chat-top"><span class="chat-name">${chat.sellerName}</span></div>
                    <div class="chat-msg">${chat.messages[chat.messages.length-1]?.content || ''}</div>
                </div>
            `;
            div.onclick = () => this.openChat(chat);
            list.appendChild(div);
        });
    }

    openChat(chat) {
        // Create chat modal
        const modal = document.createElement('div');
        modal.className = 'sub-page';
        modal.style.display = 'flex';
        modal.style.zIndex = '100';
        modal.innerHTML = `
            <div class="sub-header">
                <button class="back-btn" id="closeShopChat"><i class="fas fa-chevron-left"></i></button>
                <span class="sub-title">${chat.sellerName}</span>
            </div>
            <div class="chat-messages" id="shopChatMessages" style="flex:1;overflow-y:auto;padding:10px;"></div>
            <div class="chat-input-area">
                <input id="shopChatInput" placeholder="联系商家...">
                <button class="send-btn" id="shopChatSend">发送</button>
                <button class="chat-reply-btn" id="shopChatReply" style="margin-left:5px;">回复</button>
            </div>
        `;
        document.getElementById('shopApp').appendChild(modal);

        const renderMsgs = () => {
            const container = modal.querySelector('#shopChatMessages');
            container.innerHTML = '';
            chat.messages.forEach(m => {
                const div = document.createElement('div');
                div.className = `message-row ${m.sender === 'user' ? 'self' : ''}`;
                div.innerHTML = `<div class="msg-content"><div class="msg-bubble">${m.content}</div></div>`;
                container.appendChild(div);
            });
            container.scrollTop = container.scrollHeight;
        };
        renderMsgs();

        modal.querySelector('#closeShopChat').onclick = () => modal.remove();
        
        const sendMsg = async (isReply = false) => {
            const input = modal.querySelector('#shopChatInput');
            const text = input.value.trim();
            if(!text && !isReply) return;
            
            if(!isReply) {
                chat.messages.push({sender: 'user', content: text, time: Date.now()});
                this.store.set(this.store.get()); // Save
                renderMsgs();
                input.value = '';
            }

            // AI Reply
            if(isReply || !isReply) { // Always trigger AI reply for shop? Or manual? User said "manual click reply button"
                if(isReply) {
                     // Manual trigger
                     const apiConfig = window.API.getConfig();
                     if(apiConfig.chatApiKey) {
                         const prompt = `你扮演淘宝商家 "${chat.sellerName}"。\n用户说: "${chat.messages[chat.messages.length-1].content}"。\n请回复用户，语气要亲切客气（亲~）。`;
                         try {
                             const reply = await window.API.callAI(prompt, apiConfig);
                             chat.messages.push({sender: 'seller', content: reply, time: Date.now()});
                             this.store.set(this.store.get());
                             renderMsgs();
                         } catch(e) { alert('生成失败'); }
                     }
                }
            }
        };

        modal.querySelector('#shopChatSend').onclick = () => sendMsg(false);
        modal.querySelector('#shopChatReply').onclick = () => sendMsg(true);
    }

    startChatWithSeller(sellerName) {
        const data = this.store.get();
        let chat = data.chats.find(c => c.sellerName === sellerName);
        if(!chat) {
            chat = { sellerName, messages: [] };
            data.chats.push(chat);
            this.store.set(data);
        }
        this.openChat(chat);
    }

    renderMe() {
        // ... Simplified me page
        const qqData = JSON.parse(localStorage.getItem('qq_data'));
        document.getElementById('shopMeName').innerText = qqData.user.name;
        document.getElementById('shopMeBalance').innerText = qqData.wallet.balance;
    }

    simulateDelivery(itemName) {
        const steps = [
            { msg: '商家已接单', delay: 2000 },
            { msg: '骑手已接单，正赶往商家', delay: 5000 },
            { msg: '骑手已取餐', delay: 10000 },
            { msg: '骑手距离您还有 500米', delay: 15000 },
            { msg: `您的外卖(${itemName})已送达，祝您用餐愉快`, delay: 20000 }
        ];
        
        steps.forEach(step => {
            setTimeout(() => {
                if(Notification.permission === 'granted') {
                    new Notification('外卖进度', { body: step.msg });
                } else {
                    // Fallback to system notification if possible, or just console
                    console.log(step.msg);
                }
            }, step.delay);
        });
    }

    async generateActivity() {
        const apiConfig = JSON.parse(localStorage.getItem('apiConfig') || '{}');
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');

        const char = window.System.currentCheckedFriend;
        if(!char) return;

        const btn = document.getElementById('shopGenActivityBtn');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        // Randomly decide: Shopping or Takeout (for user)
        const isTakeoutForUser = Math.random() > 0.7;

        if(isTakeoutForUser) {
            const prompt = `你扮演 ${char.name}。\n人设: ${char.persona}\n你想给用户点一份外卖（奶茶、甜点或正餐）。\n请生成外卖名称和价格。\n返回 JSON: {"item": "外卖名", "price": 25.5}`;
            try {
                const res = await window.API.callAI(prompt, apiConfig);
                const order = JSON.parse(res);
                
                // Add to QQ messages as system card
                // We need to access QQ data. In Phone Check Mode, we are viewing char's phone, but we want to send to User.
                // We assume User is in char's friend list (or we just simulate it).
                // Actually, if we are in Phone Check Mode, we are "me" (char). We send to "User".
                // We need to find "User" in char's friend list.
                const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}');
                // Try to find a friend that represents the user (e.g. "我" in char's list, or just pick one)
                // For simplicity, let's just alert.
                alert(`(模拟) ${char.name} 给用户点了外卖: ${order.item}`);
                
                if(Notification.permission === 'granted') {
                    new Notification(char.name, { body: `给你点了外卖: ${order.item}` });
                }

            } catch(e) { console.error(e); }
        } else {
            const prompt = `你扮演 ${char.name}。\n人设: ${char.persona}\n请生成一个你在商城上的活动。\n可以是浏览商品、加入购物车或购买商品。\n返回 JSON: {"action": "browse/cart/buy", "item": "商品名", "price": 99.9}`;

            try {
                const res = await window.API.callAI(prompt, apiConfig);
                const activity = JSON.parse(res);
                
                if(activity.action === 'cart' || activity.action === 'buy') {
                    const item = {
                        title: activity.item,
                        price: activity.price,
                        image: window.Utils.generateDefaultImage(activity.item),
                        id: Date.now()
                    };
                    
                    if(activity.action === 'cart') {
                        this.store.update(d => d.cart.push(item));
                        alert(`已将 ${activity.item} 加入购物车`);
                        if(this.currentTab === 'cart') this.renderCart();
                    } else {
                        // Buy
                        this.store.update(d => d.orders.push({
                            id: Date.now(),
                            price: activity.price,
                            items: [item],
                            time: Date.now(),
                            status: 'paid'
                        }));
                        alert(`已购买 ${activity.item}`);
                    }
                } else {
                    alert(`正在浏览 ${activity.item}`);
                }
                
                // Sync Activity
                if(Math.random() > 0.5) {
                    if(Notification.permission === 'granted') {
                        new Notification(char.name, { body: '在商城有了新动态' });
                    }
                }

            } catch(e) {
                console.error(e);
                alert('生成失败');
            }
        }
        
        btn.innerHTML = '<i class="fas fa-magic"></i>';
    }
}

window.ShopApp = new ShopApp();
