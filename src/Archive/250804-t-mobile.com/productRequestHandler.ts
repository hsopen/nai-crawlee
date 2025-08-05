import type { PlaywrightCrawlingContext } from 'crawlee';
import { Dataset, log } from 'crawlee';
import { buildProductInfo } from './pushData.js';

export async function productRequestHandler(context: PlaywrightCrawlingContext) {
  const { page, request } = context;
  log.info(`正在抓取：${request.url}`);
  try {
    await page.waitForSelector('#onetrust-accept-btn-handler', { timeout: 5000 });
    await page.evaluate(() => {
      const btn = document.querySelector('#onetrust-accept-btn-handler') as HTMLElement | null;
      if (btn)
        btn.click();
    });
  }
  catch {
    console.log('未找到 banner 关闭按钮，跳过点击');
  }

  await page.waitForFunction(() => {
    const el = document.querySelector('#text-476a332a10 > div:nth-child(1) > p:nth-child(1) > span:nth-child(1)');
    return el && (el.textContent?.trim()?.length ?? 0) > 0;
  }, { timeout: 10000 });

  const name = await page.$eval('#productHeadline-0eac37b444 span', el => el.textContent || '');
  const desc = await page.$eval('#skuSelector-e26453da5b > meta:nth-child(2)', el => el.getAttribute('content') || '');
  const cags = await page.$$eval('.upf-product-breadcrumb--list li a span', els => els.map(el => el.textContent?.trim() || ''));

  let att1Name = 'Color';
  let att1Values: string[] = [];
  let att2Name = 'Storage sizes';
  let att2Values: string[] = [];
  let att3Name = '';
  let att3Values: string[] = [];

  try {
    att1Values = await page.$$eval('fieldset.upf-skuSelector__group:nth-child(2) div >label', els => els.map(el => el.textContent || ''));
  }
  catch { }
  try {
    att2Values = await page.$$eval('fieldset.upf-skuSelector__group:nth-child(3) > div > label', els => els.map(el => el.textContent || ''));
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

  const att1Buttons = await page.$$('fieldset.upf-skuSelector__group:nth-child(2) div >label');
  let prices = [];
  let images = [];
  const att2Set = att2Values.length > 0 ? att2Values : [''];
  const att3Set = att3Values.length > 0 ? att3Values : [''];

  if (att1Buttons.length === 1) {
    const price
      = (await page
        .$eval('#text-476a332a10 > div:nth-child(1) > p:nth-child(1) > span:nth-child(1)', el => el.textContent?.trim())
        .catch(() => null))
      || (await page
        .$eval('span.upf-pricing-selector__description:nth-child(2)', el => el.textContent?.trim())
        .catch(() => '')) || '';

    const imageSrc = await page.$$eval('.xpr-carousel__track > li > div > img', (imgs) => {
      const lastImg = imgs[imgs.length - 1];
      return lastImg?.getAttribute('src') || '';
    });
    prices.push(price);
    images.push(imageSrc);
  }
  else {
    for (const [index, button] of att1Buttons.entries()) {
      if (index === 0)
        continue; // 跳过第一个按钮

      try {
        await button.click({ timeout: 3000 });
      }
      catch { }

      await page.waitForTimeout(1000);

      let price = '';
      try {
        price
          = (await page
            .$eval('#text-476a332a10 > div:nth-child(1) > p:nth-child(1) > span:nth-child(1)', el => el.textContent?.trim())
            .catch(() => null))
          || (await page
            .$eval('span.upf-pricing-selector__description:nth-child(2)', el => el.textContent?.trim())
            .catch(() => '')) || '';
      }
      catch {
        price = '';
      }

      let imageSrcs: string[] = [];
      try {
        imageSrcs = await page.$$eval(
          '.xpr-carousel__track > li > div > img',
          imgs => imgs.map(img => img.getAttribute('src') || '').filter(src => !!src),
        );
      }
      catch {
        imageSrcs = [];
      }

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
  });
  const dataset = await Dataset.open('t-mobile.com');
  await dataset.pushData(productInfo);
}
