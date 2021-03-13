import * as os from 'os';
import * as path from 'path';

import DevTool from './DevTool';

const devToolMap: Record<string, DevTool> = {
	win32: new DevTool({
		cli: 'cli.bat',
		gui: '微信开发者工具.exe',
		installDir: 'C:\\Program Files (x86)\\Tencent\\微信web开发者工具',
		dataDir: path.join('AppData', 'Local', '微信开发者工具'),
		userDataDir: 'User Data',
		launchDelay: 5000,
		logoutDelay: 10000,
	}),
	darwin: new DevTool({
		cli: 'cli',
		gui: 'wechatwebdevtools',
		installDir: '/Applications/wechatwebdevtools.app/Contents/MacOS',
		dataDir: path.join('Library', 'Application Support', '微信开发者工具'),
		userDataDir: '',
		launchDelay: 10000,
		logoutDelay: 3000,
	}),
};

export default class DevToolFactory {
	static getInstance(): DevTool | undefined {
		return devToolMap[os.platform()];
	}
}
