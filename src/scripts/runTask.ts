import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline';

// 任务目录路径
const tasksDir = path.resolve('src/tasks');
const lastEmailLogPath = path.resolve('./log/last_email_reminder.log');

// 删除上次提醒时间日志（如果存在）
function deleteLastEmailLog() {
  try {
    if (fs.existsSync(lastEmailLogPath)) {
      fs.unlinkSync(lastEmailLogPath);
      console.log('🗑️ 已清除上次提醒时间日志');
    }
  }
  catch (err) {
    console.warn('⚠️ 无法删除提醒日志：', err);
  }
}

// 获取所有任务文件夹名
function getTaskFolders(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    console.error('❌ 目录不存在:', dir);
    process.exit(1);
  }

  return fs.readdirSync(dir).filter(name =>
    fs.statSync(path.join(dir, name)).isDirectory(),
  );
}

// 控制台选择任务
async function chooseTask(tasks: string[]): Promise<string> {
  console.log('\n可用任务：');
  tasks.forEach((name, i) => console.log(`  [${i + 1}] ${name}`));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer: string = await new Promise((resolve) => {
    rl.question('\n请输入要运行的任务编号：', resolve);
  });

  rl.close();

  const index = Number.parseInt(answer, 10);
  if (Number.isNaN(index) || index < 1 || index > tasks.length) {
    console.error('❌ 输入无效');
    process.exit(1);
  }

  return tasks[index - 1];
}

// 运行指定任务的 index.ts
function runTask(taskName: string) {
  const taskPath = path.join(tasksDir, taskName, 'index.ts');
  if (!fs.existsSync(taskPath)) {
    console.error(`❌ 找不到 ${taskPath}`);
    process.exit(1);
  }

  console.log(`🚀 正在运行任务: ${taskName}`);

  const child = spawn('tsx', [taskPath], {
    stdio: 'inherit',
    shell: true,
  });

  child.on('exit', (code) => {
    console.log(`✅ 任务执行完毕，退出码：${code}`);
  });
}

// 主函数
async function main() {
  deleteLastEmailLog(); // 每次启动前清除提醒日志

  const tasks = getTaskFolders(tasksDir);
  if (tasks.length === 0) {
    console.error('❌ 没有找到任何任务文件夹');
    process.exit(1);
  }

  const selectedTask = await chooseTask(tasks);
  runTask(selectedTask);
}

main();
