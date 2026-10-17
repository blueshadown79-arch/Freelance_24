import { spawn } from 'child_process';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9222;

const proc = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  `--remote-debugging-port=${port}`,
  '--window-size=390,1000',
  'http://localhost:3000'
]);

setTimeout(async () => {
  try {
    const listRes = await fetch(`http://localhost:${port}/json`);
    const tabs = await listRes.json();
    const tab = tabs.find(t => t.url && t.url.includes('localhost:3000')) || tabs[0];
    console.log('Using Tab URL:', tab.url);
    const wsUrl = tab.webSocketDebuggerUrl;

    const ws = new globalThis.WebSocket(wsUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            const docW = document.documentElement.scrollWidth;
            const vw = window.innerWidth;
            const overflows = [];
            document.querySelectorAll('*').forEach(el => {
              const r = el.getBoundingClientRect();
              if (r.right > vw + 2 || el.scrollWidth > vw + 2) {
                overflows.push({
                  tag: el.tagName,
                  class: el.className,
                  id: el.id,
                  right: Math.round(r.right),
                  width: Math.round(r.width),
                  scrollWidth: el.scrollWidth
                });
              }
            });
            return { docW, vw, overflows: overflows.slice(0, 20) };
          })()`,
          returnByValue: true
        }
      }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === 1) {
        console.log('Result:', JSON.stringify(msg.result?.result?.value || msg, null, 2));
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
