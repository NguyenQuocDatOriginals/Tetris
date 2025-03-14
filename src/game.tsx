import React, { useEffect, useRef } from 'react';
import './App.scss';

// Constants
const PLAYFIELD_WIDTH = 10;            // Số cột trong lưới game (10)
const PLAYFIELD_HEIGHT = 20;           // Số hàng trong lưới game (20)
const BLOCK_SIZE = 30;                 // Kích thước mỗi ô (px)
const CANVAS_WIDTH = PLAYFIELD_WIDTH * BLOCK_SIZE;  // 300px (10 * 30)
const CANVAS_HEIGHT = PLAYFIELD_HEIGHT * BLOCK_SIZE; // 600px (20 * 30)
const FALL_INTERVAL = 1000;            // Thời gian rơi của khối (ms)

// Tetromino shapes (mỗi tetromino có 4 trạng thái xoay)
const TETROMINOES = [
  // I
  [
    [[0, 0], [1, 0], [2, 0], [3, 0]],
    [[0, 0], [0, 1], [0, 2], [0, 3]],
    [[0, 0], [1, 0], [2, 0], [3, 0]],
    [[0, 0], [0, 1], [0, 2], [0, 3]]
  ],
  // O
  [
    [[0, 0], [1, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [0, 1], [1, 1]]
  ],
  // T
  [
    [[0, 0], [1, 0], [2, 0], [1, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 1]],
    [[0, 1], [1, 1], [2, 1], [1, 0]],
    [[0, 1], [1, 0], [1, 1], [1, 2]]
  ],
  // S
  [
    [[0, 1], [1, 1], [1, 0], [2, 0]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [1, 0], [2, 0]],
    [[0, 0], [0, 1], [1, 1], [1, 2]]
  ],
  // Z
  [
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [0, 1], [0, 2]],
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [0, 1], [0, 2]]
  ],
  // J
  [
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [0, 2]],
    [[0, 1], [1, 1], [2, 1], [2, 0]],
    [[2, 0], [1, 0], [1, 1], [1, 2]]
  ],
  // L
  [
    [[2, 0], [0, 1], [1, 1], [2, 1]],
    [[0, 0], [1, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [0, 0]],
    [[1, 0], [1, 1], [1, 2], [2, 2]]
  ]
];

// Colors for each tetromino (index 0 = trống)
const COLORS = [
  'black',  // 0: ô trống
  'cyan',   // 1: I
  'yellow', // 2: O
  'purple', // 3: T
  'green',  // 4: S
  'red',    // 5: Z
  'blue',   // 6: J
  'orange'  // 7: L
];

const Game: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Khởi tạo playfield với giá trị 0 (trống)
    let playfield = Array(PLAYFIELD_HEIGHT)
      .fill(undefined)
      .map(() => Array(PLAYFIELD_WIDTH).fill(0));
    let currentTetromino: { type: number; rotation: number; x: number; y: number } = {
      type: 0,
      rotation: 0,
      x: 0,
      y: 0,
    };
    let score = 0;
    let gameState: 'start' | 'play' | 'end' = 'start';
    let lastTime = 0;
    let accumulatedTime = 0;

    // Tạo tetromino mới và căn giữa ở đầu playfield
    const generateNewTetromino = () => {
      const type = Math.floor(Math.random() * 7);
      const rotation = 0;
      const offsets = TETROMINOES[type][rotation];
      const minDx = Math.min(...offsets.map(([dx]) => dx));
      const maxDx = Math.max(...offsets.map(([dx]) => dx));
      const width = maxDx - minDx + 1;
      const x = Math.floor((PLAYFIELD_WIDTH - width) / 2);
      const y = 0;
      currentTetromino = { type, rotation, x, y };

      // Kiểm tra va chạm ngay khi sinh (game over)
      for (const [dx, dy] of offsets) {
        const ny = y + dy;
        if (ny >= 0 && playfield[ny][x + dx] !== 0) {
          gameState = 'end';
          break;
        }
      }
    };

    // Kiểm tra xem tetromino có thể di chuyển hoặc xoay không
    const canMove = (dx: number, dy: number, newRotation: number = currentTetromino.rotation) => {
      const offsets = TETROMINOES[currentTetromino.type][newRotation];
      for (const [ox, oy] of offsets) {
        const nx = currentTetromino.x + ox + dx;
        const ny = currentTetromino.y + oy + dy;
        if (nx < 0 || nx >= PLAYFIELD_WIDTH || ny >= PLAYFIELD_HEIGHT) {
          return false;
        }
        if (ny >= 0 && playfield[ny][nx] !== 0) {
          return false;
        }
      }
      return true;
    };

    const moveLeft = () => {
      if (canMove(-1, 0)) currentTetromino.x--;
    };

    const moveRight = () => {
      if (canMove(1, 0)) currentTetromino.x++;
    };

    const moveDown = () => {
      if (canMove(0, 1)) {
        currentTetromino.y++;
        return true;
      }
      return false;
    };

    const rotateClockwise = () => {
      const newRotation = (currentTetromino.rotation + 1) % 4;
      if (canMove(0, 0, newRotation)) {
        currentTetromino.rotation = newRotation;
      }
    };

    const hardDrop = () => {
      while (canMove(0, 1)) {
        currentTetromino.y++;
      }
      lockTetromino();
      clearLines();
      generateNewTetromino();
    };

    // Khóa tetromino vào playfield
    const lockTetromino = () => {
      const { type, rotation, x, y } = currentTetromino;
      const offsets = TETROMINOES[type][rotation];
      for (const [dx, dy] of offsets) {
        const ny = y + dy;
        if (ny >= 0) {
          playfield[ny][x + dx] = type + 1; // +1 vì COLORS bắt đầu từ index 1 cho các tetromino
        }
      }
    };

    // Xóa các dòng đầy và cập nhật điểm số
    const clearLines = () => {
      let linesCleared = 0;
      for (let y = PLAYFIELD_HEIGHT - 1; y >= 0; y--) {
        if (playfield[y].every(cell => cell !== 0)) {
          playfield.splice(y, 1);
          playfield.unshift(new Array(PLAYFIELD_WIDTH).fill(0));
          linesCleared++;
          y++; // Điều chỉnh chỉ số sau khi xóa dòng
        }
      }
      score += linesCleared;
    };

    // Xử lý sự kiện bàn phím
    const handleInput = (event: KeyboardEvent) => {
      if (gameState === 'play') {
        switch (event.key) {
          case 'ArrowLeft':
            moveLeft();
            break;
          case 'ArrowRight':
            moveRight();
            break;
          case 'ArrowDown':
            moveDown();
            break;
          case 'ArrowUp':
            rotateClockwise();
            break;
          case ' ':
            hardDrop();
            break;
        }
      } else if (gameState === 'start' || gameState === 'end') {
        if (event.key === ' ') {
          resetGame();
          gameState = 'play';
        }
      }
    };

    // Vẽ giao diện game với thiết kế hiện đại, sạch sẽ
    const draw = () => {
      if (!ctx) return;
      // Vẽ nền playfield
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Vẽ lưới mờ
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      for (let y = 0; y < PLAYFIELD_HEIGHT; y++) {
        for (let x = 0; x < PLAYFIELD_WIDTH; x++) {
          ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        }
      }

      // Vẽ các khối đã khóa trong playfield
      for (let y = 0; y < PLAYFIELD_HEIGHT; y++) {
        for (let x = 0; x < PLAYFIELD_WIDTH; x++) {
          const cell = playfield[y][x];
          if (cell !== 0) {
            ctx.fillStyle = COLORS[cell];
            ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
          }
        }
      }

      // Vẽ tetromino hiện tại nếu game đang chơi
      if (gameState === 'play') {
        const { type, rotation, x, y } = currentTetromino;
        const offsets = TETROMINOES[type][rotation];
        ctx.fillStyle = COLORS[type + 1];
        for (const [dx, dy] of offsets) {
          const ny = y + dy;
          if (ny >= 0) {
            ctx.fillRect((x + dx) * BLOCK_SIZE, ny * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
          }
        }
      }

      // Vẽ văn bản game (điểm và thông báo) với kiểu chữ trung tâm, sạch sẽ
      ctx.fillStyle = 'white';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (gameState === 'start') {
        ctx.fillText('Nhấn phím cách để chơi', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      } else if (gameState === 'end') {
        ctx.fillText('Bạn đã thua cuộc!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
        ctx.fillText(`Điểm: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.fillText('Nhấn phím cách để chơi lại', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
      } else {
        ctx.fillText(`Điểm: ${score}`, CANVAS_WIDTH / 2, 30);
      }
    };

    const update = (deltaTime: number) => {
      if (gameState === 'play') {
        accumulatedTime += deltaTime;
        if (accumulatedTime >= FALL_INTERVAL) {
          accumulatedTime -= FALL_INTERVAL;
          if (!moveDown()) {
            lockTetromino();
            clearLines();
            generateNewTetromino();
          }
        }
      }
    };

    const gameLoop = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      update(deltaTime);
      draw();
      requestAnimationFrame(gameLoop);
    };

    const resetGame = () => {
      playfield = Array(PLAYFIELD_HEIGHT)
        .fill(undefined)
        .map(() => Array(PLAYFIELD_WIDTH).fill(0));
      score = 0;
      generateNewTetromino();
    };

    document.addEventListener('keydown', handleInput);
    requestAnimationFrame(gameLoop);

    return () => {
      document.removeEventListener('keydown', handleInput);
    };
  }, []);

  return <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />;
};

export default Game;