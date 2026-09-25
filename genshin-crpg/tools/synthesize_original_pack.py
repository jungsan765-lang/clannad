#!/usr/bin/env python3
"""Deterministic, original composition and synthesis. No samples or source recordings."""
from pathlib import Path
import json, math, subprocess, hashlib
import numpy as np
from scipy import signal
from scipy.io import wavfile

OUT = Path(__file__).resolve().parent
SR = 44100
RNG = np.random.default_rng(20260924)
AUTHOR = 'Project original composition and synthesis · OpenAI assistant · 2026-09-24'

def hz(note): return 440 * 2 ** ((note - 69) / 12)
def clock(d): return np.arange(round(d * SR), dtype=np.float64) / SR
def envelope(d, attack=.02, release=.10, sustain=1):
    t=clock(d); e=np.ones(len(t))*sustain
    a=min(attack,d/2); r=min(release,d/2)
    if a: e[:round(a*SR)] = np.sin(np.linspace(0,np.pi/2,round(a*SR)))**2*sustain
    if r: e[-round(r*SR):] *= np.cos(np.linspace(0,np.pi/2,round(r*SR)))**2
    return e
def filt(x, lo=None, hi=None, order=2):
    if lo and hi: sos=signal.butter(order,[lo,hi],btype='bandpass',fs=SR,output='sos')
    elif lo: sos=signal.butter(order,lo,btype='highpass',fs=SR,output='sos')
    else: sos=signal.butter(order,hi,btype='lowpass',fs=SR,output='sos')
    return signal.sosfilt(sos,x,axis=0)
def noise(d,lo=250,hi=4000):
    x=filt(RNG.normal(0,1,len(clock(d))),lo,hi)
    return x / (np.std(x)+1e-9)
def stereo(x,pan=0):
    if x.ndim==2:return x
    a=(pan+1)*np.pi/4
    return np.column_stack((x*np.cos(a),x*np.sin(a)))
def put(dst,x,start,gain=1,pan=0,wrap=False):
    x=stereo(x,pan)*gain; start=round(start*SR)
    if wrap:
        ix=(np.arange(len(x))+start)%len(dst)
        np.add.at(dst,ix,x)
    else:
        n=min(len(x),len(dst)-start)
        if n>0: dst[start:start+n]+=x[:n]

def bowed(note,d,velocity=1):
    t=clock(d); f=hz(note); y=np.zeros(len(t))
    for cents,weight,phase in [(-5,.28,.43),(0,.44,.0),(4,.28,1.12)]:
        ff=f*2**(cents/1200)
        vibr=.012*np.sin(2*np.pi*4.7*t+phase)*(1-np.exp(-t*2))
        for n in range(1,7):
            y+=weight*(np.sin(2*np.pi*ff*n*t+phase+vibr*n)/(n**1.8))*np.exp(-n/10)
    # A very quiet, filtered bow texture keeps pads soft without becoming a pure organ.
    y+=.018*noise(d,350,2000)*(0.65+0.35*np.sin(2*np.pi*.73*t)**2)
    return y*envelope(d,.65,.90)*velocity

def flute(note,d,velocity=1):
    t=clock(d); f=hz(note); breath=.045*noise(d,600,2600)
    vib=.007*np.sin(2*np.pi*5.05*t)*(1-np.exp(-t*7))
    y=np.sin(2*np.pi*f*t+vib)+.10*np.sin(4*np.pi*f*t+.6)+.035*np.sin(6*np.pi*f*t)
    return (y+breath)*envelope(d,.10,.22)*(0.94+.06*np.sin(2*np.pi*1.35*t))*velocity

def bell(note,d,velocity=1):
    t=clock(d); f=hz(note);y=np.zeros(len(t))
    for ratio,a,decay in [(1,1,2.4),(2.003,.22,4.3),(3.98,.052,7),(5.02,.012,10)]:
        y+=a*np.sin(2*np.pi*f*ratio*t)*np.exp(-decay*t)
    return y*envelope(d,.006,.10)*velocity

def pluck(note,d,velocity=1):
    t=clock(d);f=hz(note);y=np.zeros(len(t))
    for n in range(1,7):
        y+=np.sin(2*np.pi*f*n*t+0.03*n)*np.exp(-(4.0+n*.8)*t)/(n**1.5)
    return y*envelope(d,.009,.055)*velocity

def bass(note,d,velocity=1):
    t=clock(d);f=hz(note)
    return (np.sin(2*np.pi*f*t)+.17*np.sin(4*np.pi*f*t))*envelope(d,.018,.12)*np.exp(-t*.5)*velocity

def drum(d=.24):
    t=clock(d); frequency=75+65*np.exp(-t*35)
    phase=2*np.pi*np.cumsum(frequency)/SR
    return (np.sin(phase)*np.exp(-t*20)+.025*noise(d,400,1700)*np.exp(-t*40))*envelope(d,.003,.055)

def room(x,loop=False,amount=.13):
    y=x.copy()
    for delay,decay,swap in [(.071,.62,True),(.113,.47,False),(.179,.35,True),(.263,.22,False),(.397,.12,True),(.541,.07,False)]:
        shift=round(delay*SR); a=x[:,::-1] if swap else x
        if loop:y+=np.roll(a,shift,axis=0)*amount*decay
        elif shift<len(x):y[shift:]+=a[:-shift]*amount*decay
    return y

def finish(x,target_rms,peak_cap,loop=False):
    # Filter with a wrapped lead-in so mastering does not introduce a loop boundary.
    if loop:
        lead=min(len(x),SR*2); q=np.concatenate((x[-lead:],x,x[:lead]))
        q=filt(filt(q,lo=65),hi=5200);x=q[lead:lead+len(x)]
    else:x=filt(filt(x,lo=60),hi=6500)
    x-=np.mean(x,axis=0)
    x*=target_rms/(np.sqrt(np.mean(x*x))+1e-12)
    # Only a safety gain reduction, never hard limiting or clipping.
    if np.max(np.abs(x))>peak_cap:x*=peak_cap/np.max(np.abs(x))
    if not loop:x*=envelope(len(x)/SR,.002,.018)[:,None]
    return x

def exploration():
    duration=40.; beat=60/72;bar=4*beat;x=np.zeros((round(duration*SR),2))
    chords=[[50,57,62,66],[47,54,59,62],[55,59,62,66],[45,52,57,62],
            [54,57,61,64],[55,59,62,66],[52,59,62,66],[45,52,57,61],
            [50,57,62,66],[47,54,59,62],[55,59,62,66],[45,52,57,64]]
    for b,chord in enumerate(chords):
        for i,note in enumerate(chord):
            put(x,bowed(note,bar+1.45),b*bar-.62,.087,[-.5,.25,-.2,.48][i],True)
        # An original, sparse harp-like inner pattern, not a quotation.
        for j,index in enumerate([0,2,1,3]):
            put(x,pluck(chord[index]+12,1.35),b*bar+(j+.2)*beat,.031,(-1)**j*.35,True)
        if b in [0,3,6,9]:put(x,bell(chord[2]+12,2.6),b*bar+.12,.047,.33,True)
    melody=[(0,1,74,1.6),(1,.3,69,1.1),(1,2.0,71,1.25),(2,1.0,74,1.7),
            (3,1.3,73,1.3),(4,.5,69,1.55),(5,1.5,71,1.6),(6,.4,67,1.2),
            (6,2.1,69,1.3),(7,1.2,73,1.6),(8,.6,74,1.8),(9,1.0,71,1.4),
            (10,.5,69,1.2),(10,2.0,67,1.5),(11,1.1,69,1.65)]
    for b,offset,note,beats in melody:put(x,flute(note,beats*beat),b*bar+offset*beat,.083,-.12,True)
    return finish(room(x,True,.22),.061,.42,True)

def battle():
    duration=32.;beat=.5;bar=2.;x=np.zeros((round(duration*SR),2))
    chords=[[50,57,62,65],[48,55,60,64],[46,53,58,62],[45,52,57,61],
            [50,57,62,65],[53,60,65,69],[55,58,62,67],[45,52,57,61]]*2
    pattern=[0,2,1,2,3,1,2,1]
    for b,chord in enumerate(chords):
        for j,index in enumerate(pattern):
            note=chord[index]+(12 if b>=8 and j in [3,7] else 0)
            put(x,pluck(note,.43),b*bar+j*beat/2,.067*(1.12 if j%4==0 else .86),(-1)**j*.34,True)
        for j in [0,2]:
            put(x,bass(chord[0],.76),b*bar+j*beat,.10,-.04,True)
            put(x,drum(),b*bar+j*beat,.12,(-1)**j*.07,True)
        for j in [1,3]:
            brushed=noise(.12,550,2400)*np.exp(-clock(.12)*35)*envelope(.12,.003,.035)
            put(x,brushed,b*bar+j*beat,.019,.28,True)
        for i,note in enumerate(chord[1:]):put(x,bowed(note,bar+.5),b*bar-.22,.025,[-.55,.3,.55][i],True)
    melody=[(0,2,69),(1,2.5,67),(2,1,65),(3,2,64),(4,2,69),(5,1,72),(6,2,70),(7,2.5,69),
            (8,2,74),(9,2.5,72),(10,1,70),(11,2,69),(12,2,69),(13,1,72),(14,2,67),(15,2.5,64)]
    for b,offset,note in melody:put(x,flute(note,.68),b*bar+offset*beat,.047,-.17,True)
    return finish(room(x,True,.15),.070,.45,True)

def effect(kind):
    durations={'click':.05,'equip':.36,'hit':.22,'guard':.32,'heal':.78,'fire':.64,'water':.68,'ice':.60,
               'lightning':.48,'wind':.68,'rock':.58,'dendro':.68,'melt':.76,'vaporize':.76,'overload':.78,
               'freeze':.70,'victory':2.5,'defeat':2.3}
    d=durations[kind];t=clock(d);x=np.zeros((len(t),2))
    if kind=='click':
        q=(np.sin(2*np.pi*640*t)+.18*np.sin(2*np.pi*1080*t))*np.exp(-t*105)*envelope(d,.002,.014)
        put(x,q,0,.4)
    elif kind=='equip':
        for start,note,gain in [(0,62,.7),(.085,69,.35),(.15,74,.18)]:put(x,bell(note,d-start),start,gain,(-1 if start==0 else 1)*.18)
        put(x,noise(d,500,2200)*np.exp(-t*24)*envelope(d,.003,.1),0,.025)
    elif kind=='hit':
        q=np.sin(2*np.pi*np.cumsum(110+240*np.exp(-t*42))/SR)*np.exp(-t*23)
        put(x,(q*.7+noise(d,300,3000)*np.exp(-t*38)*.16)*envelope(d,.002,.05),0,.7)
    elif kind=='guard':
        q=sum(a*np.sin(2*np.pi*f*t)*np.exp(-t*decay) for f,a,decay in [(310,1,12),(477,.26,18),(731,.14,26)])
        put(x,q*envelope(d,.002,.07),0,.6)
    elif kind=='heal':
        for start,note,gain in [(0,67,.55),(.105,71,.42),(.22,74,.32),(.32,79,.15)]:put(x,bell(note,d-start),start,gain,(start-.16)*1.7)
        put(x,noise(d,700,2200)*np.sin(np.pi*t/d)**2,0,.022)
    elif kind=='fire':
        q=noise(d,180,2600)*(1+.20*np.sin(2*np.pi*39*t))*np.exp(-t*6.5)*envelope(d,.016,.16)
        put(x,q,0,.25);put(x,bass(45,.34),.015,.26)
    elif kind=='water':
        q=noise(d,350,2100)*np.sin(np.pi*t/d)**1.4
        put(x,q,0,.11,-.22)
        for start,note in [(0,69),(.09,65),(.19,62),(.31,57)]:put(x,bell(note,d-start),start,.34,.25)
    elif kind=='ice':
        for start,note,gain in [(0,79,.3),(.035,74,.36),(.105,86,.10),(.19,69,.22)]:put(x,bell(note,d-start),start,gain,(-1)**round(start*100)*.3)
        put(x,noise(d,1300,3800)*np.exp(-t*15)*envelope(d,.002,.08),0,.045)
    elif kind=='lightning':
        carrier=np.sin(2*np.pi*210*t+1.1*np.sin(2*np.pi*53*t))
        pulses=np.exp(-t*19)+.48*np.exp(-np.maximum(t-.11,0)*28)*(t>.11)
        put(x,(carrier*.28+noise(d,650,3500)*.18)*pulses*envelope(d,.002,.09),0,.75)
    elif kind=='wind':
        q=noise(d,280,2200)*np.sin(np.pi*t/d)**1.5
        x[:,0]+=q*(.16+.08*np.sin(2*np.pi*t/d));x[:,1]+=q*(.16-.08*np.sin(2*np.pi*t/d))
        put(x,flute(69,d),0,.08)
    elif kind=='rock':
        for start,gain in [(0,.8),(.075,.28),(.135,.15)]:put(x,drum(.26),start,gain,-.10)
        q=noise(d,220,1200)*np.exp(-t*13)*envelope(d,.005,.08);put(x,q,0,.18,.18)
    elif kind=='dendro':
        for start,note in [(0,62),(.10,67),(.22,71),(.32,74)]:put(x,pluck(note,d-start),start,.46,(start-.16)*2)
        put(x,noise(d,550,2000)*np.sin(np.pi*t/d)**2,0,.035)
    elif kind=='melt':
        for start,note in [(0,77),(.06,72),(.14,67)]:put(x,bell(note,d-start),start,.28,.20)
        hiss=noise(d,280,2300)*np.sin(np.pi*t/d)*np.exp(-t*2.5);put(x,hiss,.0,.18,-.20)
    elif kind=='vaporize':
        hiss=noise(d,400,2800)*np.sin(np.pi*t/d)**1.1*np.exp(-t*1.8);put(x,hiss,0,.24)
        for start,note in [(0,65),(.07,69),(.13,74)]:put(x,bell(note,d-start),start,.18,.25)
    elif kind=='overload':
        put(x,drum(.32),0,.85)
        q=(noise(d,170,2400)*.30+np.sin(2*np.pi*160*t+.7*np.sin(2*np.pi*41*t))*.13)*np.exp(-t*7)*envelope(d,.005,.15)
        put(x,q,0,.72);put(x,bass(45,.43),.025,.20)
    elif kind=='freeze':
        for start,note,gain in [(0,74,.40),(.04,81,.21),(.095,86,.10),(.17,79,.20)]:put(x,bell(note,d-start),start,gain,(start-.1)*3)
        put(x,noise(d,1000,3300)*np.exp(-t*9)*envelope(d,.006,.14),0,.070)
    elif kind=='victory':
        for start,note in [(0,62),(.22,66),(.44,69),(.74,74)]:put(x,bell(note,1.65),start,.42,(start-.37)*.55)
        for note,pan in [(50,-.4),(57,.3),(62,0),(66,.4)]:put(x,bowed(note,2.1),.25,.13,pan)
    elif kind=='defeat':
        for start,note in [(0,62),(.29,60),(.62,57),(.95,53)]:put(x,flute(note,.92),start,.27,-.16)
        for note,pan in [(50,-.3),(57,.3),(65,0)]:put(x,bowed(note,2.0),.05,.09,pan)
    if kind!='click':x=room(x,False,.14)
    return finish(x,.045 if kind=='click' else (.073 if kind in ['victory','defeat'] else .092),.32 if kind=='click' else .56)

def metric(x):
    peak=float(np.max(np.abs(x)));rms=float(np.sqrt(np.mean(x*x)))
    return {'duration_seconds':round(len(x)/SR,6),'sample_rate_hz':SR,'channels':2,'peak':round(peak,7),'peak_dbfs':round(20*np.log10(max(peak,1e-12)),3),'rms':round(rms,7),'rms_dbfs':round(20*np.log10(max(rms,1e-12)),3),'clipped_samples':int(np.count_nonzero(np.abs(x)>=1))}

def seam(x):
    delta=np.abs(np.diff(x,axis=0));join=np.abs(x[0]-x[-1]); p99=np.quantile(delta,.99,axis=0)
    return {'boundary_step_peak':round(float(np.max(join)),8),'interior_step_p99':round(float(np.max(p99)),8),
            'boundary_below_minus_40_dbfs':bool(np.max(join)<.01),'boundary_within_interior_p99':bool(np.all(join<=p99+1e-8)),
            'start_20ms_rms':round(float(np.sqrt(np.mean(x[:882]**2))),7),'end_20ms_rms':round(float(np.sqrt(np.mean(x[-882:]**2))),7)}

def save(name,x,kind,loop=False,extra=None):
    wav=OUT/(name+'.wav');wavfile.write(wav,SR,np.round(x*32767).astype(np.int16));runtime=wav;fmt='PCM S16LE WAV'
    if loop:
        runtime=OUT/(name+'.ogg');subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-c:a','libvorbis','-q:a','5',str(runtime)],check=True)
        raw=subprocess.check_output(['ffmpeg','-hide_banner','-loglevel','error','-i',str(runtime),'-f','f32le','-acodec','pcm_f32le','-'])
        decoded=np.frombuffer(raw,dtype='<f4').reshape(-1,2);fmt='Ogg Vorbis quality 5'
    else:decoded=wavfile.read(wav)[1].astype(np.float64)/32768
    m={'id':name,'file':runtime.name,'local_path':str(runtime),'type':kind,'format':fmt,'loop':loop,'loop_start_seconds':0 if loop else None,'loop_end_seconds':len(x)/SR if loop else None,'author':AUTHOR,'original':True,'source_samples':False,'bytes':runtime.stat().st_size,'sha256':hashlib.sha256(runtime.read_bytes()).hexdigest(),**metric(decoded)}
    if loop:m.update({'master_file':wav.name,'master_metrics':metric(x),'master_loop_check':seam(x),'decoded_loop_check':seam(decoded),'recommended_gain':.55})
    else:m['recommended_gain']=.42 if name=='se_click' else .65
    if extra:m.update(extra)
    assert m['clipped_samples']==0 and m['peak']<.98
    if loop:assert m['master_loop_check']['boundary_below_minus_40_dbfs'] and m['decoded_loop_check']['boundary_below_minus_40_dbfs']
    return m

if __name__=='__main__':
    tracks=[]
    tracks.append(save('bgm_exploration',exploration(),'BGM',True,{'title':'별빛 사이의 산책','tempo_bpm':72,'meter':'4/4','bars':12,'key_description':'D major / gentle modal colors','textures':['soft bowed ensemble','breathy woodwind','muted plucked strings','soft bell'],'description':'Original quiet fantasy exploration loop, with a sparse original woodwind melody.'}))
    tracks.append(save('bgm_card_battle',battle(),'BGM',True,{'title':'작은 결의','tempo_bpm':120,'meter':'4/4','bars':16,'key_description':'D minor / harmonic-minor dominant','textures':['short plucked strings','low string pulse','soft percussion','woodwind counterline'],'description':'Original restrained card-battle loop, arranged to leave space for dialogue.'}))
    labels={'click':'클릭','equip':'장비 착용','hit':'일반 타격','guard':'방어','heal':'회복','fire':'불','water':'물','ice':'얼음','lightning':'번개','wind':'바람','rock':'바위','dendro':'풀','melt':'융해','vaporize':'증발','overload':'과부하','freeze':'빙결','victory':'승리','defeat':'패배'}
    for key,label in labels.items():tracks.append(save('se_'+key,effect(key),'SE',False,{'title':label}))
    bindings={'bgm':{'exploration':'bgm_exploration','battle':'bgm_card_battle'},'ui':{'click':'se_click','equip':'se_equip'},'combat':{'hit':'se_hit','guard':'se_guard','heal':'se_heal','victory':'se_victory','defeat':'se_defeat'},'elements':{'PYRO':'se_fire','HYDRO':'se_water','CRYO':'se_ice','ELECTRO':'se_lightning','ANEMO':'se_wind','GEO':'se_rock','DENDRO':'se_dendro'},'reactions':{'RX_MELT_PYRO':'se_melt','RX_MELT_CRYO':'se_melt','RX_VAPORIZE_HYDRO':'se_vaporize','RX_VAPORIZE_PYRO':'se_vaporize','RX_OVERLOADED':'se_overload','RX_FROZEN':'se_freeze'}}
    metadata={'pack_id':'crpg_original_audio_20260924','version':1,'author':AUTHOR,'method':'Original note sequences plus additive/subtractive procedural synthesis; deterministic seed 20260924; no external recordings, melodies or samples.','bindings':bindings,'files':tracks,'validation':{'clipped_samples':sum(m['clipped_samples'] for m in tracks),'music_loops_checked_after_vorbis_decode':True,'loop_count':2,'effect_count':18,'all_runtime_files_exist':all((OUT/m['file']).exists() for m in tracks)}}
    (OUT/'audio-manifest.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'files':len(tracks),'runtime_bytes':sum(m['bytes'] for m in tracks),'loop_checks':{m['id']:m['decoded_loop_check'] for m in tracks if m['loop']},'clipped_samples':metadata['validation']['clipped_samples']},ensure_ascii=False,indent=2))
