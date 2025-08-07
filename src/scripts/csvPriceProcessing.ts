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
  const strValue = String(price).trim();
  const parts = strValue.split('.');

  if (parts.length <= 2) {
    return strValue;
  }

  const beforeDecimal = parts.slice(0, -1).join('');
  const afterDecimal = parts[parts.length - 1];
  return `${beforeDecimal}.${afterDecimal}`;
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
