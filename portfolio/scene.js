/* ZLARIOR — a quiet 3D layer: one faint wireframe form + sparse dust. Reacts gently to mouse and scroll. */
(function(){
  if(typeof THREE==='undefined')return;
  const cv=document.getElementById('fx');
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const small=innerWidth<760;
  let R;try{R=new THREE.WebGLRenderer({canvas:cv,alpha:true,antialias:!small})}catch(e){return}
  R.setPixelRatio(Math.min(devicePixelRatio,1.75));
  const S=new THREE.Scene();S.fog=new THREE.FogExp2(0x050505,.045);
  const cam=new THREE.PerspectiveCamera(50,1,.1,100);cam.position.set(0,0,10);

  const acc=0xc2a15f;
  const g=new THREE.Group();S.add(g);
  const mk=(geo,op,col=acc)=>new THREE.LineSegments(new THREE.WireframeGeometry(geo),new THREE.LineBasicMaterial({color:col,transparent:true,opacity:op}));
  const outer=mk(new THREE.IcosahedronGeometry(2.6,1),.22);
  const inner=mk(new THREE.OctahedronGeometry(1.5,0),.16,0xe3cd96);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(3.7,.004,6,220),new THREE.MeshBasicMaterial({color:acc,transparent:true,opacity:.28}));
  ring.rotation.x=1.15;
  g.add(outer,inner,ring);

  const N=small?260:520,p=new Float32Array(N*3);
  for(let i=0;i<N;i++){p[i*3]=(Math.random()-.5)*34;p[i*3+1]=(Math.random()-.5)*22;p[i*3+2]=-Math.random()*22+4}
  const dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.BufferAttribute(p,3));
  const dust=new THREE.Points(dg,new THREE.PointsMaterial({color:0xe3cd96,size:.035,transparent:true,opacity:.45,depthWrite:false}));
  S.add(dust);

  function layout(){const w=innerWidth,h=innerHeight;R.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();
    g.position.set(w<860?0:3.6,w<860?-1.2:0,0);g.scale.setScalar(w<860?.78:1)}
  addEventListener('resize',layout);layout();

  let mx=0,my=0,sx=0,sy=0,sc=0,vis=true;
  addEventListener('pointermove',e=>{mx=e.clientX/innerWidth-.5;my=e.clientY/innerHeight-.5});
  document.addEventListener('visibilitychange',()=>vis=!document.hidden);
  const t0=performance.now();
  (function frame(){requestAnimationFrame(frame);if(!vis)return;
    const t=(performance.now()-t0)/1000,m=document.documentElement.scrollHeight-innerHeight;
    sx+=(mx-sx)*.04;sy+=(my-sy)*.04;sc+=((m>0?scrollY/m:0)-sc)*.05;
    const k=reduce?0:1;
    outer.rotation.y=t*.06*k+sx*.9;outer.rotation.x=t*.03*k+sy*.6+sc*1.4;
    inner.rotation.y=-t*.09*k-sx*.5;inner.rotation.z=t*.05*k;
    ring.rotation.z=t*.04*k;ring.rotation.y=sx*.4;
    g.position.y+=((innerWidth<860?-1.2:0)-sc*2.2-g.position.y)*.05;
    cam.position.x=sx*1.1;cam.position.y=-sy*.8-sc*1.5;cam.lookAt(0,-sc*1.5,0);
    dust.position.y=sc*3;dust.rotation.y=t*.004*k+sx*.05;
    cv.style.opacity=Math.max(.22,1-scrollY/innerHeight*.95);
    R.render(S,cam);
  })();
})();
