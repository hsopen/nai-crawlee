import type { Page } from 'playwright';

/**
 * 提取页面中指定 type 的 <script> 标签的 JSON 内容
 */
async function extractJsonByType(page: Page, type: string): Promise<any[]> {
  const results: any[] = [];

  const jsonStrings: string[] = await page.$$eval(
    `script[type="${type}"]`,
    nodes => nodes.map(node => node.textContent?.trim() || ''),
  );

  for (const raw of jsonStrings) {
    if (!raw)
      continue;

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        results.push(...parsed);
      }
      else {
        results.push(parsed);
      }
    }
    catch (err) {
      console.log('JSON 解析失败:', err);
    }
  }

  return results;
}

/**
 * 提取所有类型的 JSON（包括 application/json 和 ld+json）
 */
export async function extractAllScriptJsonFromPage(page: Page): Promise<any[]> {
  const [jsonObjects, ldJsonObjects] = await Promise.all([
    extractJsonByType(page, 'application/json'),
    extractJsonByType(page, 'application/ld+json'),
  ]);
  return [...jsonObjects, ...ldJsonObjects];
}

/**
 * 判断对象中是否（递归）包含所有指定的键
 */
function deepContainsKeys(obj: any, keys: string[]): boolean {
  if (typeof obj !== 'object' || obj === null)
    return false;

  const hasAllKeys = keys.every(key => key in obj);
  if (hasAllKeys)
    return true;

  // 如果不是最外层就递归子对象
  for (const value of Object.values(obj)) {
    if (typeof value === 'object') {
      if (deepContainsKeys(value, keys)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 根据唯一键列表，递归查找包含这些键的 JSON 对象
 */
export async function extractUniqueJsonFromPageByKeys(
  page: Page,
  uniqueKeys: string | string[],
): Promise<any> {
  const keys = Array.isArray(uniqueKeys) ? uniqueKeys : [uniqueKeys];
  const allJsons = await extractAllScriptJsonFromPage(page);

  const matched: any[] = [];

  for (const json of allJsons) {
    if (deepContainsKeys(json, keys)) {
      matched.push(json);
    }
  }

  if (matched.length === 0) {
    throw new Error(`未找到包含键 ${keys.join(', ')} 的 JSON 对象`);
  }
  else if (matched.length > 1) {
    throw new Error(`找到多个包含键 ${keys.join(', ')} 的 JSON 对象，请缩小匹配范围`);
  }

  return matched[0];
}
