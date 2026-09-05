import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function auditRegression(browser, baseUrl, outDir) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const evidence = { measuredAt: new Date().toISOString(), layouts: [], checks: [] };
  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    const dataTrigger = page.locator('summary[aria-label="学习数据"]');
    assert.equal(await dataTrigger.count(), 1, 'data menu must have a stable accessible name');
    await dataTrigger.click();
    const panel = page.locator('[aria-label="本地学习数据"]');
    await page.evaluate(async () => {
      localStorage.setItem('kirina.profile.v2', JSON.stringify({ name: 'Keep me' }));
      await new Promise((resolve, reject) => {
        const request = indexedDB.open('kirina-learning-recordings', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('recordings', { keyPath: 'id' });
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db=request.result, tx=db.transaction('recordings','readwrite');
          tx.objectStore('recordings').put({ id:'audit-recording', kind:'shadowing', blob:new Blob(['audio']), createdAt:new Date().toISOString() });
          tx.oncomplete=()=>{ db.close(); resolve(); }; tx.onerror=()=>reject(tx.error);
        };
      });
    });
    const before = await snapshot(page);
    const upload = async backup => panel.locator('input[type="file"]').setInputFiles({ name:'audit-backup.json', mimeType:'application/json', buffer:Buffer.from(JSON.stringify(backup)) });
    const envelope = entries => ({ app:'kirina-korean', version:1, exportedAt:new Date().toISOString(), entries });
    await upload(envelope({ 'kirina.progress.v2':'{"completedLessons":"wrong"}' }));
    await panel.getByRole('alert').waitFor();
    assert.deepEqual(await snapshot(page), before, 'malformed backup must not change text or recordings');
    const valid=envelope({ 'kirina.profile.v2':JSON.stringify({ name:'Restored learner' }) });
    await upload(valid);
    await panel.getByRole('heading', { name:'确认替换本机数据' }).waitFor();
    assert.deepEqual(await snapshot(page), before, 'preview must not mutate data');
    await panel.getByRole('button', { name:'取消导入' }).click();
    assert.deepEqual(await snapshot(page), before, 'cancel must preserve data and recordings');
    await upload(valid);
    await panel.getByRole('heading', { name:'确认替换本机数据' }).waitFor();
    await Promise.all([page.waitForEvent('load'), panel.getByRole('button', { name:'替换本机数据并清空录音' }).click()]);
    await page.waitForLoadState('networkidle');
    const restored=await snapshot(page);
    assert.equal(JSON.parse(restored.profile).name,'Restored learner');
    assert.equal(restored.recordings,0);
    evidence.checks.push('backup: malformed, preview, cancel, confirm, IndexedDB cleanup');

    for(const width of [320,390,768,1024,1280,1440]) {
      await page.setViewportSize({ width,height:900 });
      for(const route of ['/vocabulary','/grammar','/immersion','/learn/l01-hangul-map']) {
        await page.goto(baseUrl+route,{waitUntil:'networkidle'});
        const layout=await page.evaluate(route=>{
          const rect=selector=>{const e=document.querySelector(selector);const r=e?.getBoundingClientRect();return r?{top:r.top+scrollY,left:r.left,width:r.width,height:r.height}:null;};
          return {route,width:innerWidth,dom:document.querySelectorAll('*').length,scrollWidth:document.documentElement.scrollWidth,search:rect('input[type="search"]'),title:rect('h1'),titleDisplay:getComputedStyle(document.querySelector('h1')).display,material:rect('#current-material-heading')};
        },route);
        assert.ok(layout.scrollWidth<=width+2,`${route} overflows at ${width}`);
        assert.ok(layout.dom<2500,`${route} exceeded DOM budget at ${width}: ${layout.dom}`);
        if(['/vocabulary','/grammar'].includes(route)) {
          assert.ok(layout.search,`${route} must expose a search input`);
          assert.ok(layout.search.top<1000,`${route} search is too far below the fold: ${layout.search.top}`);
        }
        if(layout.material)assert.ok(layout.material.top<1500,`current material is buried: ${layout.material.top}`);
        if(route.startsWith('/learn'))assert.equal(layout.titleDisplay,'block');
        evidence.layouts.push(layout);
        if(width===390)await page.screenshot({path:fileURLToPath(new URL(`audit-${route.split('/')[1]}-390.png`,outDir)),fullPage:false});
      }
    }
    await page.setViewportSize({width:320,height:844});
    const trigger=page.locator('summary.season-trigger');
    await trigger.click();
    const themeLabels=await page.locator('.theme-toggle button').allTextContents();
    await trigger.press('Escape');
    for(const label of themeLabels) {
      await trigger.press('Enter');
      const option=page.locator('.theme-toggle button').filter({hasText:label.trim()});
      const bounds=await option.boundingBox();
      assert.ok(bounds.width>=44&&bounds.height>=44&&bounds.x>=0&&bounds.x+bounds.width<=320,'theme tap targets must fit narrow screens');
      await option.click();
      assert.equal(await page.locator('.season-switcher').getAttribute('open'),null);
      assert.equal(await page.evaluate(()=>document.activeElement?.classList.contains('season-trigger')),true);
    }
    evidence.checks.push('six viewport layouts, title block flow, named data menu, four theme targets and focus');
    await page.goto(baseUrl+'/vocabulary',{waitUntil:'networkidle'});
    const cards=page.locator('article').filter({has:page.getByRole('button',{name:'测一测，再加入复习'})});
    assert.equal(await cards.count(),12);
    const initial=await cards.first().textContent();
    const pager=page.getByRole('navigation',{name:'词汇分页',exact:true});
    await pager.getByRole('button',{name:'下一页'}).click();
    assert.notEqual(await cards.first().textContent(),initial);
    assert.equal(await cards.count(),12);
    assert.equal(await page.evaluate(()=>document.activeElement?.id),'library-results');
    await page.getByLabel('搜索词汇').fill('안녕하세요');
    assert.ok(await cards.count()<=12);
    assert.ok(await pager.getByRole('button',{name:'上一页'}).isDisabled());
    await page.getByLabel('搜索词汇').fill('');
    assert.ok(await pager.getByRole('button',{name:'上一页'}).isDisabled(), 'returning to the original filter must keep page one');
    assert.equal(await cards.first().textContent(),initial);
    evidence.checks.push('pagination bounds, next-page contents, filter reset and return, focus');

    // Another tab removes the exact card shown in an active session.
    await page.evaluate(()=>{
      localStorage.setItem('kirina.srs.v2',JSON.stringify({cards:{'mistake:audit':{id:'mistake:audit',box:0,dueAt:Date.now()-1000,correct:0,wrong:1,lastSeenAt:null,payload:{kind:'mistake',itemId:'audit',type:'choice',prompt:'冲突测试题',answer:'가',choices:['가','나']}}},history:[]}));
    });
    await page.goto(baseUrl+'/review',{waitUntil:'networkidle'});
    await page.getByRole('heading',{name:'冲突测试题',exact:true}).waitFor();
    const second=await context.newPage();
    await second.goto(baseUrl+'/settings',{waitUntil:'networkidle'});
    await second.evaluate(()=>localStorage.setItem('kirina.srs.v2',JSON.stringify({cards:{},history:[]})));
    await page.getByRole('button',{name:'读取更新后的队列'}).waitFor();
    await page.getByRole('button',{name:'读取更新后的队列'}).click();
    await page.getByRole('heading',{name:'现在没有到期复习'}).waitFor();
    assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('kirina.srs.v2')).history),[]);
    await second.close();
    evidence.checks.push('cross-tab review refresh without duplicate history');

    await audioFailureRegression(browser,baseUrl);
    evidence.checks.push('real media load failure unlocks onboarding deferral without listening credit');
    writeFileSync(new URL('audit-regression.json',outDir),JSON.stringify(evidence,null,2));
    console.log('Audit regressions passed: '+evidence.checks.join('; '));
  } catch(error) {
    await page.screenshot({path:fileURLToPath(new URL('audit-regression-failure.png',outDir)),fullPage:true}).catch(()=>{});
    throw error;
  } finally { await context.close(); }
}

async function snapshot(page) {
  return page.evaluate(async()=>({
    profile:localStorage.getItem('kirina.profile.v2'),progress:localStorage.getItem('kirina.progress.v2'),
    recordings:await new Promise((resolve,reject)=>{
      const request=indexedDB.open('kirina-learning-recordings',1);
      request.onerror=()=>reject(request.error);
      request.onsuccess=()=>{const db=request.result;const tx=db.transaction('recordings','readonly');const count=tx.objectStore('recordings').count();count.onsuccess=()=>resolve(count.result);tx.oncomplete=()=>db.close();};
    })
  }));
}

async function audioFailureRegression(browser,baseUrl) {
  const context=await browser.newContext();
  try {
    await context.route('**/assets/audio/**',route=>route.abort('failed'));
    const page=await context.newPage();
    await page.goto(baseUrl+'/onboarding',{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'我是零基础，从头开始'}).click();
    await page.getByRole('button',{name:'下一步：检查发音'}).click();
    await page.getByRole('button',{name:/试听 안녕하세요/}).click();
    await page.getByRole('button',{name:'暂时没声音，先去打字'}).waitFor({timeout:12000});
    await page.getByRole('button',{name:'暂时没声音，先去打字'}).click();
    await page.getByLabel('试打韩文').waitFor();
    const progress=await page.evaluate(()=>JSON.parse(localStorage.getItem('kirina.progress.v2')??'{}'));
    assert.ok(!progress.lessonListeningEvidence||Object.keys(progress.lessonListeningEvidence).length===0);
  } finally {await context.close();}
}
