import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9223;
const cwd = 'C:\\Paginas web -2026\\06_Portafolio_Freelance_Fabricio';

const proc = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  `--remote-debugging-port=${port}`,
  'http://localhost:3000'
]);

setTimeout(async () => {
  try {
    const listRes = await fetch(`http://localhost:${port}/json`);
    const tabs = await listRes.json();
    const tab = tabs.find(t => t.url && t.url.includes('localhost:3000')) || tabs[0];
    const ws = new globalThis.WebSocket(tab.webSocketDebuggerUrl);

    let step = 0;

    ws.onopen = () => {
      // Step 1: Set device metrics override to true 390x844 mobile viewport
      ws.send(JSON.stringify({
        id: 1,
        method: 'Emulation.setDeviceMetricsOverride',
        params: {
          width: 390,
          height: 1800,
          deviceScaleFactor: 2,
          mobile: true
        }
      }));
    };

    ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === 1) {
        // Step 2: Query scrollWidth to ensure NO horizontal overflow at 390px
        ws.send(JSON.stringify({
          id: 2,
          method: 'Runtime.evaluate',
          params: {
            expression: `(() => {
              const docW = document.documentElement.scrollWidth;
              const vw = window.innerWidth;
              const overflows = [];
              document.querySelectorAll('*').forEach(el => {
                const r = el.getBoundingClientRect();
                if (r.right > vw + 1 || el.scrollWidth > vw + 1) {
                  overflows.push({
                    tag: el.tagName,
                    class: (el.className || '').toString().slice(0, 30),
                    right: Math.round(r.right),
                    width: Math.round(r.width)
                  });
                }
              });
              return { docW, vw, overflows: overflows.slice(0, 10) };
            })()`,
            returnByValue: true
          }
        }));
      } else if (msg.id === 2) {
        console.log('Mobile Layout Audit:', JSON.stringify(msg.result?.result?.value, null, 2));
        // Step 3: Capture full screenshot
        ws.send(JSON.stringify({
          id: 3,
          method: 'Page.captureScreenshot',
          params: {
            format: 'png',
            captureBeyondViewport: true
          }
        }));
      } else if (msg.id === 3) {
        const buffer = Buffer.from(msg.result.data, 'base64');
        const outPath = path.join(cwd, 'screenshot_mobile_true.png');
        fs.writeFileSync(outPath, buffer);
        console.log(`Saved true mobile screenshot to ${outPath} (${buffer.length} bytes)`);

        // Now do desktop capture
        ws.send(JSON.stringify({
          id: 4,
          method: 'Emulation.setDeviceMetricsOverride',
          params: {
            width: 1440,
            height: 3200,
            deviceScaleFactor: 1,
            mobile: false
          }
        }));
      } else if (msg.id === 4) {
        ws.send(JSON.stringify({
          id: 5,
          method: 'Page.captureScreenshot',
          params: {
            format: 'png',
            captureBeyondViewport: true
          }
        }));
      } else if (msg.id === 5) {
        const buffer = Buffer.from(msg.result.data, 'base64');
        const outPath = path.join(cwd, 'screenshot_desktop_true.png');
        fs.writeFileSync(outPath, buffer);
        console.log(`Saved true desktop screenshot to ${outPath} (${buffer.length} bytes)`);
        ws.close();
        proc.kill();
        process.exit(0);
      }
    };
  } catch (err) {
    console.error('Error:', err);
    proc.kill();
    process.exit(1);
  }
}, 2500);
