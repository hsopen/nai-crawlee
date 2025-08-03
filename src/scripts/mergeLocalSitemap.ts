import { XMLParser, XMLBuilder } from "fast-xml-parser";
import path from "node:path";
import fs from "node:fs";
import { Command } from "commander";

const program = new Command();

program
    .name('mergeSitemap')
    .description('合并本地目录中所有 sitemap.xml 文件，并输出到该目录下的 merged_sitemap/sitemap.xml')
    .version('0.0.1')
    .option('-l, --local <path>', '本地目录路径，递归查找 sitemap.xml 文件')
    .option('-i, --include <patterns>', '顺序包含的关键字（逗号分隔，依次过滤）')
    .option('-e, --exclude <patterns>', '顺序排除的关键字（逗号分隔，依次过滤）')
    .parse(process.argv);

const opts = program.opts();

if (!opts.local) {
    console.error('❌ 请通过 -l 或 --local 指定本地目录路径');
    process.exit(1);
}

const rootPath = path.isAbsolute(opts.local) ? opts.local : path.resolve(opts.local);

if (!fs.existsSync(rootPath) || !fs.statSync(rootPath).isDirectory()) {
    console.error(`❌ 路径无效或不是目录: ${rootPath}`);
    process.exit(1);
}

/**
 * 解析关键字字符串为字符串数组
 * @param patterns 输入字符串，多个关键字使用逗号或空格分隔
 * @returns 去除空项后的关键字数组
 */
function parsePatterns(patterns?: string): string[] {
    if (!patterns) return [];
    return patterns.split(',')
        .flatMap(part => part.split(/\s+/))
        .map(p => p.trim())
        .filter(p => p.length > 0);
}

const includePatterns = parsePatterns(opts.include);
const excludePatterns = parsePatterns(opts.exclude);

/**
 * 顺序过滤 URL：包含模式时逐步保留匹配的，排除模式时逐步剔除匹配的
 * @param urls 待过滤的 URL 列表
 * @param patterns 关键字列表
 * @param isInclude true 表示包含过滤；false 表示排除过滤
 * @returns 过滤后的 URL 列表
 */
function sequentialFilter(urls: string[], patterns: string[], isInclude: boolean): string[] {
    let result = [...urls];
    for (const pattern of patterns) {
        result = result.filter(url =>
            isInclude ? url.includes(pattern) : !url.includes(pattern)
        );
        if (result.length === 0) break;
    }
    return result;
}

/**
 * 递归查找指定目录下所有 sitemap.xml 文件
 * @param dir 根目录路径
 * @returns 所有匹配 sitemap 文件的完整路径数组
 */
function findAllSitemapFiles(dir: string): string[] {
    const results: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...findAllSitemapFiles(fullPath));
        } else if (
            entry.isFile() &&
            entry.name.toLowerCase().includes('sitemap') &&
            entry.name.endsWith('.xml')
        ) {
            results.push(fullPath);
        }
    }

    return results;
}

/**
 * 从 sitemap.xml 文件中提取所有 <loc> 标签的内容
 * @param filePath sitemap 文件路径
 * @returns 所有提取出的 URL（字符串形式）
 */
function extractLocsFromXml(filePath: string): string[] {
    const xml = fs.readFileSync(filePath, 'utf-8');
    const parser = new XMLParser({ ignoreAttributes: false });

    const json = parser.parse(xml);
    const urls = json.urlset?.url || [];
    const locs: string[] = [];

    if (Array.isArray(urls)) {
        for (const item of urls) {
            if (item.loc) locs.push(item.loc);
        }
    } else if (urls?.loc) {
        locs.push(urls.loc);
    }

    return locs;
}

/**
 * 对 URL 列表进行包含/排除关键字过滤
 * @param urls 原始 URL 列表
 * @returns 过滤后的 URL 列表
 */
function filterUrls(urls: string[]): string[] {
    let result = [...urls];

    if (includePatterns.length > 0) {
        result = sequentialFilter(result, includePatterns, true);
    }

    if (excludePatterns.length > 0) {
        result = sequentialFilter(result, excludePatterns, false);
    }

    return result;
}

/**
 * 构建合并后的 sitemap.xml 字符串
 * @param locs 所有最终保留的 URL 列表
 * @returns XML 格式字符串
 */
function buildMergedXml(locs: string[]): string {
    const builder = new XMLBuilder({
        format: true,
        ignoreAttributes: false,
        suppressEmptyNode: true,
        attributeNamePrefix: '@_'
    });

    const xmlObj = {
        '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
        urlset: {
            '@_xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
            url: locs.map(loc => ({ loc }))
        }
    };

    return builder.build(xmlObj);
}

/**
 * 主逻辑函数：执行本地 sitemap 文件合并
 * @param baseDir 指定的本地根目录路径
 */
function mergeLocalSitemap(baseDir: string) {
    const allSitemaps = findAllSitemapFiles(baseDir);
    console.log(`📦 找到 ${allSitemaps.length} 个 sitemap.xml 文件`);

    let allLocs: string[] = [];
    for (const file of allSitemaps) {
        const locs = extractLocsFromXml(file);
        allLocs.push(...locs);
    }

    console.log(`🔗 共找到 ${allLocs.length} 个 URL`);

    // 去重处理
    const uniqueLocs = [...new Set(allLocs)];
    const duplicateCount = allLocs.length - uniqueLocs.length;
    if (duplicateCount > 0) {
        console.log(`♻️ 移除了 ${duplicateCount} 个重复URL`);
    }

    if (includePatterns.length > 0) {
        console.log(`🔍 顺序包含: ${includePatterns.join(' → ')}`);
    } else {
        console.log('🔍 无包含条件');
    }

    if (excludePatterns.length > 0) {
        console.log(`🚫 顺序排除: ${excludePatterns.join(' → ')}`);
    } else {
        console.log('🚫 无排除条件');
    }

    const originalCount = uniqueLocs.length;
    const filteredLocs = filterUrls(uniqueLocs);
    const filteredCount = originalCount - filteredLocs.length;

    if (filteredLocs.length === 0) {
        console.error('\n❌ 错误：过滤后没有符合条件的URL');
        console.error('请检查包含/排除关键字设置。');
        process.exit(1);
    }

    console.log(`\n✅ 最终保留 ${filteredLocs.length} 个URL (过滤掉 ${filteredCount} 个)`);
    console.log('📍 示例前 5 个链接：');
    console.log(filteredLocs.slice(0, 5).join('\n'));

    const outputDir = path.join(baseDir, 'merged_sitemap');
    const outputFile = path.join(outputDir, 'sitemap.xml');
    fs.mkdirSync(outputDir, { recursive: true });

    const mergedXml = buildMergedXml(filteredLocs);
    fs.writeFileSync(outputFile, mergedXml, 'utf-8');

    console.log(`\n💾 合并后的 sitemap.xml 已保存到：${outputFile}`);
}

// 执行主程序
mergeLocalSitemap(rootPath);
