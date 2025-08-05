import type { PlaywrightCrawlingContext } from 'crawlee';
import { Dataset, log } from 'crawlee';
import { buildProductInfo } from './pushData.js';

export async function productRequestHandler(context: PlaywrightCrawlingContext) {
  const { page, request } = context;
  log.info(`正在抓取：${request.url}`);

  const name = await page.$eval('h1.product__title', el => el.textContent || '');
  const desc = await page.$eval('div.product__tab:nth-child(1) > div:nth-child(2)', el => el.innerHTML || '');
  const cags = await page.$$eval('div.breadcrumb:nth-child(1) > a:nth-child(2)', els => els.map(el => el.textContent?.trim() || ''));

  let att1Name = 'Size';
  let att1Values: string[] = [];
  let att2Name = '';
  let att2Values: string[] = [];
  let att3Name = '';
  let att3Values: string[] = [];

  try {
    att1Values = await page.$$eval('.fake-select__options li', els => els.map(el => el.textContent || ''));
  }
  catch { }
  try {
    att2Values = await page.$$eval('', els => els.map(el => el.textContent || ''));
  }
  catch { }
  try {
    att3Values = await page.$$eval('', els => els.map(el => el.textContent || ''));
  }
  catch { }

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

  let prices = [await page.$eval('div.product__price:nth-child(3) > span:nth-child(2)', el => el.textContent?.trim() || '')];
  let images = await page.$$eval('.swiper-vertical img', els =>
    els.map((el) => {
      let src = el.getAttribute('src') || '';
      if (src.startsWith('//')) {
        src = `https:${src}`; // 如果需要补协议
      }
      // 只保留到 height=4 前面的部分
      const index = src.indexOf('height=4');
      if (index !== -1) {
        // 截取到 height=4 的位置，加上 height=800 作为新参数
        src = `${src.slice(0, index)}height=800`;
      }
      return src;
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
  const dataset = await Dataset.open('rouje.com');
  await dataset.pushData(productInfo);
}
