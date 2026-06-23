const counters = new Map();
const histograms = new Map();

export const incrementMetric = (name, labels = {}) => {
  const key = `${name}:${JSON.stringify(labels)}`;
  counters.set(key, (counters.get(key) || 0) + 1);
};

export const observeMetric = (name, value, labels = {}) => {
  const key = `${name}:${JSON.stringify(labels)}`;
  const row = histograms.get(key) || { count: 0, sum: 0, max: 0 };
  row.count += 1;
  row.sum += value;
  row.max = Math.max(row.max, value);
  histograms.set(key, row);
};

export const metricsSnapshot = () => ({
  counters: Object.fromEntries(counters),
  histograms: Object.fromEntries(histograms),
  uptimeSeconds: process.uptime(),
  memory: process.memoryUsage()
});
