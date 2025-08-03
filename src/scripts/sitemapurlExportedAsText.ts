import path from "node:path";
import fs from "node:fs";
import { Command } from "commander";
import { XMLParser } from "fast-xml-parser";

const program = new Command();

program
    .name('exportXmlLinks')
    .description('导出XML文件中的所有链接到同目录的TXT文件')
    .version('0.0.1')
    .requiredOption('-p, --path <file>', '要处理的XML文件路径')
    .parse(process.argv);

const opts = program.opts();

// 处理文件路径（相对路径转绝对路径）
const inputPath = path.isAbsolute(opts.path) ? opts.path : path.resolve(opts.path);

// 验证文件是否存在且是XML文件
if (!fs.existsSync(inputPath)) {
    console.error(`❌ 文件不存在: ${inputPath}`);
    process.exit(1);
}

if (path.extname(inputPath).toLowerCase() !== '.xml') {
    console.error(`❌ 文件不是XML格式: ${inputPath}`);
    process.exit(1);
}

/**
 * 从XML文件中提取所有链接
 * @param filePath XML文件路径
 */
function extractLinksFromXml(filePath: string): string[] {
    const xml = fs.readFileSync(filePath, 'utf-8');
    const parser = new XMLParser({ ignoreAttributes: false });
    const json = parser.parse(xml);

    const urls = json.urlset?.url || [];
    const links: string[] = [];

    if (Array.isArray(urls)) {
        for (const item of urls) {
            if (item.loc) links.push(item.loc);
        }
    } else if (urls?.loc) {
        links.push(urls.loc);
    }

    return links;
}

/**
 * 导出链接到TXT文件
 * @param filePath 原始XML文件路径
 * @param links 要导出的链接数组
 */
function exportLinksToTxt(filePath: string, links: string[]) {
    const dir = path.dirname(filePath);
    const baseName = path.basename(filePath, '.xml');
    const outputPath = path.join(dir, `${baseName}.txt`);

    const content = links.join('\n');
    fs.writeFileSync(outputPath, content, 'utf-8');

    return outputPath;
}

// 主流程
try {
    console.log(`📄 正在处理文件: ${inputPath}`);

    // 提取链接
    const links = extractLinksFromXml(inputPath);
    console.log(`🔗 找到 ${links.length} 个链接`);

    // 导出到TXT
    const outputPath = exportLinksToTxt(inputPath, links);
    console.log(`💾 链接已导出到: ${outputPath}`);

    // 显示示例
    if (links.length > 0) {
        console.log('\n📍 前5个链接示例:');
        console.log(links.slice(0, 5).join('\n'));
    }
} catch (error) {
    console.error('❌ 处理过程中出错:', error);
    process.exit(1);
}