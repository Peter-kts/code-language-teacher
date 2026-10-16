// Just enough of Node's child_process for reference.test.ts to run Python, without adding @types/node.
declare module 'node:child_process' {
  export function spawnSync(
    command: string,
    args: string[],
    options: { input: string; encoding: 'utf8'; maxBuffer?: number },
  ): { status: number | null; stdout: string; stderr: string }
}
