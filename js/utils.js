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

// 导出到全局
window.Utils = {
    fileToBase64,
    compressImage,
    generateId,
    COUNTRIES,
    formatTime,
    vibrate
};
