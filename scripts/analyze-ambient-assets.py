#!/usr/bin/env python3
from pathlib import Path
import json, subprocess, math
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'public/audio/ambient/manifest.json').read_text())

def decode(path):
    p=subprocess.run(['ffmpeg','-v','error','-i',str(path),'-ac','1','-ar','11025','-f','f32le','pipe:1'],capture_output=True,check=True)
    return np.frombuffer(p.stdout,dtype='<f4')

def features(x,sr=11025):
    if not len(x): return {}
    rms=float(np.sqrt(np.mean(x*x))); peak=float(np.max(np.abs(x))); zcr=float(np.mean(np.abs(np.diff(np.signbit(x)))))
    # Use windows spread throughout the file for a stable compact signature.
    nfft=2048; starts=np.linspace(0,max(0,len(x)-nfft),min(24,max(1,len(x)//nfft)),dtype=int)
    cents=[]; flats=[]; flux=[]; prev=None
    freqs=np.fft.rfftfreq(nfft,1/sr)
    for st in starts:
        frame=x[st:st+nfft]
        if len(frame)<nfft: frame=np.pad(frame,(0,nfft-len(frame)))
        mag=np.abs(np.fft.rfft(frame*np.hanning(nfft)))+1e-12
        cents.append(float(np.sum(freqs*mag)/np.sum(mag)))
        flats.append(float(np.exp(np.mean(np.log(mag)))/np.mean(mag)))
        norm=mag/np.sum(mag)
        if prev is not None: flux.append(float(np.sqrt(np.mean((norm-prev)**2))))
        prev=norm
    return {'rmsDb':round(20*math.log10(max(rms,1e-12)),2),'peakDb':round(20*math.log10(max(peak,1e-12)),2),'zcr':round(zcr,5),'centroidHz':round(float(np.mean(cents)),1),'flatness':round(float(np.mean(flats)),5),'spectralFlux':round(float(np.mean(flux) if flux else 0),6)}

out={'profiles':{},'summary':{}}
for idx,(pid,profile) in enumerate(manifest['profiles'].items(),1):
    out['profiles'][pid]={}
    for stem in ['music','ambience','sonification']:
        path=ROOT/'public'/profile['stems'][stem]['ogg'].lstrip('/')
        out['profiles'][pid][stem]=features(decode(path))
    print(f'[{idx:02d}/{len(manifest["profiles"])}] {pid}',flush=True)
allf=[v for p in out['profiles'].values() for v in p.values()]
out['summary']={'minRmsDb':min(v['rmsDb'] for v in allf),'maxRmsDb':max(v['rmsDb'] for v in allf),'minPeakDb':min(v['peakDb'] for v in allf),'maxPeakDb':max(v['peakDb'] for v in allf),'filesAnalyzed':len(allf)}
# Requested A/B pairs, using all stem features.
pairs=[('planet-earth','planet-mars'),('planet-jupiter','planet-saturn'),('planet-uranus','planet-neptune'),('gallery-pulsar','gallery-magnetar'),('gallery-quasar','gallery-blazar'),('gallery-supernova','gallery-supernova-remnant'),('gallery-black-hole-accretion-disk','gallery-cosmic-web')]
def vector(pid):
    vals=[]
    for stem in ['music','ambience','sonification']:
        f=out['profiles'][pid][stem]; vals += [f['rmsDb']/30,f['centroidHz']/3000,f['flatness']*5,f['zcr']*5,f['spectralFlux']*100]
    return np.array(vals)
out['pairDistances']={f'{a}__{b}':round(float(np.linalg.norm(vector(a)-vector(b))),4) for a,b in pairs}
(ROOT/'AMBIENT_AUDIO_ANALYSIS.json').write_text(json.dumps(out,indent=2),encoding='utf-8')
print(json.dumps({'summary':out['summary'],'pairDistances':out['pairDistances']},indent=2))
