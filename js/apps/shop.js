class ShopStore {
    constructor() { this.init(); }
    init() {
        if(!localStorage.getItem('shop_data')) {
            const initialData = {
                cart: [], // {id, title, price, image, sellerId}
                orders: [], // {id, items, total, status: 'unpaid'|'unshipped'|'shipped'|'completed', time, type: 'buy'|'takeout', receiverId}
                chats: [], // {sellerName, messages:[]}
                user: {
                    addresses: [], // {id, name, phone, address}
                    coupons: [],
                    points: 0
                }
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
        // Update Header with Gen Button
        const headerIcons = document.querySelector('.shop-header-icons');
        // Use SVG for icons
        const svgPlus = `<svg viewBox="0 0 24 24" width="20" height="20" fill="#333"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`;
        const svgCart = `<svg viewBox="0 0 24 24" width="20" height="20" fill="#333"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>`;
        const svgChat = `<svg viewBox="0 0 24 24" width="20" height="20" fill="#333"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`;
        const svgSearch = `<svg viewBox="0 0 24 24" width="16" height="16" fill="#999"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`;

        headerIcons.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;">
                <div id="shopGenBtn" style="cursor:pointer;display:flex;" title="生成商品">${svgPlus}</div>
                <div onclick="window.ShopApp.currentTab='cart';window.ShopApp.render()" style="cursor:pointer;display:flex;">${svgCart}</div>
                <div onclick="window.ShopApp.currentTab='chat';window.ShopApp.render()" style="cursor:pointer;display:flex;">${svgChat}</div>
            </div>
        `;
        document.getElementById('shopGenBtn').onclick = () => this.generateItems();

        // Update Search Bar with SVG
        const searchBar = document.querySelector('.shop-search-bar');
        if(searchBar) {
            searchBar.innerHTML = `
                <div id="shopSearchBtn" style="cursor:pointer;display:flex;margin-right:5px;">${svgSearch}</div>
                <input type="text" id="shopSearchInput" placeholder="搜索商品" style="border:none;background:transparent;outline:none;width:100%;">
            `;
        }

        document.querySelectorAll('.shop-nav-item').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.shop-nav-item').forEach(el => el.classList.remove('active'));
                btn.classList.add('active');
                this.currentTab = btn.dataset.tab;
                this.render();
            };
        });

        document.querySelectorAll('.shop-tab').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.shop-tab').forEach(el => el.classList.remove('active'));
                btn.classList.add('active');
                this.currentMode = btn.dataset.mode;
                this.renderHome();
            };
        });

        const searchInput = document.getElementById('shopSearchInput');
        const searchBtn = document.getElementById('shopSearchBtn');
        
        const doSearch = () => this.generateItems(false, searchInput.value);

        if(searchInput) {
            searchInput.onkeydown = (e) => {
                if(e.key === 'Enter') doSearch();
            };
        }
        if(searchBtn) {
            searchBtn.onclick = doSearch;
        }
    }

    switchToTakeout(receiverId) {
        this.currentMode = 'takeout';
        this.targetReceiverId = receiverId;
        this.currentTab = 'home';
        
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
        // Don't clear if already has items, unless mode changed or forced
        if(grid.children.length === 0 || grid.dataset.mode !== this.currentMode) {
            grid.dataset.mode = this.currentMode;
            await this.generateItems(true);
        }
    }

    async generateItems(isInit = false, query = '') {
        const apiConfig = window.API.getConfig();
        // Allow search even without API key (using simulation)
        if(!apiConfig.chatApiKey && !isInit && !query) return alert('请先配置 API Key');

        const btn = document.getElementById('shopGenBtn');
        if(btn) btn.style.opacity = '0.5';

        const grid = document.getElementById('shopGrid');
        if(!isInit) grid.innerHTML = '<div style="text-align:center;width:100%;padding:20px;">生成中...</div>';

        const type = this.currentMode === 'shopping' ? '商品' : '外卖美食';
        let prompt = `生成 6 个${type}列表。`;
        if(query) prompt += ` 关键词: "${query}"。`;
        prompt += `
        要求：
        1. 包含名称、价格(数字)、图片描述、店铺名称。
        2. 返回 JSON 数组: [{"title": "名称", "price": 99.9, "imagePrompt": "描述", "seller": "店铺名"}]`;

        try {
            let items = [];
            if(apiConfig.chatApiKey) {
                const res = await window.API.callAI(prompt, apiConfig);
                try {
                    items = JSON.parse(res);
                } catch(e) {
                    const match = res.match(/\[[\s\S]*\]/);
                    if(match) items = JSON.parse(match[0]);
                    else throw new Error('Invalid JSON');
                }
            } else {
                // Fallback defaults or Simulation based on query
                if(query) {
                    // Simulate search results
                    const basePrice = Math.floor(Math.random() * 100) + 10;
                    items = [
                        {title: `${query} (推荐)`, price: basePrice, imagePrompt: query, seller: '搜索推荐'},
                        {title: `高级${query}`, price: basePrice * 1.5, imagePrompt: query, seller: '品牌店'},
                        {title: `${query}套装`, price: basePrice * 2, imagePrompt: query, seller: '优选店'},
                        {title: `特价${query}`, price: basePrice * 0.8, imagePrompt: query, seller: '折扣店'}
                    ];
                } else {
                    if(this.currentMode === 'shopping') {
                        items = [
                            {title: '可爱抱枕', price: 45.0, imagePrompt: 'cute pillow', seller: '家居生活馆'},
                            {title: '复古台灯', price: 128.0, imagePrompt: 'retro lamp', seller: '光影艺术'},
                            {title: '手账本套装', price: 68.0, imagePrompt: 'notebook set', seller: '文具控'},
                            {title: '蓝牙耳机', price: 299.0, imagePrompt: 'bluetooth headphones', seller: '数码科技'}
                        ];
                    } else {
                        items = [
                            {title: '炸鸡套餐', price: 35.0, imagePrompt: 'fried chicken', seller: '肯德基'},
                            {title: '麻辣烫', price: 28.0, imagePrompt: 'spicy hot pot', seller: '杨国福'},
                            {title: '珍珠奶茶', price: 18.0, imagePrompt: 'bubble tea', seller: '蜜雪冰城'},
                            {title: '寿司拼盘', price: 88.0, imagePrompt: 'sushi platter', seller: '争鲜'}
                        ];
                    }
                }
            }

            grid.innerHTML = '';
            for(const item of items) {
                let imgUrl = window.Utils.generateDefaultImage(item.title);
                
                const div = document.createElement('div');
                div.className = 'shop-item';
                div.innerHTML = `
                    <div class="shop-item-img" style="background-image:url('${imgUrl}')"></div>
                    <div class="shop-item-info">
                        <div class="shop-item-title">${item.title}</div>
                        <div class="shop-item-price">¥${item.price}</div>
                        <div style="font-size:10px;color:#999;">${item.seller}</div>
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
            grid.innerHTML = '生成失败: ' + e.message;
        } finally {
            if(btn) btn.style.opacity = '1';
        }
    }

    addToCart(item, imgUrl) {
        this.store.update(d => d.cart.push({...item, image: imgUrl, id: Date.now()}));
        alert('已加入购物车');
    }

    buyNow(item) {
        if(this.currentMode === 'takeout') {
            const qqData = JSON.parse(localStorage.getItem('qq_data'));
            const wallet = qqData.wallet;
            
            if(parseFloat(wallet.balance) < item.price) return alert('余额不足');
            
            if(confirm(`确定支付 ¥${item.price} 购买 ${item.title} 吗？`)) {
                wallet.balance = (parseFloat(wallet.balance) - parseFloat(item.price)).toFixed(2);
                wallet.history.unshift({date: new Date().toLocaleString(), amount: `-${item.price}`, reason: `外卖: ${item.title}`});
                localStorage.setItem('qq_data', JSON.stringify(qqData));
                
                this.store.update(d => d.orders.push({
                    id: Date.now(),
                    items: [item],
                    total: item.price,
                    status: 'unshipped',
                    time: Date.now(),
                    type: 'takeout'
                }));

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
                    this.simulateDelivery(item.title);
                }
            }
        } else {
            // Direct Buy Shopping
            const qqData = JSON.parse(localStorage.getItem('qq_data'));
            if(parseFloat(qqData.wallet.balance) < item.price) return alert('余额不足');
            
            if(confirm(`确认支付 ¥${item.price} 购买 ${item.title}?`)) {
                qqData.wallet.balance = (parseFloat(qqData.wallet.balance) - parseFloat(item.price)).toFixed(2);
                qqData.wallet.history.unshift({date: new Date().toLocaleString(), amount: `-${item.price}`, reason: `商城购物: ${item.title}`});
                localStorage.setItem('qq_data', JSON.stringify(qqData));
                
                this.store.update(d => d.orders.push({
                    id: Date.now(),
                    items: [item],
                    total: item.price,
                    status: 'unshipped',
                    time: Date.now(),
                    type: 'buy'
                }));
                alert('购买成功');
            }
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
                    d.orders.push({
                        id: Date.now(),
                        items: [...d.cart],
                        total: total.toFixed(2),
                        status: 'unshipped',
                        time: Date.now(),
                        type: 'buy'
                    });
                    d.cart = [];
                });
                this.renderCart();
                alert('支付成功');
            }
        };
        
        document.getElementById('btnCartPayForMe').onclick = () => {
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
            if(isReply || !isReply) {
                if(isReply) {
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

    async renderMe() {
        const qqData = JSON.parse(localStorage.getItem('qq_data'));
        const data = this.store.get();
        const container = document.getElementById('shop-me');
        container.innerHTML = '';

        // Header
        const header = document.createElement('div');
        header.style.cssText = 'background:#333;color:#fff;padding:30px 20px;display:flex;align-items:center;gap:15px;';
        
        let avatarUrl = qqData.user.avatar || '';
        if(avatarUrl.startsWith('img_')) {
            const blob = await window.db.getImage(avatarUrl);
            if(blob) avatarUrl = blob;
        }

        header.innerHTML = `
            <div style="width:60px;height:60px;background:#fff;border-radius:50%;background-image:url('${avatarUrl}');background-size:cover;"></div>
            <div>
                <h2 style="margin:0;">${qqData.user.name}</h2>
                <div style="font-size:12px;opacity:0.8;">会员等级: 黄金会员</div>
            </div>
        `;
        container.appendChild(header);

        // Assets
        const assets = document.createElement('div');
        assets.style.cssText = 'display:flex;justify-content:space-around;padding:15px;background:#fff;margin-bottom:10px;';
        assets.innerHTML = `
            <div style="text-align:center;"><div style="font-weight:bold;">${qqData.wallet.balance}</div><div style="font-size:12px;color:#999;">余额</div></div>
            <div style="text-align:center;"><div style="font-weight:bold;">${data.user.coupons.length}</div><div style="font-size:12px;color:#999;">优惠券</div></div>
            <div style="text-align:center;"><div style="font-weight:bold;">${data.user.points}</div><div style="font-size:12px;color:#999;">积分</div></div>
        `;
        container.appendChild(assets);

        // Orders
        const ordersDiv = document.createElement('div');
        ordersDiv.style.background = '#fff';
        ordersDiv.style.padding = '15px';
        ordersDiv.style.marginBottom = '10px';
        ordersDiv.innerHTML = `
            <div style="display:flex;justify-content:space-between;margin-bottom:15px;">
                <span style="font-weight:bold;">我的订单</span>
                <span style="font-size:12px;color:#999;">全部订单 ></span>
            </div>
            <div style="display:flex;justify-content:space-around;">
                <div style="text-align:center;font-size:12px;color:#666;"><i class="fas fa-wallet" style="font-size:20px;margin-bottom:5px;"></i><br>待付款</div>
                <div style="text-align:center;font-size:12px;color:#666;"><i class="fas fa-box" style="font-size:20px;margin-bottom:5px;"></i><br>待发货</div>
                <div style="text-align:center;font-size:12px;color:#666;"><i class="fas fa-truck" style="font-size:20px;margin-bottom:5px;"></i><br>待收货</div>
                <div style="text-align:center;font-size:12px;color:#666;"><i class="fas fa-comment-alt" style="font-size:20px;margin-bottom:5px;"></i><br>待评价</div>
            </div>
        `;
        container.appendChild(ordersDiv);

        // Order List (Simplified)
        const orderList = document.createElement('div');
        orderList.style.padding = '10px';
        data.orders.slice(0, 5).forEach(o => {
            const div = document.createElement('div');
            div.style.cssText = 'background:#fff;padding:10px;margin-bottom:10px;border-radius:5px;';
            div.innerHTML = `
                <div style="display:flex;justify-content:space-between;font-size:12px;color:#999;margin-bottom:5px;">
                    <span>${new Date(o.time).toLocaleDateString()}</span>
                    <span>${o.status}</span>
                </div>
                <div style="display:flex;gap:10px;">
                    <div style="width:50px;height:50px;background:#eee;background-image:url('${o.items[0].image}');background-size:cover;"></div>
                    <div style="flex:1;">
                        <div>${o.items[0].title} 等${o.items.length}件</div>
                        <div style="font-weight:bold;">¥${o.total}</div>
                    </div>
                </div>
            `;
            orderList.appendChild(div);
        });
        container.appendChild(orderList);

        // Address
        const addrBtn = document.createElement('div');
        addrBtn.style.cssText = 'background:#fff;padding:15px;margin-top:10px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;';
        addrBtn.innerHTML = '<span>收货地址管理</span><i class="fas fa-chevron-right" style="color:#ccc;"></i>';
        addrBtn.onclick = () => alert('地址管理功能开发中');
        container.appendChild(addrBtn);
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

        // Removed FAB button logic
        
        const isTakeoutForUser = Math.random() > 0.7;

        if(isTakeoutForUser) {
            const prompt = `你扮演 ${char.name}。\n人设: ${char.persona}\n你想给用户点一份外卖（奶茶、甜点或正餐）。\n请生成外卖名称和价格。\n返回 JSON: {"item": "外卖名", "price": 25.5}`;
            try {
                const res = await window.API.callAI(prompt, apiConfig);
                const order = JSON.parse(res);
                
                const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}');
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
                        this.store.update(d => d.orders.push({
                            id: Date.now(),
                            items: [item],
                            total: activity.price,
                            status: 'paid',
                            time: Date.now(),
                            type: 'buy'
                        }));
                        alert(`已购买 ${activity.item}`);
                    }
                } else {
                    alert(`正在浏览 ${activity.item}`);
                }
                
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
    }
}

window.ShopApp = new ShopApp();
