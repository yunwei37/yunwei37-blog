#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
小说章节拆分脚本
功能：将小说文件按照每10章拆分成多个文件
"""

import re
import os

def split_novel_by_chapters(input_file, output_dir, chapters_per_file=10):
    """
    按章节数量拆分小说文件

    Args:
        input_file: 输入文件路径
        output_dir: 输出目录
        chapters_per_file: 每个文件包含的章节数
    """
    # 读取文件内容
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # 查找所有章节标记及其位置
    chapter_pattern = re.compile(r'^第\d+章.*$', re.MULTILINE)
    chapters = []

    for match in chapter_pattern.finditer(content):
        chapter_num_match = re.search(r'第(\d+)章', match.group())
        if chapter_num_match:
            chapter_num = int(chapter_num_match.group(1))
            chapters.append({
                'num': chapter_num,
                'title': match.group().strip(),
                'start_pos': match.start()
            })

    print(f"找到 {len(chapters)} 个章节")

    # 创建输出目录
    os.makedirs(output_dir, exist_ok=True)

    # 获取文件头部（第一章之前的内容，通常是简介等）
    if chapters:
        header = content[:chapters[0]['start_pos']]
    else:
        print("未找到章节标记！")
        return

    # 计算需要拆分的文件数量
    total_files = (len(chapters) + chapters_per_file - 1) // chapters_per_file
    print(f"将拆分为 {total_files} 个文件")

    # 拆分文件
    for file_idx in range(total_files):
        start_chapter_idx = file_idx * chapters_per_file
        end_chapter_idx = min((file_idx + 1) * chapters_per_file, len(chapters))

        # 获取起始和结束位置
        start_pos = chapters[start_chapter_idx]['start_pos']
        if end_chapter_idx < len(chapters):
            end_pos = chapters[end_chapter_idx]['start_pos']
        else:
            end_pos = len(content)

        # 提取内容（包含头部信息）
        file_content = header + content[start_pos:end_pos]

        # 生成输出文件名
        start_chapter = chapters[start_chapter_idx]['num']
        end_chapter = chapters[end_chapter_idx - 1]['num']
        output_filename = f"第{start_chapter:03d}-{end_chapter:03d}章.txt"
        output_path = os.path.join(output_dir, output_filename)

        # 写入文件
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(file_content)

        print(f"已生成: {output_filename} (章节 {start_chapter}-{end_chapter}, 共 {end_chapter_idx - start_chapter_idx} 章)")

    print(f"\n拆分完成！所有文件已保存到: {output_dir}")

if __name__ == "__main__":
    # 设置路径
    input_file = "/home/yunwei37/my-new-blog/data/docs/小说/改文/我的化身正在成为最终BOSS/原文-我的化身正在成为最终BOSS【番外二】.txt"
    output_dir = "/home/yunwei37/my-new-blog/data/docs/小说/改文/我的化身正在成为最终BOSS/拆分文件"

    # 执行拆分
    split_novel_by_chapters(input_file, output_dir, chapters_per_file=10)
