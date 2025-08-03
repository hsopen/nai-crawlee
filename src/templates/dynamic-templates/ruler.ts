import { launchOptions } from 'camoufox-js';
import { Configuration, log, PlaywrightCrawler, ProxyConfiguration } from 'crawlee';
import { firefox } from 'playwright';
import { productRequestHandler } from './productRequestHandler.js';

const proxyConfiguration = new ProxyConfiguration({ proxyUrls: ['http://127.0.0.1:8800'] });

const config = new Configuration({
  persistStorage: true, // 是否持久化存储（默认 true）[2][6]
  persistStateIntervalMillis: 30_000, // 状态保存间隔（毫秒，默认 60_000）[2]
  purgeOnStart: false, // 启动时是否清空存储（默认 true）[2]
  defaultDatasetId: 'tasks_id',
  defaultKeyValueStoreId: 'tasks_id',
  defaultRequestQueueId: 'tasks_id',
});

const crawler = new PlaywrightCrawler({
  launchContext: {
    launcher: firefox,
    launchOptions: await launchOptions({
      headless: true,
    }),
  },
  headless: false,
  maxConcurrency: 5,
  minConcurrency: 2,
  maxRequestsPerCrawl: 5,
  proxyConfiguration,
  browserPoolOptions: {
    useFingerprints: false,
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
    async ({ page }) => {
      // 更精细的资源控制
      await page.route('**/*', (route) => {
        return ['image', 'stylesheet', 'font'].includes(route.request().resourceType())
          ? route.abort()
          : route.continue();
      });
    },
  ],
  requestHandler: productRequestHandler,
  async failedRequestHandler({ request }) {
    log.error(`请求失败：${request.url}`);
  },
}, config);

export default crawler;
