import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, Html, Line, OrbitControls, RoundedBox, useGLTF } from '@react-three/drei';
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh, OrthographicCamera, Plane, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { asset, cadToWorld, dimensions, measurement, savedCamera, spec } from './model';
import type { Dimension, Mode, Vec3, View, ViewState } from './model';

export type CameraSnapshot = {position:number[];target:number[];zoom:number};
type Props = ViewState & { labels:boolean; cameraTick:number; onSelect:(id:string)=>void;
  onPart:(part:string)=>void; onCamera:(camera:CameraSnapshot)=>void; onReady:()=>void };
const center:Vec3 = [0,-32,-101.5];

function Camera({mode,view,cameraTick,onCamera}:Pick<Props,'mode'|'view'|'cameraTick'|'onCamera'>) {
  const ref = useRef<OrbitControlsImpl>(null);
  const {camera,size,invalidate}=useThree();
  const first = useRef(true);
  useEffect(()=>{
    const controls=ref.current; if(!controls)return;
    const target:Vec3 = (mode==='bin' || mode==='lid') ? [-30,-35,-147] : center;
    const directions:Record<View,Vec3>={iso:[-280,270,-330],top:[0,450,0],front:[0,0,450],rear:[0,0,-450],left:[450,0,0],right:[-450,0,0],bottom:[0,-450,0]};
    const direction=directions[view];
    camera.up.set(0,1,0);
    if(view==='top')camera.up.set(0,0,1);
    if(view==='bottom')camera.up.set(0,0,-1);
    camera.position.set(...target).add(new Vector3(...direction));
    controls.target.set(...target);
    (camera as OrthographicCamera).zoom=Math.min(size.width/((mode==='bin'||mode==='lid')?210:365),size.height/((mode==='bin'||mode==='lid')?205:315));
    const saved = first.current ? savedCamera():null;
    if(saved){camera.position.fromArray(saved.position);controls.target.fromArray(saved.target);(camera as OrthographicCamera).zoom=saved.zoom;}
    first.current=false;
    camera.lookAt(controls.target);camera.updateProjectionMatrix();controls.update();invalidate();
    onCamera({position:camera.position.toArray(),target:controls.target.toArray(),zoom:(camera as OrthographicCamera).zoom});
  },[mode,view,cameraTick,size.width,size.height,camera,invalidate,onCamera]);
  return <OrbitControls ref={ref} makeDefault enableDamping minZoom={.4} maxZoom={12} onEnd={()=>{
    if(ref.current)onCamera({position:camera.position.toArray(),target:ref.current.target.toArray(),zoom:(camera as OrthographicCamera).zoom});
  }}/>;
}

function CutEdges({geometry,x}:{geometry:BufferGeometry;x:number}) {
  const line=useMemo(()=>{
    const p=geometry.getAttribute('position'); const index=geometry.index; const result:number[]=[];
    for(let i=0;i<(index?.count||p.count);i+=3){
      const tri=[0,1,2].map(j=>new Vector3().fromBufferAttribute(p,index?index.getX(i+j):i+j));
      const hits:Vector3[]=[];
      for(let j=0;j<3;j++){
        const a=tri[j],b=tri[(j+1)%3];
        if((a.x-x)*(b.x-x)<0){const t=(x-a.x)/(b.x-a.x);hits.push(a.clone().lerp(b,t));}
      }
      if(hits.length===2)result.push(...hits[0].toArray(),...hits[1].toArray());
    }
    return new BufferGeometry().setAttribute('position',new Float32BufferAttribute(result,3));
  },[geometry,x]);
  useEffect(()=>()=>line.dispose(),[line]);
  return <lineSegments geometry={line}><lineBasicMaterial color="#d78a42" depthTest={false}/></lineSegments>;
}

function Parts({mode,explode,section,onPart,onReady}:Pick<Props,'mode'|'explode'|'section'|'onPart'|'onReady'>) {
  const {scene}=useGLTF(asset('Models/assembly-v1.3.0.glb'));
  const parts=useMemo(()=>{
    const result:{id:string;geometry:BufferGeometry}[]=[];
    scene.traverse(o=>{if(o instanceof Mesh)result.push({id:o.name,geometry:o.geometry.clone().scale(1000,1000,1000)});});
    return result;
  },[scene]);
  const plane=useMemo(()=>new Plane(new Vector3(1,0,0),30.105421686747),[]);
  useEffect(()=>{onReady();},[onReady]);
  return <>{parts.filter(p=>mode==='tray'?p.id==='tray':mode==='bin'||mode==='lid'?p.id==='bin':true).map(p=><group key={p.id} position={[0,p.id==='bin'&&explode?65:0,0]}>
    <mesh geometry={p.geometry} castShadow receiveShadow onClick={e=>{e.stopPropagation();onPart(p.id);}}
      onPointerOver={e=>{e.stopPropagation();document.body.style.cursor='pointer';}} onPointerOut={()=>{document.body.style.cursor='auto';}}>
      <meshStandardMaterial color={p.id==='tray'?'#9a9d91':'#405c51'} metalness={.08} roughness={.52} side={DoubleSide} clippingPlanes={section?[plane]:[]} clipShadows/>
    </mesh>
    {section&&<CutEdges geometry={p.geometry} x={-30.105421686747}/>}
  </group>)}</>;
}

function Annotation({d,explode,onSelect}:{d:Dimension;explode:boolean;onSelect:(id:string)=>void}) {
  const binLift=d.part==='bin'&&explode?65:0;
  const base=(point:number[])=>{const p=cadToWorld(point);p[1]+=binLift;return p;};
  const moved=(point:number[])=>base(point.map((v,i)=>v+d.offset[i]));
  const a=moved(d.a),b=moved(d.b);
  const midpoint=a.map((v,i)=>(v+b[i])/2) as Vec3;
  if(d.unit==='°') {
    const c=[d.a[0]+d.offset[0],d.a[1],d.a[2]];
    const arc:Vec3[]=Array.from({length:25},(_,i)=>{const t=i/24*Math.PI/10;return base([c[0],c[1]-Math.sin(t)*32,c[2]-Math.cos(t)*32]);});
    return <group><Line points={[base(c),arc[0]]} color="#a77748" lineWidth={1}/><Line points={[base(c),arc[24]]} color="#a77748" lineWidth={1}/><Line points={arc} color="#b66b34" lineWidth={1.5}/><Html center position={base([c[0],c[1]-17,c[2]-40])} zIndexRange={[10,0]}><button className="dimension-label" onClick={()=>onSelect(d.id)}>{measurement(d)}</button></Html></group>;
  }
  return <group>
    <Line points={[base(d.a),a]} color="#a7aa9d" lineWidth={1} dashed dashSize={2} gapSize={2}/>
    <Line points={[base(d.b),b]} color="#a7aa9d" lineWidth={1} dashed dashSize={2} gapSize={2}/>
    <Line points={[a,b]} color="#b66b34" lineWidth={1.4}/>
    {[a,b].map((p,i)=><mesh key={i} position={p}><sphereGeometry args={[1.2,8,8]}/><meshBasicMaterial color="#b66b34" depthTest={false}/></mesh>)}
    <Html position={midpoint} center zIndexRange={[10,0]}><button className="dimension-label" onClick={()=>onSelect(d.id)} title={d.name}>{measurement(d)}</button></Html>
  </group>;
}

function LidEnvelope() {
  return <group>
    <mesh position={[-30.1054,4.5,-147]}><boxGeometry args={[86,4,111]}/><meshStandardMaterial color="#dfab57" transparent opacity={.22} depthWrite={false}/></mesh>
    <Line points={[[-73.1054,6.5,-91.5],[12.8946,6.5,-91.5],[12.8946,6.5,-202.5],[-73.1054,6.5,-202.5],[-73.1054,6.5,-91.5]]} color="#ac762c" lineWidth={1.5} dashed dashSize={4} gapSize={2}/>
    <Line points={[[-30.1054,0,-147],[-30.1054,-38,-147]]} color="#e0ac67" lineWidth={2} dashed dashSize={4} gapSize={3}/>
    <mesh position={[-30.1054,-42,-147]} rotation={[Math.PI,0,0]}><coneGeometry args={[4,8,20]}/><meshBasicMaterial color="#d6a666"/></mesh>
    <Html position={[12.8946,18,-200]} center zIndexRange={[8,0]}><div className="envelope-label">Z +6.5 <span>HEIGHT LIMIT</span></div></Html>
  </group>;
}

function ConsoleContext() {
  // Deliberately schematic. No closed vehicle cavity or collision claim is implied.
  return <group>
    <RoundedBox args={[12,42,315]} radius={6} position={[-96,-8,-118]}><meshStandardMaterial color="#b7b8af" transparent opacity={.2} depthWrite={false}/></RoundedBox>
    <RoundedBox args={[12,42,315]} radius={6} position={[96,-8,-118]}><meshStandardMaterial color="#b7b8af" transparent opacity={.2} depthWrite={false}/></RoundedBox>
    <mesh position={[0,9,19]}><boxGeometry args={[180,3,38]}/><meshStandardMaterial color="#848d86" transparent opacity={.18} depthWrite={false}/></mesh>
    {[-1,1].map(side=><Line key={side} points={[[side*81.25,-3,38],[side*81.25,-3,-240]]} color="#8e9e94" lineWidth={2} dashed dashSize={5} gapSize={3}/>)}
    <Html position={[0,24,26]} center zIndexRange={[6,0]}><div className="context-label">VEHICLE FRONT ↑</div></Html>
    <Html position={[0,-125,-180]} center zIndexRange={[6,0]}><div className="context-label">SCHEMATIC CONTEXT · NOT TO SCALE</div></Html>
  </group>;
}

function Scene(props:Props) {
  const chosen=dimensions.find(d=>d.id===props.selected);
  return <>
    <Camera mode={props.mode} view={props.view} cameraTick={props.cameraTick} onCamera={props.onCamera}/>
    <ambientLight intensity={1.1}/><hemisphereLight args={['#ffffff','#9f9884',1.4]}/>
    <directionalLight position={[-160,350,180]} intensity={3.5} castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-240} shadow-camera-right={240} shadow-camera-top={240} shadow-camera-bottom={-240} shadow-camera-far={1000} shadow-bias={-.001}/>
    <directionalLight position={[250,100,-150]} intensity={1.6}/><directionalLight position={[-100,30,-350]} intensity={1}/>
    <group position={[0,0,props.mode==='context'?props.travel:0]}>
      <Parts {...props}/>
      {props.mode==='lid'&&<LidEnvelope/>}
      {props.labels&&chosen&&<Annotation d={chosen} explode={props.explode} onSelect={props.onSelect}/>}
    </group>
    {props.mode==='context'&&<ConsoleContext/>}
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,props.mode==='tray'?-46:-107,-101.5]} receiveShadow><planeGeometry args={[1000,1000]}/><shadowMaterial transparent opacity={.13}/></mesh>
  </>;
}

export default function Viewer(props:Props) {
  const [lost,setLost]=useState(false);
  if(lost)return <StaticFallback reason="Your browser lost its 3D graphics context."/>;
  return <Canvas orthographic shadows frameloop="demand" dpr={[1,2]} camera={{position:[-280,270,-430],zoom:2,near:.1,far:2500}}
    gl={{antialias:true,alpha:true,powerPreference:'low-power'}} fallback={<StaticFallback reason="3D isn't available in this browser."/>}
    onCreated={({gl})=>{gl.localClippingEnabled=true;gl.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();setLost(true);},{once:true});}}>
    <Suspense fallback={null}><Scene {...props}/></Suspense>
  </Canvas>;
}

export function StaticFallback({reason}:{reason?:string}) {
  return <div className="static-fallback"><img src={asset('Images/assembly.png')} alt="Validated Fusion assembly: shallow tapered tray with a deep removable bin in the rear passenger corner"/><p>{reason||'Static reference view.'} <a href="#specifications">All dimensions remain available below.</a></p></div>;
}
