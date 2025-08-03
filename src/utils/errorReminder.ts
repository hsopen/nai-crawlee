import fs from 'node:fs';
import path from 'node:path';
import notifier from 'node-notifier';
import nodemailer from 'nodemailer';

// ====== 可配置项 ======
const EMAIL_CONFIG = {
  user: '2279107415@qq.com',
  pass: 'qsmeenikbwatecfh', // 请使用你的 QQ 邮箱授权码
  to: '2279107415@qq.com',
  service: 'qq',
  host: 'smtp.qq.com',
  port: 465,
  secure: true,
};

const NOTIFY_LIMIT = {
  intervalMinutes: 15, // 邮件提醒最小间隔时间（分钟）
  popupMaxCount: 5, // 弹窗最多显示几条错误
  popupMaxLength: 200, // 弹窗最多字符数
};

const LOG_DIR = path.resolve('./log');
const LAST_EMAIL_LOG = path.join(LOG_DIR, 'last_email_reminder.log');
// =======================

/**
 * 判断当前是否允许提醒（09:00 ~ 24:00）
 */
function isReminderAllowed(): boolean {
  const hour = new Date().getHours();
  return hour >= 9 && hour < 24;
}

/**
 * 判断是否为白天（弹窗提醒时间：09:00 ~ 18:00）
 */
function isDaytime(): boolean {
  const hour = new Date().getHours();
  return hour >= 9 && hour < 18;
}

/**
 * 确保日志目录存在
 */
function ensureLogDirExists() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

/**
 * 获取上一次提醒时间（用于节流）
 */
function getLastReminderTime(): number {
  try {
    ensureLogDirExists();
    return Number(fs.readFileSync(LAST_EMAIL_LOG, 'utf-8'));
  }
  catch {
    return 0;
  }
}

/**
 * 更新上一次提醒时间
 */
function updateLastReminderTime(time: number) {
  try {
    ensureLogDirExists();
    fs.writeFileSync(LAST_EMAIL_LOG, String(time), 'utf-8');
  }
  catch (err) {
    console.warn('无法写入提醒时间日志：', err);
  }
}

/**
 * 弹窗提醒
 */
function showPopup(taskName: string, messages: string[]) {
  notifier.notify({
    title: `任务错误提醒 - ${taskName}`,
    message: messages
      .slice(0, NOTIFY_LIMIT.popupMaxCount)
      .join('\n\n')
      .slice(0, NOTIFY_LIMIT.popupMaxLength),
    wait: false,
  });
}

/**
 * 邮件提醒
 */
async function sendEmail(taskName: string, messages: string[]) {
  const transporter = nodemailer.createTransport({
    service: EMAIL_CONFIG.service,
    host: EMAIL_CONFIG.host,
    port: EMAIL_CONFIG.port,
    secure: EMAIL_CONFIG.secure,
    auth: {
      user: EMAIL_CONFIG.user,
      pass: EMAIL_CONFIG.pass,
    },
  });

  const mailOptions = {
    from: EMAIL_CONFIG.user,
    to: EMAIL_CONFIG.to,
    subject: `任务错误提醒 - ${taskName}`,
    text: messages.join('\n\n'),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[提醒已发送邮件] ${taskName}`);
  }
  catch (err) {
    console.error(`[邮件发送失败]`, err);
  }
}

/**
 * 通用提醒函数（自动判断弹窗/邮件，支持时间限制与节流）
 * @param taskName 错误任务名
 * @param messages 最近 10 个错误信息
 */
export async function errorReminder(taskName: string, messages: string[]) {
  const now = Date.now();

  if (!isReminderAllowed()) {
    console.log('[提醒跳过] 当前时间为凌晨或早晨（不提醒）');
    return;
  }

  if (isDaytime()) {
    showPopup(taskName, messages);
    return;
  }

  const lastTime = getLastReminderTime();
  const intervalMs = NOTIFY_LIMIT.intervalMinutes * 60 * 1000;

  if (now - lastTime < intervalMs) {
    console.log(`[提醒节流中] 距离上次邮件发送不足 ${NOTIFY_LIMIT.intervalMinutes} 分钟`);
    return;
  }

  await sendEmail(taskName, messages);
  updateLastReminderTime(now);
}
