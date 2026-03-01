import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, PageBreak, TabStopType, TabStopPosition, convertInchesToTwip } from 'docx';
import { saveAs } from 'file-saver';

interface Section {
  id?: number;
  title: string;
  duration: string;
  questions: string[];
  notes: string;
}

interface OutlineData {
  project_title: string;
  sections: Section[];
}

interface ExportData {
  outlineData: OutlineData;
  interviewType: string;
  totalDuration: number;
  researchTopic: string;
  targetAudience: string;
  researchPurpose: string;
}

export const exportToWord = async (data: OutlineData) => {
  const outlineData = data;

  // 生成免责声明
  const disclaimer = `免责声明：本访谈大纲仅供研究参考使用。访谈中收集的所有个人信息将严格保密，仅用于研究目的。访谈内容将在匿名化后进行分析和报告。`;

  // 生成暖场话术
  const warmUpScript = `暖场话术：
1. 欢迎与感谢：非常感谢您抽出宝贵时间参与本次访谈。
2. 自我介绍：我是今天的访谈员[姓名]，来自[公司名称]。
3. 研究目的说明：我们希望通过今天的交流，深入了解您的真实体验和想法。
4. 保密承诺：您的所有回答都将严格保密，仅用于研究目的，报告中不会出现您的个人信息。
5. 录音说明：为了确保信息准确性，我将对访谈进行录音，您是否同意？
6. 开场提问：让我们从您最初接触相关话题的经历开始聊起。`;

  // 生成文档内容
  const doc = new Document({
    features: {
      updateFields: true, // 强制开启'打开时更新'
    },
    sections: [
      {
        properties: {
          page: {
            // 设置页边距：上下 2.54cm，左右 3.18cm
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.25),
              right: convertInchesToTwip(1.25),
            },
            // 页码设置
            pageNumbers: {
              start: 1,
              formatType: "decimal",
            },
          },
        },
        children: [
          // 文档标题
          new Paragraph({
            children: [
              new TextRun({
                text: outlineData.project_title,
                bold: true,
                size: 22, // 11pt * 2 = 22
                color: "2E74B5", // 深蓝色
                font: {
                  name: "Microsoft YaHei",
                },
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 600 },
          }),

          // 项目基本信息表格
          new Paragraph({
            children: [
              new TextRun({
                text: "项目基本信息",
                bold: true,
                size: 24, // 12pt
                color: "434343",
                font: {
                  name: "Microsoft YaHei",
                },
              }),
            ],
            spacing: { before: 200, after: 120 },
          }),

          // 使用表格布局项目信息
          new Paragraph({
            children: [
              new TextRun({
                text: "研究主题：",
                bold: true,
                size: 22, // 11pt
                color: "2C3E50",
                font: {
                  name: "Microsoft YaHei",
                },
              }),
              new TextRun({
                text: outlineData.project_title,
                size: 22, // 11pt
                color: "434343",
                font: {
                  name: "Microsoft YaHei",
                },
              }),
            ],
            spacing: { after: 100 },
            border: {
              bottom: {
                color: "E0E0E0",
                size: 1,
                style: BorderStyle.SINGLE,
              },
            },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: "目标人群：",
                bold: true,
                size: 22, // 11pt
                color: "2C3E50",
                font: {
                  name: "Microsoft YaHei",
                },
              }),
              new TextRun({
                text: "目标用户群体",
                size: 22, // 11pt
                color: "434343",
                font: {
                  name: "Microsoft YaHei",
                },
              }),
            ],
            spacing: { after: 100 },
            border: {
              bottom: {
                color: "E0E0E0",
                size: 1,
                style: BorderStyle.SINGLE,
              },
            },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: "研究目的：",
                bold: true,
                size: 22, // 11pt
                color: "2C3E50",
                font: {
                  name: "Microsoft YaHei",
                },
              }),
              new TextRun({
                text: "深入了解用户需求和体验",
                size: 22, // 11pt
                color: "434343",
                font: {
                  name: "Microsoft YaHei",
                },
              }),
            ],
            spacing: { after: 100 },
            border: {
              bottom: {
                color: "E0E0E0",
                size: 1,
                style: BorderStyle.SINGLE,
              },
            },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: "访谈形式：",
                bold: true,
                size: 22, // 11pt
                color: "2C3E50",
                font: {
                  name: "Microsoft YaHei",
                },
              }),
              new TextRun({
                text: "深度访谈 (IDI)",
                size: 22, // 11pt
                color: "434343",
                font: {
                  name: "Microsoft YaHei",
                },
              }),
            ],
            spacing: { after: 100 },
            border: {
              bottom: {
                color: "E0E0E0",
                size: 1,
                style: BorderStyle.SINGLE,
              },
            },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: "预计总时长：",
                bold: true,
                size: 22, // 11pt
                color: "2C3E50",
                font: {
                  name: "Microsoft YaHei",
                },
              }),
              new TextRun({
                text: "60 分钟",
                size: 22, // 11pt
                color: "434343",
                font: {
                  name: "Microsoft YaHei",
                },
              }),
            ],
            spacing: { after: 320 },
            border: {
              bottom: {
                color: "E0E0E0",
                size: 1,
                style: BorderStyle.SINGLE,
              },
            },
          }),

          // 免责声明
          new Paragraph({
            children: [
              new TextRun({
                text: "■ ",
                bold: true,
                size: 24, // 12pt
                color: "E74C3C",
                font: {
                  name: "Microsoft YaHei",
                },
              }),
              new TextRun({
                text: "免责声明与隐私条款",
                bold: true,
                size: 24, // 12pt
                color: "E74C3C",
                font: {
                  name: "Microsoft YaHei",
                },
              }),
            ],
            spacing: { before: 320, after: 150 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: disclaimer,
                italics: true,
                size: 22, // 11pt
                color: "666666",
                font: {
                  name: "Microsoft YaHei",
                },
              }),
            ],
            spacing: { after: 420 },
            shading: {
              type: "solid",
              color: "FFF9E6", // 淡黄色背景
            },
          }),

          // 暖场话术
          new Paragraph({
            children: [
              new TextRun({
                text: "■ ",
                bold: true,
                size: 24, // 12pt
                color: "27AE60",
                font: {
                  name: "Microsoft YaHei",
                },
              }),
              new TextRun({
                text: "暖场话术",
                bold: true,
                size: 24, // 12pt
                color: "27AE60",
                font: {
                  name: "Microsoft YaHei",
                },
              }),
            ],
            spacing: { before: 320, after: 150 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: warmUpScript,
                size: 22, // 11pt
                color: "434343",
                font: {
                  name: "Microsoft YaHei",
                },
              }),
            ],
            spacing: { after: 420 },
            shading: {
              type: "solid",
              color: "E8F5E8", // 淡绿色背景
            },
          }),

          // 访谈大纲标题
          new Paragraph({
            children: [
              new TextRun({
                text: "■ ",
                bold: true,
                size: 24, // 12pt
                color: "2E74B5",
                font: {
                  name: "Microsoft YaHei",
                },
              }),
              new TextRun({
                text: "详细访谈大纲",
                bold: true,
                size: 24, // 12pt
                color: "2E74B5",
                font: {
                  name: "Microsoft YaHei",
                },
              }),
            ],
            spacing: { before: 420, after: 320 },
          }),

          // 各个环节
          ...outlineData.sections.map((section, index) => [
            // 环节标题
            new Paragraph({
              children: [
                new TextRun({
                  text: "■ ",
                  bold: true,
                  size: 32, // 16pt
                  color: "2E74B5",
                  font: {
                    name: "Microsoft YaHei",
                  },
                }),
                new TextRun({
                  text: `环节 ${section.id || index + 1}: ${section.title}`,
                  bold: true,
                  size: 32, // 16pt
                  color: "2C3E50",
                  font: {
                    name: "Microsoft YaHei",
                  },
                }),
                new TextRun({
                  text: ` (${section.duration})`,
                  bold: true,
                  size: 28, // 14pt，略小但仍然加粗
                  color: "7F8C8D", // 灰色
                  font: {
                    name: "Microsoft YaHei",
                  },
                }),
              ],
              spacing: { before: 400, after: 200 },
              shading: {
                type: "solid",
                color: "F2F2F2", // 更浅的灰色背景，提高文字对比度
              },
              border: {
                bottom: {
                  color: "E8E8E8",
                  size: 2,
                  style: BorderStyle.SINGLE,
                },
              },
            }),

            // 研究问题标题
            new Paragraph({
              children: [
                new TextRun({
                  text: "研究问题：",
                  bold: true,
                  size: 22, // 11pt
                  color: "34495E",
                  font: {
                    name: "Microsoft YaHei",
                  },
                }),
              ],
              spacing: { before: 200, after: 100 },
            }),

            // 问题列表
            ...section.questions.map((question, qIndex) => {
              // 判断是否为深挖追问（包含"为什么"、"如何"、"请描述"等关键词）
              const isProbing = question.includes("为什么") || question.includes("如何") || 
                               question.includes("请描述") || question.includes("具体") ||
                               question.includes("如果") || question.includes("设想");

              return new Paragraph({
                children: [
                  new TextRun({ 
                    text: isProbing ? "💡 " : "• ", 
                    bold: true,
                    size: 22, // 11pt
                    color: isProbing ? "3498DB" : "34495E",
                    font: {
                      name: "Microsoft YaHei",
                    },
                  }),
                  new TextRun({ 
                    text: question, 
                    size: 22, // 11pt
                    italics: isProbing,
                    color: isProbing ? "666666" : "434343",
                    font: {
                      name: "Microsoft YaHei",
                    },
                  }),
                ],
                spacing: { after: 100 },
                indent: { left: convertInchesToTwip(0.2) }, // 0.5厘米缩进
              });
            }),

            // 备注说明
            new Paragraph({
              children: [
                new TextRun({
                  text: "备注说明：",
                  bold: true,
                  size: 22, // 11pt
                  color: "8E44AD",
                  font: {
                    name: "Microsoft YaHei",
                  },
                }),
              ],
              spacing: { before: 200, after: 100 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: section.notes,
                  italics: true,
                  size: 22, // 11pt
                  color: "7F8C8D",
                  font: {
                    name: "Microsoft YaHei",
                  },
                }),
              ],
              spacing: { after: 480 }, // 24pt 下间距，让文档有呼吸感
              indent: { left: convertInchesToTwip(0.1) },
              shading: {
                type: "solid",
                color: "F8F9FA", // 更淡的灰色背景
              },
              border: {
                left: {
                  color: "DEE2E6",
                  size: 3,
                  style: BorderStyle.SINGLE,
                },
              },
            }),
          ]).flat(),

          // 结束语
          new Paragraph({
            children: [
              new TextRun({
                text: "■ ",
                bold: true,
                size: 24, // 12pt
                color: "2E74B5",
                font: {
                  name: "Microsoft YaHei",
                },
              }),
              new TextRun({
                text: "访谈结束",
                bold: true,
                size: 24, // 12pt
                color: "2E74B5",
                font: {
                  name: "Microsoft YaHei",
                },
              }),
            ],
            spacing: { before: 420, after: 200 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: "感谢您的时间分享，您的观点对我们的研究非常有价值。如果还有其他想法，欢迎随时补充。祝您生活愉快！",
                size: 22, // 11pt
                color: "434343",
                font: {
                  name: "Microsoft YaHei",
                },
              }),
            ],
            spacing: { after: 400 },
          }),

          // 文档结束标识
          new Paragraph({
            children: [
              new TextRun({
                text: "-- 访谈指南结束 --",
                size: 20, // 10pt
                color: "999999",
                italics: true,
                font: {
                  name: "Microsoft YaHei",
                },
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 600, after: 400 },
          }),
        ],
      },
    ],
  });

  // 生成并下载文档
  const buffer = await Packer.toBuffer(doc);
  const fileName = `${outlineData.project_title}_访谈大纲.docx`;
  saveAs(new Blob([buffer as unknown as BlobPart]), fileName);
};
