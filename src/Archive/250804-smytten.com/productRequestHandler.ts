import type { PlaywrightCrawlingContext } from 'crawlee';
import { Dataset, log } from 'crawlee';
import { buildProductInfo } from './pushData.js';

export async function productRequestHandler(context: PlaywrightCrawlingContext) {
  const { page, request } = context;
  log.info(`正在抓取：${request.url}`);

  const name = await page.$eval('.css-pbjvln', el => el.textContent || '');
  const desc = await page.$eval('.ant-collapse-content-active > div:nth-child(1) > div:nth-child(1) > div:nth-child(1)', el => el.innerHTML || '');
  const cags = await page.$$eval('.ant-breadcrumb > ol:nth-child(1) li a', els => els.map(el => el.textContent?.trim() || ''));

  let att1Name = 'Size';
  let att1Values: string[] = await page.$$eval('h3.css-alwil5', els => els.map(el => el.textContent || ''));
  let att2Name = '';
  let att2Values: string[] = [];
  let att3Name = '';
  let att3Values: string[] = [];

  if (att1Values.length === 0 && att2Values.length === 0 && att3Values.length === 0) {
    log.warning('所有属性都为空，进行默认处理');
  }
  else {
    if (att1Values.length === 0) {
      if (att2Values.length > 0) {
        att1Name = att2Name;
        att1Values = att2Values;
        att2Name = att3Name;
        att2Values = att3Values;
        att3Name = '';
        att3Values = [];
      }
      else {
        att1Name = '';
        att1Values = [];
        att2Name = '';
        att2Values = [];
        att3Name = '';
        att3Values = [];
      }
    }
    else if (att2Values.length === 0 && att3Values.length > 0) {
      att2Name = att3Name;
      att2Values = att3Values;
      att3Name = '';
      att3Values = [];
    }
    if (att3Values.length === 0) {
      att3Name = '';
    }
  }

  const prices = [await page.$eval('.css-14td2b1', el => el.textContent?.trim() || '')];
  const cleanedPrice = prices[0].replace(/[^\d.]/g, '');
  prices[0] = String((Number.parseFloat(cleanedPrice) * 0.011459).toFixed(2)); // 转换为美元，并保留两位小数

  let images = await page.$$eval('.css-y53t9s img', els => els.map(el => el.getAttribute('src') || ''));
  images = [...new Set(images)];

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
  const dataset = await Dataset.open('smytten.com');
  await dataset.pushData(productInfo);
}
