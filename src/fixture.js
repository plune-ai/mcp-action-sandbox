// The MCP test server behind every workflow of this repository. No dependencies.
//
// Modes (first argument of server.js / http-server.js):
//   clean   three tools, no specification problem: get_status (read-only, no arguments),
//           reset_counter (readOnlyHint: false) and clear_log (no annotations at all).
//   broken  breaks the specification: a closed input schema whose "required" names a property it
//           does not define, and a declared prompts capability whose list answers with an error.
//   empty   declares tools and lists none: nothing to measure.
//   crash   writes a line to stderr and exits 1 before reading anything.
//
// Options:
//   --log <file>   append one JSON line per request received: {"method","tool"} (and "refused"
//                  for an HTTP request without the expected Authorization header).
//   --echo-auth    (HTTP only) add the read-only tool whoami, which answers with the Authorization
//                  header it received: a server that repeats a credential back.

import fs from 'node:fs';

export function options(argv) {
  const mode = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'clean';
  const at = argv.indexOf('--log');
  return { mode, log: at >= 0 ? argv[at + 1] : undefined, echoAuth: argv.includes('--echo-auth') };
}

const NO_ARGS = { type: 'object', properties: {}, additionalProperties: false };

const getStatus = {
  name: 'get_status',
  description: 'Returns the fixed status text of this test server. Use it to see that the server is up; do not use it to change anything.',
  inputSchema: NO_ARGS,
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
};
const resetCounter = {
  name: 'reset_counter',
  description: 'Sets the request counter of this test server back to zero. Use it to start a count over; do not use it to read the count.',
  inputSchema: NO_ARGS,
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
};
const clearLog = {
  name: 'clear_log',
  description: 'Empties the request log of this test server. Use it before a new measurement; do not use it while one is running.',
  inputSchema: NO_ARGS,
};
const whoami = {
  name: 'whoami',
  description: 'Returns the Authorization header this request arrived with. Use it to see what the client sent; do not use it for anything else.',
  inputSchema: NO_ARGS,
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
};

export function toolList(opts) {
  if (opts.mode === 'empty') return [];
  if (opts.mode === 'broken') return [{ ...getStatus, inputSchema: { ...NO_ARGS, required: ['target'] } }];
  return [getStatus, resetCounter, clearLog, ...(opts.echoAuth ? [whoami] : [])];
}

export function record(opts, entry) {
  if (opts.log) fs.appendFileSync(opts.log, JSON.stringify(entry) + '\n');
}

/** The JSON-RPC answer to one message, or undefined for a notification. */
export function handle(msg, opts, auth = '') {
  record(opts, { method: msg.method, tool: msg.params?.name });
  if (msg.id === undefined || msg.id === null) return undefined;
  const result = (r) => ({ jsonrpc: '2.0', id: msg.id, result: r });
  const error = (code, message) => ({ jsonrpc: '2.0', id: msg.id, error: { code, message } });
  const text = (t) => result({ content: [{ type: 'text', text: t }] });
  switch (msg.method) {
    case 'initialize':
      return result({
        protocolVersion: msg.params?.protocolVersion ?? '2025-06-18',
        capabilities: opts.mode === 'broken' ? { tools: {}, prompts: {} } : { tools: {} },
        serverInfo: { name: 'mcp-action-sandbox', version: '1.0.0' },
      });
    case 'ping':
      return result({});
    case 'tools/list':
      return result({ tools: toolList(opts) });
    case 'tools/call': {
      const name = msg.params?.name;
      if (!toolList(opts).some((t) => t.name === name)) return error(-32602, `Unknown tool: ${name}`);
      if (name === 'get_status') return text('ok');
      if (name === 'whoami') return text(`Authorization: ${auth}`);
      return text('done');
    }
    case 'prompts/list':
      return error(-32603, 'prompts/list fails on purpose in the broken mode');
    default:
      return error(-32601, `Method not found: ${msg.method}`);
  }
}

export function crashIfAsked(opts) {
  if (opts.mode !== 'crash') return;
  process.stderr.write('fixture: cannot open the database (crash mode, on purpose)\n');
  process.exit(1);
}
