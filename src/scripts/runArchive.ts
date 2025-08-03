import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const tasksDir = path.resolve('src/tasks');
const archiveDir = path.resolve('src/archive');

function moveTasksToArchive() {
  if (!fs.existsSync(tasksDir)) {
    console.error(`❌ 任务目录不存在: ${tasksDir}`);
    process.exit(1);
  }

  // 读取 tasks 目录下所有文件夹
  const taskFolders = fs.readdirSync(tasksDir).filter((name) => {
    const fullPath = path.join(tasksDir, name);
    return fs.statSync(fullPath).isDirectory();
  });

  if (taskFolders.length === 0) {
    console.log('ℹ️ 没有找到任务文件夹，无需归档');
    return;
  }

  // 确保 archive 目录存在
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }

  for (const folder of taskFolders) {
    const srcPath = path.join(tasksDir, folder);
    const destPath = path.join(archiveDir, folder);

    // 移动文件夹（重命名）
    try {
      fs.renameSync(srcPath, destPath);
      console.log(`✅ 已移动 "${folder}" 到归档目录 "${archiveDir}"`);
    }
    catch (error) {
      console.error(`❌ 移动文件夹 "${folder}" 失败:`, error);
    }
  }
}

moveTasksToArchive();
