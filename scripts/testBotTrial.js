import { io } from 'socket.io-client';

const URL = 'http://localhost:3000';

async function testBot() {
  console.log('🤖 Testing Solo Trial Bot flow...');
  const user = io(URL);

  let roomCode = null;
  await new Promise((resolve) => {
    user.on('connect', () => {
      user.emit('create_room', { myNickname: 'SoloTester', partnerNickname: 'SweetBot' }, (res) => {
        roomCode = res.code;
        console.log('✅ Room created:', roomCode);
        resolve();
      });
    });
  });

  // Request bot partner
  await new Promise((resolve) => {
    user.on('partner_joined', (data) => {
      console.log('✅ Bot joined as partner:', data.players[2]?.nickname);
      resolve();
    });
    user.emit('add_bot_partner', { code: roomCode });
  });

  // Wait for game started
  await new Promise((resolve) => {
    user.on('game_started', (data) => {
      console.log(`🎨 Game started with prompt: "${data.prompt}"`);
      console.log(`👉 Step 1: "${data.currentStep}"`);
      resolve();
    });
  });

  console.log('🎉 Bot Trial Flow Verified Successfully!');
  user.disconnect();
  process.exit(0);
}

testBot().catch(err => {
  console.error(err);
  process.exit(1);
});
