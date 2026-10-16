#!/usr/bin/env python3
"""Generate original, normalized ambient stems for Cosmic Explorer.

The output is deterministic, locally generated, and contains no third-party audio.
Each identity receives three independently rendered stems: relaxing music, artistic
ambience, and data-inspired sonification. OGG/Opus and MP3 fallbacks are emitted.
"""
from __future__ import annotations
import hashlib, json, math, os, subprocess, tempfile, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parents[1]
PROFILE_LIST = json.loads((ROOT / 'profile-list.json').read_text(encoding='utf-8'))
OUT = ROOT / 'public' / 'audio' / 'ambient'
SR = 22050
MUSIC_SECONDS = 30.0
AMBIENCE_SECONDS = 20.0
SCIENCE_SECONDS = 16.0

# Distinct musical identities for the most important locations. Remaining
# identities are deterministically derived from their id, but still render an
# independent composition and audio file rather than reusing a generic track.
MANUAL = {
    'section-home': dict(root=57, scale='major_pent', bpm=48, mood='calm', texture='chimes'),
    'section-universe': dict(root=45, scale='dorian', bpm=42, mood='vast', texture='orbit'),
    'section-gallery': dict(root=40, scale='minor', bpm=46, mood='mystery', texture='archive'),
    'section-favorites': dict(root=60, scale='major_pent', bpm=52, mood='warm', texture='chimes'),
    'section-music-space': dict(root=62, scale='lydian', bpm=54, mood='light', texture='clean'),
    'section-cosmic-defender': dict(root=43, scale='minor_pent', bpm=66, mood='launch', texture='pulse'),
    'section-appearance': dict(root=64, scale='whole', bpm=58, mood='future', texture='digital'),
    'planet-mercury': dict(root=50, scale='phrygian', bpm=72, mood='dry', texture='metal'),
    'planet-venus': dict(root=38, scale='minor', bpm=40, mood='dense', texture='pressure'),
    'planet-earth': dict(root=57, scale='major_pent', bpm=56, mood='alive', texture='ocean'),
    'planet-mars': dict(root=43, scale='dorian', bpm=48, mood='lonely', texture='wind'),
    'planet-jupiter': dict(root=31, scale='minor', bpm=52, mood='storm', texture='storm'),
    'planet-saturn': dict(root=52, scale='lydian', bpm=50, mood='elegant', texture='rings'),
    'planet-uranus': dict(root=66, scale='whole', bpm=44, mood='ice', texture='crystal'),
    'planet-neptune': dict(root=35, scale='minor_pent', bpm=70, mood='darkwind', texture='storm'),
    'star-sun': dict(root=48, scale='mixolydian', bpm=60, mood='solar', texture='flare'),
    'star-sirius': dict(root=69, scale='lydian', bpm=76, mood='bright', texture='spark'),
    'star-vega': dict(root=67, scale='major_pent', bpm=68, mood='clean', texture='spark'),
    'star-betelgeuse': dict(root=33, scale='minor', bpm=34, mood='giant', texture='redgiant'),
    'star-rigel': dict(root=71, scale='lydian', bpm=78, mood='bluegiant', texture='flare'),
    'star-polaris': dict(root=55, scale='dorian', bpm=46, mood='variable', texture='pulse'),
    'star-proxima-centauri': dict(root=38, scale='minor_pent', bpm=38, mood='red', texture='redgiant'),
    'star-antares': dict(root=31, scale='phrygian', bpm=36, mood='giant', texture='redgiant'),
    'gallery-black-hole-accretion-disk': dict(root=26, scale='minor', bpm=36, mood='gravity', texture='blackhole'),
    'gallery-quasar': dict(root=42, scale='lydian', bpm=82, mood='power', texture='jet'),
    'gallery-blazar': dict(root=46, scale='whole', bpm=96, mood='directional', texture='blazar'),
    'gallery-tidal-disruption-event': dict(root=34, scale='phrygian', bpm=58, mood='tension', texture='rupture'),
    'gallery-pulsar': dict(root=54, scale='minor_pent', bpm=120, mood='regular', texture='pulsar'),
    'gallery-magnetar': dict(root=30, scale='minor', bpm=88, mood='magnetic', texture='magnetar'),
    'gallery-supernova': dict(root=40, scale='minor', bpm=50, mood='expansion', texture='supernova'),
    'gallery-supernova-remnant': dict(root=45, scale='dorian', bpm=32, mood='echo', texture='remnant'),
    'gallery-neutron-star-merger-kilonova': dict(root=29, scale='phrygian', bpm=84, mood='collision', texture='kilonova'),
    'gallery-protostar-protoplanetary-disk': dict(root=59, scale='major_pent', bpm=46, mood='birth', texture='orbit'),
    'gallery-planetary-nebula': dict(root=62, scale='lydian', bpm=38, mood='ethereal', texture='nebula'),
    'gallery-cosmic-web': dict(root=36, scale='whole', bpm=24, mood='vast', texture='network'),
    'gallery-wolf-rayet-star': dict(root=47, scale='phrygian', bpm=92, mood='wind', texture='wolf'),
    'gallery-vampire-star-system': dict(root=49, scale='harmonic_minor', bpm=66, mood='dual', texture='binary'),
    'gallery-herbig-haro-stellar-jet': dict(root=52, scale='dorian', bpm=86, mood='flow', texture='jet'),
    'gallery-gamma-ray-burst': dict(root=39, scale='minor_pent', bpm=110, mood='burst', texture='gamma'),
}

SCALES = {
    'major_pent': [0,2,4,7,9],
    'minor_pent': [0,3,5,7,10],
    'minor': [0,2,3,5,7,8,10],
    'dorian': [0,2,3,5,7,9,10],
    'phrygian': [0,1,3,5,7,8,10],
    'lydian': [0,2,4,6,7,9,11],
    'mixolydian': [0,2,4,5,7,9,10],
    'whole': [0,2,4,6,8,10],
    'harmonic_minor': [0,2,3,5,7,8,11],
}


def seed_for(value: str) -> int:
    return int(hashlib.sha256(value.encode()).hexdigest()[:16], 16) & 0xFFFFFFFF


def midi_to_hz(note: float) -> float:
    return 440.0 * 2 ** ((note - 69.0) / 12.0)


def pan_stereo(mono: np.ndarray, pan: float) -> np.ndarray:
    pan = float(np.clip(pan, -1, 1))
    left = math.cos((pan + 1) * math.pi / 4)
    right = math.sin((pan + 1) * math.pi / 4)
    return np.stack([mono * left, mono * right], axis=1)


def smooth_noise(rng, n, cutoff=0.008):
    x = rng.normal(0, 1, n)
    win = max(5, int(SR * cutoff))
    kernel = np.ones(win) / win
    return np.convolve(x, kernel, mode='same')


def lowpass(x, hz):
    hz = min(hz, SR * 0.45)
    sos = butter(4, hz / (SR / 2), btype='low', output='sos')
    return sosfilt(sos, x, axis=0)


def highpass(x, hz):
    hz = max(10, min(hz, SR * 0.4))
    sos = butter(3, hz / (SR / 2), btype='high', output='sos')
    return sosfilt(sos, x, axis=0)


def envelope(n, attack=.5, release=.8):
    env = np.ones(n)
    a = min(n//2, int(SR*attack)); r = min(n//2, int(SR*release))
    if a: env[:a] = np.sin(np.linspace(0, math.pi/2, a))**2
    if r: env[-r:] = np.cos(np.linspace(0, math.pi/2, r))**2
    return env


def oscillator(freq, n, phase=0, kind='sine', vibrato=0.0, vibrato_rate=0.2):
    t = np.arange(n) / SR
    inst = freq * (1 + vibrato * np.sin(2*np.pi*vibrato_rate*t))
    ph = phase + 2*np.pi*np.cumsum(inst) / SR
    if kind == 'triangle': return 2/np.pi * np.arcsin(np.sin(ph))
    if kind == 'saw': return 2 * ((ph/(2*np.pi)) % 1) - 1
    if kind == 'square': return np.sign(np.sin(ph))
    return np.sin(ph)


def add_note(track, start, dur, freq, amp, pan=0, kind='sine', bell=False):
    i0 = max(0, int(start*SR)); i1 = min(len(track), i0 + int(dur*SR))
    if i1 <= i0: return
    n = i1-i0
    if bell:
        t = np.arange(n)/SR
        mono = (np.sin(2*np.pi*freq*t) + .45*np.sin(2*np.pi*freq*2.01*t) + .18*np.sin(2*np.pi*freq*3.97*t))
        mono *= np.exp(-t/max(.25,dur*.38))
        mono *= envelope(n,.015,.2)
    else:
        mono = oscillator(freq,n,kind=kind,vibrato=.002,vibrato_rate=.15) * envelope(n,min(.8,dur*.2),min(1.2,dur*.25))
    track[i0:i1] += pan_stereo(mono*amp,pan)


def recipe_for(pid, category):
    if pid in MANUAL: return MANUAL[pid]
    rng = np.random.default_rng(seed_for(pid))
    return dict(root=int(rng.integers(36,68)), scale=list(SCALES)[int(rng.integers(0,len(SCALES)))], bpm=int(rng.integers(38,88)), mood=category, texture='generic')


def render_music(pid, category, seconds=MUSIC_SECONDS):
    recipe = recipe_for(pid, category); rng=np.random.default_rng(seed_for(pid+'music'))
    n=int(seconds*SR); out=np.zeros((n,2),dtype=np.float64)
    root=recipe['root']; scale=SCALES[recipe['scale']]; bpm=recipe['bpm']
    # Unique 4-chord progression derived per identity.
    degree_seq = rng.choice(len(scale),4,replace=False if len(scale)>=4 else True)
    chord_len=seconds/4
    for ci,deg in enumerate(degree_seq):
        start=ci*chord_len
        base=root+scale[int(deg)]
        chord=[base, base+scale[(int(deg)+2)%len(scale)]+(12 if int(deg)+2>=len(scale) else 0), base+scale[(int(deg)+4)%len(scale)]+(12 if int(deg)+4>=len(scale) else 0)]
        for j,note in enumerate(chord):
            freq=midi_to_hz(note-12 if j==0 else note)
            add_note(out,start,chord_len+.4,freq,.10 if j else .12,pan=(-.35+j*.35),kind='sine')
            add_note(out,start,chord_len+.2,freq*2,.025,pan=(.3-j*.3),kind='triangle')
    beat=60/bpm
    motif=rng.choice(scale, size=8, replace=True)
    for k,t0 in enumerate(np.arange(1.5,seconds-1,beat*2)):
        note=root+12+int(motif[k%len(motif)])+(12 if k%7==6 else 0)
        add_note(out,float(t0),min(2.4,beat*2.2),midi_to_hz(note),.08,pan=float(np.sin(k*1.7)*.65),bell=True)
    # Slow breathing and subtle width make each file musical rather than a static drone.
    t=np.arange(n)/SR
    breath=.78+.22*np.sin(2*np.pi*(.035+(seed_for(pid)%17)*.001)*t+1.3)
    out*=breath[:,None]
    out=lowpass(out, 4200 if recipe['texture'] in ('spark','flare','digital') else 2600)
    return out


def render_ambience(pid, category, seconds=AMBIENCE_SECONDS):
    recipe=recipe_for(pid,category); tex=recipe['texture']; rng=np.random.default_rng(seed_for(pid+'amb'))
    n=int(seconds*SR); t=np.arange(n)/SR; out=np.zeros((n,2),float)
    root=midi_to_hz(recipe['root']-24)
    # Every identity receives independent random material and modulation.
    noiseL=rng.normal(0,1,n); noiseR=rng.normal(0,1,n)
    noise=np.stack([noiseL,noiseR],axis=1)
    cutoff={'pressure':420,'wind':1200,'ocean':1800,'storm':900,'crystal':4500,'blackhole':500,'nebula':2600,'network':1400}.get(tex,1800)
    noise=lowpass(noise,cutoff)
    noise/=max(1e-6,np.std(noise))
    motion=.55+.45*np.sin(2*np.pi*(.025+(seed_for(pid)%23)*.002)*t + rng.random()*6.28)
    out += noise * motion[:,None] * .055
    # Distinct harmonic texture.
    for j,mul in enumerate([1,1.5,2.01]):
        kind='sine' if tex not in ('metal','storm','wolf','jet','gamma') else ('triangle' if j else 'saw')
        mono=oscillator(root*mul,n,kind=kind,vibrato=.006+(j*.002),vibrato_rate=.04+j*.025)
        amp=[.09,.045,.025][j]
        pan=(-.55+j*.55)
        out += pan_stereo(mono*amp,pan)
    # Signature effects per texture.
    if tex in ('metal','rings','crystal','digital'):
        for k in range(6):
            start=(k+1)*seconds/7 + rng.uniform(-.35,.35)
            freq=root*(4+rng.choice([1,1.5,2,2.5]))
            add_note(out,start,1.4,freq,.075,pan=rng.uniform(-.8,.8),bell=True)
    if tex in ('storm','pressure','wind','wolf'):
        gust=smooth_noise(rng,n,.015); gust=(gust-gust.min())/(np.ptp(gust)+1e-9)
        out += noise * gust[:,None] * (.10 if tex=='storm' else .065)
    if tex in ('orbit','rings','binary','network'):
        orbit=np.sin(2*np.pi*(.06 if tex!='network' else .018)*t)
        out[:,0]+=oscillator(root*2,n)*.045*(.5+.5*orbit)
        out[:,1]+=oscillator(root*2.5,n)*.045*(.5-.5*orbit)
    if tex in ('blackhole','rupture'):
        gliss=oscillator(root*.8,n,vibrato=.18,vibrato_rate=.015,kind='sine')
        out += pan_stereo(gliss*.11,0)
    out*=envelope(n,.3,.6)[:,None]
    return out


def add_pulse(out, at, freq, amp=.18, dur=.12, pan=0, noise=False):
    i0=int(at*SR); i1=min(len(out),i0+int(dur*SR))
    if i1<=i0:return
    n=i1-i0; tt=np.arange(n)/SR
    if noise:
        rng=np.random.default_rng(i0+int(freq)); mono=rng.normal(0,1,n); mono=lowpass(mono[:,None],min(6000,freq*5))[:,0]
    else: mono=np.sin(2*np.pi*freq*tt)+.3*np.sin(2*np.pi*freq*2.02*tt)
    mono*=np.exp(-tt/max(.03,dur*.3))*envelope(n,.005,.04)*amp
    out[i0:i1]+=pan_stereo(mono,pan)


def render_science(pid, category, seconds=SCIENCE_SECONDS):
    recipe=recipe_for(pid,category); tex=recipe['texture']; rng=np.random.default_rng(seed_for(pid+'sci'))
    n=int(seconds*SR); t=np.arange(n)/SR; out=np.zeros((n,2),float)
    base=max(45,midi_to_hz(recipe['root']-12))
    # Explicitly recognizable signatures for requested A/B pairs.
    if tex=='pulsar':
        for at in np.arange(.35,seconds,.72): add_pulse(out,float(at),base*2.2,.24,.08,pan=.15)
    elif tex=='magnetar':
        at=.4
        while at<seconds:
            count=int(rng.integers(2,6))
            for j in range(count): add_pulse(out,at+j*.075,base*(2+j*.7),.22,.16,pan=rng.uniform(-.7,.7),noise=j%2==1)
            at+=rng.uniform(1.4,3.2)
    elif tex=='blackhole':
        f0=base*3; f1=base*.35
        phase=2*np.pi*np.cumsum(np.geomspace(f0,f1,n))/SR
        mono=np.sin(phase)*(.12+.06*np.sin(2*np.pi*.17*t))
        out+=pan_stereo(mono,0)
    elif tex=='jet':
        for at in np.arange(.25,seconds,1.1):
            dur=.55; i0=int(at*SR); i1=min(n,i0+int(dur*SR)); nn=i1-i0
            if nn>0:
                freq=np.linspace(base*1.5,base*8,nn); ph=2*np.pi*np.cumsum(freq)/SR
                mono=np.sin(ph)*np.hanning(nn)*.18
                out[i0:i1]+=pan_stereo(mono, .65 if int(at)%2 else -.65)
    elif tex=='blazar':
        for at in np.arange(.2,seconds,.42): add_pulse(out,float(at),base*(3+(int(at*10)%4)),.15,.07,pan=.75)
    elif tex in ('supernova','gamma','kilonova'):
        moments=[seconds*.28,seconds*.65] if tex!='gamma' else [seconds*.35]
        for at in moments:
            add_pulse(out,at,base*.7,.25,1.2,pan=0,noise=True)
            for j in range(8): add_pulse(out,at+j*.06,base*(1+j*.5),.11,.25,pan=(-1+j/4))
    elif tex=='remnant':
        for at in [1.0,5.4,10.2,14.0]:
            add_pulse(out,at,base,.16,.5,pan=-.5)
            add_pulse(out,at+.5,base*.75,.10,.8,pan=.5)
            add_pulse(out,at+1.2,base*.5,.06,1.0,pan=0)
    elif tex=='network':
        for lane,period in enumerate([2.9,4.1,5.3]):
            for at in np.arange(.4+lane*.6,seconds,period): add_pulse(out,float(at),base*(1+lane*.5),.12,.5,pan=-.7+lane*.7)
    else:
        period=max(.38,60/max(30,recipe['bpm']))
        for k,at in enumerate(np.arange(.4,seconds,period*(1.5+(seed_for(pid)%5)*.2))):
            f=base*(1+[0,.25,.5,1][k%4]); add_pulse(out,float(at),f,.12+(k%3)*.025,.15+(k%4)*.06,pan=float(np.sin(k*1.3)*.7),noise=(k%5==4))
        # Frequency sweep uniquely parameterized by identity.
        sweep=oscillator(base*(1.1+(seed_for(pid)%13)/20),n,vibrato=.08,vibrato_rate=.03+(seed_for(pid)%7)*.009)
        out+=pan_stereo(sweep*.035,0)
    out=highpass(out,30)
    out*=envelope(n,.08,.25)[:,None]
    return out


def normalize(audio, target_rms_db, peak_db=-2.0):
    audio=np.nan_to_num(audio)
    rms=float(np.sqrt(np.mean(audio**2)))
    target=10**(target_rms_db/20)
    if rms>1e-9: audio*=target/rms
    peak=float(np.max(np.abs(audio)))
    peak_target=10**(peak_db/20)
    if peak>peak_target: audio*=peak_target/peak
    # 30 ms edge fades, no long silent lead-in/tail.
    f=min(len(audio)//2,int(.03*SR)); fade=np.linspace(0,1,f)
    audio[:f]*=fade[:,None]; audio[-f:]*=fade[::-1,None]
    return np.clip(audio,-1,1).astype(np.float32)


def write_wav(path,audio):
    pcm=(audio*32767).astype('<i2')
    with wave.open(str(path),'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


def encode(wav, outbase):
    ogg=outbase.with_suffix('.ogg'); mp3=outbase.with_suffix('.mp3')
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(wav),'-c:a','libopus','-b:a','48k','-vbr','on',str(ogg)],check=True)
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(wav),'-c:a','libmp3lame','-b:a','64k',str(mp3)],check=True)
    return ogg,mp3


def analyze(path):
    p=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration,size','-of','json',str(path)],capture_output=True,text=True,check=True)
    data=json.loads(p.stdout)['format']; return {'duration':round(float(data['duration']),3),'size':int(data['size'])}


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    manifest={'version':2,'generatedBy':'Cosmic Explorer original procedural renderer','sampleRate':SR,'profiles':{},'files':[]}
    with tempfile.TemporaryDirectory() as td:
        td=Path(td)
        total=len(PROFILE_LIST)
        for idx,p in enumerate(PROFILE_LIST,1):
            pid=p['id']; category=p['category']; folder=OUT/pid; folder.mkdir(parents=True,exist_ok=True)
            stem_specs=[('music',-16.5,MUSIC_SECONDS),('ambience',-20.0,AMBIENCE_SECONDS),('sonification',-19.0,SCIENCE_SECONDS)]
            entry={'id':pid,'category':category,'names':p['names'],'stems':{}}
            for stem,target,seconds in stem_specs:
                ogg=folder/f'{stem}.ogg'; mp3=folder/f'{stem}.mp3'
                if not (ogg.exists() and ogg.stat().st_size>0 and mp3.exists() and mp3.stat().st_size>0):
                    audio = render_music(pid,category) if stem=='music' else render_ambience(pid,category) if stem=='ambience' else render_science(pid,category)
                    audio=normalize(audio,target, peak_db=-4.5 if stem=='sonification' else -2.5)
                    wav=td/f'{pid}-{stem}.wav'; write_wav(wav,audio)
                    ogg,mp3=encode(wav,folder/stem)
                meta={'ogg':f'/audio/ambient/{pid}/{stem}.ogg','mp3':f'/audio/ambient/{pid}/{stem}.mp3','targetRmsDb':target,'duration':seconds}
                entry['stems'][stem]=meta
                for fmt,path in [('ogg',ogg),('mp3',mp3)]:
                    details=analyze(path); manifest['files'].append({'profileId':pid,'stem':stem,'format':fmt,'path':str(path.relative_to(ROOT/'public')).replace(os.sep,'/'),**details})
            manifest['profiles'][pid]=entry
            print(f'[{idx:02d}/{total}] {pid}',flush=True)
    (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    total_bytes=sum(x['size'] for x in manifest['files'])
    print(f'Generated {len(manifest["files"])} files, {total_bytes/1024/1024:.1f} MiB')

if __name__=='__main__': main()
