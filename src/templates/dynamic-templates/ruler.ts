import process from 'node:process';
// import { launchOptions } from 'camoufox-js';
import { Configuration, log, PlaywrightCrawler, ProxyConfiguration } from 'crawlee';
// import { firefox } from 'playwright';
// 假设 errorReminder 函数已定义
import { errorReminder } from '../../utils/errorReminder.js';
import { productRequestHandler } from './productRequestHandler.js';

// 支持 Ctrl+C 退出
process.on('SIGINT', async () => {
  log.info('收到 Ctrl+C，正在关闭爬虫...');
  process.exit(1);
});

const proxyConfiguration = new ProxyConfiguration({ proxyUrls: ['http://127.0.0.1:8800'] });

const config = new Configuration({
  persistStorage: true,
  persistStateIntervalMillis: 30_000,
  purgeOnStart: false,
  defaultDatasetId: 'tasks_id',
  defaultKeyValueStoreId: 'tasks_id',
  defaultRequestQueueId: 'tasks_id',
});

// 错误记录缓存
const errorLogCache: { url: string; timestamp: number; message: string }[] = [];
const ERROR_THRESHOLD = 20; // 错误数阈值
const TIME_WINDOW = 3 * 60 * 1000; // 时间窗口，单位毫秒（3 分钟）

const crawler = new PlaywrightCrawler({
  // launchContext: {
  //   launcher: firefox,
  //   launchOptions: await launchOptions({
  //     headless: false,
  //   }),
  // },
  headless: false,
  maxRequestRetries: 3,
  maxConcurrency: 5,
  minConcurrency: 2,
  maxRequestsPerCrawl: 5,
  proxyConfiguration,
  browserPoolOptions: {
    useFingerprints: true,
  },
  postNavigationHooks: [
    async ({ handleCloudflareChallenge }) => {
      await handleCloudflareChallenge();
    },
  ],
  preNavigationHooks: [
    async ({ handleCloudflareChallenge }) => {
      await handleCloudflareChallenge();
    },
    // async ({ page }) => {
    //   await page.route('**/*', (route) => {
    //     return ['image', 'stylesheet', 'font'].includes(route.request().resourceType())
    //       ? route.abort()
    //       : route.continue();
    //   });
    // },
  ],
  requestHandler: productRequestHandler,

  async failedRequestHandler({ request, error }) {
    const now = Date.now();
    const message = (error as Error)?.message || '未知错误';

    const errorEntry = {
      url: request.url,
      timestamp: now,
      message,
    };

    errorLogCache.push(errorEntry);

    const recentErrors = errorLogCache.filter(e => now - e.timestamp <= TIME_WINDOW);
    errorLogCache.length = 0;
    errorLogCache.push(...recentErrors);

    log.error(`请求失败：${request.url}，错误信息：${message}`);

    if (recentErrors.length >= ERROR_THRESHOLD) {
      const taskName = '产品爬虫任务失败';
      const recent10Errors = recentErrors.slice(-10).map(e => `链接：${e.url}\n错误：${e.message}`);
      await errorReminder(taskName, recent10Errors);
      errorLogCache.length = 0;
    }
  },
}, config);

export { crawler };
