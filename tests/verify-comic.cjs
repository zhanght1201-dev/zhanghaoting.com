const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict');
const base=process.env.SITE_URL||'http://127.0.0.1:8771';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true});
 try{
 const context=await browser.newContext({viewport:{width:1440,height:1060}}),page=await context.newPage(),errors=[],bad=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.url()+':'+r.status())});
 const home=()=>page.goto(base+'/');
 const mode=()=>page.locator('html').getAttribute('data-ui');
 const overflow=async(label)=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' horizontal overflow');
 await home();assert.equal(await mode(),'comic');assert.equal(await page.locator('[data-ui-mode=comic]').getAttribute('aria-pressed'),'true');assert(!(await page.locator('body').innerText()).includes('美漫'));
 await page.locator('.card').first().hover();await page.waitForSelector('.comic-fx');await page.mouse.move(1,1);assert.equal(await page.locator('.comic-fx').count(),0);
 await page.waitForTimeout(1000);await page.locator('.motion-control').click();const still=await page.locator('.comic-strip').first().getAttribute('style');await page.waitForTimeout(220);assert.equal(await page.locator('.comic-strip').first().getAttribute('style'),still);await page.locator('.motion-control').click();
 for(const slug of ['about','school','work','notes']){
  await home();const card=page.locator('.card.'+slug);await card.click();assert.equal(await page.locator('dialog').getAttribute('data-section'),slug);
  await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0);assert(await card.evaluate(el=>el===document.activeElement));
  await card.click();await page.locator('.summary:not([hidden]) .details').click();await page.waitForSelector('.story-piece');assert.equal(await page.locator('.story-piece').count(),5);
  assert((await page.locator('.transition-screen').getAttribute('style')).includes('story-'+slug+'-final.png'));
  await page.waitForURL(base+'/'+slug+'/');await page.waitForSelector('.transition-screen.is-breaking');assert.equal(await page.locator('.story-piece').count(),12);
  await page.waitForSelector('.transition-screen',{state:'detached'});assert.equal(await mode(),'comic');assert.equal(await page.locator('[data-reading]').getAttribute('data-comic-section'),slug);assert.equal(await page.locator('[inert]').count(),0);await overflow(slug);
 }
 await page.locator('[data-filter=reading]').click();assert.equal(await page.locator('[data-note]:visible').count(),0);await page.locator('[data-filter=all]').click();assert.equal(await page.locator('[data-note]:visible').count(),3);
 await page.locator('.note-row h3 a').first().click();assert(page.url().includes('/notes/'));assert.equal(await page.locator('h1').count(),1);await overflow('article');
 await home();await page.locator('.card.school').click();await page.locator('dialog [data-open=notes]').click();assert.equal(await page.locator('.summary:not([hidden])').getAttribute('data-summary'),'notes');await page.locator('.summary:not([hidden]) .details').click();await page.waitForSelector('.transition-screen');await page.keyboard.press('Escape');await page.waitForURL(base+'/notes/');await page.waitForTimeout(150);assert.equal(await page.locator('.transition-screen').count(),0);
 await home();await page.locator('[data-ui-mode=pixel]').click();assert.equal(await mode(),'pixel');assert.equal(await page.locator('.card .comic-art').first().isVisible(),false);assert(await page.locator('#city').isVisible());await page.reload();assert.equal(await mode(),'pixel');
 await page.locator('.card.about').click();await page.locator('.summary:not([hidden]) .details').click();await page.waitForURL(base+'/about/');assert.equal(await mode(),'pixel');assert.equal(await page.locator('.transition-screen').count(),0);assert.equal(await page.locator('.reading-art .comic-art').isVisible(),false);await page.locator('[data-ui-mode=comic]').click();assert.equal(await mode(),'comic');
 for(const width of [1440,1024,768,390,360]){
  await page.setViewportSize({width,height:900});await home();await overflow('home '+width);
  for(const h of await page.locator('.card h2').all()){assert(await h.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'clipped title '+width)}
  await page.locator('.card.notes').click();await overflow('dialog '+width);await page.keyboard.press('Escape');
  await page.goto(base+'/notes/');await overflow('notes '+width);
  if(width<=390){await page.locator('.menu-toggle').click();assert(await page.locator('#site-nav').isVisible());await overflow('menu '+width)}
  await page.locator('[data-ui-mode=pixel]').click();await home();await overflow('pixel '+width);await page.locator('[data-ui-mode=comic]').click();
 }
 // A failed story asset must never strand the visitor in the overlay.
 await page.route('**/story-about-final.png',r=>r.abort());await home();await page.locator('.card.about').click();await page.locator('.summary:not([hidden]) .details').click();await page.waitForURL(base+'/about/');await page.unroute('**/story-about-final.png');assert.equal(await page.locator('.transition-screen').count(),0);
 const plain=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),p=await plain.newPage();await p.goto(base+'/');assert(await p.locator('.card .comic-art').first().isVisible());await p.locator('.card.about').click();assert.equal(new URL(p.url()).pathname,'/about/');assert(await p.locator('h1').isVisible());
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);console.log('PASS: default/persisted modes, four 5-panel/12-shard routes, hover, pause, skip, dialog focus, notes, five widths, pixel fallback, asset failure and no-JS.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
