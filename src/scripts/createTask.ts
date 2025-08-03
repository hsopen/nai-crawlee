import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline';

const args = process.argv.slice(2);
const nameIndex = args.findIndex(arg => arg === '-n' || arg === '--name');
const taskName = nameIndex !== -1 ? args[nameIndex + 1] : null;

if (!taskName) {
  console.error('❌ 请使用 -n 或 --name 参数指定任务名称，例如: -n chatgpt.com');
  process.exit(1);
}

const templatesDir = path.resolve('src/templates');
const tasksDir = path.resolve('src/tasks');
const datePrefix = new Date().toISOString().slice(2, 10).replace(/-/g, '');
const targetFolderName = `${datePrefix}-${taskName}`;
const targetDir = path.join(tasksDir, targetFolderName);

// 获取模板列表
function getTemplateFolders(dir: string): string[] {
  return fs.readdirSync(dir).filter(file =>
    fs.statSync(path.join(dir, file)).isDirectory(),
  );
}

// 复制文件夹
function copyDir(src: string, dest: string) {
  if (!fs.existsSync(dest))
    fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    }
    else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 替换所有 .ts 文件中的 tasks_id 和 time_task_id
function replaceInAllTsFiles(dir: string, taskName: string, datePrefix: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      replaceInAllTsFiles(fullPath, taskName, datePrefix);
    }
    else if (entry.isFile() && fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      // 替换 tasks_id
      content = content.replace(/tasks_id/g, taskName);
      // 替换 time_task_id
      const timeTaskId = `${datePrefix}-${taskName}`;
      content = content.replace(/time_task_id/g, timeTaskId);

      fs.writeFileSync(fullPath, content, 'utf-8');
    }
  }
}

// 控制台模板选择
async function chooseTemplate(templates: string[]): Promise<string> {
  console.log('\n可用模板：');
  templates.forEach((name, i) => console.log(`  [${i + 1}] ${name}`));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer: string = await new Promise((resolve) => {
    rl.question('\n请输入模板编号：', resolve);
  });

  rl.close();

  const index = Number.parseInt(answer, 10);
  if (Number.isNaN(index) || index < 1 || index > templates.length) {
    console.error('❌ 输入无效，退出程序');
    process.exit(1);
  }

  return templates[index - 1];
}

// 主函数
async function main() {
  if (!fs.existsSync(templatesDir)) {
    console.error('❌ 模板目录不存在: src/templates');
    process.exit(1);
  }

  const templates = getTemplateFolders(templatesDir);
  if (templates.length === 0) {
    console.error('❌ 未找到模板文件夹');
    process.exit(1);
  }

  const selected = await chooseTemplate(templates);
  const srcPath = path.join(templatesDir, selected);

  copyDir(srcPath, targetDir);
  console.log(`✅ 已复制模板 "${selected}" 到 ${targetDir}`);

  replaceInAllTsFiles(targetDir, taskName as string, datePrefix);
  console.log(`✅ 已替换 "${targetDir}" 中所有 .ts 文件内的 tasks_id 为 "${taskName}"，time_task_id 为 "${datePrefix}-${taskName}"`);
}

main();
