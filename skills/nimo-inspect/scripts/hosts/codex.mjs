import fs from 'node:fs/promises';
import path from 'node:path';

// Read only an explicitly declared local rollout. Never discover unrelated sessions.
export async function readCodexSource(ref, projectRoot) {
  if (!ref.source) return { status: 'UNAVAILABLE', message: '需明确提供 Codex 会话记录的源路径' };
  const source = path.resolve(projectRoot, ref.source);
  try {
    let current = path.parse(source).root;
    for (const part of source.slice(current.length).split(path.sep)) {
      current = path.join(current, part);
      if ((await fs.lstat(current)).isSymbolicLink()) return { status: 'SYMLINK_REFUSED', message: '已拒绝通过符号链接读取会话源' };
    }
    const stat = await fs.stat(source);
    if (!stat.isFile() || stat.size > 16 * 1024 * 1024) return { status: 'UNAVAILABLE', message: '会话源不是普通文件，或大小超过 16 MiB 上限' };
    const rows = (await fs.readFile(source, 'utf8')).split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
    const meta = rows.find(row => row.type === 'session_meta')?.payload;
    if (meta?.id !== ref.sessionId || typeof meta?.cwd !== 'string' || path.resolve(meta.cwd) !== path.resolve(projectRoot)) return { status: 'SOURCE_MISMATCH', message: '会话标识或工作区与声明的任务不一致' };
    let turn = 0;
    let turnId;
    const events = rows.map((row, index) => {
      if (row.type === 'turn_context' && row.payload?.turn_id !== turnId) { turn += 1; turnId = row.payload?.turn_id; }
      const payload = row.payload ?? {};
      const call = row.type === 'response_item' && ['function_call', 'custom_tool_call'].includes(payload.type);
      let kind = 'unknown';
      if (call && /(?:^|__|\.)(?:apply_patch|write_file|edit_file)$/.test(payload.name ?? '')) kind = 'change';
      else if (call && /(?:^|__|\.)(?:read_file|view_image)$/.test(payload.name ?? '')) kind = 'read';
      else if (call && /(?:^|__|\.)(?:exec_command|shell_command|shell)$/.test(payload.name ?? '')) kind = 'execute';
      return { eventId: String(index + 1), turn, kind, activity: call, timestamp: typeof row.timestamp === 'string' ? row.timestamp : '' };
    });
    return { status: 'OK', events };
  } catch (error) {
    return { status: error.code === 'ENOENT' ? 'UNAVAILABLE' : 'UNOBSERVED', message: '声明的源文件缺失、不可读，或不是支持的 Codex JSONL 会话格式' };
  }
}
