import type { PlaywrightCrawlingContext } from 'crawlee';
import { Dataset, log } from 'crawlee';
import { buildProductInfo } from './pushData.js';

export async function productRequestHandler(context: PlaywrightCrawlingContext) {
  const { page, request } = context;
  log.info(`正在抓取：${request.url}`);
  try {
    const acceptButton = await page.waitForSelector('#popin_tc_privacy_button_3', { timeout: 3000 });
    if (acceptButton) {
      await acceptButton.click();
      log.info('已点击隐私接受按钮');
    }
  }
  catch {
    log.info('隐私按钮不存在或超时，已跳过');
  }

  const name = await page.$eval('.product-name', el => el.textContent || '');
  const desc = await page.$eval('.content-description > ul:nth-child(2)', el => el.innerHTML || '');
  let cags = await page.$$eval('.breadcrumb-top > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > ol:nth-child(1) li a', els => els.map(el => el.textContent?.trim() || ''));
  cags = cags.slice(0, -1);

  let att1Name = 'Size';
  let att1Values: string[] = await page.$$eval('#size-selection span', els => els.map(el => el.textContent || ''));
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

  let prices = [await page.$eval('div.price:nth-child(1) > span:nth-child(1) > span:nth-child(1) > span:nth-child(1)', (el) => {
    return (el.textContent?.trim() || '').replace(/,/g, '.');
  })];
  const pageUrl = request.url;
  const { origin } = new URL(pageUrl); // 获取页面完整域名，例如 https://example.com

  let images = await page.$$eval('div.images-container:nth-child(1) img', (els, origin) => {
    return els.map((el) => {
      const src = el.getAttribute('src') || '';
      // 如果是以单斜杠开头（相对路径），但不是双斜杠（协议相对路径）
      if (src.startsWith('/') && !src.startsWith('//')) {
        return origin + src;
      }
      return src;
    });
  }, origin);

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
  const dataset = await Dataset.open('morgandetoi.fr');
  await dataset.pushData(productInfo);
}
