import fs from 'node:fs/promises';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';

/**
 * 从本地 XML / CSV 文件或文件夹提取所有链接
 * @param localPath XML/CSV 文件路径或包含多个文件的文件夹路径
 * @returns 所有提取到的链接数组
 */
export async function extractLocalSitemapLinks(localPath: string): Promise<string[]> {
  try {
    const absolutePath = path.resolve(localPath);
    const stat = await fs.stat(absolutePath);

    const files: string[] = [];

    if (stat.isFile()) {
      files.push(absolutePath);
    }
    else if (stat.isDirectory()) {
      const entries = await fs.readdir(absolutePath, { withFileTypes: true });
      for (const entry of entries) {
        if (
          entry.isFile()
          && (entry.name.endsWith('.xml') || entry.name.endsWith('.csv'))
        ) {
          files.push(path.join(absolutePath, entry.name));
        }
      }
    }
    else {
      throw new Error('提供的路径既不是文件也不是目录');
    }

    console.log(`读取到 ${files.length} 个 XML/CSV 文件`);

    const parser = new XMLParser();
    const allLinks: string[] = [];

    for (const file of files) {
      try {
        console.log(`正在解析文件: ${file}`);
        const content = await fs.readFile(file, 'utf-8');

        if (file.endsWith('.xml')) {
          const parsed = parser.parse(content);
          const urls = parsed?.urlset?.url ?? [];
          const links = Array.isArray(urls)
            ? urls.map((item: any) => item.loc).filter((loc: string) => typeof loc === 'string')
            : typeof urls.loc === 'string'
              ? [urls.loc]
              : [];
          console.log(`从文件 ${file} 提取到 ${links.length} 个 XML 链接`);
          allLinks.push(...links);
        }
        else if (file.endsWith('.csv')) {
          const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);

          // 自动判断是用逗号还是分号作为分隔符
          const delimiter = lines[0].includes(';') ? ';' : ',';

          const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
          const urlIndex = headers.indexOf('url');

          if (urlIndex === -1) {
            console.warn(`文件 ${file} 中未找到 "url" 表头，跳过`);
            continue;
          }

          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
            if (cols[urlIndex]) {
              allLinks.push(cols[urlIndex]);
            }
          }

          if (urlIndex === -1) {
            console.warn(`文件 ${file} 中未找到 "url" 表头，跳过`);
            continue;
          }

          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',');
            if (cols[urlIndex]) {
              allLinks.push(cols[urlIndex].trim());
            }
          }

          console.log(`从文件 ${file} 提取到 ${lines.length - 1} 个 CSV 链接`);
        }
      }
      catch (err: any) {
        console.warn(`跳过文件 ${file}，解析失败：`, err.message);
      }
    }

    console.log(`总共提取到 ${allLinks.length} 个链接`);
    return allLinks;
  }
  catch (error: any) {
    console.error(`读取 sitemap 失败：${localPath}`, error.message);
    return [];
  }
}
