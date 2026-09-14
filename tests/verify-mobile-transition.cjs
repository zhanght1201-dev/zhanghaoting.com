const {webkit,devices}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict');const path=require('node:path');
const base=process.env.SITE_URL||'http://127.0.0.1:8771';
(async()=>{const browser=await webkit.launch({headless:true});try{
 const context=await browser.newContext({...devices['iPhone 13']}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const slug of ['about','school','work','notes']){
  await page.goto(base+'/');await page.locator('.card.'+slug).tap();await page.locator('.summary:not([hidden]) .details').tap();await page.waitForSelector('.story-piece img');
  assert.equal(await page.locator('.story-piece').count(),5);await page.waitForTimeout(1300);
  assert(await page.locator('.story-piece img').first().evaluate(el=>el.complete&&el.naturalWidth>100));
  const stage=page.locator('.transition-sheet');const box=await stage.boundingBox();assert(box.height>200&&box.width>300);
  if(process.env.SCREENSHOT_DIR)await stage.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'safari-'+slug+'.png')});
  await page.waitForURL(base+'/'+slug+'/');await page.waitForSelector('.transition-screen.is-breaking');assert.equal(await page.locator('.story-piece img').count(),12);await page.waitForSelector('.transition-screen',{state:'detached'});assert.equal(await page.locator('[inert]').count(),0);
 }
 // Cold mobile load longer than the old 6.5 second timeout still shows a preview and then plays.
 const slow=await browser.newContext({...devices['iPhone 13']}),p=await slow.newPage();
 await p.route('**/story-about-final.png',async route=>{await new Promise(resolve=>setTimeout(resolve,8000));await route.continue()});
 await p.goto(base+'/');await p.addStyleTag({content:'.transition-sheet{aspect-ratio:auto!important}'});await p.locator('.card.about').tap();await p.locator('.summary:not([hidden]) .details').tap();await p.waitForTimeout(6700);
 assert.equal(new URL(p.url()).pathname,'/');assert(await p.locator('.transition-preview').isVisible());assert((await p.locator('.transition-sheet').boundingBox()).height>200);
 await p.waitForSelector('.story-piece img');await p.waitForURL(base+'/about/');await p.waitForSelector('.transition-screen',{state:'detached'});
 assert.deepEqual(errors,[]);console.log('PASS: WebKit iPhone touch, all four decoded comic pages, twelve target shards, focus unlock, and an 8-second cold load without blanking or skipping.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
