from playwright.sync_api import sync_playwright
URL='http://localhost:8766/'; errs=[]
def run(p,name,vp,mob):
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome'); c=b.new_context(viewport=vp,is_mobile=mob,has_touch=mob); pg=c.new_page()
    pg.on('pageerror',lambda e:errs.append(f'{name}: {e}')); pg.on('console',lambda m: m.type=='error' and errs.append(f'{name} console: {m.text}'))
    pg.on('dialog',lambda d:d.accept('X'))
    w=lambda t=400: pg.wait_for_timeout(t); s=lambda n: pg.screenshot(path=f'shot_v3_{name}_{n}.png')
    pg.goto(URL); w(600); pg.fill('#le','admin@sparrow.demo'); pg.fill('#lp','admin123'); pg.click('form .btn'); w()
    pg.goto(URL+'#/project/c1/list'); w(); s('list')
    if not mob:
        pg.click('.hcell[data-col="pr"]'); w(); pg.hover('.popm .sub:has-text("Sort")'); w(); s('column_menu')
        pg.click('.subm a:text("Descending ↓")'); w(); assert 'Sort: Priority' in pg.content()
        pg.click('.hcell[data-col="due"]'); w(); pg.hover('.popm .sub:has-text("Move column")'); pg.click('.subm a:has-text("Move right")'); w(600)
        assert pg.locator('.lhead .hcell[data-col]').nth(2).get_attribute('data-col')=='due','move'
        pg.click('.hcell[data-col="vis"]'); w(); pg.click('.popm a:has-text("Hide column")'); w(600); assert pg.locator('.hcell[data-col="vis"]').count()==0
        pg.click('button:has-text("Options")'); w(); pg.click('.popm a:has-text("Show Client")'); w(600); assert pg.locator('.hcell[data-col="vis"]').count()==1
        pg.click('.c-add'); w(); pg.fill('#fn','Stage'); pg.click('a:has-text("Add an option")'); w(); s('add_field')
        pg.click('#fsave'); w(700); assert pg.locator('.hcell:has-text("Stage")').count()==1
        fid=pg.locator('.hcell:has-text("Stage")').get_attribute('data-col')
        pg.click(f'.hcell[data-col="{fid}"]'); w(); pg.click('.popm a:has-text("automation")'); w(); pg.select_option('#ao',index=1); pg.click('button:text("Add rule")'); w(600)
        pg.select_option(f'.lrow[data-id="t4"] .c-cf select',index=2); w(700)
        assert 'done' in pg.locator('.lrow[data-id="t4"]').get_attribute('class'),'automation'
        pg.click('.lsh:has-text("Doing")'); w(); s('list_after')
        pg.goto(URL+'#/project/c1/messages'); w(); s('messages')
        pg.goto(URL+'#/project/c1/board'); w(); pg.goto(URL+'#/portfolios'); w()
        pg.reload(); w(800); pg.goto(URL+'#/project/c1/list'); w(); assert pg.locator('.hcell:has-text("Stage")').count()==1,'persist'
    else:
        pg.click('.topbar .iconbtn'); w(); s('drawer'); pg.click('.scrim',position={'x':370,'y':300}); w()
        pg.click('.hcell[data-col="as"]'); w(); s('column_menu')
    pg.goto(URL+'#/tickets'); w(); pg.goto(URL+'#/templates'); w()
    pg.evaluate('logout()'); w(); pg.click('button:text("Client Login")'); pg.fill('#le','client1@sparrow.demo'); pg.fill('#lp','client123'); pg.click('form .btn'); w(700)
    assert 'margin calculation' not in pg.content(); s('client_portal')
    b.close()
with sync_playwright() as p:
    run(p,'desktop',{'width':1280,'height':800},False); run(p,'mobile',{'width':390,'height':844},True)
print('ERRORS:',errs or 'none')
