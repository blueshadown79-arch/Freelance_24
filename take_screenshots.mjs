import { spawnSync } from 'child_process';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const cwd = 'C:\\Paginas web -2026\\06_Portafolio_Freelance_Fabricio';

const targets = [
  {
    name: 'desktop',
    file: path.join(cwd, 'screenshot_desktop_redesign.png'),
    size: '1440,3200'
  },
  {
    name: 'mobile',
    file: path.join(cwd, 'screenshot_mobile_redesign.png'),
    size: '390,2000'
  }
];

for (const target of targets) {
  console.log(`Capturing ${target.name} to ${target.file}...`);
  const args = [
    '--headless=new',
    '--disable-gpu',
    `--screenshot=${target.file}`,
    `--window-size=${target.size}`,
    'http://localhost:3000'
  ];
  const res = spawnSync(chromePath, args, { encoding: 'utf-8' });
  console.log(`Finished ${target.name}:`, res.status, res.stdout, res.stderr);
}
