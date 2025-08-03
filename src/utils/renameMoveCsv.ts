import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

/**
 * 将 default.csv 移动并重命名为 “角鲸任务名.csv”
 * @param taskName 任务名称，例如 chatgpt.com
 */
export function renameMoveCsv(taskName: string) {
  const src = path.resolve('storage/key_value_stores/default/default.csv');
  const destDir = path.resolve('storage/key_value_stores', taskName);
  const destFile = path.join(destDir, `角鲸${taskName}.csv`);

  if (!fs.existsSync(src)) {
    console.error(`❌ 源文件不存在: ${src}`);
    process.exit(1);
  }

  // 如果目标目录不存在则创建
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // 移动并重命名文件
  fs.renameSync(src, destFile);
  console.log(`✅ 已将文件移动到: ${destFile}`);
}
