const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  fs.mkdirSync('artifacts', { recursive: true });
  const browser = await chromium.launch({channel:'msedge', headless:true});
  const page = await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];
  page.on('pageerror', e=>errors.push(e.message));
  await page.route('https://static.zdassets.com/**', route=>route.fulfill({contentType:'text/javascript',body:`window.requests=[];window.ZAFClient={init:()=>({invoke:()=>Promise.resolve(),request:async (r)=>{window.requests.push(r);if(r.type==='POST'){const key=r.url.includes('/articles.')?'article':r.url.includes('/sections.')?'section':'category';return {[key]:{id:123}}}if(r.url.includes('categories.json'))return {categories:[{id:1,name:'Getting started'}]};if(r.url.includes('sections.json'))return {sections:[{id:2,category_id:1,name:'Basics'}]};return {articles:[{section_id:2,title:'Hello',body:'<p>Welcome, everyone</p>',draft:true,locale:'en-us',label_names:['welcome']}]}}})};`}));
  await page.goto('http://127.0.0.1:8765/assets/iframe.html');
  await page.getByRole('heading',{name:'Article Migrate',exact:true}).waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({path:'artifacts/desktop.png',fullPage:true});
  const dl=page.waitForEvent('download');
  await page.getByRole('link',{name:/Download CSV template/}).click();
  const download=await dl;
  assert.equal(download.suggestedFilename(),'article-migrate-template.csv');
  const template=fs.readFileSync(await download.path(),'utf8');
  assert.equal(template.trim(),'category,section,title,body_html,status,locale,position,labels');
  await page.locator('#csv-file').setInputFiles({name:'empty.csv',mimeType:'text/csv',buffer:Buffer.from(template)});
  await page.getByRole('button',{name:'Validate CSV',exact:true}).click();
  await page.getByText('Add at least one article to your CSV before validating.').waitFor();
  await page.locator('#csv-file').setInputFiles({name:'manual.csv',mimeType:'text/csv',buffer:Buffer.from(template.trim()+'\r\nGetting started,Basics,Hello,"<p>Welcome, everyone</p>",draft,en-us,0,welcome\r\n')});
  await page.getByRole('button',{name:'Validate CSV',exact:true}).click();
  await page.getByRole('heading',{name:'Validation passed',exact:true}).waitFor();
  await page.getByRole('button',{name:'Run Dry Run'}).click();
  await page.getByText('Migration status: DRY_RUN').waitFor();
  assert.equal(await page.evaluate(()=>window.requests.length),0);
  await page.locator('#confirm').fill('MIGRATE');
  await page.getByRole('button',{name:'Start Migration'}).click();
  await page.getByText('Migration status: COMPLETED',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.requests.filter(r=>r.type==='POST').length),3);
  await page.getByRole('button',{name:'Export from instance',exact:true}).click();
  const ex=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export Help Center CSV'}).click();
  const exported=await ex;
  const csv=fs.readFileSync(await exported.path(),'utf8');
  assert(csv.includes('"<p>Welcome, everyone</p>"'));
  const requestCount=await page.evaluate(()=>window.requests.length);
  for(let retry=0;retry<3;retry++) {
    const repeat=page.waitForEvent('download');
    await page.getByRole('link',{name:'Download CSV',exact:true}).click();
    assert.equal(fs.readFileSync(await (await repeat).path(),'utf8'),csv);
  }
  assert.equal(await page.evaluate(()=>window.requests.length),requestCount,'Downloading must not repeat API export');
  await page.getByRole('button',{name:'Import articles',exact:true}).click();
  await page.locator('#csv-file').setInputFiles({name:'export.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
  await page.getByRole('button',{name:'Validate CSV',exact:true}).click();
  await page.getByRole('heading',{name:'Validation passed',exact:true}).waitFor();
  await page.locator('#csv-file').setInputFiles({name:'required-only.csv',mimeType:'text/csv',buffer:Buffer.from('category,section,title,body_html\nA,B,C,D')});
  await page.getByRole('button',{name:'Validate CSV',exact:true}).click();
  await page.getByRole('heading',{name:'Validation passed',exact:true}).waitFor();
  for(const width of [1920,1024,768,390,320]){
    await page.setViewportSize({width,height:900});
    await page.getByText('How to fill in the template',{exact:true}).click();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow at ${width}`);
    if(width===390)await page.screenshot({path:'artifacts/mobile.png',fullPage:true});
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.reload();
  await page.getByRole('heading',{name:'Article Migrate',exact:true}).waitFor();
  // Zendesk owns the nav-bar iframe height and may clip all outer overflow.
  await page.route('**/embedded-test',route=>route.fulfill({contentType:'text/html',body:'<html style="height:100%;overflow:hidden"><body style="margin:0;height:100%;overflow:hidden"><div style="height:60px">Zendesk host fixture</div><iframe title="Article Migrate" src="/assets/iframe.html" style="display:block;border:0;width:100%;height:calc(100% - 60px)" sandbox="allow-scripts allow-same-origin allow-downloads"></iframe></body></html>'}));
  await page.goto('http://127.0.0.1:8765/embedded-test');
  const app=page.frameLocator('iframe');
  await app.getByRole('button',{name:'Upload CSV',exact:true}).waitFor();
  for(const size of [{width:1366,height:768},{width:1024,height:600},{width:800,height:500},{width:390,height:700},{width:320,height:480}]) {
    await page.setViewportSize(size);
    for(const name of ['Validate CSV','Run Dry Run','Start Migration']) {
      const box=await app.getByRole('button',{name,exact:true}).boundingBox();
      assert(box.y>=60 && box.y+box.height<=size.height,`${name} clipped at ${JSON.stringify(size)}`);
    }
    const bounds=await app.locator('.workspace-scroll').evaluate(el=>({height:el.clientHeight,overflow:getComputedStyle(el).overflowY,width:document.documentElement.scrollWidth,viewport:innerWidth}));
    assert(bounds.height>50 && bounds.overflow==='auto' && bounds.width<=bounds.viewport);
    await app.getByRole('button',{name:'Upload CSV',exact:true}).scrollIntoViewIfNeeded();
    if(size.width===1366) await page.screenshot({path:'artifacts/embedded-desktop.png'});
    if(size.width===320) await page.screenshot({path:'artifacts/embedded-mobile.png'});
  }
  await app.locator('#csv-file').setInputFiles({name:'many.csv',mimeType:'text/csv',buffer:Buffer.from('category,section,title,body_html\n'+Array.from({length:100},(_,i)=>`A,B,Article ${i},Body`).join('\n'))});
  await app.getByRole('button',{name:'Validate CSV',exact:true}).click();
  await app.getByRole('heading',{name:'Validation passed',exact:true}).waitFor();
  await app.getByRole('button',{name:'Run Dry Run',exact:true}).click();
  await app.getByRole('heading',{name:'Dry-run plan',exact:true}).waitFor();
  await app.getByRole('link',{name:/Download CSV template/}).scrollIntoViewIfNeeded();
  const footerBox=await app.getByRole('button',{name:'Start Migration',exact:true}).boundingBox();
  assert(footerBox.y+footerBox.height<=480,'Long results must not push controls offscreen');
  // Simulate a browser suppressing downloads initiated after async API calls.
  await app.locator('body').evaluate(()=>{HTMLAnchorElement.prototype.click=function(){};});
  await app.getByRole('button',{name:'Export from instance',exact:true}).click();
  await app.getByRole('button',{name:'Export Help Center CSV',exact:true}).click();
  await app.getByRole('link',{name:'Download CSV',exact:true}).waitFor();
  const manualDownload=page.waitForEvent('download');
  await app.getByRole('link',{name:'Download CSV',exact:true}).click();
  assert.equal((await manualDownload).suggestedFilename(),'article-migrate-export.csv');
  assert.deepEqual(errors,[]);
  await browser.close();
  console.log('PASS: template download, empty-file guard, manual import, required-only CSV, dry run, mocked migration/export, CSV round trip, five responsive widths, reduced motion, no JS errors.');
})().catch(e=>{console.error(e);process.exit(1)});
