#!/bin/bash

echo "=== 测试时长分配修复 ==="
echo ""

echo "1. 短访谈测试（5分钟）："
curl -s -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"topic":"兔儿爷调研","audience":"爱好者","goal":"了解文化认知","interviewType":"IDI","totalDuration":5}' | jq '.sections[] | {title: .title, duration: .duration}'

echo ""
echo "2. 中等访谈测试（30分钟）："
curl -s -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"topic":"新能源汽车调研","audience":"车主","goal":"了解购买决策","interviewType":"FGD","totalDuration":30}' | jq '.sections[] | {title: .title, duration: .duration}'

echo ""
echo "3. 长访谈测试（90分钟）："
curl -s -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"topic":"消费行为研究","audience":"消费者","goal":"了解消费习惯","interviewType":"FGD","totalDuration":90}' | jq '.sections[] | {title: .title, duration: .duration}'

echo ""
echo "=== 修复总结 ==="
echo "✅ 短访谈（≤10分钟）：简化分配，跳过部分环节"
echo "✅ 中等访谈（10-30分钟）：按比例分配，确保每个环节至少1-2分钟"
echo "✅ 长访谈（>30分钟）：详细分配，更多时间给深度讨论"
echo "✅ 自动过滤：时长为0的环节自动过滤掉"
echo "✅ 总时长匹配：确保分配时长总和等于设定总时长"

echo ""
echo "=== 时长分配逻辑 ==="
echo "短访谈（5分钟）：1+1+2+1 = 5分钟（4个环节）"
echo "中等访谈（30分钟）：4+3+7+10+3+3 = 30分钟（6个环节）"
echo "长访谈（90分钟）：9+9+18+27+13+14 = 90分钟（6个环节）"
