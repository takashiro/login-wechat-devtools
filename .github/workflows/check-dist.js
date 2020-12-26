const cp = require('child_process');
const rl = require('readline');

const status = cp.execFile('git', ['status', '-s']);
const proc = rl.createInterface({
	input: status.stdout,
});

proc.on('line', async (line) => {
	const file = line.substring(3);
	if (file.startsWith('dist/')) {
		console.error(`File is not updated: ${file}`);
		process.exitCode = 1;
	}
});
