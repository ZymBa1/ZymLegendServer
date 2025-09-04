const WebSocket = require('ws');
const fs = require('fs');
const PORT = 8080;

// Файл логов
const logFile = 'RuLogs.md';

// Функция записи логов
function log(msg){
  const timestamp = new Date().toISOString();
  const line = `\n- [${timestamp}] ${msg}`;
  console.log(msg);
  fs.appendFile(logFile, line, err => { if(err) console.error('Ошибка записи лога', err); });
}

// Запуск сервера
const wss = new WebSocket.Server({ port: PORT });
log(`RuServer запущен на ws://localhost:${PORT}`);

let players = [];
let bases = [
  { id: 1, x: 100, y: 100, owner: null },
  { id: 2, x: 700, y: 400, owner: null }
];

function broadcast(data) {
  const str = JSON.stringify(data);
  wss.clients.forEach(c => { if(c.readyState === WebSocket.OPEN) c.send(str); });
}

wss.on('connection', ws => {
  const player = { id: Date.now(), x: 400, y: 250, color: 'lime', lang: 'ru' };
  players.push(player);
  log(`Игрок подключился: ${player.id}`);

  ws.send(JSON.stringify({ type: 'init', player, players, bases }));
  broadcast({ type: 'updatePlayers', players });

  ws.on('message', msg => {
    try {
      const data = JSON.parse(msg);
      switch(data.type){
        case 'move':
          const p = players.find(pl => pl.id === player.id);
          if(p){ p.x = data.x; p.y = data.y; }
          broadcast({ type: 'updatePlayers', players });
          log(`Игрок ${player.id} переместился в (${data.x},${data.y})`);
          break;
        case 'capture':
          const base = bases.find(b => b.id === data.baseId);
          if(base) base.owner = player.id;
          broadcast({ type: 'updateBases', bases });
          log(`Игрок ${player.id} захватил базу ${data.baseId}`);
          break;
      }
    } catch(e){ log(`Ошибка сообщения: ${e}`); }
  });

  ws.on('close', () => {
    players = players.filter(p => p.id !== player.id);
    broadcast({ type: 'updatePlayers', players });
    log(`Игрок отключился: ${player.id}`);
  });
});
