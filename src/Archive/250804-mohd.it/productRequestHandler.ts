import type { PlaywrightCrawlingContext } from 'crawlee';
import { Dataset, log } from 'crawlee';
import { buildProductInfo } from './pushData.js';

export async function productRequestHandler(context: PlaywrightCrawlingContext) {
  const { page, request } = context;
  log.info(`正在抓取：${request.url}`);
  try {
    // 等待最多3秒，等待按钮出现
    const btn = await page.waitForSelector('.cky-notice-btn-wrapper > button:nth-child(2)', { timeout: 3000 });
    if (btn) {
      await btn.click();
      log.info('接受按钮已点击');
    }
  }
  catch {
    // 超时或未找到按钮时，捕获异常，继续执行
    log.info('接受按钮不存在，跳过点击');
  }
  const name = await page.$eval('.Heading_heading__PeFJ2', el => el.textContent?.trim() || '');
  const desc = await page.$eval('.Description_spacer__i0_tJ', el => el.innerHTML || '');
  const cags = await page.$$eval('.Template_breadcrumbs__hCUNp > ul:nth-child(1) li a', els => els.map(el => el.textContent?.trim() || ''));

  const att1Name = '';
  const att1Values: string[] = [];
  const att2Name = '';
  const att2Values: string[] = [];
  const att3Name = '';
  const att3Values: string[] = [];

  let prices = [await page.$eval('.Price_price__d42XT > span:nth-child(1)', el => el.textContent?.trim() || '')];
  if (prices[0].includes('e')) {
    return;
  }
  let images = await page.$$eval('#product-gallery img', els => els.map(el => el.getAttribute('src') || ''));

  images = [...new Set(images)];
  if ([...new Set(prices)].length === 1) {
    prices = [prices[0]];
  }

  if (!name || prices.length === 0 || cags.length === 0 || images.length === 0) {
    log.error(`有必要属性为空 name:${name} ,price:${prices.length} ,cags:${cags.length} images:${images.length}`);
    return;
  }

  const productInfo = buildProductInfo({
    name,
    prices,
    cags,
    images,
    desc,
    att1Name,
    att1Values,
    att2Name,
    att2Values,
    att3Name,
    att3Values,
  });
  const dataset = await Dataset.open('mohd.it');
  await dataset.pushData(productInfo);
}
