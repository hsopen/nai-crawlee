import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXCHANGE_RATE_PATH = path.resolve(__dirname, '../../exchangeRate.json');

const API_URL = 'https://v2.xxapi.cn/api/allrates';

/**
 * 获取所有汇率并保存到 exchangeRate.json，附带获取时间。
 */

export async function fetchAndSaveExchangeRates() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok)
      throw new Error(`请求失败: ${res.status}`);
    const data = await res.json();
    const saveData = {
      rates: data.data,
      update_at: Date.now(),
    };
    fs.writeFileSync(EXCHANGE_RATE_PATH, JSON.stringify(saveData, null, 2), 'utf-8');
    return saveData;
  }
  catch (error) {
    throw new Error(`获取汇率失败: ${error}`);
  }
}

function readExchangeRates() {
  if (!fs.existsSync(EXCHANGE_RATE_PATH))
    throw new Error('汇率文件不存在');
  const content = fs.readFileSync(EXCHANGE_RATE_PATH, 'utf-8');
  const json = JSON.parse(content);
  // 兼容嵌套结构
  if (json.rates && json.rates.rates) {
    json.rates = json.rates.rates;
  }
  return json;
}

const currencyMap: Record<string, string> = {};

function buildCurrencyMap() {
  const { rates } = readExchangeRates();
  for (const [code, info] of Object.entries<any>(rates)) {
    currencyMap[code.toUpperCase()] = code;
    currencyMap[code.toLowerCase()] = code;
    currencyMap[code] = code;
    if (info.name)
      currencyMap[info.name.replace(/\(.+\)/, '').trim()] = code;
  }
  // 常见符号映射
  currencyMap.$ = 'USD';
  currencyMap['＄'] = 'USD';
  currencyMap.USD = 'USD';
  currencyMap.usd = 'USD';
  currencyMap.US$ = 'USD';
  currencyMap['USＤ'] = 'USD';
  currencyMap['ＵＳＤ'] = 'USD';
  currencyMap['₣'] = 'CHF'; // 瑞士法郎
  currencyMap['₤'] = 'ITL'; // 旧意大利里拉
  currencyMap['₧'] = 'ESP'; // 旧西班牙比塞塔
  currencyMap['₨'] = 'PKR'; // 巴基斯坦卢比
  currencyMap['₩'] = 'KRW';
  currencyMap['₫'] = 'VND';
  currencyMap['₭'] = 'LAK';
  currencyMap['₮'] = 'MNT';
  currencyMap['₯'] = 'GRD'; // 旧希腊德拉克马
  currencyMap['₱'] = 'PHP';
  currencyMap['₲'] = 'PYG';
  currencyMap['₳'] = 'ARA'; // 旧阿根廷奥斯特拉尔
  currencyMap['₴'] = 'UAH';
  currencyMap['₵'] = 'GHS';
  currencyMap['₸'] = 'KZT';
  currencyMap['₺'] = 'TRY';
  currencyMap['₼'] = 'AZN';
  currencyMap['₽'] = 'RUB';
  currencyMap['₾'] = 'GEL';
  currencyMap['₿'] = 'BTC';
  currencyMap['₠'] = 'EWE'; // 欧洲货币单位
  currencyMap['€'] = 'EUR';
  currencyMap['£'] = 'GBP';
  currencyMap['₤'] = 'GBP';
  currencyMap['¥'] = 'CNY';
  currencyMap['￥'] = 'CNY';
  currencyMap['円'] = 'JPY';
  currencyMap['元'] = 'CNY';
  currencyMap['₹'] = 'INR';
  currencyMap['៛'] = 'KHR';
  currencyMap['﷼'] = 'IRR';
  currencyMap['؋'] = 'AFN';
  currencyMap['₺'] = 'TRY';
  currencyMap['₦'] = 'NGN';
  currencyMap['₡'] = 'CRC';
  currencyMap['₢'] = 'BRB'; // 旧巴西克鲁塞罗
  currencyMap['₠'] = 'EWE';
  currencyMap['₣'] = 'FRF'; // 旧法郎
  currencyMap['₧'] = 'ESP';
  currencyMap['₯'] = 'GRD';
  currencyMap['₨'] = 'INR';
  currencyMap['₩'] = 'KRW';
  currencyMap['₪'] = 'ILS';
  currencyMap['₫'] = 'VND';
  currencyMap['₭'] = 'LAK';
  currencyMap['₮'] = 'MNT';
  currencyMap['₱'] = 'PHP';
  currencyMap['₲'] = 'PYG';
  currencyMap['₳'] = 'ARA';
  currencyMap['₴'] = 'UAH';
  currencyMap['₵'] = 'GHS';
  currencyMap['₸'] = 'KZT';
  currencyMap['₼'] = 'AZN';
  currencyMap['₽'] = 'RUB';
  currencyMap['₾'] = 'GEL';
  currencyMap['₿'] = 'BTC';
  currencyMap['៛'] = 'KHR';
  currencyMap['﷼'] = 'SAR';
  currencyMap['؋'] = 'AFN';
  currencyMap['ƒ'] = 'ANG';
}

export async function convertToUSD(input: string | number | Array<string | number>, currency: string): Promise<string | string[]> {
  // 检查汇率文件是否存在，不存在则自动请求创建
  let ratesData;
  const ONE_DAY = 24 * 60 * 60 * 1000;
  try {
    ratesData = readExchangeRates();
    // 检查更新时间，超过一天自动更新
    if (!ratesData.update_at || (Date.now() - ratesData.update_at > ONE_DAY)) {
      ratesData = await fetchAndSaveExchangeRates();
    }
  }
  catch {
    // 文件不存在，自动请求创建
    ratesData = await fetchAndSaveExchangeRates();
  }
  if (Object.keys(currencyMap).length === 0)
    buildCurrencyMap();
  const { rates } = ratesData;
  const key = currency.trim();
  let code = currencyMap[key.toUpperCase()] || currencyMap[key.toLowerCase()] || currencyMap[key];
  // 中文模糊匹配（唯一）
  if (!code && /[\u4E00-\u9FA5]/.test(key)) {
    const matches = Object.entries(rates)
      .filter(([_c, info]) => (info as any).name && (info as any).name.includes(key));
    if (matches.length === 1) {
      code = matches[0][0];
    }
    else if (matches.length > 1) {
      throw new Error(`中文名称“${key}”匹配到多个货币，请输入更精确的名称。`);
    }
  }
  if (!code || !rates[code])
    throw new Error(`不支持的货币类型: ${currency}`);
  const rate = rates[code].rate;
  if (!rate)
    throw new Error(`汇率不存在: ${code}`);

  function convertOne(val: string | number): string {
    let num: number;
    if (typeof val === 'number') {
      num = val;
    }
    else if (typeof val === 'string') {
      // 只提取数字，不根据符号自动判断货币类型
      num = Number.parseFloat(val.replace(/[^\d.]/g, ''));
    }
    else {
      return '';
    }
    if (Number.isNaN(num))
      return '';
    return (num / rate).toFixed(6);
  }

  if (Array.isArray(input)) {
    return input.map(convertOne) as string[];
  }
  return convertOne(input);
}
