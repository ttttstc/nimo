import fs from 'node:fs/promises';
import path from 'node:path';

// Read only an explicitly declared local rollout. Never discover unrelated sessions.
export async function readCodexSource(ref, projectRoot) {
  if (!ref.source) return { status: 'UNAVAILABLE', message: 'An explicit Codex rollout source path is required' };
  const source = path.resolve(projectRoot, ref.source);
  try {
    let current = path.parse(source).root;
    for (const part of source.slice(current.length).split(path.sep)) {
      current = path.join(current, part);
      if ((await fs.lstat(current)).isSymbolicLink()) return { status: 'SYMLINK_REFUSED', message: 'Linked session sources are refused' };
    }
    const stat = await fs.stat(source);
    if (!stat.isFile() || stat.size > 16 * 1024 * 1024) return { status: 'UNAVAILABLE', message: 'Session source is not a regular file within the 16 MiB limit' };
    const rows = (await fs.readFile(source, 'utf8')).split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
    const meta = rows.find(row => row.type === 'session_meta')?.payload;
    if (meta?.id !== ref.sessionId || typeof meta?.cwd !== 'string' || path.resolve(meta.cwd) !== path.resolve(projectRoot)) return { status: 'SOURCE_MISMATCH', message: 'Session ID or workspace does not match the declared task' };
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
    return { status: error.code === 'ENOENT' ? 'UNAVAILABLE' : 'UNOBSERVED', message: 'Declared source is missing, unreadable, or not a supported Codex JSONL rollout' };
  }
}
