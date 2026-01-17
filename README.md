# AI 小手机 (AI Phone)

一个运行在浏览器中的虚拟手机系统，内置了 QQ、微信、Twitter、Instagram 等高仿应用，并深度接入 AI，让虚拟角色“活”起来。

## ✨ 特色功能

*   **全 AI 驱动**：聊天、朋友圈、热搜、文章评论均由 AI 实时生成。
*   **沉浸式体验**：
    *   **QQ**：支持群聊（手动触发水群）、红包、转账、朋友圈。
    *   **情侣空间**：记录甜蜜日常，照片墙、碎碎念。
    *   **生日快乐**：AI 为你庆生，写信、做蛋糕。
    *   **X (Twitter)**：多账号切换，AI 生成热搜和推荐流。
    *   **Instagram**：快拍、滤镜、AI 生成探索页。
    *   **同人墙**：AI 辅助创作同人文。
*   **极致适配**：支持手机端滑动返回、触摸反馈，体验如原生 App。
*   **数据安全**：所有数据存储在浏览器本地 (IndexedDB)，不上传服务器。

## 🚀 如何部署 (手机访问)

本项目是纯前端应用，推荐使用 **Vercel** 或 **GitHub Pages** 进行免费部署。

### 方法一：使用 Vercel (推荐)

1.  将本项目代码上传到您的 GitHub 仓库。
2.  访问 [Vercel](https://vercel.com/) 并使用 GitHub 账号登录。
3.  点击 **"Add New..."** -> **"Project"**。
4.  选择您刚才上传的仓库，点击 **"Import"**。
5.  保持默认设置，点击 **"Deploy"**。
6.  部署完成后，Vercel 会提供一个网址（如 `https://your-project.vercel.app`）。
7.  在手机浏览器中打开该网址即可使用！

### 方法二：使用 GitHub Pages

1.  将本项目代码上传到您的 GitHub 仓库。
2.  进入仓库的 **Settings** -> **Pages**。
3.  在 **Source** 下选择 `Deploy from a branch`。
4.  在 **Branch** 下选择 `main` (或 `master`) 分支，文件夹选择 `/ (root)`。
5.  点击 **Save**。
6.  等待几分钟，GitHub 会生成一个网址（如 `https://yourname.github.io/repo-name`）。

## ⚠️ 注意事项

1.  **API Key**：为了体验 AI 功能，请在手机上的“设置”应用中配置您的 OpenAI 格式 API Key。API Key 仅保存在您手机的本地存储中。
2.  **数据同步**：由于数据存储在本地，电脑和手机上的聊天记录**不互通**。
3.  **图片存储**：图片存储在浏览器 IndexedDB 中，清除浏览器缓存会导致图片丢失。

## 🛠️ 开发

如果您想在本地运行：

1.  确保安装了 Python。
2.  运行 `run_server.bat` (Windows) 或 `python server.py`。
3.  浏览器访问 `http://localhost:8000`。

---
Enjoy your AI life! 📱
