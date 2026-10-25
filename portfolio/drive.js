/* ZLARIOR — "The Drive": procedural supercar on an endless neon-gold highway (three.js).
   Renders only while its section is on screen. Scroll through the section to hit the nitro. */
(function(){
  const sec=document.getElementById('drive'),cv=document.getElementById('drivecv');
  if(!sec||!cv||typeof THREE==='undefined')return;
  const mobile=innerWidth<760||matchMedia('(hover:none)').matches;
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  let R;try{R=new THREE.WebGLRenderer({canvas:cv,antialias:!mobile})}catch(e){return}
  R.setPixelRatio(Math.min(devicePixelRatio,mobile?1.5:2));R.setClearColor(0x000000,1);
  const S=new THREE.Scene();S.fog=new THREE.Fog(0x050300,30,150);
  const cam=new THREE.PerspectiveCamera(62,1,.1,400);

  // ---- lights
  S.add(new THREE.AmbientLight(0x8a6f30,1.5));
  const key=new THREE.DirectionalLight(0xffe2a0,2.6);key.position.set(-6,9,8);S.add(key);
  const back=new THREE.DirectionalLight(0xd4af37,1.8);back.position.set(5,4,-10);S.add(back);
  function glowTex(c){const k=document.createElement('canvas');k.width=k.height=128;const x=k.getContext('2d');
    const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,c);g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(k)}
  const rim=new THREE.PointLight(0xd4af37,1.2,14);rim.position.set(0,1.4,-3);S.add(rim);

  // ---- road texture (asphalt, gold edge lines, dashed center)
  function roadTex(){
    const c=document.createElement('canvas');c.width=256;c.height=512;const x=c.getContext('2d');
    x.fillStyle='#0a0907';x.fillRect(0,0,256,512);
    for(let i=0;i<2600;i++){x.fillStyle=`rgba(255,235,170,${Math.random()*.05})`;x.fillRect(Math.random()*256,Math.random()*512,1.4,1.4)}
    x.fillStyle='#d4af37';x.fillRect(10,0,6,512);x.fillRect(240,0,6,512);
    x.fillStyle='#f5d77a';[0,256].forEach(y=>x.fillRect(125,y+30,6,150));
    const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,28);
    t.anisotropy=4;return t}
  const rt=roadTex();
  const ROADW=15;
  const road=new THREE.Mesh(new THREE.PlaneGeometry(ROADW,420),new THREE.MeshStandardMaterial({map:rt,roughness:.85,metalness:.05,color:0xffffff}));
  road.rotation.x=-Math.PI/2;road.position.z=-170;S.add(road);
  // glossy reflection sheen
  const sheen=new THREE.Mesh(new THREE.PlaneGeometry(ROADW,420),new THREE.MeshBasicMaterial({color:0xd4af37,transparent:true,opacity:.05,blending:THREE.AdditiveBlending,depthWrite:false}));
  sheen.rotation.x=-Math.PI/2;sheen.position.set(0,.01,-170);S.add(sheen);

  // ---- ground grid + mountains
  const grid=new THREE.GridHelper(400,100,0x8a6d1a,0x3a2c08);grid.position.set(0,-.02,-170);S.add(grid);
  const mtn=new THREE.Group();S.add(mtn);
  for(let i=0;i<26;i++){
    const h=6+Math.random()*26,w=10+Math.random()*18,side=i%2?1:-1;
    const m=new THREE.Mesh(new THREE.ConeGeometry(w,h,4),new THREE.MeshBasicMaterial({color:0x000000}));
    const e=new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry),new THREE.LineBasicMaterial({color:0x8a6d1a,transparent:true,opacity:.65}));
    m.add(e);m.position.set(side*(30+Math.random()*60),h/2-.3,-60-Math.random()*220);m.rotation.y=Math.random();mtn.add(m)}

  // ---- sun
  (function(){const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');
    const g=x.createLinearGradient(0,0,0,512);g.addColorStop(0,'#fff0b0');g.addColorStop(.5,'#f5c84a');g.addColorStop(1,'#a8461a');
    x.fillStyle=g;x.beginPath();x.arc(256,256,250,0,7);x.fill();
    x.globalCompositeOperation='destination-out';for(let i=0;i<9;i++){x.fillRect(0,270+i*24,512,4+i*2.2)}
    const sun=new THREE.Mesh(new THREE.PlaneGeometry(90,90),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,fog:false}));
    sun.position.set(0,34,-300);S.add(sun);
    const glow=new THREE.Mesh(new THREE.PlaneGeometry(260,160),new THREE.MeshBasicMaterial({color:0xd4af37,transparent:true,opacity:.1,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));
    glow.position.set(0,26,-301);S.add(glow)})();

  // ---- stars
  (function(){const n=900,p=new Float32Array(n*3);for(let i=0;i<n;i++){p[i*3]=(Math.random()-.5)*500;p[i*3+1]=20+Math.random()*120;p[i*3+2]=-120-Math.random()*220}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));
    S.add(new THREE.Points(g,new THREE.PointsMaterial({color:0xf5d77a,size:.7,transparent:true,opacity:.8,fog:false})))})();

  // ---- light poles streaming past
  const poles=[];const POLES=18,GAP=17;
  for(let i=0;i<POLES;i++)for(const s of[-1,1]){
    const g=new THREE.Group();
    const post=new THREE.Mesh(new THREE.BoxGeometry(.18,6,.18),new THREE.MeshStandardMaterial({color:0x14110a,metalness:.8,roughness:.3}));post.position.y=3;g.add(post);
    const arm=new THREE.Mesh(new THREE.BoxGeometry(2.2,.14,.14),post.material);arm.position.set(-s*1.1,6,0);g.add(arm);
    const lamp=new THREE.Mesh(new THREE.BoxGeometry(.9,.12,.4),new THREE.MeshBasicMaterial({color:0xfff0b0}));lamp.position.set(-s*2.1,5.93,0);g.add(lamp);
    const pool=new THREE.Mesh(new THREE.CircleGeometry(3.4,24),new THREE.MeshBasicMaterial({color:0xd4af37,transparent:true,opacity:.12,blending:THREE.AdditiveBlending,depthWrite:false}));
    pool.rotation.x=-Math.PI/2;pool.position.set(-s*2.1,.03,0);g.add(pool);
    g.position.set(s*(ROADW/2+2.2),0,-i*GAP);S.add(g);poles.push(g)}

  // ---- speed streaks
  const SL=mobile?60:140,sp=new Float32Array(SL*6),sd=[];
  for(let i=0;i<SL;i++){const x=(Math.random()-.5)*34,y=.2+Math.random()*9,z=-Math.random()*120;sd.push({x,y,z,l:2+Math.random()*7,v:.6+Math.random()});}
  const slg=new THREE.BufferGeometry();slg.setAttribute('position',new THREE.BufferAttribute(sp,3));
  const sls=new THREE.LineSegments(slg,new THREE.LineBasicMaterial({color:0xf5d77a,transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false}));
  sls.frustumCulled=false;S.add(sls);

  // ---- the car (procedural supercar: low wedge, gold-edged, glowing rear)
  const car=new THREE.Group();S.add(car);
  const body=new THREE.Group();car.add(body);
  const prof=new THREE.Shape();
  [[2.3,.2],[2.32,.38],[1.1,.62],[.55,.82],[-.15,.98],[-.95,.95],[-1.7,.78],[-2.3,.7],[-2.3,.2]].forEach(([x,y],i)=>i?prof.lineTo(x,y):prof.moveTo(x,y));
  const bg=new THREE.ExtrudeGeometry(prof,{depth:1.9,bevelEnabled:true,bevelThickness:.1,bevelSize:.1,bevelSegments:2});
  bg.translate(0,0,-.95);bg.rotateY(Math.PI/2);          // length now along z (nose at -z? we flip below)
  bg.rotateY(Math.PI);                                    // nose points away from camera (-z)
  const paint=new THREE.MeshStandardMaterial({color:0x2a2418,metalness:.55,roughness:.3,emissive:0x120d03});
  const shell=new THREE.Mesh(bg,paint);body.add(shell);
  body.add(new THREE.LineSegments(new THREE.EdgesGeometry(bg,28),new THREE.LineBasicMaterial({color:0xf5d77a})));
  // canopy glass
  const glass=new THREE.Mesh(new THREE.BoxGeometry(1.35,.3,1.5),new THREE.MeshStandardMaterial({color:0x000000,metalness:1,roughness:.05,emissive:0x1a1305}));
  glass.position.set(0,.98,.15);glass.rotation.x=.12;body.add(glass);
  // side blades (gold intakes)
  [-1,1].forEach(s=>{const b=new THREE.Mesh(new THREE.BoxGeometry(.06,.26,1.5),new THREE.MeshBasicMaterial({color:0xd4af37}));b.position.set(s*1.02,.55,.45);body.add(b)});
  // rear light bar + diffuser glow
  const tail=new THREE.Mesh(new THREE.BoxGeometry(1.7,.09,.06),new THREE.MeshBasicMaterial({color:0xff3b1f}));tail.position.set(0,.62,2.42);body.add(tail);
  const tail2=new THREE.Mesh(new THREE.BoxGeometry(.5,.05,.06),new THREE.MeshBasicMaterial({color:0xffd27a}));tail2.position.set(0,.5,2.43);body.add(tail2);
  const tailGlow=new THREE.Mesh(new THREE.PlaneGeometry(4.2,1.8),new THREE.MeshBasicMaterial({map:glowTex('rgba(255,70,30,.9)'),transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false}));
  tailGlow.position.set(0,.6,2.6);body.add(tailGlow);
  // wing
  const wing=new THREE.Mesh(new THREE.BoxGeometry(1.9,.05,.5),paint);wing.position.set(0,1.08,2.1);body.add(wing);
  [-.7,.7].forEach(x=>{const st=new THREE.Mesh(new THREE.BoxGeometry(.05,.26,.2),paint);st.position.set(x,.95,2.1);body.add(st)});
  const wingE=new THREE.LineSegments(new THREE.EdgesGeometry(wing.geometry),new THREE.LineBasicMaterial({color:0xf5d77a}));wingE.position.copy(wing.position);body.add(wingE);
  // wheels
  const wheels=[];
  [[-1.05,1.45],[1.05,1.45],[-1.05,-1.5],[1.05,-1.5]].forEach(([x,z])=>{
    const w=new THREE.Group();
    const tire=new THREE.Mesh(new THREE.CylinderGeometry(.46,.46,.42,28),new THREE.MeshStandardMaterial({color:0x050505,roughness:.8}));tire.rotation.z=Math.PI/2;w.add(tire);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(.3,.035,8,24),new THREE.MeshBasicMaterial({color:0xf5d77a}));rim.rotation.y=Math.PI/2;rim.position.x=x>0?.22:-.22;w.add(rim);
    for(let k=0;k<5;k++){const sp=new THREE.Mesh(new THREE.BoxGeometry(.03,.55,.04),new THREE.MeshBasicMaterial({color:0xd4af37}));sp.rotation.x=k*Math.PI/5;sp.position.x=x>0?.22:-.22;w.add(sp)}
    w.position.set(x,.46,z);car.add(w);wheels.push(w)});
  // underglow
  const ug=new THREE.Mesh(new THREE.PlaneGeometry(2.6,5.4),new THREE.MeshBasicMaterial({color:0xd4af37,transparent:true,opacity:.28,blending:THREE.AdditiveBlending,depthWrite:false}));
  ug.rotation.x=-Math.PI/2;ug.position.y=.04;car.add(ug);
  // exhaust flame
  const flames=[-.42,.42].map(x=>{const f=new THREE.Mesh(new THREE.ConeGeometry(.13,1.3,10),new THREE.MeshBasicMaterial({color:0xffb347,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false}));
    f.rotation.x=Math.PI/2;f.position.set(x,.42,3.1);car.add(f);return f});
  // headlight beams forward
  [-.7,.7].forEach(x=>{const b=new THREE.Mesh(new THREE.ConeGeometry(.9,16,16,1,true),new THREE.MeshBasicMaterial({color:0xfff0b0,transparent:true,opacity:.07,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
    b.rotation.x=Math.PI/2;b.position.set(x,.5,-10.2);car.add(b)});

  // ---- UI hooks
  const elKmh=document.getElementById('kmh'),elGear=document.getElementById('gear'),elNos=document.getElementById('nos'),elLines=[...document.querySelectorAll('.mline')];
  function resize(){const w=cv.clientWidth,h=cv.clientHeight;R.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();cam.userData.back=w<760?10:7.4}
  addEventListener('resize',resize);resize();

  let vis=false;new IntersectionObserver(e=>vis=e[0].isIntersecting,{threshold:0}).observe(sec);
  let p=0,speed=0,off=0,steer=0,tx=0,mxn=0;
  addEventListener('pointermove',e=>mxn=(e.clientX/innerWidth-.5)*2);
  const clk=new THREE.Clock();
  function frame(){requestAnimationFrame(frame);if(!vis||document.hidden)return;
    const dt=Math.min(clk.getDelta(),.05),t=clk.elapsedTime;
    const r=sec.getBoundingClientRect(),span=r.height-innerHeight;
    p=Math.min(1,Math.max(0,span>0?-r.top/span:0));
    const target=(reduce?30:55)+p*120+(p>.5?60*Math.sin((p-.5)*Math.PI):0);   // world speed units/s
    speed+=(target-speed)*Math.min(1,dt*2.2);
    off+=speed*dt;
    rt.offset.y=(off/ (420/28));
    poles.forEach((g,i)=>{g.position.z+=speed*dt;if(g.position.z>12)g.position.z-=POLES*GAP});
    mtn.children.forEach(m=>{m.position.z+=speed*dt*.15;if(m.position.z>-30)m.position.z-=230});
    // streaks
    const arr=slg.attributes.position.array;
    sd.forEach((s,i)=>{s.z+=speed*dt*s.v*1.4;if(s.z>10){s.z=-120;s.x=(Math.random()-.5)*34}
      const L=s.l*(.4+speed/90);arr[i*6]=s.x;arr[i*6+1]=s.y;arr[i*6+2]=s.z;arr[i*6+3]=s.x;arr[i*6+4]=s.y;arr[i*6+5]=s.z-L});
    slg.attributes.position.needsUpdate=true;sls.material.opacity=.25+Math.min(.6,speed/200);
    // steering: weaves lanes, nudged by mouse
    tx=Math.sin(t*.55)*3.4*(.4+p*.7)+mxn*1.2;
    steer+=(tx-steer)*Math.min(1,dt*1.8);
    car.position.x=steer;
    car.rotation.y=-(tx-steer)*.07;body.rotation.z=(tx-steer)*.035;
    body.position.y=Math.sin(t*38)*.006*(speed/90)+.02;
    wheels.forEach(w=>w.rotation.x-=speed*dt*1.5);
    flames.forEach(f=>{const L=.45+Math.random()*.5+p*1.0;f.scale.set(1,L,1);f.position.z=2.45+1.3*L/2;f.material.opacity=.4+p*.35});
    tailGlow.material.opacity=.3+Math.sin(t*9)*.05+p*.25;
    rim.intensity=1+p*1.2;
    // chase camera
    const ease=Math.min(1,p/.28),e2=ease*ease*(3-2*ease);
    const th=(1-e2)*1.15,Rr=cam.userData.back-p*1.0,hh=1.1+e2*1.3-p*.5;
    cam.position.set(car.position.x+Math.sin(th)*Rr*.95+Math.sin(t*.4)*.12,hh,Math.cos(th)*Rr+.5);
    cam.position.x+=(Math.random()-.5)*.012*(speed/60);cam.position.y+=(Math.random()-.5)*.012*(speed/60);
    cam.lookAt(car.position.x*(.8+.2*e2)+(1-e2)*0,.62+e2*.5,-e2*8);
    cam.fov=60+Math.min(24,speed*.16);cam.updateProjectionMatrix();
    // HUD
    const kmh=Math.round(speed*2.6);elKmh.textContent=kmh;
    elGear.textContent=Math.min(7,1+Math.floor(kmh/58));
    elNos.style.width=Math.round(p*100)+'%';
    elLines.forEach((l,i)=>{const a=i/elLines.length,b=(i+1)/elLines.length;l.classList.toggle('on',p>=a&&p<b+.0001||(i===elLines.length-1&&p>=a))});
    if(!document.body.classList.contains("hasvid"))R.render(S,cam);
  }
  frame();
})();
