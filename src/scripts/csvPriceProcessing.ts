import process from 'node:process';
import { program } from 'commander';
import { parseFile, writeToPath } from 'fast-csv';

// 定义处理选项接口
interface ProcessOptions {
  input: string;
  output?: string;
}

// 处理单个价格文本
function processSinglePrice(price: string): string {
  let strValue = String(price).trim();

  // 全角数字和全角点转半角
  strValue = strValue.replace(/[０１２３４５６７８９]/g, s => String.fromCharCode(s.charCodeAt(0) - 65248));
  strValue = strValue.replace(/．/g, '.');

  // 去除括号
  strValue = strValue.replace(/[()]/g, '');

  // 去除首尾非数字、非负号、非小数点字符（用\D替换[^0-9]）
  strValue = strValue.replace(/^[^\d.-]+/, '').replace(/\D+$/, '');

  // 去除开头和结尾的小数点
  strValue = strValue.replace(/^\./, '').replace(/\.$/, '');

  // 只保留第一个小数点，去除多余的小数点
  const firstDot = strValue.indexOf('.');
  if (firstDot !== -1) {
    strValue = strValue.slice(0, firstDot + 1) + strValue.slice(firstDot + 1).replace(/\./g, '');
  }

  // 允许负号在最前面，且为有效数字
  if (/^-?\d+(?:\.\d+)?$/.test(strValue)) {
    return strValue;
  }
  // 如果处理后不是有效数字，返回原始值
  return String(price).trim();
}

// 处理可能包含多个价格的单元格
function processPriceCell(value: string): string {
  if (!value)
    return value;

  // 分割多个价格（按逗号分隔）
  return String(value)
    .split(',')
    .map(price => processSinglePrice(price))
    .join(',');
}

// 处理 CSV 文件的函数
async function processCSV(options: ProcessOptions): Promise<void> {
  const { input, output } = options;
  const outputPath = output || input.replace(/\.csv$/, '_processed.csv');

  return new Promise((resolve, reject) => {
    const rows: any[] = [];

    parseFile(input, {
      headers: true,
      quote: '"',
      escape: '"',
      ignoreEmpty: true,
    })
      .on('error', reject)
      .on('data', (row) => {
        const newRow = { ...row };

        // 处理 Regular price 列
        if (row['Regular price'] !== undefined) {
          newRow['Regular price'] = processSinglePrice(row['Regular price']);
        }

        // 处理 zcp 列（可能包含多个价格）
        if (row.zcp !== undefined) {
          newRow.zcp = processPriceCell(row.zcp);
        }

        rows.push(newRow);
      })
      .on('end', (rowCount: number) => {
        writeToPath(outputPath, rows, {
          headers: true,
          quote: '"',
          quoteHeaders: true,
        })
          .on('error', reject)
          .on('finish', () => {
            console.log(`成功处理 ${rowCount} 行数据，结果已保存到 ${outputPath}`);
            resolve();
          });
      });
  });
}

// 设置命令行参数
program
  .name('csv-price-processor')
  .description('专门处理 Regular price 和 zcp 列的价格数据')
  .version('1.0.0');

program
  .requiredOption('-i, --input <path>', '输入CSV文件路径')
  .option('-o, --output <path>', '输出CSV文件路径（可选，默认在原文件名后加_processed）');

program.parse(process.argv);

// 获取命令行参数并运行处理函数
const options = program.opts();
processCSV({
  input: options.input,
  output: options.output,
}).catch((err) => {
  console.error('处理CSV文件时出错:', err);
  process.exit(1);
});
