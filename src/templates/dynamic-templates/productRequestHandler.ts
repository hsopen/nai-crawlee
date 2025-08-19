import type { PlaywrightCrawlingContext } from 'crawlee';
import { Dataset, log } from 'crawlee';
import { buildProductInfo } from './pushData.js';

// 处理前尝试点击关闭弹窗按钮
async function tryClosePopup(page: any) {
  try {
    const closeBtn = await page.$('body > div:nth-child(111) > div > div:nth-child(2) > div > div > div > div > div > button');
    if (closeBtn) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }
  }
  catch { }
}

export async function productRequestHandler(context: PlaywrightCrawlingContext) {
  const { page, request } = context;
  log.info(`正在抓取：${request.url}`);

  await tryClosePopup(page);

  let name = '';
  const productName = (await page.$eval('.pdp-top__product-name__not-ot', el => el.textContent || '')).trim();
  let variantName = '';
  if (await page.$('.variants__item--column:nth-child(1) .small-reg')) {
    variantName = (await page.$eval('.variants__item--column:nth-child(1) .small-reg', el => el.textContent || '')).trim();
  }
  name = variantName ? `${productName} - ${variantName}` : productName;
  await tryClosePopup(page);

  const desc = await page.$eval('', el => el.innerHTML || '');
  const cags = await page.$$eval('', els => els.map(el => el.textContent?.trim() || ''));

  let att1Name = '';
  let att1Values: string[] = [];
  let att2Name = '';
  let att2Values: string[] = [];
  let att3Name = '';
  let att3Values: string[] = [];

  try {
    att1Values = await page.$$eval('', els => els.map(el => el.textContent || ''));
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

  // No attribute values found, nothing to process in this block
  if (att1Values.length === 0 && att2Values.length === 0 && att3Values.length === 0) {
    // Intentionally left blank
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
  await tryClosePopup(page);

  const att1Buttons = await page.$$('');
  let prices = [];
  let images = [];
  const att2Set = att2Values.length > 0 ? att2Values : [''];
  const att3Set = att3Values.length > 0 ? att3Values : [''];

  if (att1Buttons.length === 1) {
    await tryClosePopup(page);

    const price = await page.$eval('', el => el.textContent?.trim() || '');
    const imageSrcs = await page.$$eval(
      'div.for-desktop:nth-child(1) > div:nth-child(1) > div:nth-child(1) ul li img',
      imgs => imgs.map(img => img.getAttribute('src') || ''),
    );
    prices.push(price);
    images.push(...imageSrcs);
  }
  else {
    for (const button of att1Buttons) {
      await tryClosePopup(page);
      await button.click();
      await tryClosePopup(page);
      await page.waitForTimeout(1000);
      let price = '';
      try {
        price = await page.$eval('', el => el.textContent?.trim() || '');
        await tryClosePopup(page);
      }
      catch {
        price = '';
      }
      let imageSrcs: string[] = [];
      try {
        imageSrcs = await page.$$eval('', imgs => imgs.map(img => img.getAttribute('src') || '').filter(src => !!src));
      }
      catch {
        imageSrcs = [];
      }
      await tryClosePopup(page);
      const uniqueImages = [...new Set(imageSrcs)];
      images.push(...uniqueImages);
      const comboCount = att2Set.length * att3Set.length;
      for (let i = 0; i < comboCount; i++) {
        prices.push(price);
      }
    }
  }

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
    url: request.url,
  });
  const dataset = await Dataset.open('tasks_id');
  await dataset.pushData(productInfo);
}
