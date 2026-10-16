#!/usr/bin/env python3
from pathlib import Path
import json, subprocess
ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'public/audio/ambient/manifest.json').read_text())
rows=[];errors=[]
for i,item in enumerate(manifest['files'],1):
    path=ROOT/'public'/item['path']
    row={'profileId':item['profileId'],'stem':item['stem'],'format':item['format'],'path':item['path'],'exists':path.exists(),'size':path.stat().st_size if path.exists() else 0}
    if not path.exists() or row['size']==0:
        row['status']='ERROR';row['error']='missing or empty';errors.append(row);rows.append(row);continue
    proc=subprocess.run(['ffprobe','-v','error','-select_streams','a:0','-show_entries','stream=codec_name,sample_rate,channels,duration','-of','json',str(path)],capture_output=True,text=True)
    if proc.returncode:
        row['status']='ERROR';row['error']=proc.stderr.strip();errors.append(row)
    else:
        streams=json.loads(proc.stdout).get('streams',[]);stream=streams[0] if streams else {}
        row.update({'codec':stream.get('codec_name'),'sampleRate':int(stream.get('sample_rate') or 0),'channels':stream.get('channels'),'duration':round(float(stream.get('duration') or item['duration']),3),'status':'OK'})
        if row['channels']!=2 or row['duration']<10: row['status']='ERROR';row['error']='invalid channels or duration';errors.append(row)
    rows.append(row)
report={'summary':{'files':len(rows),'ok':sum(r['status']=='OK' for r in rows),'errors':len(errors),'totalBytes':sum(r['size'] for r in rows)},'files':rows,'errors':errors}
(ROOT/'AMBIENT_AUDIO_FILE_AUDIT.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report['summary'],indent=2))
if errors: raise SystemExit(1)
