"""Generate one dimension manifest from the validated CAD configuration."""
from pathlib import Path
import json, math

ROOT=Path(__file__).resolve().parents[1]
r=json.loads((ROOT/'Public/Data/validation.json').read_text())
c=r['config']; rear=r['inspection']['rear_profile']; parts=r['inspection']['bodies']
assert r['status']=='passed' and r['version']=='1.3.0'
x0=parts[1]['bounds_mm'][0]+3; x1=x0+80; y0=94.5; y1=199.5; xc=(x0+x1)/2
D=[]
def dim(id,name,value,group,description,a,b,offset=(0,0,0),view='iso',status='cad',unit='mm',part=None):
    D.append(dict(id=id,name=name,value=round(value,6),group=group,description=description,a=a,b=b,
                  offset=list(offset),view=view,status=status,unit=unit,part=part or ('bin' if group in ('Bin','Rear relief','Lid') else 'tray')))
dim('rail-width','Overall rail width',c['carrier_width'],'Tray','Outside-to-outside width of the unchanged guide-rail plate.',[-81.25,0,0],[81.25,0,0],(0,-18,0),'top')
dim('carrier-length','Overall length',203,'Tray','Front-to-rear carrier length, including its end walls.',[81.25,0,0],[81.25,203,0],(18,0,0),'top')
dim('tray-depth','Tray outside depth',44.5,'Tray','From the carrier seating plane (Z = 0) to the tray underside.',[73.25,40,0],[71.25,40,-44.5],(18,0,0),'front',status='specified')
dim('body-top','Body width beneath rails',146.5,'Tray','Measured at Z = -3 mm, directly beneath the rail plate.',[-73.25,35,-3],[73.25,35,-3],(0,-45,0),'front')
dim('body-bottom','Body width at bottom',142.5,'Tray','Measured at Z = -44.5 mm. Each side tapers inward by 2 mm.',[-71.25,35,-44.5],[71.25,35,-44.5],(0,-45,0),'front')
dim('plate-thickness','Rail plate thickness',3,'Tray','Rail plate spans Z = -3 to Z = 0 mm.',[-78,45,-3],[-78,45,0],(-18,0,0),'front',status='specified')
dim('rail-overhang','Rail projection',8,'Tray','Per side, relative to the upper body width; rail footprint unchanged.',[73.25,40,-3],[81.25,40,-3],(0,-35,0),'front',status='derived')
dim('tray-wall','Tray side wall',3,'Tray','Horizontal thickness. Inner cavity follows the outer taper.',[72.4307,40,-20],[69.4307,40,-20],(0,-48,0),'front',status='cad')
dim('tray-floor','Tray floor',3,'Tray','Flat floor thickness away from the bin receiver.',[30,40,-44.5],[30,40,-41.5],(60,0,0),'front',status='specified')
dim('inside-depth','Usable tray depth',41.5,'Tray','Seating plane to the inside tray floor.',[40,50,0],[40,50,-41.5],(0,-65,0),'front',status='derived')
dim('front-tray-width','Front cavity width',140.5,'Tray','Upper bounding width. Rounded corners reduce local usable space.',[-70.25,40,0],[70.25,40,0],(0,-15,8),'top',status='derived')
dim('front-tray-length','Front cavity length',85.5,'Tray','Upper bounding length, from Y = 3 to Y = 88.5.',[0,3,0],[0,88.5,0],(0,0,8),'top',status='derived')
dim('side-tray-top','Side cavity at top',54.355421686747,'Tray','Driver-side storage width at the upper opening.',[x1+6,150,0],[70.25,150,0],(0,0,9),'top',status='derived')
dim('side-tray-floor','Side cavity at floor',52.5,'Tray','Width at the inner floor after tapering.',[x1+6,150,-41.5],[68.394578313253,150,-41.5],(0,0,4),'top',status='derived')
dim('rim-depth','Receiver reinforcing rib',6,'Fit','Rib depth beside the open passenger-side receiver.',[x0-2,145,0],[x0-2,145,-6],(-17,0,0),'right',status='specified')
dim('rim-land','Minimum rim support',2.5,'Fit','Minimum land supporting the bin flange through the 6 mm rib depth.',[-73.105421686747,145,-6],[x0-.5,145,-6],(0,0,12),'top')
dim('receiver-gap','Receiver clearance per side',.5,'Fit','Nominal lateral clearance between the bin body and its opening. Not a print-fit guarantee.',[x1,145,-2],[x1+.5,145,-2],(0,0,18),'top',status='specified',part='bin')
dim('rear-receiver-wall','Receiver rear wall',3,'Fit','Carrier wall behind the opening, Y = 200 to 203.',[xc,200,0],[xc,203,0],(0,0,14),'top',status='derived')
dim('bin-width','Bin upper width',80,'Bin','Outside width of the removable bin, excluding the retaining flange.',[x0,145,0],[x1,145,0],(0,0,14),'top')
dim('bin-length','Bin upper length',105,'Bin','Front-to-rear outside length above the rear relief.',[x1,y0,0],[x1,y1,0],(18,0,0),'top')
dim('bin-depth','Bin maximum depth',105,'Bin','Below the carrier seating plane. The flange adds 2.5 mm above it.',[x0,y0,0],[x0,y0,-105],(-18,0,0),'left')
dim('bin-total-height','Bin overall height',107.5,'Bin','Bottom to flange top, including the 2.5 mm flange height.',[x0,y0,2.5],[x0,y0,-105],(-24,0,0),'left',status='derived')
dim('bin-wall','Bin shell thickness',2.4,'Bin','Side-wall thickness. The sloped rear wall also retains 2.4 mm measured normally.',[x1,140,-25],[x1-2.4,140,-25],(0,0,38),'top',status='specified')
dim('bin-floor','Bin floor thickness',3,'Bin','Flat bottom at Z = -105; cavity floor at Z = -102.',[xc,120,-105],[xc,120,-102],(0,-35,0),'left')
dim('bin-corner','Original outside corner radius',8,'Bin','Retained on the upper/front geometry. New lower rear intersections have no added fillets.',[x0,y0+8,0],[x0+8,y0+8,0],(0,0,12),'top',status='specified')
dim('flange-width','Flange outside width',86,'Lid','Existing footprint available to reference the lid attachment. Baseline geometry stays fixed.',[x0-3,145,2.5],[x1+3,145,2.5],(0,0,12),'top')
dim('flange-length','Flange outside length',111,'Lid','Retaining flange front-to-rear length.',[x1+3,y0-3,2.5],[x1+3,y1+3,2.5],(15,0,0),'top')
dim('flange-height','Flange above seating plane',2.5,'Lid','The confirmed 4 mm lid allowance starts at this surface, Z = +2.5.',[x0-2,135,0],[x0-2,135,2.5],(-15,0,0),'right')
dim('opening-width','Nominal opening width',75.2,'Lid','Inside upper width, excluding rounded-corner reductions. Derived from 80 minus two 2.4 mm walls.',[x0+2.4,145,2.5],[x1-2.4,145,2.5],(0,0,14),'top',status='derived')
dim('opening-length','Nominal opening length',100.2,'Lid','Inside upper length, excluding rounded-corner reductions.',[xc,y0+2.4,2.5],[xc,y1-2.4,2.5],(0,0,14),'top',status='derived')
dim('opening-radius','Opening corner radius',5.6,'Lid','Existing rounded inner corners. Derived from 8 minus 2.4 mm.',[x0+2.4,y0+8,2.5],[x0+8,y0+8,2.5],(0,0,14),'top',status='derived')
dim('lid-headroom','Lid height allowance',4,'Lid','Confirmed by Chris: 4 mm ABOVE the existing flange when closed or sliding. Lid opens downward.',[xc,145,2.5],[xc,145,6.5],(-48,0,0),'right',status='user')
dim('lid-ceiling','Closed/sliding height limit',6.5,'Lid','Absolute Z limit relative to the carrier seating plane. Includes the existing 2.5 mm flange.',[xc,145,0],[xc,145,6.5],(-58,0,0),'right',status='derived')
dim('step-start','Rear relief begins',44.5,'Rear relief','Upper exterior stays unchanged through the tray depth.',[xc,y1,0],[xc,y1,-44.5],(55,0,0),'left')
dim('rear-setback','Rear forward setback',3,'Rear relief','Horizontal step toward the vehicle front at Z = -44.5. Not proof of a 3 mm vehicle gap.',[xc,199.5,-44.5],[xc,196.5,-44.5],(55,0,0),'left')
dim('rear-angle','Rear wall from vertical',18,'Rear relief','Both inside and outside sloping faces are 18° from vertical. Front wall stays unchanged.',[xc,196.5,-44.5],[xc,176.842358,-105],(55,0,0),'left',unit='°')
dim('rear-sloped-height','Sloped section height',60.5,'Rear relief','Vertical span from the tray underside to the bin bottom.',[xc,196.5,-44.5],[xc,196.5,-105],(55,0,0),'left',status='derived')
dim('bottom-length','Bottom outside length',rear['bottom_length_mm'],'Rear relief','Verified outside floor footprint after the rear relief.',[xc,y0,-105],[xc,176.842358377909,-105],(55,0,-12),'left')
dim('bottom-inset','Total rear-bottom inset',rear['total_bottom_setback_mm'],'Rear relief','3 mm step plus 60.5 × tan(18°).',[xc,176.842358377909,-105],[xc,y1,-105],(55,0,-20),'left',status='derived')
dim('inner-step','Inside shoulder depth',42.1,'Rear relief','The inside shoulder is raised 2.4 mm to keep the rear step closed.',[xc,197.1,0],[xc,197.1,-42.1],(48,0,0),'left',status='derived')
dim('rear-wall-normal','Sloped rear wall thickness',2.4,'Rear relief','Normal distance between parallel sloping rear faces; checked against Fusion BReps.',[xc,187.5484623687834,-72.05],[xc,185.02495303061158,-72.05],(55,0,0),'left')
dim('slide-travel','Reference slide travel',77,'Fit','Historical travel requirement. Context animation is illustrative; the full vehicle sweep is unverified.',[0,0,0],[0,77,0],(105,0,0),'top',status='reference',part='system')
dim('shallow-gap','Bin inside shallow envelope',1.144578313253,'Fit','Distance to the narrowest shallow-body side envelope. Does not establish deep console clearance.',[-71.25,145,-44.5],[x0,145,-44.5],(0,0,12),'top')
# The dimension line must encode the actual vector measured. Depth and normal
# thickness callouts use projection/normal annotation rather than chord length.
for d in D:
    if d['id']=='tray-depth':
        d['a']=[73.25,40,0];d['b']=[73.25,40,-44.5]
    if d['id']=='rear-wall-normal':
        angle=math.radians(18)
        # Start on the outer face and move inward along its normal.
        d['a']=[xc,187.5484623687834,-72.05]
        d['b']=[xc,187.5484623687834-2.4*math.cos(angle),-72.05+2.4*math.sin(angle)]
manifest=dict(revision='1.3.0',sourceSha256=r['script_sha256'],vehicle='2024 Tesla Model Y',
 units='mm',meshToleranceMm=.02,binBounds=[x0,x1,y0,y1,-105,2.5],
 lid=dict(aboveFlange=4,flangeZ=2.5,ceilingZ=6.5,direction='Downward into the bin',status='user'),
 axes=dict(x='Positive: driver. Negative: passenger.',y='Positive: rear. Zero: vehicle front.',z='Zero: carrier seating plane. Positive: upward.'),
 dimensions=D,issues={},
 warnings=['CAD geometry is verified; physical vehicle fit is not.',
 'The Tesla scene is an illustrative console reference, not a measured collision model.',
 'Historical 157 mm opening, 143.5 mm ledge gap, and 130 mm deep width conflict with some approved product dimensions.',
 'The 4 mm lid envelope is a height constraint, not a finished lid design.',
 'All website comments and downloadable CAD are public.'])
(ROOT/'Public/Data/specification.json').write_text(json.dumps(manifest,indent=2))
print(f'Generated {len(D)} dimensions from validated revision {r["version"]}.')
