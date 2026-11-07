import {useEffect,useRef,useState} from 'react';
import {Canvas,type ThreeEvent} from '@react-three/fiber';
import {Bounds,OrbitControls,Environment,Lightformer} from '@react-three/drei';
import {Box3,Vector3,type Group,type Mesh} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {ZoomIn,ZoomOut,Scan} from 'lucide-react';
import type {OrbitControls as Controls} from 'three-stdlib';
import {supabase} from '@/integrations/supabase/client';
import {assertEmbeddedModel} from '@/lib/model-validation';
import {Button} from '@/components/ui/button';

export default function ModelPreview({path,format}:{path:string;format:string}) {
 const [scene,setScene]=useState<Group|null>(null);const [error,setError]=useState('');
 const [metadata,setMetadata]=useState({meshes:0,triangles:0,animations:0,extent:''});
 const [selected,setSelected]=useState('');const [ready,setReady]=useState(false);
 const controls=useRef<Controls|null>(null);
 useEffect(()=>{
  let cancelled=false;let loaded:Group|undefined;
  setScene(null);setError('');setReady(false);setSelected('');
  void (async()=>{try{
   const file=await supabase.storage.from('design-documents').download(path);if(file.error||!file.data)throw new Error('Private model could not be opened.');
   const bytes=await file.data.arrayBuffer();
   let json:Record<string,unknown>;
   if(format==='gltf')json=JSON.parse(new TextDecoder().decode(bytes));
   else {const view=new DataView(bytes);const length=view.getUint32(12,true);if(view.getUint32(16,true)!==0x4e4f534a||20+length>bytes.byteLength)throw new Error('Invalid GLB structure.');json=JSON.parse(new TextDecoder().decode(bytes.slice(20,20+length)));}
   assertEmbeddedModel(json);
   const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
   const model=await loader.parseAsync(format==='gltf'?JSON.stringify(json):bytes,'');loaded=model.scene;
   if(cancelled)return;
   let meshes=0,triangles=0;model.scene.traverse(o=>{const mesh=o as Mesh;if(mesh.isMesh){meshes++;triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes['position']?.count??0)/3;}});
   if(!meshes)throw new Error('No visible mesh elements found in this model.');
   const box=new Box3().setFromObject(model.scene);const size=box.getSize(new Vector3());const center=box.getCenter(new Vector3());
   setMetadata({meshes,triangles:Math.round(triangles),animations:model.animations.length,extent:`${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)} (model units)`});
   model.scene.position.sub(center);model.scene.scale.setScalar(5/Math.max(size.x,size.y,size.z,0.001));setScene(model.scene);
  }catch(e){if(!cancelled)setError(e instanceof Error?e.message:'Model preview unavailable.');}})();
  return()=>{cancelled=true;loaded?.traverse(o=>{const m=o as Mesh;if(m.isMesh){m.geometry.dispose();const materials=Array.isArray(m.material)?m.material:[m.material];materials.forEach(mat=>mat.dispose());}});};
 },[path,format]);
 function zoom(factor:number){const c=controls.current;if(!c)return;c.object.position.sub(c.target).multiplyScalar(factor).add(c.target);c.update();}
 return <section className="min-w-0">
  <div className="mb-3 flex justify-end gap-1"><Button size="icon" variant="outline" title="Zoom in" aria-label="Zoom in" onClick={()=>zoom(0.8)}><ZoomIn/></Button><Button size="icon" variant="outline" title="Zoom out" aria-label="Zoom out" onClick={()=>zoom(1.25)}><ZoomOut/></Button><Button size="icon" variant="outline" title="Reset model view" aria-label="Reset model view" onClick={()=>controls.current?.reset()}><Scan/></Button></div>
  {error?<p role="alert" className="break-words text-sm text-destructive">{error}</p>:!scene?<p role="status">Loading private model…</p>:<div className="h-[420px] w-full bg-muted touch-none" data-scene-ready={ready?'true':undefined} aria-label="3D model viewer">
   <Canvas frameloop="demand" camera={{position:[7,5,7],fov:45}} onCreated={()=>setReady(true)}>
    <ambientLight intensity={1.5}/><directionalLight position={[5,8,5]} intensity={2}/>
    <Environment><Lightformer intensity={2} position={[0,5,0]} scale={[10,10,1]}/><Lightformer intensity={1} position={[-5,1,-1]} rotation-y={Math.PI/2} scale={[20,1,1]}/></Environment>
    <Bounds fit clip observe margin={1.3}><primitive object={scene} onClick={(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();setSelected(e.object.name||`Mesh ${e.object.id}`);}}/></Bounds>
    <OrbitControls ref={controls} makeDefault minDistance={0.05} maxDistance={100}/>
   </Canvas>
  </div>}
  {scene&&<dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-muted-foreground">Visible meshes</dt><dd>{metadata.meshes}</dd></div><div><dt className="text-muted-foreground">Triangles / animations</dt><dd>{metadata.triangles.toLocaleString()} / {metadata.animations}</dd></div><div className="col-span-2"><dt className="text-muted-foreground">Original extents · units not verified</dt><dd className="break-words">{metadata.extent}</dd></div><div className="col-span-2"><dt className="text-muted-foreground">Selected element</dt><dd className="break-words" aria-live="polite">{selected||'None'}</dd></div></dl>}
 </section>;
}