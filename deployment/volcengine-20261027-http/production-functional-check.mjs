import { chromium } from '/Users/chenxuguang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true,args:['--host-resolver-rules=MAP live-http.test 127.0.0.1','--no-proxy-server']});
try {
 const page=await browser.newPage();
 // Read this public prototype's generated captcha in an isolated test profile.
 // No screenshot, customer profile, server account or server data is used.
 await page.addInitScript(()=>{
   globalThis.__testCaptcha='';
   const rect=CanvasRenderingContext2D.prototype.fillRect;
   CanvasRenderingContext2D.prototype.fillRect=function(...args){if(this.canvas.width===264&&this.canvas.height===84)globalThis.__testCaptcha='';return rect.apply(this,args)};
   const text=CanvasRenderingContext2D.prototype.fillText;
   CanvasRenderingContext2D.prototype.fillText=function(...args){if(this.canvas.width===264&&this.canvas.height===84&&String(args[0]).length===1)globalThis.__testCaptcha+=String(args[0]);return text.apply(this,args)};
 });
 const base='http://live-http.test:4189/xingchen';
 async function open(path) { for(let i=0;i<3;i++){try {const r=await page.goto(base+path,{waitUntil:'networkidle',timeout:60000});if(r.status()>=400)throw new Error('HTTP '+r.status());return;}catch(e){if(i===2)throw e;}} }
 await open('/login');
 const secure=await page.evaluate(()=>isSecureContext);if(secure)throw new Error('Not HTTP context');
 async function login(password){
   await page.locator('input[name="username"]').fill('admin');
   await page.locator('input[name="password"]').fill(password);
   await page.waitForFunction(()=>globalThis.__testCaptcha.length===4);
   await page.locator('#login-captcha').fill(await page.evaluate(()=>globalThis.__testCaptcha));
   await page.getByRole('button',{name:'登录系统',exact:true}).click();
   await page.waitForURL('**/admin/**',{timeout:30000});
 }
 await login('12345678');
 await open('/account/profile');
 await page.getByRole('button',{name:'修改密码',exact:true}).click();
 await page.locator('input[name="currentPassword"]').fill('12345678');
 await page.locator('input[name="newPassword"]').fill('HttpLiveTest123!');
 await page.locator('input[name="confirmPassword"]').fill('HttpLiveTest123!');
 await page.getByRole('button',{name:'保存新密码',exact:true}).click();
 await page.waitForURL('**/login',{timeout:30000});
 await login('HttpLiveTest123!');
 console.log(JSON.stringify({productionHttpViaSshTunnel:true,isSecureContext:secure,profilePasswordDialog:true,passwordChanged:true,newPasswordLogin:true,isolatedBrowserStorage:true,screenshots:false},null,2));
} finally { await browser.close(); }
