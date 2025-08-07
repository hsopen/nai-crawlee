import { JSDOM } from 'jsdom';

/**
 * 删除 HTML 字符串中所有带链接的标签（保留 <a> 的文本），并格式化输出
 * @param html 原始 HTML 字符串
 * @returns 清理后格式化的 HTML 字符串
 */
export function removeHtmlStrLink(html: string): string {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const linkTagsSelector = [
    'a[href]',
    'img[src]',
    'script[src]',
    'iframe[src]',
    'link[href]',
    '[style*="url("]',
    '[src]',
    '[href]',
  ].join(',');

  const elements = document.querySelectorAll(linkTagsSelector);

  elements.forEach((el) => {
    const tagName = el.tagName.toLowerCase();

    // 如果是 <a> 标签，保留文字内容
    if (tagName === 'a' && el.textContent?.trim()) {
      const span = document.createElement('span');
      span.textContent = el.textContent;
      el.replaceWith(span);
    }
    else {
      el.remove();
    }
  });

  const cleanedHtml = document.body.innerHTML;

  return cleanedHtml
    .trim();
}
