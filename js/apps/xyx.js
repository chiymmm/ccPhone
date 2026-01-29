// 游戏合集 App
(function() {
    'use strict';

    const openGamesBtn = document.getElementById('openGamesBtn');
    const gamesApp = document.getElementById('gamesApp');

    // 打开游戏合集
    if (openGamesBtn) {
        openGamesBtn.addEventListener('click', function() {
            if (window.showPage) {
                window.showPage('gamesApp');
                showGamesPage('gamesHome');
            }
        });
    }

    // 显示指定游戏页面
    function showGamesPage(pageId) {
        const allPages = document.querySelectorAll('.games-page');
        allPages.forEach(page => {
            page.style.display = 'none';
        });

        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.style.display = 'flex';
        }
    }

    // 游戏卡片点击事件
    const gameCards = document.querySelectorAll('.game-card');
    gameCards.forEach(card => {
        card.addEventListener('click', function() {
            const gameId = this.getAttribute('data-game');
            if (gameId) {
                showGamesPage(gameId + 'Page');
            }
        });
    });

    // 暴露到全局
    window.GamesApp = {
        showPage: showGamesPage
    };

    console.log('游戏合集 App 已加载');
})();
