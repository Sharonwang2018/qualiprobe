import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, PageBreak, TabStopType, TabStopPosition, convertInchesToTwip } from 'docx';
import { saveAs } from 'file-saver';

interface Section {
  id?: number;
  title: string;
  duration: string;
  questions: string[];
  notes: string;
  discussionTask?: string;
  consensusChallengeTask?: string;
  behavioralEvidenceTask?: string;
  probingQuestion?: string;
  isCore?: boolean;
}

interface OutlineData {
  project_title: string;
  sections: Section[];
}

export interface ExportOptions {
  targetAudience?: string;
  researchPurpose?: string;
  interviewType?: string;
  totalDuration?: string;
}

export const exportToWord = async (data: OutlineData, options?: ExportOptions) => {
  const outlineData = data;
  const targetAudience = options?.targetAudience || "目标用户群体";
  const researchPurpose = options?.researchPurpose || "深入了解用户需求和体验";
  const interviewTypeLabel = options?.interviewType === "FGD" ? "焦点小组 (FGD)" : "深度访谈 (IDI)";
  const totalDuration = options?.totalDuration || "60";

  // 生成免责声明
  const disclaimer = `免责声明：本访谈大纲仅供研究参考使用。访谈中收集的所有个人信息将严格保密，仅用于研究目的。访谈内容将在匿名化后进行分析和报告。`;

  // 生成暖场话术
  const warmUpScript = [
    "欢迎与感谢：非常感谢您抽出宝贵时间参与本次访谈。",
    "自我介绍：我是今天的访谈员[姓名]，来自[公司名称]。",
    "研究目的说明：我们希望通过今天的交流，深入了解您的真实体验和想法。",
    "保密承诺：您的所有回答都将严格保密，仅用于研究目的，报告中不会出现您的个人信息。",
    "录音说明：为了确保信息准确性，我将对访谈进行录音，您是否同意？",
    "开场提问：让我们从您最初接触相关话题的经历开始聊起。"
  ];

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
          // H1 文档标题
          new Paragraph({
            children: [
              new TextRun({
                text: outlineData.project_title,
                bold: true,
                size: 28,
                color: "1a365d",
                font: { name: "Microsoft YaHei" },
              }),
            ],
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 480 },
          }),

          // H2 项目基本信息 (标准模块)
          new Paragraph({
            children: [
              new TextRun({
                text: "项目基本信息",
                bold: true,
                size: 24,
                color: "2c5282",
                font: { name: "Microsoft YaHei" },
              }),
            ],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 320, after: 160 },
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
                text: targetAudience,
                size: 22,
                color: "434343",
                font: { name: "Microsoft YaHei" },
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
                text: researchPurpose,
                size: 22,
                color: "434343",
                font: { name: "Microsoft YaHei" },
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
                text: interviewTypeLabel,
                size: 22,
                color: "434343",
                font: { name: "Microsoft YaHei" },
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
                text: `${totalDuration} 分钟`,
                size: 22,
                color: "434343",
                font: { name: "Microsoft YaHei" },
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

          // H2 免责声明 (标准模块)
          new Paragraph({
            children: [
              new TextRun({
                text: "免责声明与隐私条款",
                bold: true,
                size: 24,
                color: "c53030",
                font: { name: "Microsoft YaHei" },
              }),
            ],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 160 },
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

          // H2 标准暖场/破冰话术 (标准模块)
          new Paragraph({
            children: [
              new TextRun({
                text: "标准暖场/破冰话术",
                bold: true,
                size: 24,
                color: "276749",
                font: { name: "Microsoft YaHei" },
              }),
            ],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 160 },
          }),

          // 暖场话术内容 - 每个要点一个段落
          ...warmUpScript.map((point, index) => (
            new Paragraph({
              children: [
                new TextRun({
                  text: `• ${point}`,
                  size: 22, // 11pt
                  color: "434343",
                  font: {
                    name: "Microsoft YaHei",
                  },
                }),
              ],
              spacing: { before: 80, after: 160 },
              indent: { left: 360 },
              shading: { type: "solid", color: "E8F5E8" },
            })
          )),

          // H2 详细访谈大纲
          new Paragraph({
            children: [
              new TextRun({
                text: "详细访谈大纲",
                bold: true,
                size: 24,
                color: "2c5282",
                font: { name: "Microsoft YaHei" },
              }),
            ],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 480, after: 320 },
          }),

          // 各个环节 (H3)
          ...outlineData.sections.map((section, index) => {
            const isCore = section.isCore === true;
            return [
            new Paragraph({
              children: [
                new TextRun({
                  text: isCore ? "◆ 核心 " : "● ",
                  bold: true,
                  size: isCore ? 32 : 28,
                  color: isCore ? "2b6cb0" : "4a5568",
                  font: { name: "Microsoft YaHei" },
                }),
                new TextRun({
                  text: `环节 ${section.id || index + 1}: ${section.title}`,
                  bold: true,
                  size: isCore ? 28 : 24,
                  color: isCore ? "1a365d" : "2C3E50",
                  font: { name: "Microsoft YaHei" },
                }),
                new TextRun({
                  text: ` (${section.duration})`,
                  bold: true,
                  size: 22,
                  color: "718096",
                  font: { name: "Microsoft YaHei" },
                }),
              ],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: isCore ? 400 : 320, after: 200 },
              shading: {
                type: "solid",
                color: isCore ? "EBF8FF" : "F7FAFC",
              },
              border: {
                bottom: { color: isCore ? "2b6cb0" : "E2E8F0", size: isCore ? 2 : 1, style: BorderStyle.SINGLE },
              },
            }),

            // [讨论任务] FGD 环节任务（如有）
            ...(section.discussionTask ? [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "讨论任务：",
                    bold: true,
                    size: 22,
                    color: "27AE60",
                    font: { name: "Microsoft YaHei" },
                  }),
                ],
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: section.discussionTask,
                    size: 22,
                    color: "2C3E50",
                    font: { name: "Microsoft YaHei" },
                  }),
                ],
                spacing: { after: 200 },
                indent: { left: convertInchesToTwip(0.2) },
                shading: { type: "solid", color: "E8F5E9" },
              }),
            ] : []),

            // [共识挑战任务] FGD 环节2 强制（如有）
            ...(section.consensusChallengeTask ? [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "共识挑战任务：",
                    bold: true,
                    size: 22,
                    color: "C53030",
                    font: { name: "Microsoft YaHei" },
                  }),
                ],
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: section.consensusChallengeTask,
                    size: 22,
                    color: "2C3E50",
                    font: { name: "Microsoft YaHei" },
                  }),
                ],
                spacing: { after: 200 },
                indent: { left: convertInchesToTwip(0.2) },
                shading: { type: "solid", color: "FFF5F5" },
              }),
            ] : []),

            // [证物展示] Show & Tell 行为证据（如有）
            ...(section.behavioralEvidenceTask ? [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "证物展示 (Show & Tell)：",
                    bold: true,
                    size: 22,
                    color: "2B6CB0",
                    font: { name: "Microsoft YaHei" },
                  }),
                ],
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: section.behavioralEvidenceTask,
                    size: 22,
                    color: "2C3E50",
                    font: { name: "Microsoft YaHei" },
                  }),
                ],
                spacing: { after: 200 },
                indent: { left: convertInchesToTwip(0.2) },
                shading: { type: "solid", color: "EBF8FF" },
              }),
            ] : []),

            // 研究问题
            new Paragraph({
              children: [
                new TextRun({
                  text: "研究问题：",
                  bold: true,
                  size: 22,
                  color: "34495E",
                  font: { name: "Microsoft YaHei" },
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
                spacing: { before: 60, after: 140 },
                indent: { left: convertInchesToTwip(0.25) },
              });
            }),

            // [深度追问] 追问梯子（如有）
            ...(section.probingQuestion ? (() => {
              const probes = section.probingQuestion.split(/\n+/).filter(Boolean);
              return [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "深度追问（追问梯子）：",
                      bold: true,
                      size: 22,
                      color: "8E44AD",
                      font: { name: "Microsoft YaHei" },
                    }),
                  ],
                  spacing: { before: 200, after: 100 },
                }),
                ...probes.map((probe, i) =>
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `追问 ${i + 1}: `,
                        bold: true,
                        size: 22,
                        color: "3498DB",
                        font: { name: "Microsoft YaHei" },
                      }),
                      new TextRun({
                        text: probe.trim(),
                        size: 22,
                        italics: true,
                        color: "555555",
                        font: { name: "Microsoft YaHei" },
                      }),
                    ],
                    spacing: { before: 60, after: 120 },
                    indent: { left: convertInchesToTwip(0.25) },
                    shading: { type: "solid", color: "EBF5FB" },
                  })
                ),
              ];
            })() : []),

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
              spacing: { before: 80, after: 400 },
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
          ];
          }).flat(),

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
