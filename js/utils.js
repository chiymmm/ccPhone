// ==========================================
// Utils
// ==========================================

const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

// 图片压缩工具
const compressImage = (base64, maxWidth = 800, quality = 0.7) => new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
            height = Math.round(height * (maxWidth / width));
            width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64); // 失败则返回原图
});

const generateId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const COUNTRIES = [
    {name: '中国', timezone: 8}, {name: '日本', timezone: 9}, {name: '美国 (纽约)', timezone: -5},
    {name: '美国 (洛杉矶)', timezone: -8}, {name: '英国', timezone: 0}, {name: '法国', timezone: 1},
    {name: '俄罗斯 (莫斯科)', timezone: 3}, {name: '澳大利亚 (悉尼)', timezone: 11},
    {name: '印度', timezone: 5.5}, {name: '阿联酋 (迪拜)', timezone: 4}
];

// 格式化时间
const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
};

// 震动反馈
const vibrate = (pattern = 50) => {
    if (navigator.vibrate) {
        navigator.vibrate(pattern);
    }
};

// 生成默认头像 (可爱风格)
const generateDefaultAvatar = (name) => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    
    // 随机柔和背景色
    const hues = [0, 30, 60, 120, 180, 210, 270, 300];
    const hue = hues[Math.floor(Math.random() * hues.length)];
    ctx.fillStyle = `hsl(${hue}, 70%, 90%)`;
    ctx.fillRect(0, 0, 200, 200);
    
    // 绘制简笔画表情
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    
    // 眼睛
    const eyeType = Math.floor(Math.random() * 3);
    if(eyeType === 0) { // 点眼
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.arc(60, 80, 10, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(140, 80, 10, 0, Math.PI*2); ctx.fill();
    } else if (eyeType === 1) { // 弯眼
        ctx.beginPath(); ctx.arc(60, 80, 15, Math.PI, 0); ctx.stroke();
        ctx.beginPath(); ctx.arc(140, 80, 15, Math.PI, 0); ctx.stroke();
    } else { // 线眼
        ctx.beginPath(); ctx.moveTo(45, 80); ctx.lineTo(75, 80); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(125, 80); ctx.lineTo(155, 80); ctx.stroke();
    }
    
    // 嘴巴
    const mouthType = Math.floor(Math.random() * 3);
    if(mouthType === 0) { // 微笑
        ctx.beginPath(); ctx.arc(100, 100, 30, 0, Math.PI); ctx.stroke();
    } else if (mouthType === 1) { // O型
        ctx.beginPath(); ctx.arc(100, 120, 15, 0, Math.PI*2); ctx.stroke();
    } else { // 猫嘴
        ctx.beginPath(); 
        ctx.moveTo(100, 110); ctx.lineTo(80, 130); 
        ctx.moveTo(100, 110); ctx.lineTo(120, 130); 
        ctx.stroke();
    }
    
    // 腮红
    ctx.fillStyle = 'rgba(255, 100, 100, 0.2)';
    ctx.beginPath(); ctx.arc(50, 110, 15, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(150, 110, 15, 0, Math.PI*2); ctx.fill();

    return canvas.toDataURL('image/png');
};

// 生成默认图片 (纯色+文字)
const generateDefaultImage = (text = 'Image') => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, 600, 400);
    
    // 绘制网格
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    for(let i=0; i<600; i+=40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 400); ctx.stroke();
    }
    for(let i=0; i<400; i+=40) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(600, i); ctx.stroke();
    }
    
    ctx.fillStyle = '#999';
    ctx.font = 'bold 40px Gaegu';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 300, 200);
    
    return canvas.toDataURL('image/png');
};

// 导出到全局
window.Utils = {
    fileToBase64,
    compressImage,
    generateId,
    COUNTRIES,
    formatTime,
    vibrate,
    generateDefaultAvatar,
    generateDefaultImage
};
