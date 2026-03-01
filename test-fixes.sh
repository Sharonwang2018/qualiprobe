#!/bin/bash

echo "=== 测试修复后的功能 ==="
echo ""

echo "1. 测试大纲生成..."
curl -s -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"topic":"兔儿爷传统文化调研","audience":"传统文化爱好者","goal":"了解兔儿爷文化认知和情感连接","interviewType":"IDI","totalDuration":60}' | jq '.sections[] | {title: .title, duration: .duration}' | head -10

echo ""
echo "2. 检查环境变量配置..."
if [ -f ".env.local" ]; then
    echo "✅ .env.local 存在"
    if grep -q "NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here" .env.local; then
        echo "⚠️  需要更新 API Key"
        echo "请编辑 .env.local 文件，替换 'your_gemini_api_key_here' 为真实的 API Key"
    else
        echo "✅ API Key 已配置"
    fi
else
    echo "❌ .env.local 不存在"
fi

echo ""
echo "3. 修复总结："
echo "✅ Gemini 初始化移到 startAnalysis 函数内部"
echo "✅ 运行时环境变量检查"
echo "✅ 大纲时长解析修复（支持'15分钟'格式）"
echo "✅ 完整的错误处理和调试信息"

echo ""
echo "4. 使用说明："
echo "1. 确保 .env.local 中有真实的 Gemini API Key"
echo "2. 重启开发服务器: npm run dev"
echo "3. 生成大纲"
echo "4. 上传音频文件（如'兔儿爷.MP3'）"
echo "5. 点击'开始分析'测试音频分析功能"

echo ""
echo "5. 预期控制台输出："
echo "=== Runtime Gemini Initialization ==="
echo "API Key exists: true"
echo "API Key length: 39"
echo "=== Starting Client-Side Analysis for 兔儿爷.MP3 ==="
echo "✅ Runtime analysis completed successfully"
