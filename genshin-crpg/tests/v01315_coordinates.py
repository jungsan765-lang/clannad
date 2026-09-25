"""Targeted v0.13.15 checks against v0.13.14. Runs built local app; never contacts production."""
from pathlib import Path
import json, hashlib, mimetypes, re, sys, base64, os, shutil
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]; D=R/'dist'; O=R/'reports/v01315'; O.mkdir(parents=True,exist_ok=True)
FIXTURES=R/'tests/v01315_fixtures'
BASE_HASHES=json.loads((FIXTURES/'baseline-hashes.json').read_text())
checks=[];errors=[];pixel_samples=[]
def ck(name,result,evidence=None):
 checks.append({'name':name,'passed':bool(result),'evidence':evidence}); print(('PASS ' if result else 'FAIL ')+name,flush=True)
 if not result: raise AssertionError(name)
def catalog(p):return json.loads(p.read_text().split('=',1)[1].strip().rstrip(';'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
a=catalog(R/'source/runtime_liyue_area_content.js');old=json.loads((FIXTURES/'baseline-catalog.json').read_text())
allowed={'point','anchor','anchorKind','anchorFeature'}
ck('All 26 IDs and gameplay fields preserved',len(a['areas'])==26 and all({k:v for k,v in x.items() if k not in allowed}=={k:v for k,v in y.items() if k not in allowed} for x,y in zip(a['areas'],old['areas'])))
ck('All 39 route pairs, travel times and modes preserved',a['links']==old['links'] and len(a['links'])==39)
ck('Only coordinate catalog, area UI and stylesheet changed in source',set(p.name for p in (R/'source').iterdir() if p.is_file() and p.name in BASE_HASHES['source'] and sha(p)!=BASE_HASHES['source'][p.name])=={'runtime_liyue_area_content.js','app_liyue_areas.js','style.css'})
ck('Approved terrain image unchanged in source and build',sha(R/'assets/terrain/liyue.png')==a['coordinateSystem']['imageSha256']==sha(D/'assets/terrain/liyue.png')==BASE_HASHES['liyueTerrain'])
ck('All selected pixel coordinates are within the original canvas',all(0<=x['point'][0]<880 and 0<=x['point'][1]<786 for x in a['areas']))
setup="""s=>{GameEffects.cancel();game=new Runtime(DB,s);game.s.equipmentGuide={version:1,acquired:true,equipped:true,pendingAcquired:null,pendingEquipped:null};document.getElementById('modal').close();showArt=false;settings.uiTutorialVersion=1;settings.audioEnabled=false;settings.reducedMotion=true;activeTutorial=null;document.getElementById('tutorial-tour')?.remove();saveFailed=false;autoSavePaused=false;busy=false;storeSave=async()=>({});persistSettings=async()=>({});NavigationUI.saveId=null;render();}"""
state=json.loads((FIXTURES/'synthetic-liyue-state.json').read_text())
# This is an inherited synthetic test fixture (V011-2), never an account save.
try:
 with sync_playwright() as p:
  browser_path=os.environ.get('CRPG_CHROMIUM') or shutil.which('chromium') or shutil.which('chromium-browser')
  browser=p.chromium.launch(**({'executable_path':browser_path} if browser_path else {}),headless=True,args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1440,'height':1050});page.set_default_timeout(8000)
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.route('**/*',lambda r:r.abort())
  h=(D/'index.html').read_text();scripts=re.findall(r'<script[^>]+src="([^"]+)"[^>]*></script>',h)
  h=re.sub(r'<script[^>]*>.*?</script>','',h,flags=re.S);h=re.sub(r'<link[^>]*>','',h)
  page.set_content(h)
  css=(D/'style.css').read_text()
  def inline_font(m):
   file=D/m.group(1).strip("\"'")
   if file.is_file() and file.suffix in ('.woff','.woff2','.ttf'):
    return "url(data:font/woff2;base64,"+base64.b64encode(file.read_bytes()).decode()+")"
   return m.group(0)
  css=re.sub(r'url\(([^)]+)\)',inline_font,css)
  page.add_style_tag(content=css)
  for script in scripts:page.add_script_tag(content=(D/script.split('?')[0]).read_text())
  for region in ['mond','liyue']:
   page.evaluate('([k,url])=>CRPGTerrainMap.atlases[k].url=url',[region,'data:image/png;base64,'+base64.b64encode((D/f'assets/terrain/{region}.png').read_bytes()).decode()])
  page.evaluate(setup,state);page.wait_for_function("document.querySelector('.terrain-raster')?.naturalWidth===880")
  ck('26 area entries and 78 directed edges installed',page.evaluate("CRPGRuntime.liyueAreaCatalog.areas.every(a=>game.tables['32_MAP_DB'].has(a.id)) && game.rows('47_MAP_EDGE_DB').filter(r=>r[0].startsWith('EDGE_LY_DETAIL_')).length===78"))
  maxerr=0
  before=page.evaluate('game.serialize()')
  for width in [1440,390]:
   page.set_viewport_size({'width':width,'height':1050 if width>500 else 844})
   for z in [1,2,4]:
    for area in a['areas']:
     page.evaluate("([id,z])=>{const p=CRPGTerrainMap.points[id];NavigationUI.atlas='liyue';NavigationUI.camera={mode:'custom',zoom:z,cx:p[1],cy:p[2]};NavigationUI.choose(id);}",[area['id'],z]);page.wait_for_timeout(12)
     result=page.evaluate("""id=>{const im=document.querySelector('.terrain-raster').getBoundingClientRect(),el=document.querySelector('.terrain-anchor[data-map-id="'+id+'"]');if(!el)return null;const r=el.getBoundingClientRect(),p=CRPGTerrainMap.points[id];return {error:Math.hypot(r.x+r.width/2-im.x-p[1]/880*im.width,r.y+r.height/2-im.y-p[2]/786*im.height),text:document.querySelector('.liyue-coordinate-value')?.textContent};}""",area['id'])
     assert result is not None,area['id']
     maxerr=max(maxerr,result['error']);pixel_samples.append({'id':area['id'],'width':width,'zoom':z,'error_css_px':result['error']})
     assert f"X {area['point'][0]} / Y {area['point'][1]}" in result['text']
  ck('All 26 anchors align at desktop/mobile and 1x/2x/4x',maxerr<1,{'samples':len(pixel_samples),'max_error_css_px':maxerr})
  ck('Map selection and zoom preserve full serialized game state',page.evaluate('game.serialize()')==before)
  ck('Mobile has no horizontal page overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  ck('Unpictured regions have no invented anchors',page.evaluate("!CRPGTerrainMap.points.MAP_CHENYU_YILONG&&!CRPGTerrainMap.points.MAP_CHENYU_QIAOYING"))
  # Real app screenshots, original approved raster, no generated UI or replacement imagery.
  for width,tag in [(1440,'desktop'),(390,'mobile')]:
   page.set_viewport_size({'width':width,'height':1050 if width>500 else 844});page.evaluate(setup,state)
   page.evaluate("()=>{const pt=CRPGTerrainMap.points.MAP_LY_DETAIL_YUJING;NavigationUI.atlas='liyue';NavigationUI.camera={mode:'custom',zoom:3,cx:pt[1]+18,cy:pt[2]-20};NavigationUI.choose('MAP_LY_DETAIL_YUJING');}")
   page.wait_for_timeout(160);page.locator('#journey-map').screenshot(path=str(O/f'liyue-coordinates-{tag}.png'))
  page.set_viewport_size({'width':1440,'height':1050});page.evaluate(setup,state)
  page.evaluate("()=>{game.s.global.CURRENT_MAP_ID='MAP_LY_DETAIL_WANGSHU';NavigationUI.saveId=null;render();NavigationUI.camera={mode:'custom',zoom:3,cx:507,cy:244};NavigationUI.choose('MAP_LY_DETAIL_DIHUA');}");page.wait_for_timeout(180)
  page.locator('#journey-map').screenshot(path=str(O/'wangshu-dihua-desktop.png'))
  # Confirmed UI MOVE examples, random encounters disabled for the deterministic travel check only.
  moves=[]
  for start,dest,minutes in [('MAP_LIYUE_HARBOR','MAP_LY_DETAIL_FEIYUN',5),('MAP_LY_DETAIL_FEIYUN','MAP_LY_DETAIL_YUJING',5),('MAP_LY_DETAIL_WHARF','MAP_LY_DETAIL_GUYUN',60)]:
   page.evaluate(setup,state)
   page.evaluate("([id,dest])=>{game.s.global.CURRENT_MAP_ID=id;game.s.global.WORLD_TIME='12:00';game.rollEncounter=()=>null;NavigationUI.saveId=null;render();NavigationUI.choose(dest);}",[start,dest])
   evidence=page.evaluate("id=>({edge:game.navigationRoute(id)?.edges?.[0],button:document.querySelector('.terrain-travel')?.textContent,disabled:document.querySelector('.terrain-travel')?.disabled})",dest)
   page.locator('.terrain-travel').click();page.wait_for_function('(id)=>game.s.global.CURRENT_MAP_ID===id',arg=dest)
   outcome=page.evaluate('({map:game.s.global.CURRENT_MAP_ID,cost:game.s.global.LAST_MOVE_TIME_COST_MIN,time:game.s.global.WORLD_TIME})')
   moves.append({'from':start,'to':dest,'before':evidence,'after':outcome})
   assert int(outcome['cost'])==minutes,moves[-1]
  ck('3 confirmed real MOVE routes keep original travel costs',True,moves)
  ck('No uncaught browser errors',not errors,errors)
  browser.close()
finally:
 (O/'verification.json').write_text(json.dumps({'checks':checks,'passed':sum(c['passed'] for c in checks),'total':len(checks),'errors':errors,'pixel_samples':pixel_samples,'limitations':['Screenshot/coordinate alignment is not proof of exact official world entrances.','Random encounters disabled only during deterministic MOVE examples.','No production deployment, live account state or full-story playthrough.']},ensure_ascii=False,indent=2)+'\n')
