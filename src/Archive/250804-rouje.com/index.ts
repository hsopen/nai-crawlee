import { Dataset, log } from 'crawlee';
import { extractLocalSitemapLinks } from '../../utils/readLocalSitemap.js';
import { renameMoveCsv } from '../../utils/renameMoveCsv.js';
import { completeAndRunNext } from '../../utils/runNextTask.js';
import crawler from './ruler.js';

(async () => {
  const sites = await extractLocalSitemapLinks('./src/tasks/250804-rouje.com/sitemap_products_1.xml');

  const INCLUDE_KEYWORD = '';
  const EXCLUDE_KEYWORD = '';

  const filteredSites = sites.filter((url) => {
    // 类型校验 + 必须以 http/https 开头
    const isValidUrl = typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));
    if (!isValidUrl)
      return false;
    // 包含关键字（可为空）判断
    const includePass = !INCLUDE_KEYWORD || url.includes(INCLUDE_KEYWORD);
    // 排除关键字（可为空）判断
    const excludePass = !EXCLUDE_KEYWORD || !url.includes(EXCLUDE_KEYWORD);
    return includePass && excludePass;
  });
  const siteNum = filteredSites.length;
  log.info(`获取了 ${siteNum} 个符合条件的链接`);
  await crawler.run(filteredSites);
  const dataset = await Dataset.open('rouje.com');
  await dataset.exportToCSV('default');
  renameMoveCsv('rouje.com');
  completeAndRunNext('250804-rouje.com');
})();
