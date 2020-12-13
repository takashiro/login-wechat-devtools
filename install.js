const cp = require('child_process');

cp.execSync('npm ci --production', {
	stdio: 'inherit',
	cwd: __dirname,
});
