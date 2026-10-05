/** Binary min-heap of (priority, value) pairs – used by A* and Dijkstra. */
export class MinHeap {
  private pri: number[] = [];
  private val: number[] = [];

  get size(): number {
    return this.pri.length;
  }

  push(priority: number, value: number): void {
    const pri = this.pri;
    const val = this.val;
    let i = pri.length;
    pri.push(priority);
    val.push(value);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (pri[p] <= priority) break;
      pri[i] = pri[p];
      val[i] = val[p];
      i = p;
    }
    pri[i] = priority;
    val[i] = value;
  }

  /** Returns the value with the lowest priority; call peekPriority() first if you need it. */
  pop(): number {
    const pri = this.pri;
    const val = this.val;
    const top = val[0];
    const lastP = pri.pop()!;
    const lastV = val.pop()!;
    const n = pri.length;
    if (n > 0) {
      let i = 0;
      while (true) {
        const l = 2 * i + 1;
        if (l >= n) break;
        const r = l + 1;
        const c = r < n && pri[r] < pri[l] ? r : l;
        if (pri[c] >= lastP) break;
        pri[i] = pri[c];
        val[i] = val[c];
        i = c;
      }
      pri[i] = lastP;
      val[i] = lastV;
    }
    return top;
  }

  peekPriority(): number {
    return this.pri[0];
  }
}
