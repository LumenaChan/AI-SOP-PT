import { chromium } from '/Users/chenxuguang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--host-resolver-rules=MAP http-compat.test 127.0.0.1','--no-proxy-server'] });
try {
  const page = await browser.newPage();
  await page.goto('http://http-compat.test:4178/', {waitUntil:'domcontentloaded'});
  const result = await page.evaluate(async () => {
    if (isSecureContext || crypto.subtle || crypto.randomUUID) throw new Error('Not a real insecure HTTP context');
    const {createAdminAccountActions} = await import('/src/adminAccountActions.js');
    const {createOwnProfileActions} = await import('/src/accountProfileRules.js');
    const {authenticatePrototypeAccount} = await import('/src/teacherAccountRules.js');
    let data = {teachers:[],adminUsers:[],auditLogs:[]}, session={role:'admin',account:'admin',source:'browser'};
    const options={ getData:()=>data, setData:(fn)=>{data=fn(data)}, getSession:()=>session, getSource:()=> 'browser', source:'browser' };
    const actions=createAdminAccountActions(options);
    const created=await actions.createAdminUser({name:'HTTP临时验证',account:'http_test_user',identity:'普通管理员',permissions:['overview']});
    session={...(await authenticatePrototypeAccount(data,'http_test_user',created.temporaryPassword)),source:'browser'};
    await actions.changeAdminPassword({currentPassword:created.temporaryPassword,newPassword:'HttpNew123!',confirmPassword:'HttpNew123!'});
    await authenticatePrototypeAccount(data,'http_test_user','HttpNew123!');
    let rejected=false;try{await authenticatePrototypeAccount(data,'http_test_user',created.temporaryPassword)}catch{rejected=true}
    if(!rejected) throw new Error('Old password remained valid');
    session={role:'admin',account:'admin',source:'browser'};
    await createOwnProfileActions(options).changeSystemAdminPassword({currentPassword:'12345678',newPassword:'RootHttp123!',confirmPassword:'RootHttp123!'});
    await authenticatePrototypeAccount(data,'admin','RootHttp123!');
    rejected=false;try{await authenticatePrototypeAccount(data,'admin','12345678')}catch{rejected=true}
    if(!rejected) throw new Error('Old root password remained valid');
    if(JSON.stringify(data).includes('HttpNew123!') || JSON.stringify(data).includes('RootHttp123!')) throw new Error('Plaintext persisted');
    return {isSecureContext,subtleAvailable:!!crypto.subtle,randomUUIDAvailable:!!crypto.randomUUID,accountCreation:true,temporaryPasswordChange:true,rootPasswordChange:true,newPasswordLogin:true,oldPasswordRejected:true,plaintextPersisted:false};
  });
  console.log(JSON.stringify(result,null,2));
} finally { await browser.close(); }
