import type { PlaywrightCrawlingContext } from 'crawlee';
import { Dataset, log } from 'crawlee';
import { buildProductInfo } from './pushData.js';

export async function productRequestHandler(context: PlaywrightCrawlingContext) {
  const { page, request } = context;
  log.info(`正在抓取：${request.url}`);

  const name = await page.$eval('.prod-name-container > h1:nth-child(1)', el => el.textContent || '');
  const desc = await page.$eval('meta[name="description"]', el => el.getAttribute('content') || '');
  const cags = await page.$$eval('.product-price-container > span:nth-child(3)', els => els.map(el => el.textContent?.trim() || ''));

  const att1Name = '';
  const att1Values: string[] = [];
  const att2Name = '';
  const att2Values: string[] = [];
  const att3Name = '';
  const att3Values: string[] = [];

  let prices = [await page.$eval('.price-actual > span:nth-child(2) > span:nth-child(2)', el => el.textContent?.trim() || '')];
  let images = await page.$$eval('#tn-product-row img', els =>
    els
      .map(el => el.getAttribute('src') || '')
      .filter(src => src && !src.includes('.svg')) // 去除 svg 链接
      .map((src) => {
        // 用正则匹配形如 *_15_100.jpg 这种结尾，将最后的数字替换为 800
        return src.replace(/_(\d+)\.jpg$/, '_800.jpg');
      }));

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
  const dataset = await Dataset.open('etrailer.com');
  await dataset.pushData(productInfo);
}
