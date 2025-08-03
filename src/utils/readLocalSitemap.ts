import fs from 'node:fs/promises';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';

/**
 * 从本地 XML 文件或文件夹提取所有 < loc > 链接
 * @param localPath XML 文件路径或包含多个 XML 文件的文件夹路径
 * @returns 所有提取到的链接数组
 */
export async function extractLocalSitemapLinks(localPath: string): Promise<string[]> {
  try {
    const absolutePath = path.resolve(localPath);
    const stat = await fs.stat(absolutePath);

    const xmlFiles: string[] = [];

    if (stat.isFile()) {
      // 如果是单个文件，直接推入 xmlFiles 数组
      xmlFiles.push(absolutePath);
    }
    else if (stat.isDirectory()) {
      // 如果是文件夹，读取所有 .xml 文件
      const entries = await fs.readdir(absolutePath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.xml')) {
          xmlFiles.push(path.join(absolutePath, entry.name));
        }
      }
    }
    else {
      throw new Error('提供的路径既不是文件也不是目录');
    }

    console.log(`读取到 ${xmlFiles.length} 个 XML 文件`); // 查看读取到的文件数量

    const parser = new XMLParser();
    const allLinks: string[] = [];

    for (const file of xmlFiles) {
      try {
        console.log(`正在解析文件: ${file}`); // 增加日志输出解析文件

        const xmlContent = await fs.readFile(file, 'utf-8');
        const parsed = parser.parse(xmlContent);

        const urls = parsed?.urlset?.url ?? [];
        const links = Array.isArray(urls)
          ? urls.map((item: any) => item.loc).filter((loc: string) => typeof loc === 'string')
          : typeof urls.loc === 'string'
            ? [urls.loc]
            : [];

        console.log(`从文件 ${file} 提取到 ${links.length} 个链接`); // 输出每个文件提取到的链接数量
        allLinks.push(...links);
      }
      catch (err: any) {
        console.warn(`跳过文件 ${file}，解析失败：`, err.message);
      }
    }

    console.log(`总共提取到 ${allLinks.length} 个链接`); // 输出合并后的链接数量
    return allLinks;
  }
  catch (error: any) {
    console.error(`读取 sitemap 失败：${localPath}`, error.message);
    return [];
  }
}
