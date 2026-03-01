# 环境变量配置说明

## 问题
当前显示错误：`Gemini client not initialized. Please check NEXT_PUBLIC_GEMINI_API_KEY.`

## 解决方案

### 1. 获取 Gemini API Key
1. 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 登录你的 Google 账号
3. 点击 "Create API Key"
4. 复制生成的 API Key

### 2. 配置环境变量
在项目根目录的 `.env.local` 文件中添加：
```bash
NEXT_PUBLIC_GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### 3. 重启开发服务器
```bash
# 停止当前服务器 (Ctrl+C)
# 然后重新启动
npm run dev
```

### 4. 验证配置
打开浏览器控制台，应该看到：
```
=== Main Page Environment Check ===
NEXT_PUBLIC_GEMINI_API_KEY exists: true
NEXT_PUBLIC_GEMINI_API_KEY length: [API_KEY_LENGTH]
✅ NEXT_PUBLIC_GEMINI_API_KEY is configured
```

### 5. 测试音频分析
1. 生成访谈大纲
2. 上传"兔儿爷.MP3"音频文件
3. 点击"开始分析"
4. 查看控制台日志确认客户端 API 调用

## 当前状态
- ✅ `.env.local` 文件已创建
- ✅ 客户端 Gemini API 服务已实现
- ✅ 环境变量检查功能已添加
- ⏳ 需要添加真实的 API Key

## 注意事项
- API Key 将在前端暴露，仅适用于开发环境
- 生产环境建议使用后端代理
- 免费版 Gemini API 有配额限制
