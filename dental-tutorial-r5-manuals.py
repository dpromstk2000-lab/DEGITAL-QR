from pathlib import Path
import os, json, time, textwrap, hashlib, subprocess, sys, re
from PIL import Image, ImageDraw, ImageFont
import qrcode
import fitz
from pyzbar.pyzbar import decode as zbar_decode
from playwright.sync_api import sync_playwright

BASE=os.environ.get('DPRO_BASE_URL','https://dpromstk2000-lab.github.io/DEGITAL-QR/').rstrip('/')+'/'
TUTORIAL=BASE+'tutorial.html'
GUIDE=BASE+'guide-center.html'
STORAGE_KEY='dpro.dental.tutorial.v1.1'
OUT=Path('.')
EVID=OUT/'r5-evidence'
SHOT=EVID/'screenshots'
RENDER=EVID/'renders'
for d in [EVID,SHOT,RENDER]: d.mkdir(parents=True,exist_ok=True)

QUICK_PNG=OUT/'DPRO_TUTORIAL_DENTAL_QUICK_START_V1.0.png'
QUICK_PDF=OUT/'DPRO_TUTORIAL_DENTAL_QUICK_START_V1.0.pdf'
DETAIL_PDF=OUT/'DPRO_TUTORIAL_DENTAL_DETAILED_MANUAL_V1.0.pdf'
DETAIL_PNGS=[OUT/f'DPRO_TUTORIAL_DENTAL_DETAILED_MANUAL_V1.0_P{i:02d}.png' for i in range(1,7)]
QA_JSON=EVID/'dental-r5-manual-qa.json'

EXPECTED_STEPS=[
 {'step':1,'title':'公開デモの全体像','route':'demo-guide.html','primary':'#screenGrid'},
 {'step':2,'title':'受診する家族を選ぶ場所','route':'hybrid.html?t=demo-dental-patient-001','primary':'#patientTabs'},
 {'step':3,'title':'選択中の診察券を確認','route':'hybrid.html?t=demo-dental-patient-001','primary':'#patientSummary'},
 {'step':4,'title':'30分予約の入口','route':'hybrid.html?t=demo-dental-patient-001','primary':'#reservationLink'},
 {'step':5,'title':'予約する受診者を確認','route':'reservation.html?t=demo-dental-patient-001','primary':'#selectedPatient'},
 {'step':6,'title':'診療内容と空き枠の流れ','route':'reservation.html?t=demo-dental-patient-001','primary':'#menuChoices'},
 {'step':7,'title':'当日急患受付の安全注意','route':'urgent.html?t=demo-dental-patient-001','primary':'.danger-notice'},
 {'step':8,'title':'家族のデジタル診察券','route':'member.html?t=demo-dental-patient-001','primary':'#familyPanel'},
 {'step':9,'title':'受付で見せるQR','route':'member.html?t=demo-dental-patient-001','primary':'#qrImage'},
 {'step':10,'title':'医院側の受付運用を知る','route':'owner.html','primary':'.sales-guide'},
]
STEP_NOTES=[
 '公開デモに含まれる画面と体験順を確認します。製品リンクは自動操作しません。',
 '本人・家族の診察券を切り替える位置を確認します。患者情報は作成しません。',
 '選択中の診察券情報を読むだけです。患者データは変更しません。',
 '30分予約への入口を確認します。予約ボタンの自動クリックは行いません。',
 '予約対象の受診者が引き継がれる位置を確認します。実在情報は入力しません。',
 '診療内容・日付・30分枠の構成を確認します。予約送信は行いません。',
 '急患受付の注意表示を確認します。症状入力・申込送信は行いません。',
 '家族のデジタル診察券を確認します。LINE連携や家族紐付けは行いません。',
 '受付提示用QRの位置を確認します。QR読取・チェックインは行いません。',
 '医院側の受付運用領域を確認します。管理コードの推測・入力は行いません。',
]

# ---------- capture current LIVE ----------
telemetry={'pageerrors':[],'console_errors':[],'unsafe_writes':[],'runtime_steps':[],'resolved':[]}
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
    page.on('pageerror',lambda e: telemetry['pageerrors'].append(str(e)))
    def on_console(msg):
        if msg.type=='error':
            loc=msg.location or {}
            url=loc.get('url','') if isinstance(loc,dict) else ''
            if '/DEGITAL-QR/' in url or 'dpro-dental-qr-api.dpromstk2000.workers.dev' in url:
                telemetry['console_errors'].append({'text':msg.text,'url':url})
    page.on('console',on_console)
    def on_req(req):
        if req.method not in ('GET','HEAD','OPTIONS') and ('/DEGITAL-QR/' in req.url or 'dpro-dental-qr-api.dpromstk2000.workers.dev' in req.url):
            telemetry['unsafe_writes'].append({'method':req.method,'url':req.url})
    page.on('request',on_req)

    page.goto(TUTORIAL,wait_until='domcontentloaded',timeout=60000)
    page.evaluate(f"localStorage.removeItem({json.dumps(STORAGE_KEY)})")
    page.reload(wait_until='domcontentloaded',timeout=60000)
    page.wait_for_function("()=>!!window.DPRO_TUTORIAL_QA",timeout=30000)
    runtime=page.evaluate("()=>window.DPRO_TUTORIAL_QA.steps.map(s=>({step:s.step,title:s.title,route:s.route,primary:s.primary,fallback:s.fallback}))")
    telemetry['runtime_steps']=runtime
    for exp,got in zip(EXPECTED_STEPS,runtime):
        for k in ('step','title','route','primary'):
            if got.get(k)!=exp[k]:
                raise RuntimeError(f'R5 runtime First10 mismatch step {exp["step"]} field {k}: {got.get(k)!r} != {exp[k]!r}')
    if len(runtime)!=10: raise RuntimeError(f'R5 runtime First10 count {len(runtime)} != 10')
    page.evaluate("()=>window.DPRO_TUTORIAL_QA.start()")
    for idx in range(10):
        page.wait_for_function("i=>window.DPRO_TUTORIAL_QA?.getState().active===true && window.DPRO_TUTORIAL_QA.getState().index===i",idx,timeout=30000)
        page.wait_for_function("()=>document.getElementById('dpro-product-frame')?.contentDocument?.readyState==='complete'",timeout=30000)
        try:
            page.wait_for_function("()=>!!window.DPRO_TUTORIAL_QA.refreshTarget()?.selector",timeout=15000,polling=200)
        except Exception:
            pass
        resolved=page.evaluate("()=>window.DPRO_TUTORIAL_QA.refreshTarget()")
        telemetry['resolved'].append({'step':idx+1,'resolved':resolved})
        page.screenshot(path=str(SHOT/f'tutorial-step-{idx+1:02d}.png'),full_page=False)
        if idx<9:
            page.evaluate("()=>window.DPRO_TUTORIAL_QA.next()")

    # Guide Center in fresh state
    page.goto(GUIDE,wait_until='domcontentloaded',timeout=60000)
    page.evaluate(f"localStorage.removeItem({json.dumps(STORAGE_KEY)})")
    page.reload(wait_until='domcontentloaded',timeout=60000)
    page.wait_for_function("()=>window.DPRO_DENTAL_GUIDE_CENTER?.ready===true",timeout=30000)
    page.wait_for_function("()=>window.DPRO_DENTAL_GUIDE_CENTER?.aligned===true",timeout=10000)
    page.screenshot(path=str(SHOT/'guide-center.png'),full_page=False)
    guide_info=page.evaluate("()=>({ready:window.DPRO_DENTAL_GUIDE_CENTER.ready,aligned:window.DPRO_DENTAL_GUIDE_CENTER.aligned,runtimeCount:window.DPRO_DENTAL_GUIDE_CENTER.runtimeCount,stateMode:window.DPRO_DENTAL_GUIDE_CENTER.stateMode,guideCount:document.querySelectorAll('[data-guide-step]').length})")
    browser.close()

if telemetry['unsafe_writes']:
    raise RuntimeError(f'unsafe writes detected: {telemetry["unsafe_writes"]}')
if telemetry['pageerrors']:
    raise RuntimeError(f'pageerrors detected: {telemetry["pageerrors"]}')
if telemetry['console_errors']:
    raise RuntimeError(f'console errors detected: {telemetry["console_errors"]}')
if not (guide_info['ready'] and guide_info['aligned'] and guide_info['runtimeCount']==10 and guide_info['guideCount']==10):
    raise RuntimeError(f'Guide Center mismatch: {guide_info}')

# ---------- drawing ----------
W,H=1654,2339
M=92
BG=(244,250,252); WHITE=(255,255,255); INK=(15,36,48); MUTED=(74,103,117); TEAL=(8,125,145); GREEN=(8,122,91); ORANGE=(235,155,22); LINE=(205,226,232); SOFT=(233,247,250)
font_candidates=['/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc','/usr/share/fonts/opentype/noto/NotoSansCJKjp-Regular.otf','/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc']
bold_candidates=['/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc','/usr/share/fonts/opentype/noto/NotoSansCJKjp-Bold.otf','/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc']
def pick(cands):
    for x in cands:
        if Path(x).exists(): return x
    raise RuntimeError('Noto CJK font not found')
REG=pick(font_candidates); BOLD=pick(bold_candidates)
def F(sz,b=False): return ImageFont.truetype(BOLD if b else REG,sz)

boxes=[]
def rect(draw,xy,fill=WHITE,outline=LINE,width=2,r=26):
    draw.rounded_rectangle(xy,radius=r,fill=fill,outline=outline,width=width)

def wrap_text(text,font,maxw):
    lines=[]
    for para in str(text).split('\n'):
        if para=='': lines.append(''); continue
        cur=''
        for ch in para:
            test=cur+ch
            if font.getlength(test)<=maxw or not cur:
                cur=test
            else:
                lines.append(cur); cur=ch
        if cur: lines.append(cur)
    return lines

def draw_text(draw,xy,text,font,fill=INK,maxw=None,spacing=10):
    x,y=xy
    lines=wrap_text(text,font,maxw) if maxw else str(text).split('\n')
    lh=font.size+spacing
    for line in lines:
        draw.text((x,y),line,font=font,fill=fill)
        y+=lh
    return y

def fit_img(src,box):
    x,y,w,h=box
    im=Image.open(src).convert('RGB')
    im.thumbnail((w,h),Image.Resampling.LANCZOS)
    canvas=Image.new('RGB',(w,h),(238,246,248))
    ox=(w-im.width)//2; oy=(h-im.height)//2
    canvas.paste(im,(ox,oy))
    return canvas

def qr_img(url,size=220):
    q=qrcode.QRCode(version=None,error_correction=qrcode.constants.ERROR_CORRECT_Q,box_size=8,border=4)
    q.add_data(url);q.make(fit=True)
    return q.make_image(fill_color='black',back_color='white').convert('RGB').resize((size,size),Image.Resampling.NEAREST)

def header(draw,kicker,title,sub=None):
    draw.text((M,70),kicker,font=F(24,True),fill=TEAL)
    draw.text((M,116),title,font=F(54,True),fill=INK)
    if sub: draw_text(draw,(M,190),sub,F(24),MUTED,W-2*M,12)
    draw.line((M,270,W-M,270),fill=LINE,width=3)

def footer(draw,page_label):
    draw.line((M,H-92,W-M,H-92),fill=LINE,width=2)
    draw.text((M,H-68),'DPRO TUTORIAL / DENTAL - DEMO / READ ONLY',font=F(18,True),fill=MUTED)
    fw=F(18,True).getlength(page_label)
    draw.text((W-M-fw,H-68),page_label,font=F(18,True),fill=MUTED)

def make_page(): return Image.new('RGB',(W,H),BG)

# Quick Start one page
im=make_page(); d=ImageDraw.Draw(im)
header(d,'DPRO TUTORIAL / DENTAL','歯科 Quick Start','現行のTutorial / Guide Centerを安全に体験するための1枚ガイド')
# screenshots
rect(d,(M,305,780,1088)); rect(d,(820,305,W-M,1088))
d.text((M+26,330),'Guide Center',font=F(25,True),fill=TEAL)
d.text((846,330),'Tutorial',font=F(25,True),fill=TEAL)
im.paste(fit_img(SHOT/'guide-center.png',(640,690)),(116,382))
im.paste(fit_img(SHOT/'tutorial-step-01.png',(640,690)),(846,382))
# controls/instructions
rect(d,(M,1120,W-M,1600),fill=WHITE)
d.text((M+30,1150),'基本操作',font=F(30,True),fill=INK)
items=[
 '1. Guide Centerで「Start / はじめる」からTutorialを開く。',
 '2. 「次へ / 戻る」でFirst10を進む。カードは上部の専用ハンドルでドラッグ可能。',
 '3. Escまたは「閉じる」で一時停止。Guide Centerへ戻るとResumeが使える。',
 '4. 完了・スキップ後はReplayでStep 1から再開。キーボードはTab + Enterで操作可能。'
]
y=1210
for t in items:
    y=draw_text(d,(M+38,y),t,F(23),INK,W-2*M-76,10)+8
# safe boundary
rect(d,(M,1630,W-M,1888),fill=(239,250,246),outline=(171,220,203))
d.text((M+30,1660),'安全なデモ境界',font=F(28,True),fill=GREEN)
safe='予約作成・急患申込・チェックイン・待ち状況変更・患者/家族データ変更・LINE連携・管理設定は自動実行しません。実在する患者情報や認証情報を入力しないでください。'
draw_text(d,(M+30,1710),safe,F(22),INK,W-2*M-60,11)
# QR area
rect(d,(M,1918,W-M,H-120),fill=WHITE)
q1=qr_img(GUIDE,210); q2=qr_img(TUTORIAL,210)
im.paste(q1,(M+42,1965)); im.paste(q2,(820,1965))
d.text((M+280,1980),'Guide Center',font=F(25,True),fill=TEAL)
draw_text(d,(M+280,2025),GUIDE,F(17),MUTED,430,6)
d.text((1060,1980),'Tutorial',font=F(25,True),fill=TEAL)
draw_text(d,(1060,2025),TUTORIAL,F(17),MUTED,410,6)
footer(d,'QUICK START / 1 of 1')
im.save(QUICK_PNG,quality=95)

# Detailed page 1 overview
pages=[]
im=make_page(); d=ImageDraw.Draw(im)
header(d,'DPRO TUTORIAL / DENTAL','Detailed Manual','現行First10 exactly 10 / Guide Center / Resume / mobile / keyboard')
rect(d,(M,310,W-M,1020),fill=WHITE)
d.text((M+30,340),'Guide Centerを入口にする',font=F(30,True),fill=INK)
im.paste(fit_img(SHOT/'guide-center.png',(560,590)),(M+30,400))
text_x=720
y=410
y=draw_text(d,(text_x,y),'Start',F(27,True),TEAL,760,8)
y=draw_text(d,(text_x,y+6),'新規状態ではStep 1から開始します。',F(21),INK,760,8)+18
y=draw_text(d,(text_x,y),'Resume',F(27,True),TEAL,760,8)
y=draw_text(d,(text_x,y+6),'Esc / 閉じるで一時停止した位置を、ページをまたいで復元します。',F(21),INK,760,8)+18
y=draw_text(d,(text_x,y),'Replay',F(27,True),TEAL,760,8)
y=draw_text(d,(text_x,y+6),'完了またはスキップ後にStep 1へ戻ります。',F(21),INK,760,8)+18
y=draw_text(d,(text_x,y),'キーボード / モバイル',F(27,True),TEAL,760,8)
draw_text(d,(text_x,y+6),'Tabでボタンへ移動、Enterで実行。Escで一時停止。カード移動は専用ハンドルのみ。320px / 390pxでも横スクロールなし。',F(21),INK,760,8)
rect(d,(M,1050,W-M,1515),fill=WHITE)
d.text((M+30,1080),'安全・Read Only',font=F(30,True),fill=GREEN)
safe2='Tutorialの「次へ」は製品ボタンをクリックする代わりに、説明用iframeの表示先だけを切り替えます。フォーム入力・送信、管理コード入力、LINE連携、業務データ更新は行いません。実在患者の氏名・電話番号・症状・診察内容・家族情報を入力しないでください。'
draw_text(d,(M+30,1140),safe2,F(23),INK,W-2*M-60,12)
rect(d,(M,1545,W-M,2185),fill=WHITE)
d.text((M+30,1575),'公開URL / QR',font=F(30,True),fill=INK)
q1=qr_img(GUIDE,230); q2=qr_img(TUTORIAL,230)
im.paste(q1,(M+40,1640)); im.paste(q2,(820,1640))
d.text((M+300,1660),'Guide Center',font=F(25,True),fill=TEAL); draw_text(d,(M+300,1710),GUIDE,F(18),MUTED,420,7)
d.text((1080,1660),'Tutorial',font=F(25,True),fill=TEAL); draw_text(d,(1080,1710),TUTORIAL,F(18),MUTED,390,7)
draw_text(d,(M+40,1935),'Troubleshooting: 対象ハイライトが見えない場合でも説明カードは継続できます。画面を閉じた場合はGuide CenterからResume。状態を最初に戻す場合はReplayを使用します。',F(22),INK,W-2*M-80,10)
footer(d,'DETAILED / 1 of 6')
pages.append(im)

# Detailed pages 2-6, two steps each
for pg in range(5):
    idx1=pg*2; idx2=idx1+1
    im=make_page(); d=ImageDraw.Draw(im)
    header(d,'DPRO TUTORIAL / DENTAL',f'First10 - Steps {idx1+1} & {idx2+1}','現行R3/R4で受理済みの順序・画面をそのまま掲載')
    y0=315
    for slot,idx in enumerate([idx1,idx2]):
        top=y0+slot*940
        bottom=top+885
        rect(d,(M,top,W-M,bottom),fill=WHITE)
        d.text((M+28,top+25),f'STEP {idx+1} / 10',font=F(23,True),fill=TEAL)
        d.text((M+28,top+70),EXPECTED_STEPS[idx]['title'],font=F(32,True),fill=INK)
        # screenshot on left
        im.paste(fit_img(SHOT/f'tutorial-step-{idx+1:02d}.png',(570,700)),(M+28,top+135))
        tx=M+640
        d.text((tx,top+150),'確認すること',font=F(24,True),fill=GREEN)
        ty=draw_text(d,(tx,top+195),STEP_NOTES[idx],F(21),INK,680,10)+18
        d.text((tx,ty),'画面',font=F(22,True),fill=MUTED); ty+=42
        ty=draw_text(d,(tx,ty),EXPECTED_STEPS[idx]['route'],F(19),MUTED,680,8)+14
        d.text((tx,ty),'Primary target',font=F(22,True),fill=MUTED); ty+=42
        ty=draw_text(d,(tx,ty),EXPECTED_STEPS[idx]['primary'],F(19),MUTED,680,8)+18
        d.text((tx,ty),'共通操作',font=F(22,True),fill=MUTED); ty+=42
        draw_text(d,(tx,ty),'次へ / 戻る / Escで一時停止 / 専用ハンドルでカード移動。製品側の入力や送信は自動実行しません。',F(20),INK,680,9)
    footer(d,f'DETAILED / {pg+2} of 6')
    pages.append(im)

for pth,img in zip(DETAIL_PNGS,pages): img.save(pth,quality=95)

# PDFs from exact page images at 200 DPI
qim=Image.open(QUICK_PNG).convert('RGB')
qim.save(QUICK_PDF,'PDF',resolution=200.0)
dims=[Image.open(p).convert('RGB') for p in DETAIL_PNGS]
dims[0].save(DETAIL_PDF,'PDF',resolution=200.0,save_all=True,append_images=dims[1:])
for x in dims: x.close()
qim.close()

# ---------- render every PDF page & QR decode ----------
def render_pdf(pdf_path,prefix):
    doc=fitz.open(pdf_path)
    outs=[]
    mat=fitz.Matrix(200/72,200/72)
    for i,page in enumerate(doc):
        pix=page.get_pixmap(matrix=mat,alpha=False)
        out=RENDER/f'{prefix}_p{i+1:02d}.png'
        pix.save(out)
        outs.append(out)
    doc.close()
    return outs
quick_r=render_pdf(QUICK_PDF,'quick')
detail_r=render_pdf(DETAIL_PDF,'detailed')

def image_metrics(p):
    im=Image.open(p).convert('L')
    extrema=im.getextrema(); hist=im.histogram(); total=sum(hist); white=sum(hist[248:])
    return {'width':im.width,'height':im.height,'extrema':list(extrema),'white_ratio':white/total if total else 1.0}

def decode_qrs(p):
    im=Image.open(p).convert('RGB')
    vals=[]
    for obj in zbar_decode(im):
        try: vals.append(obj.data.decode('utf-8'))
        except Exception: vals.append(obj.data.decode('utf-8','replace'))
    return sorted(set(vals))

qr_rows=[]
for kind,arr in [('quick',quick_r),('detailed',detail_r)]:
    for i,p in enumerate(arr,1):
        vals=decode_qrs(p)
        qr_rows.append({'document':kind,'page':i,'render':str(p),'decoded':vals})

expected_qrs={('quick',1):sorted([GUIDE,TUTORIAL]),('detailed',1):sorted([GUIDE,TUTORIAL])}
for row in qr_rows:
    exp=expected_qrs.get((row['document'],row['page']),[])
    if row['decoded']!=exp:
        raise RuntimeError(f'QR mismatch {row["document"]} p{row["page"]}: {row["decoded"]} != {exp}')

visual=[]
for kind,arr in [('quick',quick_r),('detailed',detail_r)]:
    for i,p in enumerate(arr,1):
        m=image_metrics(p)
        auto_pass=(m['width']>=1600 and m['height']>=2300 and m['extrema'][0]<245 and m['white_ratio']<0.98)
        visual.append({'document':kind,'page':i,'render':str(p),'metrics':m,'automated_preflight_pass':auto_pass,'manual_visual_review':'PENDING_ASSISTANT_REVIEW'})
        if not auto_pass: raise RuntimeError(f'Visual preflight failed {p}: {m}')

# exact links reachable
import urllib.request
link_status={}
for url in [TUTORIAL,GUIDE]:
    req=urllib.request.Request(url,method='GET',headers={'Cache-Control':'no-cache','User-Agent':'DPRO-R5-QA'})
    with urllib.request.urlopen(req,timeout=30) as r:
        link_status[url]=r.status
        if r.status!=200: raise RuntimeError(f'URL not HTTP 200: {url} -> {r.status}')

files=[QUICK_PDF,QUICK_PNG,DETAIL_PDF,*DETAIL_PNGS]
qa={
 'schema':'DPRO_TUTORIAL_DENTAL_R5_MANUAL_QA_V1_0',
 'system':'DENTAL','stage':'R5','standard':'V1.1_LOCKED','first10_count':10,
 'source_base':BASE,'tutorial_url':TUTORIAL,'guide_center_url':GUIDE,
 'guide_center':guide_info,'telemetry':telemetry,
 'manuals':{
   'quick':{'pdf':QUICK_PDF.name,'png':QUICK_PNG.name,'pdf_pages':len(quick_r)},
   'detailed':{'pdf':DETAIL_PDF.name,'png_pages':[p.name for p in DETAIL_PNGS],'pdf_pages':len(detail_r)},
 },
 'visual_pages':visual,'qr_pages':qr_rows,'link_status':link_status,
 'sensitive_data_policy':'current demo/read-only screenshots only; no production secrets/credentials; no real patient/family/health data intentionally supplied',
 'business_mutation':len(telemetry['unsafe_writes']),
 'generated_files':[{'name':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'size':p.stat().st_size} for p in files],
 'automated_pass':True,
 'manual_visual_review_required':True,
 'r5_pass':False,
}
QA_JSON.write_text(json.dumps(qa,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'automated_pass':True,'quick_pages':len(quick_r),'detailed_pages':len(detail_r),'qrs':qr_rows,'business_mutation':qa['business_mutation'],'generated':[p.name for p in files]},ensure_ascii=False,indent=2))
