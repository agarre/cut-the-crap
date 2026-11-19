const line = (level, message) => process.stdout.write(`${new Date().toISOString()} ${level} ${message}\n`);

export const log = {
  info: (message) => line("info", message),
  warn: (message) => line("warn", message),
};
