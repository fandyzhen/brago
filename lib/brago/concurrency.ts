/**
 * 带并发上限的 map：并行执行任务，但限制同时进行的数量，并保留输入顺序
 * （results[i] 对应 items[i]）。
 *
 * 为什么要限并发而不是 Promise.all 全部：
 * - 前端图片压缩走 web worker，10 张同时跑会吃满移动端 CPU/内存甚至崩溃
 * - 后端 sharp 处理 + R2 上传，serverless 内存有限，全并发易 OOM / 触发限流
 * 限并发在"明显提速"和"不压垮设备/服务"之间取平衡。
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workerCount = Math.min(Math.max(1, limit), items.length || 1);
  const workers = Array.from({ length: workerCount }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}
