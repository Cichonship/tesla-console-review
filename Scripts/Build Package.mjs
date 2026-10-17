import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),pub=path.join(root,'Public');
const spec=JSON.parse(await readFile(path.join(pub,'Data/specification.json'),'utf8'));
const validation=JSON.parse(await readFile(path.join(pub,'Data/validation.json'),'utf8'));
const pdf=await PDFDocument.create();
pdf.setTitle('Console Study: Designer Handoff v1.3.0');pdf.setAuthor('Console Study');pdf.setSubject('Verified CAD dimensions and downward-opening lid design brief');
const normal=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
const ink=rgb(.16,.25,.18),muted=rgb(.36,.43,.32),line=rgb(.83,.87,.79);
let page,y;
function text(value,x,at,size=10,font=normal,color=ink){page.drawText(String(value),{x,y:at,size,font,color});}
function lines(value,width,size=10){const result=[];let current='';for(const word of value.split(' ')){const next=(current+' '+word).trim();if(normal.widthOfTextAtSize(next,size)>width&&current){result.push(current);current=word;}else current=next;}if(current)result.push(current);return result;}
function para(value,size=10){for(const s of lines(value,500,size)){text(s,48,y,size,normal,muted);y-=size*1.5;}y-=10;}
function heading(value){text(value,48,y,15,bold);y-=25;}
function newPage(title){page=pdf.addPage([595,842]);y=758; text('CONSOLE STUDY / DESIGNER HANDOFF',48,800,8,bold,muted);text('v1.3.0',510,800,8,normal,muted);text(title,48,y,26,normal);y-=36;page.drawLine({start:{x:48,y:42},end:{x:547,y:42},thickness:.5,color:line});text('Public review. Exact CAD governs fabrication. Physical vehicle fit is unverified.',48,29,7,normal,muted);text(String(pdf.getPageCount()),535,29,7,normal,muted);}
newPage('The baseline and the brief.');
para('A tapered console tray and removable rear-passenger bin for the 2024 Tesla Model Y context. This is an independent design project, not a Tesla product or a verified fit certificate.');
const image=await pdf.embedPng(await readFile(path.join(pub,'Images/assembly.png')));
const dims=image.scaleToFit(480,245);page.drawImage(image,{x:(595-dims.width)/2,y:y-dims.height,width:dims.width,height:dims.height});y-=dims.height+28;
heading('Keep the accepted base. Design the lid.');
para('The tray and bin are frozen at revision 1.3.0. Propose changes in an item-specific review thread before modifying the baseline. Comments do not change the accepted CAD.');
heading('Four millimeters above the flange.');
para('The flange top is Z = +2.5 mm. Chris confirmed 4 mm of additional headroom, so the closed/sliding ceiling is Z = +6.5 mm relative to the carrier seating plane. Hinge hardware, tolerances, warping, flex, seals, and running clearance all share this allowance.');
heading('Open downward into the bin.');
para('No finished lid, hinge axis, or validated swept volume is supplied. Check the entire mechanism against the walls, optional liner, accumulated trash, lift-out path, and console cover. Manufacturing process, materials, tolerances, and mechanism choice belong to the designer.');
for(let start=0;start<spec.dimensions.length;start+=24){
  newPage(start?'Dimensions / continued.':'The dimension register.');
  para('All values are in millimeters unless marked in degrees. Rounded nominal openings exclude corner reductions. The website provides an anchor and explanation for every item.',9);
  text('FEATURE',48,y,8,bold,muted);text('VALUE',315,y,8,bold,muted);text('EVIDENCE',410,y,8,bold,muted);y-=18;
  for(const d of spec.dimensions.slice(start,start+24)){
    text(d.name,48,y,9);text(`${+d.value.toFixed(3)}${d.unit==='°'?'°':' mm'}`,315,y,9,bold);
    text(({cad:'CAD verified',specified:'CAD specification',derived:'Derived',user:'User confirmed',reference:'Unverified reference'})[d.status],410,y,8,normal,muted);
    page.drawLine({start:{x:48,y:y-9},end:{x:547,y:y-9},thickness:.3,color:line});y-=25;
  }
}
newPage('What the evidence supports.');
heading('Verified in Fusion');
para('Two connected solids. Zero assembly interference. The accepted source passed 29 regression tests and 53 point-containment checks. Exported part volumes match the approved validation report. The browser mesh is tessellated from the same BReps at a requested 0.02 mm surface tolerance.');
for(const b of validation.inspection.bodies)para(`${b.component}: ${b.volume_mm3.toFixed(3)} cubic millimeters. Bounds: ${b.bounds_mm.map(x=>+x.toFixed(3)).join(', ')}.`,9);
heading('Unverified or conflicting');
for(const w of validation.warnings)para(w,9);
heading('Coordinate system');
for(const [axis,desc] of Object.entries(spec.axes))para(`${axis.toUpperCase()}: ${desc}`,9);
heading('Files and provenance');
para('Assembly and individual-part STEP files are exact CAD exports. The F3D is the approved native archive. This is a direct-design BRep model, not a fully parametric feature-history design. A SHA-256 manifest identifies the downloadable assets. No manufacturing tolerances or vehicle compatibility are implied.');
para('Generator SHA-256:',8);text(spec.sourceSha256,48,y,6.8,normal,muted);y-=25;
para('Review: https://cichonship.github.io/tesla-console-review/',9);
await writeFile(path.join(pub,'Downloads/dimension-sheet-v1.3.0.pdf'),await pdf.save());
const brief=`# Console Study: Designer Handoff\n\nBaseline: Rear Right Bin v1.3.0\nVehicle context: 2024 Tesla Model Y. Physical fit is NOT verified.\n\n## Lid Requirements\n\n- Lid covers the bin only and opens DOWNWARD into the bin.\n- The existing flange top is Z=+2.5 mm.\n- Allowance above the flange is 4 mm. Closed/sliding ceiling is Z=+6.5 mm.\n- This allowance includes hardware, tolerances and operating clearance.\n- Preserve the approved tray and bin. Proposed changes require review.\n- Designer selects mechanism, materials, process, tolerances and service details.\n- Consider removal, washing, optional liners, accumulated trash and internal sweep.\n\n## Evidence Boundary\n\nThe Fusion geometry is verified. Vehicle fit, cover movement, lift-out, lid sweep and printed strength are unverified. Historical console references conflict with the approved geometry. The site's console scene is illustrative and not to scale.\n\n## Coordinates And Units\n\nAll dimensions in mm. X positive driver-side, negative passenger-side. Y=0 at vehicle front and positive toward rear. Z=0 at the carrier seating plane, positive upward. glTF uses meters with (x,z,-y) axis mapping; the site converts display units to mm once.\n\n## Package Contents\n\n- assembly-v1.3.0.step: assembled exact solids\n- tray-v1.3.0.step: carrier exact solid\n- bin-v1.3.0.step: bin exact solid\n- assembly-v1.3.0.f3d: approved native Fusion archive\n- dimension-sheet-v1.3.0.pdf: dimensions, brief and evidence boundary\n- Data/specification.json: shared dimension registry\n- Data/validation.json: accepted Fusion inspection report\n- Data/export-verification.json: export and mesh provenance\n- Images/: inspected native Fusion views\n\nThe CAD is direct-design BRep, not a fully parametric feature-history model. Exact CAD governs fabrication; the browser mesh is a viewing aid. Comments and files are public.\n\nReview: https://cichonship.github.io/tesla-console-review/\n\nSource SHA-256: ${spec.sourceSha256}\n`;
await writeFile(path.join(pub,'Downloads/Design Brief.md'),brief);
const manifest={revision:spec.revision,sourceSha256:spec.sourceSha256,meshToleranceMm:spec.meshToleranceMm,files:{}};
async function hashDir(dir){for(const file of await readdir(path.join(pub,dir),{withFileTypes:true})){if(!file.isFile()||file.name==='asset-manifest.json'||file.name.endsWith('.zip'))continue;const rel=dir+'/'+file.name;const bytes=await readFile(path.join(pub,rel));manifest.files[rel]={bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};}}
await Promise.all(['Data','Downloads','Models','Images'].map(hashDir));
// The archive contains the per-file manifest. The published manifest additionally
// lists the final archive hash, avoiding a self-referential ZIP checksum.
await writeFile(path.join(pub,'Data/asset-manifest.json'),JSON.stringify(manifest,null,2));
execFileSync('python3',['-c',`
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
p=Path(${JSON.stringify(pub)})
with ZipFile(p/'Downloads/designer-handoff-v1.3.0.zip','w',ZIP_DEFLATED) as z:
 for folder in ('Downloads','Data','Images'):
  for f in sorted((p/folder).iterdir()):
   if f.is_file() and f.suffix!='.zip': z.write(f,str(f.relative_to(p)))
`]);
const zip=await readFile(path.join(pub,'Downloads/designer-handoff-v1.3.0.zip'));
manifest.files['Downloads/designer-handoff-v1.3.0.zip']={bytes:zip.length,sha256:createHash('sha256').update(zip).digest('hex')};
await writeFile(path.join(pub,'Data/asset-manifest.json'),JSON.stringify(manifest,null,2));
console.log(`Built ${pdf.getPageCount()}-page dimension sheet and ${(zip.length/1024).toFixed(1)} KB designer ZIP. ${Object.keys(manifest.files).length} assets hashed.`);
