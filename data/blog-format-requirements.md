# scifi.mdx 格式修复要求

## 概述

对 `/home/yunwei37/my-new-blog/data/blog/scifi.mdx` 文件进行了格式修复，使其符合 `/home/yunwei37/my-new-blog/data/blog/setjmp.mdx` 的格式标准。

## 修改清单

### 1. 添加 Frontmatter

在文件开头添加了 YAML 格式的 frontmatter：

```yaml
---
title: '2020年代的科技突破、未来图景演变与科幻文学新母题'
date: 2026-01-22T00:00:00-08:00
tags: ['Science Fiction', 'Technology', 'Future']
---
```

### 2. 去除所有加粗标记

- 删除了所有 `**` 标记
- 保留了文本原有的强调内容，但移除了 markdown 加粗语法

### 3. 修复引用格式

- 统一了 URL 格式，去掉多余的文字内容
- 确保链接完整有效

### 4. 参考文献改为可点击列表

采用标准的 Markdown 链接列表格式：

```markdown
- [作者, 年份. 标题. 来源.](https://example-url)
- [作者, 年份. 标题. 来源.](https://example-url-2)
```

每条参考文献都是可点击的独立链接，无需在正文中添加引用标记（如 `[1]`）。

## 格式示例

### Frontmatter 示例

```yaml
---
title: '文章标题'
date: 2026-01-22T00:00:00-08:00
tags: ['Tag1', 'Tag2', 'Tag3']
---
```

### 参考文献示例

```markdown
参考文献

- Ferreira, B. (2025). The biggest scientific breakthroughs of the last 25 years—and a few to watch. National Geographic.
- Hu, K. (2023). ChatGPT sets record for fastest-growing user base. Reuters.
- Choi, C. Q. (2022). IBM Unveils 433-Qubit Osprey Chip. IEEE Spectrum.
```

## 完成状态

所有修改已完成，文件格式已与 setjmp.mdx 保持一致。
