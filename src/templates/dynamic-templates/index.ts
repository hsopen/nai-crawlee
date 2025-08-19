import { Dataset, log } from 'crawlee';
import { extractLocalSitemapLinks } from '../../utils/readLocalSitemap.js';
import { renameMoveCsv } from '../../utils/renameMoveCsv.js';
import { completeAndRunNext } from '../../utils/runNextTask.js';
import { crawler } from './ruler.js';

(async () => {
  const sites = await extractLocalSitemapLinks('./');

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
  // 固定顺序打乱数组（种子洗牌）
  function shuffleFixed<T>(arr: T[], seed = 42): T[] {
    const m = 2 ** 32;
    const a = 1664525;
    const c = 1013904223;
    let s = seed;
    const rand = () => (s = (a * s + c) % m) / m;
    const result = arr.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  const shuffledSites = shuffleFixed(filteredSites);
  const siteNum = shuffledSites.length;
  log.info(`获取了 ${siteNum} 个符合条件的链接`);
  await crawler.run(shuffledSites);
  const dataset = await Dataset.open('tasks_id');
  await dataset.exportToCSV('default');
  renameMoveCsv('tasks_id');
  completeAndRunNext('time_task_id');
})();
