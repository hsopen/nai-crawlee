import { exec } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

process.stdout.write('\x1Bc');

const TASKS_FILE = path.resolve('./src/tasks/tasks.json');

/**
 * 调度下一个任务，并标记当前任务为已完成
 * @param currentTask 当前任务名，例如 'task-a'
 */
export function completeAndRunNext(currentTask: string) {
  const json = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8'));

  // 移动当前任务到 done
  const index = json.undone.indexOf(currentTask);
  if (index === -1) {
    console.warn(`[调度器] 当前任务 "${currentTask}" 不在 undone 列表中，跳过处理`);
    return;
  }
  json.undone.splice(index, 1);
  json.done.push(currentTask);
  fs.writeFileSync(TASKS_FILE, JSON.stringify(json, null, 2), 'utf-8');

  // 依次查找可执行的下一个任务
  while (json.undone.length > 0) {
    const nextTask = json.undone[0];
    const taskPath = path.resolve(`./src/tasks/${nextTask}/index.ts`);

    if (fs.existsSync(taskPath)) {
      console.log(`[调度器] 即将执行下一个任务：${nextTask}`);
      const child = exec(`tsx ${taskPath}`, (err) => {
        if (err) {
          console.error(`[调度器] 执行 ${nextTask} 失败:`, err);
        }
      });

      // 实时输出 stdout 和 stderr 到主控制台
      child.stdout?.on('data', data => process.stdout.write(data));
      child.stderr?.on('data', data => process.stderr.write(data));

      return;
    }
    else {
      console.warn(`[调度器] 找不到任务文件：${taskPath}，跳过该任务`);
      const invalidTask = json.undone.shift()!;
      json.done.push(invalidTask);
      fs.writeFileSync(TASKS_FILE, JSON.stringify(json, null, 2), 'utf-8');
    }
  }

  console.log('[调度器] 所有任务已完成或无有效任务可执行');
}
