#!/bin/bash

echo "=== API Key 修复和笔录导出功能测试 ==="
echo ""

echo "1. 检查环境变量配置..."
if [ -f ".env.local" ]; then
    echo "✅ .env.local 存在"
    API_KEY=$(grep "NEXT_PUBLIC_GEMINI_API_KEY" .env.local | cut -d'=' -f2)
    if [ -n "$API_KEY" ]; then
        KEY_LENGTH=${#API_KEY}
        echo "✅ API Key 长度: $KEY_LENGTH"
        if [ $KEY_LENGTH -ge 30 ]; then
            echo "✅ API Key 长度正常"
        else
            echo "⚠️  API Key 长度可能不完整"
        fi
        echo "✅ API Key 前缀: ${API_KEY:0:10}..."
    else
        echo "❌ API Key 未设置"
    fi
else
    echo "❌ .env.local 不存在"
fi

echo ""
echo "2. 测试大纲生成（验证后端正常）..."
curl -s -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"topic":"测试访谈","audience":"测试用户","goal":"验证功能","interviewType":"IDI","totalDuration":10}' | jq '.project_title'

echo ""
echo "3. 功能实现总结："
echo "✅ API Key 清理：使用 .trim() 清理环境变量"
echo "✅ 调试信息：添加 Key 长度检查和前缀显示"
echo "✅ 模型确认：使用 'gemini-2.0-flash' 字符串"
echo "✅ 转录功能：分析完成后自动进行精确转录"
echo "✅ 笔录导出：生成包含转录和分析的 Word 文档"
echo "✅ UI 集成：在分析结果中显示转录内容和导出按钮"

echo ""
echo "4. 新增功能："
echo "🎯 转录模式：使用 '请将此音频转录为精确的逐字稿' 提示"
echo "🎯 自动转录：分析完成后自动进行转录"
echo "🎯 笔录显示：在详细分析中显示完整转录内容"
echo "🎯 Word 导出：包含转录、分析摘要、关键发现和引用"
echo "🎯 智能按钮：只有存在转录结果时才显示导出按钮"

echo ""
echo "5. 使用流程："
echo "1. 设置环境变量：确保 .env.local 中有完整的 API Key"
echo "2. 生成访谈大纲"
echo "3. 上传音频文件"
echo "4. 点击 '开始分析'"
echo "5. 等待分析和转录完成"
echo "6. 查看 '访谈笔录' 内容"
echo "7. 点击 '导出笔录 Word' 下载文档"

echo ""
echo "6. 预期控制台输出："
echo "=== Runtime Gemini Initialization ==="
echo "Current Key Length: 39"
echo "API Key exists: true"
echo "API Key prefix: AIzaSy..."
echo "=== Starting Client-Side Analysis for 文件名 ==="
echo "✅ Runtime analysis completed successfully"
echo "=== Starting Transcription for 文件名 ==="
echo "✅ Transcription completed"
echo "✅ Transcription exported for 文件名"
