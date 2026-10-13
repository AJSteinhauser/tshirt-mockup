export async function runWithConcurrency(items, limit, worker) {
  const queue = [...items]
  async function drain() {
    while (queue.length > 0) {
      await worker(queue.shift())
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, drain))
}
