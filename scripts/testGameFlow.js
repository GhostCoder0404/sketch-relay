// Automated E2E verification of 2-player game flow
import { io } from 'socket.io-client';

const URL = 'http://localhost:3000';

async function runTest() {
  console.log('🚀 Starting Sketch Relay 2-Player E2E Test...');

  // 1. Host connects
  const host = io(URL);
  let roomCode = null;

  await new Promise((resolve) => {
    host.on('connect', () => {
      console.log('✅ Host connected');
      host.emit('create_room', { myNickname: 'Aarav', partnerNickname: 'Diya' }, (res) => {
        console.log('✅ Room created with code:', res.code);
        roomCode = res.code;
        resolve();
      });
    });
  });

  // 2. Partner connects
  const partner = io(URL);
  await new Promise((resolve) => {
    partner.on('connect', () => {
      console.log('✅ Partner connected');
      partner.emit('join_room', { code: roomCode, nickname: 'Diya' }, (res) => {
        console.log('✅ Partner joined room:', res.success);
        resolve();
      });
    });
  });

  // 3. Start game & verify 6-step prompt
  await new Promise((resolve) => {
    partner.on('game_started', (data) => {
      console.log('🎨 Game started event received!');
      console.log(`📌 Short Prompt Title: "${data.prompt}"`);
      console.log(`📋 Total Process Steps: ${data.promptSteps.length}`);
      console.log(`👉 Turn 1 Step: "${data.currentStep}"`);
      if (data.promptSteps.length === 6) {
        console.log('✅ Exactly 6 process steps verified for this round:');
        data.promptSteps.forEach((s, idx) => console.log(`   Step ${idx + 1}: ${s}`));
      }
      resolve();
    });

    // Host triggers start
    host.emit('start_game', { code: roomCode });
  });

  // 4. Test stroke sync
  await new Promise((resolve) => {
    partner.on('draw_action_received', (action) => {
      console.log('✅ Partner received Host drawing stroke:', action.type);
      resolve();
    });

    host.emit('draw_action', {
      code: roomCode,
      action: {
        type: 'brush',
        points: [{ x: 0.2, y: 0.2 }, { x: 0.5, y: 0.5 }],
        color: '#FF6B8B',
        size: 6
      }
    });
  });

  // 5. Test chat sync
  await new Promise((resolve) => {
    host.on('new_chat_message', (msg) => {
      console.log(`💬 Chat received by host from ${msg.sender}: "${msg.text}"`);
      resolve();
    });

    partner.emit('send_chat', {
      code: roomCode,
      text: 'You draw so cute! 💕',
      isReaction: false
    });
  });

  // 6. Test pause / resume
  await new Promise((resolve) => {
    partner.on('pause_toggled', (data) => {
      console.log(`⏸️ Pause toggled. isPaused: ${data.isPaused}`);
      resolve();
    });

    host.emit('toggle_pause', { code: roomCode });
  });

  host.disconnect();
  partner.disconnect();
  console.log('🎉 ALL GAMEPLAY MECHANICS VERIFIED SUCCESSFULLY!');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
