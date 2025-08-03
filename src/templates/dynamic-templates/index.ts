import { Dataset, log } from 'crawlee';
import { extractLocalSitemapLinks } from '../../utils/readLocalSitemap.js';
import { renameMoveCsv } from '../../utils/renameMoveCsv.js';
import { completeAndRunNext } from '../../utils/runNextTask.js';
import crawler from './ruler.js';

(async () => {
  const sites = await extractLocalSitemapLinks('./');
  const INCLUDE_KEYWORD = '';
  const EXCLUDE_KEYWORD = '';
  const filteredSites = sites.filter((url) => {
    const includePass = !INCLUDE_KEYWORD || url.includes(INCLUDE_KEYWORD);
    const excludePass = !EXCLUDE_KEYWORD || !url.includes(EXCLUDE_KEYWORD);
    return includePass && excludePass;
  });
  const siteNum = filteredSites.length;
  log.info(`获取了${siteNum}个符合条件的链接`);
  await crawler.run(filteredSites);
  await Dataset.exportToCSV('default');
  renameMoveCsv('tasks_id');
  completeAndRunNext('time_task_id');
})();
