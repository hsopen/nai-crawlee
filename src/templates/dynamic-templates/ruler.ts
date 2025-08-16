// import { launchOptions } from 'camoufox-js';
import { Configuration, log, PlaywrightCrawler, ProxyConfiguration } from 'crawlee';
// import { firefox } from 'playwright';
// 假设 errorReminder 函数已定义
import { errorReminder } from '../../utils/errorReminder.js';

import { productRequestHandler } from './productRequestHandler.js';

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

// 统计相关变量
const visitedUrls = new Set<string>(); // 已访问（不重复）
const succeededUrls = new Set<string>(); // 已采集成功（不重复）
const failedUrls = new Set<string>(); // 已采集失败（不重复）
let totalUrls = 0;

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
  requestHandler: async (ctx) => {
    // 统计已访问
    visitedUrls.add(ctx.request.url);
    await productRequestHandler(ctx);
    succeededUrls.add(ctx.request.url);
  },

  async failedRequestHandler({ request, error }) {
    const now = Date.now();
    const message = (error as Error)?.message || '未知错误';

    const errorEntry = {
      url: request.url,
      timestamp: now,
      message,
    };

    errorLogCache.push(errorEntry);
    failedUrls.add(request.url);

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

// 统计初始化和定时器逻辑，需在实际启动爬虫前调用
async function startCrawler() {
  // 获取总链接数
  try {
    const queue = await crawler.requestQueue; // PlaywrightCrawler 实例的 requestQueue 属性
    if (queue) {
      const info = await queue.getInfo();
      totalUrls = info?.totalRequestCount || 0;
    }
  }
  catch {
    log.warning('无法获取总链接数');
  }

  setInterval(() => {
    if (!totalUrls)
      return;
    const visitedPercent = ((visitedUrls.size / totalUrls) * 100).toFixed(2);
    const succeededPercent = ((succeededUrls.size / totalUrls) * 100).toFixed(2);
    const failedPercent = ((failedUrls.size / totalUrls) * 100).toFixed(2);
    log.info(`状态统计：\n已访问：${visitedUrls.size}/${totalUrls} (${visitedPercent}%)\n已采集成功：${succeededUrls.size}/${totalUrls} (${succeededPercent}%)\n已采集失败：${failedUrls.size}/${totalUrls} (${failedPercent}%)`);
  }, 10_000);
}

export { crawler, startCrawler };
