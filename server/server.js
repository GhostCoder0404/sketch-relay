import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { PROMPTS } from './prompts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend in production
app.use(express.static(path.join(__dirname, '../dist')));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 10000,
  pingTimeout: 5000
});

// Rooms storage in memory: roomCode -> RoomObject
const rooms = new Map();

function generateRoomCode() {
  const prefixes = ['SKETCH', 'DRAW', 'DUO', 'PLAY', 'STUDIO', 'CANVAS', 'TEAM', 'RELAY', 'STAR', 'ARC'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const num = Math.floor(10 + Math.random() * 90);
  const code = `${prefix}-${num}`;
  if (rooms.has(code)) return generateRoomCode();
  return code;
}

function getNextPrompt(room) {
  const unused = PROMPTS.filter(p => !room.usedPrompts.has(p.title));
  if (unused.length === 0) {
    room.usedPrompts.clear();
    const prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
    room.usedPrompts.add(prompt.title);
    return prompt;
  }
  const prompt = unused[Math.floor(Math.random() * unused.length)];
  room.usedPrompts.add(prompt.title);
  return prompt;
}

function getActiveDrawerSlot(turn) {
  return turn % 2 === 1 ? 1 : 2;
}

// Bot Companion Actions (Simulates partner drawing during their turns)
function triggerBotTurn(roomCode, turn) {
  const room = rooms.get(roomCode);
  if (!room || room.status !== 'playing' || !room.players[2]?.isBot) return;

  // 1. Send an opening cute message for this turn
  const botNick = room.players[2].nickname || 'SweetBot 🤖';
  const startMsgs = [
    `My turn! Following Step ${turn}: ${room.promptObj?.steps?.[turn - 1] || 'adding cute details'} 🎨`,
    `Step ${turn} time! Let me add something sweet to our sketch! 💖`,
    `Ooh, this looks great so far! Let me sketch the next part ✏️✨`
  ];
  const greeting = startMsgs[Math.floor(Math.random() * startMsgs.length)];

  setTimeout(() => {
    sendBotChat(roomCode, greeting, false);
  }, 1200);

  // 2. Schedule realistic strokes over the 45s turn
  const strokeColors = ['#FF6B8B', '#FF4757', '#FFA502', '#2ED573', '#1E90FF', '#9B59B6', '#FED330'];

  // Draw 2 to 3 cute decorative stroke sequences
  const delays = [3500, 9000, 16000];
  delays.forEach((delay, idx) => {
    setTimeout(() => {
      const r = rooms.get(roomCode);
      if (!r || r.status !== 'playing' || r.isPaused || r.currentTurn !== turn) return;

      const color = strokeColors[Math.floor(Math.random() * strokeColors.length)];
      const action = generateBotStroke(turn, idx, color);

      // Save to canvas history
      r.canvasHistory.push(action);
      // Emit to human partner
      io.to(roomCode).emit('draw_action_received', action);

      // Occasionally send reaction
      if (idx === 1) {
        setTimeout(() => sendBotChat(roomCode, '💖', true), 1500);
      }
    }, delay);
  });
}

// Generate cute procedural strokes for the bot
function generateBotStroke(turn, strokeIndex, color) {
  const points = [];
  const centerX = 0.35 + (strokeIndex * 0.15);
  const centerY = 0.35 + (strokeIndex * 0.12);

  if (turn === 2) {
    // Cute curved smile or heart
    const r = 0.08 + strokeIndex * 0.04;
    for (let t = 0; t <= Math.PI; t += 0.2) {
      points.push({
        x: Math.max(0.05, Math.min(0.95, centerX + Math.cos(t) * r)),
        y: Math.max(0.05, Math.min(0.95, centerY + Math.sin(t) * r))
      });
    }
  } else if (turn === 4) {
    // Star or flower sparkle
    for (let i = 0; i <= 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const radius = i % 2 === 0 ? 0.09 : 0.03;
      points.push({
        x: Math.max(0.05, Math.min(0.95, centerX + Math.cos(angle) * radius)),
        y: Math.max(0.05, Math.min(0.95, centerY + Math.sin(angle) * radius))
      });
    }
  } else {
    // Swirls and highlights
    for (let t = 0; t <= 4 * Math.PI; t += 0.3) {
      const r = 0.015 * t;
      points.push({
        x: Math.max(0.05, Math.min(0.95, centerX + Math.cos(t) * r)),
        y: Math.max(0.05, Math.min(0.95, centerY + Math.sin(t) * r))
      });
    }
  }

  return {
    type: 'brush',
    points,
    color,
    size: 7
  };
}

// Bot cheerleader during human partner's turns
function botCheerHuman(roomCode, turn) {
  const room = rooms.get(roomCode);
  if (!room || room.status !== 'playing' || !room.players[2]?.isBot) return;

  const cheers = [
    { text: 'Looking so adorable! 😍', reaction: false },
    { text: '💖', reaction: true },
    { text: 'Love that outline! 👏', reaction: false },
    { text: '✨', reaction: true },
    { text: 'You are so good at this! 🎨', reaction: false }
  ];

  const cheer = cheers[Math.floor(Math.random() * cheers.length)];
  setTimeout(() => {
    const r = rooms.get(roomCode);
    if (!r || r.status !== 'playing' || r.isPaused || r.currentTurn !== turn) return;
    sendBotChat(roomCode, cheer.text, cheer.reaction);
  }, 12000 + Math.random() * 8000);
}

function sendBotChat(roomCode, text, isReaction) {
  const room = rooms.get(roomCode);
  if (!room) return;
  const message = {
    id: Date.now() + '-bot',
    slot: 2,
    sender: room.players[2]?.nickname || 'SweetBot 🤖',
    text,
    isReaction,
    timestamp: Date.now()
  };
  room.chatMessages.push(message);
  if (room.chatMessages.length > 50) room.chatMessages.shift();
  io.to(roomCode).emit('new_chat_message', message);
}

// Room timer management
function startTurnTimer(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }

  // Trigger bot actions if bot's turn, or cheer if human's turn
  const activeSlot = getActiveDrawerSlot(room.currentTurn);
  if (activeSlot === 2 && room.players[2]?.isBot) {
    triggerBotTurn(roomCode, room.currentTurn);
  } else if (activeSlot === 1 && room.players[2]?.isBot) {
    botCheerHuman(roomCode, room.currentTurn);
  }

  room.timerInterval = setInterval(() => {
    const r = rooms.get(roomCode);
    if (!r) return;

    if (r.isPaused || r.status !== 'playing') {
      return;
    }

    r.timeLeft -= 1;
    io.to(roomCode).emit('timer_tick', { timeLeft: r.timeLeft });

    if (r.timeLeft <= 0) {
      if (r.currentTurn < r.totalTurns) {
        r.currentTurn += 1;
        r.timeLeft = r.turnDuration;
        const nextActiveSlot = getActiveDrawerSlot(r.currentTurn);
        const activePlayer = r.players[nextActiveSlot];
        const stepIndex = r.currentTurn - 1;
        const currentStep = r.promptObj?.steps?.[stepIndex] || `Step ${r.currentTurn}`;

        io.to(roomCode).emit('turn_changed', {
          currentTurn: r.currentTurn,
          totalTurns: r.totalTurns,
          timeLeft: r.timeLeft,
          activeSlot: nextActiveSlot,
          activeNickname: activePlayer ? activePlayer.nickname : '',
          currentStep: currentStep
        });

        // Trigger bot turn if Slot 2 is bot
        if (nextActiveSlot === 2 && r.players[2]?.isBot) {
          triggerBotTurn(roomCode, r.currentTurn);
        } else if (nextActiveSlot === 1 && r.players[2]?.isBot) {
          botCheerHuman(roomCode, r.currentTurn);
        }
      } else {
        clearInterval(r.timerInterval);
        r.timerInterval = null;
        r.status = 'results';

        io.to(roomCode).emit('game_ended', {
          prompt: r.promptObj?.title || r.prompt,
          promptSteps: r.promptObj?.steps || [],
          canvasHistory: r.canvasHistory,
          players: [
            { slot: 1, nickname: r.players[1]?.nickname || 'Partner 1' },
            { slot: 2, nickname: r.players[2]?.nickname || 'Partner 2' }
          ]
        });
      }
    }
  }, 1000);
}

io.on('connection', (socket) => {
  let userRoomCode = null;
  let userSlot = null;

  socket.on('ping_check', (data) => {
    socket.emit('pong_check', data);
  });

  // Create Room
  socket.on('create_room', ({ myNickname, partnerNickname }, callback) => {
    try {
      const code = generateRoomCode();
      const cleanMyNick = (myNickname || 'Sweetie').trim().slice(0, 15);
      const cleanPartnerNick = (partnerNickname || 'Honey').trim().slice(0, 15);

      const room = {
        code,
        hostNickname: cleanMyNick,
        expectedPartnerNickname: cleanPartnerNick,
        status: 'waiting',
        players: {
          1: { socketId: socket.id, nickname: cleanMyNick, slot: 1, online: true, isHost: true },
          2: null
        },
        promptObj: null,
        prompt: '',
        usedPrompts: new Set(),
        currentTurn: 1,
        totalTurns: 6,
        turnDuration: 40,
        timeLeft: 40,
        timerInterval: null,
        isPaused: false,
        pauseReason: null,
        canvasHistory: [],
        chatMessages: [],
        createdAt: Date.now()
      };

      rooms.set(code, room);
      userRoomCode = code;
      userSlot = 1;
      socket.join(code);

      if (typeof callback === 'function') {
        callback({
          success: true,
          code,
          slot: 1,
          room: {
            code,
            myNickname: cleanMyNick,
            expectedPartnerNickname: cleanPartnerNick,
            status: 'waiting',
            players: { 1: room.players[1], 2: null }
          }
        });
      }
    } catch (err) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  // Add Bot Partner for Solo Trial Test
  socket.on('add_bot_partner', ({ code }, callback) => {
    const room = rooms.get(code);
    if (!room) {
      if (typeof callback === 'function') callback({ success: false, error: 'Room not found' });
      return;
    }

    const botNick = (room.expectedPartnerNickname && room.expectedPartnerNickname !== 'Honey')
      ? `${room.expectedPartnerNickname} (AI)`
      : 'SweetBot 🤖';

    room.players[2] = {
      socketId: 'bot-companion',
      nickname: botNick,
      slot: 2,
      online: true,
      isHost: false,
      isBot: true
    };

    io.to(code).emit('partner_joined', {
      players: room.players
    });

    if (typeof callback === 'function') {
      callback({ success: true, nickname: botNick });
    }

    // Auto-start game after 1 second
    setTimeout(() => {
      const r = rooms.get(code);
      if (!r || r.status === 'playing') return;

      r.promptObj = getNextPrompt(r);
      r.prompt = r.promptObj.title;
      r.status = 'playing';
      r.currentTurn = 1;
      r.timeLeft = r.turnDuration;
      r.isPaused = false;
      r.pauseReason = null;
      r.canvasHistory = [];

      io.to(code).emit('game_started', {
        prompt: r.promptObj.title,
        promptSteps: r.promptObj.steps,
        currentStep: r.promptObj.steps[0],
        currentTurn: r.currentTurn,
        totalTurns: r.totalTurns,
        timeLeft: r.timeLeft,
        activeSlot: 1,
        activeNickname: r.players[1]?.nickname,
        players: r.players
      });

      startTurnTimer(code);
    }, 1000);
  });

  // Join Room
  socket.on('join_room', ({ code, nickname }, callback) => {
    try {
      const upperCode = (code || '').trim().toUpperCase();
      const room = rooms.get(upperCode);

      if (!room) {
        if (typeof callback === 'function') callback({ success: false, error: 'Room not found! Please check the code.' });
        return;
      }

      const cleanNick = (nickname || room.expectedPartnerNickname || 'Honey').trim().slice(0, 15);

      if (!room.players[2] || !room.players[2].online) {
        room.players[2] = {
          socketId: socket.id,
          nickname: cleanNick,
          slot: 2,
          online: true,
          isHost: false
        };
        userRoomCode = upperCode;
        userSlot = 2;
        socket.join(upperCode);

        io.to(upperCode).emit('partner_joined', {
          players: room.players
        });

        if (typeof callback === 'function') {
          callback({
            success: true,
            code: upperCode,
            slot: 2,
            room: {
              code: upperCode,
              status: room.status,
              players: room.players,
              prompt: room.promptObj?.title || '',
              promptSteps: room.promptObj?.steps || [],
              currentTurn: room.currentTurn,
              totalTurns: room.totalTurns,
              timeLeft: room.timeLeft,
              isPaused: room.isPaused
            }
          });
        }
      } else {
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Room is already full with 2 partners!' });
        }
      }
    } catch (err) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  // Start Game
  socket.on('start_game', ({ code }, callback) => {
    const room = rooms.get(code);
    if (!room) return;

    if (!room.players[1] || !room.players[2]) {
      if (typeof callback === 'function') callback({ success: false, error: 'Both partners must join before starting!' });
      return;
    }

    room.promptObj = getNextPrompt(room);
    room.prompt = room.promptObj.title;
    room.status = 'playing';
    room.currentTurn = 1;
    room.timeLeft = room.turnDuration;
    room.isPaused = false;
    room.pauseReason = null;
    room.canvasHistory = [];

    io.to(code).emit('game_started', {
      prompt: room.promptObj.title,
      promptSteps: room.promptObj.steps,
      currentStep: room.promptObj.steps[0],
      currentTurn: room.currentTurn,
      totalTurns: room.totalTurns,
      timeLeft: room.timeLeft,
      activeSlot: 1,
      activeNickname: room.players[1].nickname,
      players: room.players
    });

    startTurnTimer(code);
    if (typeof callback === 'function') callback({ success: true });
  });

  // Toggle Pause / Resume
  socket.on('toggle_pause', ({ code }) => {
    const room = rooms.get(code);
    if (!room || room.status !== 'playing') return;

    room.isPaused = !room.isPaused;
    room.pauseReason = room.isPaused ? 'manual' : null;

    io.to(code).emit('pause_toggled', {
      isPaused: room.isPaused,
      pausedBy: userSlot ? room.players[userSlot]?.nickname : 'Partner',
      pauseReason: room.pauseReason,
      timeLeft: room.timeLeft
    });
  });

  // Canvas Drawing Action
  socket.on('draw_action', ({ code, action }) => {
    const room = rooms.get(code);
    if (!room || room.status !== 'playing' || room.isPaused) return;

    const activeSlot = getActiveDrawerSlot(room.currentTurn);
    const callerSlot = (room.players[1]?.socketId === socket.id)
      ? 1
      : (room.players[2]?.socketId === socket.id)
      ? 2
      : userSlot;
    if (callerSlot !== activeSlot) return;

    if (action.type === 'clear') {
      room.canvasHistory = [];
    } else if (action.type === 'undo') {
      room.canvasHistory.pop();
    } else {
      room.canvasHistory.push(action);
    }

    socket.to(code).emit('draw_action_received', action);
  });

  // Chat message
  socket.on('send_chat', ({ code, text, isReaction }) => {
    const room = rooms.get(code);
    if (!room) return;

    const senderNick = userSlot && room.players[userSlot] ? room.players[userSlot].nickname : 'Partner';
    const message = {
      id: Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      slot: userSlot,
      sender: senderNick,
      text: (text || '').trim().slice(0, 100),
      isReaction: Boolean(isReaction),
      timestamp: Date.now()
    };

    room.chatMessages.push(message);
    if (room.chatMessages.length > 50) room.chatMessages.shift();

    io.to(code).emit('new_chat_message', message);
  });

  // Play Again
  socket.on('play_again', ({ code }, callback) => {
    const room = rooms.get(code);
    if (!room) return;

    room.promptObj = getNextPrompt(room);
    room.prompt = room.promptObj.title;
    room.status = 'playing';
    room.currentTurn = 1;
    room.timeLeft = room.turnDuration;
    room.isPaused = false;
    room.pauseReason = null;
    room.canvasHistory = [];

    io.to(code).emit('game_started', {
      prompt: room.promptObj.title,
      promptSteps: room.promptObj.steps,
      currentStep: room.promptObj.steps[0],
      currentTurn: room.currentTurn,
      totalTurns: room.totalTurns,
      timeLeft: room.timeLeft,
      activeSlot: 1,
      activeNickname: room.players[1]?.nickname,
      players: room.players
    });

    startTurnTimer(code);
    if (typeof callback === 'function') callback({ success: true });
  });

  // Reconnection / Rejoin
  socket.on('reconnect_slot', ({ code, slot, nickname }, callback) => {
    const room = rooms.get(code);
    if (!room) {
      if (typeof callback === 'function') callback({ success: false, error: 'Room not found' });
      return;
    }

    userRoomCode = code;
    userSlot = slot;
    socket.join(code);

    if (room.players[slot]) {
      room.players[slot].socketId = socket.id;
      room.players[slot].online = true;
    }

    const bothOnline = room.players[1]?.online && (room.players[2]?.online || room.players[2]?.isBot);
    if (bothOnline && room.pauseReason === 'disconnect') {
      room.isPaused = false;
      room.pauseReason = null;
    }

    io.to(code).emit('partner_reconnected', {
      slot,
      nickname: room.players[slot]?.nickname,
      isPaused: room.isPaused,
      pauseReason: room.pauseReason
    });

    const stepIdx = (room.currentTurn || 1) - 1;
    if (typeof callback === 'function') {
      callback({
        success: true,
        room: {
          code,
          status: room.status,
          prompt: room.promptObj?.title || room.prompt,
          promptSteps: room.promptObj?.steps || [],
          currentStep: room.promptObj?.steps?.[stepIdx] || '',
          currentTurn: room.currentTurn,
          totalTurns: room.totalTurns,
          timeLeft: room.timeLeft,
          isPaused: room.isPaused,
          pauseReason: room.pauseReason,
          activeSlot: getActiveDrawerSlot(room.currentTurn),
          players: room.players,
          canvasHistory: room.canvasHistory,
          chatMessages: room.chatMessages
        }
      });
    }
  });

  // Skip Turn (active drawer passes canvas early to partner)
  socket.on('skip_turn', ({ code, slot }, callback) => {
    const room = rooms.get(code);
    if (!room || room.status !== 'playing' || room.isPaused) {
      if (typeof callback === 'function') callback({ success: false, error: 'Game not active' });
      return;
    }

    const activeSlot = getActiveDrawerSlot(room.currentTurn);
    const callerSlot = (room.players[1]?.socketId === socket.id)
      ? 1
      : (room.players[2]?.socketId === socket.id)
      ? 2
      : (slot || userSlot);

    if (callerSlot !== activeSlot) {
      if (typeof callback === 'function') callback({ success: false, error: 'Not your turn to pass' });
      return;
    }

    if (room.currentTurn < room.totalTurns) {
      room.currentTurn += 1;
      room.timeLeft = room.turnDuration;
      const nextActiveSlot = getActiveDrawerSlot(room.currentTurn);
      const activePlayer = room.players[nextActiveSlot];
      const stepIndex = room.currentTurn - 1;
      const currentStep = room.promptObj?.steps?.[stepIndex] || `Step ${room.currentTurn}`;

      io.to(code).emit('turn_changed', {
        currentTurn: room.currentTurn,
        totalTurns: room.totalTurns,
        timeLeft: room.timeLeft,
        activeSlot: nextActiveSlot,
        activeNickname: activePlayer ? activePlayer.nickname : '',
        currentStep: currentStep
      });

      startTurnTimer(code);
    } else {
      if (room.timerInterval) {
        clearInterval(room.timerInterval);
        room.timerInterval = null;
      }
      room.status = 'results';

      io.to(code).emit('game_ended', {
        prompt: room.promptObj?.title || room.prompt,
        promptSteps: room.promptObj?.steps || [],
        canvasHistory: room.canvasHistory,
        players: [
          { slot: 1, nickname: room.players[1]?.nickname || 'Player 1' },
          { slot: 2, nickname: room.players[2]?.nickname || 'Player 2' }
        ]
      });
    }

    if (typeof callback === 'function') callback({ success: true });
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (!userRoomCode || !userSlot) return;

    const room = rooms.get(userRoomCode);
    if (!room) return;

    if (room.players[userSlot]) {
      room.players[userSlot].online = false;
    }

    if (room.status === 'playing') {
      room.isPaused = true;
      room.pauseReason = 'disconnect';

      const disconnectedNick = room.players[userSlot]?.nickname || 'Your partner';
      io.to(userRoomCode).emit('partner_disconnected', {
        slot: userSlot,
        nickname: disconnectedNick,
        message: `${disconnectedNick} disconnected. Pausing game... Reconnecting your partner... please check your internet.`
      });
    } else {
      io.to(userRoomCode).emit('partner_status_changed', {
        slot: userSlot,
        online: false
      });
    }
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'), (err) => {
    if (err) {
      res.send('Sketch Relay Backend API is Running!');
    }
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🎨 Sketch Relay Server running on port ${PORT}`);
});
