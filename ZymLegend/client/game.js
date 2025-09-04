/* =================== Preloader =================== */
window.addEventListener('load', () => {
    setTimeout(()=>{ document.getElementById('preloader').style.display='none'; }, 1000);
  });
  
  /* =================== Глобальные переменные =================== */
  let ws; // WebSocket
  let player = { id:null, x:400, y:250, color:'lime', size:15 };
  let players = [];
  let bases = [];
  let clans = [];
  let enemies = [];
  let gameActive = false;
  
  let settings = {
    lang: 'ru',
    difficulty: 'normal',
    enableShootJoystick: false,
    movableJoysticks: true
  };
  
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  
  /* =================== СЕРВЕРА =================== */
  let servers = ['RU','ENG'];
  let customServers = [];
  
  function openServerSelect(){
    showScreen('servers'); 
    renderServers();
  }
  
  function renderServers(){
    const container = document.getElementById('serverList');
    container.innerHTML = '';
    servers.concat(customServers).forEach(s=>{
      const btn = document.createElement('button');
      btn.innerText = s + 'Server';
      btn.onclick = ()=>connectToServer(s);
      container.appendChild(btn);
    });
  }
  
  function connectToServer(name){
    let url = '';
    if(name==='RU') url='ws://localhost:8080';
    if(name==='ENG') url='ws://localhost:8081';
    if(!url) return alert('Неверный сервер');
    
    ws = new WebSocket(url);
  
    ws.onopen = ()=>{ 
      alert(`Подключено к серверу: ${name}`); 
      gameActive = true;
      gameLoop();
    };
  
    ws.onmessage = (msg)=>{
      const data = JSON.parse(msg.data);
      switch(data.type){
        case 'init':
          player = data.player;
          players = data.players;
          bases = data.bases;
          break;
        case 'updatePlayers':
          players = data.players;
          break;
        case 'updateBases':
          bases = data.bases;
          break;
      }
    };
  
    ws.onclose = ()=>{ 
      alert('Соединение разорвано'); 
      gameActive=false; 
    };
  }
  
  function addCustomServer(){
    const val = document.getElementById('customServer').value.trim();
    if(val && !customServers.includes(val)) customServers.push(val);
    renderServers();
  }
  
  /* =================== Меню =================== */
  function showScreen(id){
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }
  
  function openMenu(){ showScreen('menu'); }
  function openAccounts(){ showScreen('accounts'); }
  function openSkins(){ showScreen('skins'); }
  function openClans(){ showScreen('clans'); }
  function goHome(){ showScreen('menu'); gameActive=false; }
  
  /* =================== Настройки =================== */
  document.getElementById('difficultySelect').addEventListener('change',(e)=>{
    settings.difficulty = e.target.value;
  });
  
  /* =================== PvP и захват баз =================== */
  function captureBase(base){
    if(player && Math.hypot(player.x-base.x,player.y-base.y)<30){
      ws.send(JSON.stringify({ type:'capture', baseId:base.id }));
    }
  }
  
  function updateBaseHUD(){
    const owned = bases.filter(b=>b.owner===player.id).length;
    document.getElementById('baseStatus').innerText = `Базы захвачены: ${owned}`;
  }
  
  /* =================== Кланы =================== */
  function createClan(){
    const name = document.getElementById('clanName').value.trim();
    if(name) clans.push({name, members:[player.id]});
    renderClans();
  }
  
  function renderClans(){
    const div = document.getElementById('clanList');
    div.innerHTML='';
    clans.forEach(c=>{
      const el = document.createElement('div');
      el.innerText=`${c.name} (${c.members.length} участников)`;
      div.appendChild(el);
    });
  }
  
  /* =================== Игровой цикл =================== */
  function update(){
    if(!gameActive) return;
  
    // Простейшее управление (стрелки)
    if(keys['ArrowUp']) player.y-=3;
    if(keys['ArrowDown']) player.y+=3;
    if(keys['ArrowLeft']) player.x-=3;
    if(keys['ArrowRight']) player.x+=3;
  
    // Отправка позиции на сервер
    if(ws && ws.readyState===WebSocket.OPEN){
      ws.send(JSON.stringify({ type:'move', x:player.x, y:player.y }));
    }
  
    // Захват баз
    bases.forEach(b=>captureBase(b));
    updateBaseHUD();
  
    // Ограничение движения по экрану
    player.x = Math.max(10, Math.min(canvas.width-10, player.x));
    player.y = Math.max(10, Math.min(canvas.height-10, player.y));
  }
  
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
  
    // Рисуем базы
    bases.forEach(b=>{
      ctx.fillStyle = b.owner===player.id ? 'lime' : 'red';
      ctx.fillRect(b.x-15, b.y-15, 30, 30);
    });
  
    // Рисуем игроков
    players.forEach(p=>{
      ctx.fillStyle = p.color || 'blue';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 15, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle='white';
      ctx.fillText(p.id, p.x-10, p.y-20);
    });
  
    // Игрок
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size, 0, Math.PI*2);
    ctx.fill();
  }
  
  /* =================== Игровой цикл =================== */
  function gameLoop(){
    update();
    draw();
    if(gameActive) requestAnimationFrame(gameLoop);
  }
  
  /* =================== Управление клавишами =================== */
  let keys = {};
  window.addEventListener('keydown', e=>{ keys[e.key]=true; });
  window.addEventListener('keyup', e=>{ keys[e.key]=false; });
  