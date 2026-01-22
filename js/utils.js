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

// 生成默认图片 (Canvas 设计风格)
const generateDefaultImage = (text = 'Image') => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    
    // 生成随机渐变背景
    const hue = Math.floor(Math.random() * 360);
    const gradient = ctx.createLinearGradient(0, 0, 600, 400);
    gradient.addColorStop(0, `hsl(${hue}, 60%, 80%)`);
    gradient.addColorStop(1, `hsl(${(hue + 40) % 360}, 60%, 90%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 600, 400);
    
    // 绘制装饰图案
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for(let i=0; i<10; i++) {
        const x = Math.random() * 600;
        const y = Math.random() * 400;
        const r = Math.random() * 50 + 20;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // 绘制文字
    ctx.fillStyle = '#555';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 简单的文字换行处理
    const maxWidth = 500;
    const words = text.split('');
    let line = '';
    let lines = [];
    
    for(let n = 0; n < words.length; n++) {
        const testLine = line + words[n];
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            lines.push(line);
            line = words[n];
        } else {
            line = testLine;
        }
    }
    lines.push(line);

    const lineHeight = 60;
    const startY = 200 - ((lines.length - 1) * lineHeight) / 2;

    for(let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], 300, startY + (i * lineHeight));
    }
    
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
