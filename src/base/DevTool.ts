import * as path from 'path';

interface DevTool {
	cli: string;
	gui: string;
	installDir: string;
	dataDir: string;
	userDataDir: string;
	launchDelay: number;
	logoutDelay: number;
}

export const devToolMap: Record<string, DevTool> = {
	win32: {
		cli: 'cli.bat',
		gui: '微信开发者工具.exe',
		installDir: 'C:\\Program Files (x86)\\Tencent\\微信web开发者工具',
		dataDir: path.join('AppData', 'Local', '微信开发者工具'),
		userDataDir: 'User Data',
		launchDelay: 5000,
		logoutDelay: 10000,
	},
	darwin: {
		cli: 'cli',
		gui: 'wechatwebdevtools',
		installDir: '/Applications/wechatwebdevtools.app/Contents/MacOS',
		dataDir: path.join('Library', 'Application Support', '微信开发者工具'),
		userDataDir: '',
		launchDelay: 5000,
		logoutDelay: 3000,
	},
};

export default DevTool;
