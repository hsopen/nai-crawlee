import type { ProductCsvRow } from '../../types/ProductCsvRow.js';
import { v7 as uuidv7 } from 'uuid';

interface ProductInfoParams {
  name: string;
  prices: string[];
  cags: string[];
  images: string[];
  desc: string;
  att1Name: string;
  att1Values: string[];
  att2Name: string;
  att2Values: string[];
  att3Name: string;
  att3Values: string[];
}

export function buildProductInfo({
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
}: ProductInfoParams): ProductCsvRow {
  return {
    'Type': 'variable',
    'SKU': uuidv7().replace(/-/g, '').toUpperCase(),
    'Name': name?.replace(/^[\s\u200B-\u200D]+|[\s\u200B-\u200D]+$/g, '') || '',
    'Published': 1,
    'Is featured?': '',
    'Visibility in catalog': 'visible',
    'Short description': '',
    'Description': desc?.replace(/^[\s\u200B-\u200D]+|[\s\u200B-\u200D]+$/g, '') || '',
    'Date sale price starts': '',
    'Date sale price ends': '',
    'Tax status': 'taxable',
    'Tax class': '',
    'In stock?': 1,
    'Stock': '1000',
    'Backorders allowed?': 1,
    'Sold individually?': 0,
    'Weight (lbs)': '',
    'Length (in)': '',
    'Width (in)': '',
    'Height (in)': '',
    'Allow customer reviews?': 1,
    'Purchase note': '',
    'Sale price': '',
    'Regular price': prices[0].replace(/[^0-9.]/g, '') || '',
    'Categories': cags.map(el => el?.replace(/^[\s\u200B-\u200D]+|[\s\u200B-\u200D]+$/g, '') || '').join('>'),
    'Tags': '',
    'Shipping class': '',
    'Images': images.map(url => url.startsWith('//') ? `https:${url}` : url).join(','),
    'Download limit': '',
    'Download expiry days': '',
    'Parent': '',
    'Grouped products': '',
    'Upsells': '',
    'Cross-sells': '',
    'External URL': '',
    'Button text': '',
    'Position': '',
    'Attribute 1 name': att1Name.replace(/^[\s\u200B-\u200D]+|[\s\u200B-\u200D]+$/g, ''),
    'Attribute 1 value(s)': att1Values?.map(v => v.replace(/^[\s\u200B-\u200D]+|[\s\u200B-\u200D]+$/g, '')).filter(Boolean).join(','),
    'Attribute 1 visible': '1',
    'Attribute 1 global': '1',
    'Attribute 2 name': att2Name.replace(/^[\s\u200B-\u200D]+|[\s\u200B-\u200D]+$/g, ''),
    'Attribute 2 value(s)': att2Values?.map(v => v.replace(/^[\s\u200B-\u200D]+|[\s\u200B-\u200D]+$/g, '')).filter(Boolean).join(','),
    'Attribute 2 visible': '1',
    'Attribute 2 global': '1',
    'Attribute 3 name': att3Name.replace(/^[\s\u200B-\u200D]+|[\s\u200B-\u200D]+$/g, ''),
    'Attribute 3 value(s)': att3Values?.map(v => v.replace(/^[\s\u200B-\u200D]+|[\s\u200B-\u200D]+$/g, '')).filter(Boolean).join(','),
    'Attribute 3 visible': '',
    'Attribute 3 global': '',
    'zcp': prices.map(el => el.replace(/[^0-9.]/g, '') || '').join(','),
    'Sub_sku': '',
    'Rec': 1,
  };
}
