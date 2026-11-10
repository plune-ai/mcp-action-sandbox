// stdio transport: one JSON-RPC message per line on stdin, one answer per line on stdout.
//   node dist/server.js [clean|broken|empty|crash] [--log <file>]
import readline from 'node:readline';
import { crashIfAsked, handle, options } from './fixture.js';

const opts = options(process.argv.slice(2));
crashIfAsked(opts);
readline.createInterface({ input: process.stdin }).on('line', (line) => {
  if (!line.trim()) return;
  const answer = handle(JSON.parse(line), opts);
  if (answer) process.stdout.write(JSON.stringify(answer) + '\n');
});
