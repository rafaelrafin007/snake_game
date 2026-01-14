// Wrap everything in DOMContentLoaded to ensure DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    class SnakeGame {
        constructor() {
            this.$app = document.querySelector('#app');
            this.$canvas = this.$app.querySelector('canvas');
            this.ctx = this.$canvas.getContext('2d');
            this.$startScreen = this.$app.querySelector('.start-screen');
            this.$score = this.$app.querySelector('.score');
            this.$activePowerups = this.$app.querySelector('.active-powerups');

            // Bind methods for event listeners
            this.handleKeyDown = this.handleKeyDown.bind(this);
            this.handleResize = this.handleResize.bind(this);
            
            this.settings = {
                canvas: {
                    width: Math.min(window.innerWidth * 0.9, 1000),
                    height: Math.min(window.innerHeight * 0.9, 700),
                    background: '#1a3a1a'
                },
                snake: {
                    size: 20,
                    background: '#fac020'
                }
            };

            // Define power-ups
            this.powerUps = {
                speed: {
                    name: 'Speed Boost',
                    color: '#00ff00',
                    duration: 10000,
                    icon: '⚡',
                    probability: 0.20,
                    speedMultiplier: 0.5
                },
                slow: {
                    name: 'Slow Time',
                    color: '#4169e1',
                    duration: 10000,
                    icon: '🐌',
                    probability: 0.20,
                    speedMultiplier: 2
                },
                invincible: {
                    name: 'Invincibility',
                    color: '#ffd700',
                    duration: 5000,
                    icon: '🛡️',
                    probability: 0.15
                },
                shrink: {
                    name: 'Shrink',
                    color: '#9370db',
                    duration: 0,
                    icon: '📉',
                    probability: 0.15
                },
                doublePoints: {
                    name: 'Double Points',
                    color: '#ff4500',
                    duration: 15000,
                    icon: '2×',
                    probability: 0.30
                }
            };

            this.game = {
                speed: 100,
                originalSpeed: 100,
                keyCodes: {
                    87: 'up',
                    83: 'down',
                    68: 'right',
                    65: 'left',
                    38: 'up',
                    40: 'down',
                    39: 'right',
                    37: 'left',
                    32: 'pause',
                    80: 'pause'
                },
                isPaused: false,
                scoreMultiplier: 1,
                invincible: false,
                activePowerUps: [],
                keysPressed: {}
            };

            this.setUpGame();
            this.init();
        }

        init() {
            // Choose difficulty
            this.$startScreen.querySelector('.options').addEventListener('click', (event) => {
                if (event.target.matches('button[data-difficulty]')) {
                    this.chooseDifficulty(event);
                }
            });

            // Play
            this.$startScreen.querySelector('.play-btn').addEventListener('click', () => {
                this.startGame();
            });

            // Handle window resize
            window.addEventListener('resize', this.handleResize);
        }

        handleResize() {
            // Update canvas size on resize
            this.settings.canvas.width = Math.min(window.innerWidth * 0.9, 1000);
            this.settings.canvas.height = Math.min(window.innerHeight * 0.9, 700);
            
            if (this.$app.classList.contains('game-in-progress')) {
                this.resetCanvas();
                this.drawSnake();
                if (this.food.active) {
                    this.drawFood();
                }
                if (this.game.isPaused) {
                    this.drawPauseOverlay();
                }
            }
        }

        chooseDifficulty(event) {
            const difficulty = event.target.dataset.difficulty;
            if (difficulty) {
                this.game.speed = parseInt(difficulty);
                this.game.originalSpeed = parseInt(difficulty);
                this.$startScreen.querySelectorAll('.options button').forEach(btn => btn.classList.remove('active'));
                event.target.classList.add('active');
            }
        }

        setUpGame() {
            // Calculate starting position based on canvas size
            const x = Math.floor(this.settings.canvas.width / 2 / this.settings.snake.size) * this.settings.snake.size;
            const y = Math.floor(this.settings.canvas.height / 2 / this.settings.snake.size) * this.settings.snake.size;

            this.snake = [
                { x: x, y: y },
                { x: x - this.settings.snake.size, y: y },
                { x: x - (this.settings.snake.size * 2), y: y },
                { x: x - (this.settings.snake.size * 3), y: y },
                { x: x - (this.settings.snake.size * 4), y: y }
            ];

            this.food = {
                active: false,
                type: 'regular',
                color: '#f8a2ff',
                coordinates: {
                    x: 0,
                    y: 0
                }
            };

            this.game.score = 0;
            this.game.direction = 'right';
            this.game.nextDirection = 'right';
            this.game.isPaused = false;
            this.game.scoreMultiplier = 1;
            this.game.invincible = false;
            this.game.activePowerUps = [];
            this.game.keysPressed = {};
            
            this.$activePowerups.innerHTML = '';
            this.resetCanvas();
        }

        startGame() {
            // Reset the start screen text
            this.$startScreen.querySelector('.options h3').innerText = 'Choose Difficulty';
            this.$startScreen.querySelector('.options .end-score').innerText = '';

            // Remove any inline display style
            this.$startScreen.style.display = '';
            
            // Set app classes properly
            this.$app.classList.add('game-in-progress');
            this.$app.classList.remove('game-over');
            this.$score.innerText = 0;
            this.game.isPaused = false;

            // Clear any existing interval
            if (this.startGameInterval) {
                clearInterval(this.startGameInterval);
            }

            // Add keydown event listener
            document.addEventListener('keydown', this.handleKeyDown);

            this.generateSnake();

            this.startGameInterval = setInterval(() => {
                if (this.game.isPaused) return;

                this.updatePowerUps();

                if (!this.detectCollision()) {
                    this.generateSnake();
                } else {
                    this.endGame();
                }
            }, this.game.speed);
        }

        handleKeyDown(event) {
            // Handle pause key (Spacebar or P)
            if (event.keyCode === 32 || event.keyCode === 80) {
                event.preventDefault(); // Prevent spacebar from scrolling
                this.togglePause();
                return;
            }
            
            // Only process direction keys if game is not paused
            if (!this.game.isPaused && this.$app.classList.contains('game-in-progress')) {
                this.changeDirection(event.keyCode);
            }
        }

        togglePause() {
            if (!this.$app.classList.contains('game-in-progress')) return;
            
            this.game.isPaused = !this.game.isPaused;
            
            if (this.game.isPaused) {
                this.drawPauseOverlay();
            } else {
                this.resetCanvas();
                this.drawSnake();
                if (this.food.active) {
                    this.drawFood();
                }
            }
        }

        drawPauseOverlay() {
            // Create or update pause overlay
            let $pauseOverlay = this.$app.querySelector('.pause-overlay');
            if (!$pauseOverlay) {
                $pauseOverlay = document.createElement('div');
                $pauseOverlay.className = 'pause-overlay';
                $pauseOverlay.innerHTML = `
                    <div class="pause-text">PAUSED</div>
                    <div class="pause-subtext">Press SPACE or P to resume</div>
                `;
                this.$app.appendChild($pauseOverlay);
            } else {
                $pauseOverlay.style.display = 'flex';
            }
        }

        removePauseOverlay() {
            const $pauseOverlay = this.$app.querySelector('.pause-overlay');
            if ($pauseOverlay) {
                $pauseOverlay.style.display = 'none';
            }
        }

        changeDirection(keyCode) {
            const validKeyPress = Object.keys(this.game.keyCodes).includes(keyCode.toString());

            if (validKeyPress && this.validateDirectionChange(this.game.keyCodes[keyCode], this.game.direction)) {
                this.game.nextDirection = this.game.keyCodes[keyCode];
            }
        }

        validateDirectionChange(keyPress, currentDirection) {
            return (keyPress === 'left' && currentDirection !== 'right') ||
                (keyPress === 'right' && currentDirection !== 'left') ||
                (keyPress === 'up' && currentDirection !== 'down') ||
                (keyPress === 'down' && currentDirection !== 'up');
        }

        resetCanvas() {
            // Set canvas dimensions
            this.$canvas.width = this.settings.canvas.width;
            this.$canvas.height = this.settings.canvas.height;

            // Create forest-themed background
            const gradient = this.ctx.createLinearGradient(0, 0, this.$canvas.width, this.$canvas.height);
            gradient.addColorStop(0, '#1a3a1a');
            gradient.addColorStop(0.5, '#0f2a0f');
            gradient.addColorStop(1, '#1a3a1a');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.$canvas.width, this.$canvas.height);
            
            // Remove pause overlay if not paused
            if (!this.game.isPaused) {
                this.removePauseOverlay();
            }
        }

        generateSnake() {
            let coordinate;

            switch (this.game.direction) {
                case 'right':
                    coordinate = {
                        x: this.snake[0].x + this.settings.snake.size,
                        y: this.snake[0].y
                    };
                    break;
                case 'up':
                    coordinate = {
                        x: this.snake[0].x,
                        y: this.snake[0].y - this.settings.snake.size
                    };
                    break;
                case 'left':
                    coordinate = {
                        x: this.snake[0].x - this.settings.snake.size,
                        y: this.snake[0].y
                    };
                    break;
                case 'down':
                    coordinate = {
                        x: this.snake[0].x,
                        y: this.snake[0].y + this.settings.snake.size
                    };
                    break;
            }

            this.snake.unshift(coordinate);
            this.resetCanvas();

            const head = this.snake[0];
            const food = this.food.coordinates;

            const ateFood = head.x === food.x && head.y === food.y;

            if (ateFood) {
                this.food.active = false;

                if (this.food.type === 'regular') {
                    const points = 10 * this.game.scoreMultiplier;
                    this.game.score += points;
                    this.$score.innerText = this.game.score;
                    this.playSound('score');
                } else {
                    this.applyPowerUp(this.food.type);
                    this.playSound('powerUp');
                }
            } else {
                this.snake.pop();
            }

            this.generateFood();
            this.drawSnake();
        }

        playSound(type) {
            try {
                let soundUrl;
                switch(type) {
                    case 'score':
                        soundUrl = 'https://arcade.arealalien.com/games/snake/sounds/score.mp3';
                        break;
                    case 'powerUp':
                        soundUrl = 'https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3';
                        break;
                    case 'gameOver':
                        soundUrl = 'https://arcade.arealalien.com/games/snake/sounds/game-over.mp3';
                        break;
                }
                
                if (soundUrl) {
                    const audio = new Audio(soundUrl);
                    audio.volume = 0.3;
                    audio.play().catch(e => console.log("Audio play failed:", e));
                }
            } catch (e) {
                console.log("Sound error:", e);
            }
        }

        drawSnake() {
            const size = this.settings.snake.size;

            if (this.game.invincible) {
                this.ctx.fillStyle = '#ffd700';
                this.ctx.shadowColor = 'rgba(255, 215, 0, 0.7)';
                this.ctx.shadowBlur = 15;
            } else {
                this.ctx.fillStyle = this.settings.snake.background;
                this.ctx.shadowColor = 'rgba(250, 192, 32, 0.45)';
                this.ctx.shadowBlur = 20;
            }

            this.snake.forEach(coordinate => {
                this.ctx.fillRect(coordinate.x, coordinate.y, size, size);
            });

            this.ctx.shadowBlur = 0;
            this.game.direction = this.game.nextDirection;
        }

        generateFood() {
            if (this.food.active) {
                this.drawFood();
                return;
            }

            const gridSize = this.settings.snake.size;
            const xMax = this.settings.canvas.width - gridSize;
            const yMax = this.settings.canvas.height - gridSize;

            const x = Math.round((Math.random() * xMax) / gridSize) * gridSize;
            const y = Math.round((Math.random() * yMax) / gridSize) * gridSize;

            let conflict = false;
            for (const segment of this.snake) {
                if (segment.x === x && segment.y === y) {
                    conflict = true;
                    break;
                }
            }

            if (conflict) {
                this.generateFood();
                return;
            }

            // 40% chance for power-up
            const rand = Math.random();
            let foodType = 'regular';
            let foodColor = '#f8a2ff';

            if (rand < 0.4) {
                const powerUpRand = Math.random();
                let cumulative = 0;

                for (const [type, powerUp] of Object.entries(this.powerUps)) {
                    cumulative += powerUp.probability;

                    if (powerUpRand <= cumulative) {
                        foodType = type;
                        foodColor = powerUp.color;
                        break;
                    }
                }
            }

            this.food.active = true;
            this.food.type = foodType;
            this.food.color = foodColor;
            this.food.coordinates.x = x;
            this.food.coordinates.y = y;

            this.drawFood();
        }

        drawFood() {
            const size = this.settings.snake.size;
            const x = this.food.coordinates.x;
            const y = this.food.coordinates.y;

            if (this.food.type !== 'regular') {
                this.ctx.shadowColor = this.food.color + '80';
                this.ctx.shadowBlur = 15;
            } else {
                this.ctx.shadowColor = 'rgba(248, 162, 255, .35)';
                this.ctx.shadowBlur = 20;
            }

            this.ctx.fillStyle = this.food.color;

            if (this.food.type !== 'regular') {
                this.ctx.beginPath();
                this.ctx.moveTo(x + size / 2, y);
                this.ctx.lineTo(x + size, y + size / 2);
                this.ctx.lineTo(x + size / 2, y + size);
                this.ctx.lineTo(x, y + size / 2);
                this.ctx.closePath();
                this.ctx.fill();
            } else {
                this.ctx.fillRect(x, y, size, size);
            }

            this.ctx.shadowBlur = 0;
        }

        applyPowerUp(type) {
            const powerUp = this.powerUps[type];
            if (!powerUp) return;

            const points = 20 * this.game.scoreMultiplier;
            this.game.score += points;
            this.$score.innerText = this.game.score;

            switch (type) {
                case 'speed':
                    this.game.speed = Math.max(20, Math.floor(this.game.originalSpeed * powerUp.speedMultiplier));
                    this.restartGameInterval();
                    break;
                case 'slow':
                    this.game.speed = Math.floor(this.game.originalSpeed * powerUp.speedMultiplier);
                    this.restartGameInterval();
                    break;
                case 'invincible':
                    this.game.invincible = true;
                    break;
                case 'shrink':
                    const removeCount = Math.min(3, this.snake.length - 3);
                    for (let i = 0; i < removeCount; i++) {
                        this.snake.pop();
                    }
                    break;
                case 'doublePoints':
                    this.game.scoreMultiplier = 2;
                    break;
            }

            if (powerUp.duration > 0) {
                const powerUpObj = {
                    type: type,
                    endTime: Date.now() + powerUp.duration,
                    element: this.createPowerUpIndicator(type)
                };

                this.game.activePowerUps.push(powerUpObj);
                this.updatePowerUpDisplay();
            }
        }

        createPowerUpIndicator(type) {
            const powerUp = this.powerUps[type];
            const indicator = document.createElement('div');
            indicator.className = 'powerup-indicator';
            indicator.style.borderColor = powerUp.color;

            const icon = document.createElement('div');
            icon.className = 'powerup-icon';
            icon.style.background = powerUp.color;
            icon.textContent = powerUp.icon;

            const timer = document.createElement('div');
            timer.className = 'powerup-timer';
            timer.textContent = Math.ceil(powerUp.duration / 1000) + 's';

            indicator.appendChild(icon);
            indicator.appendChild(timer);

            return { element: indicator, timer: timer };
        }

        updatePowerUpDisplay() {
            this.$activePowerups.innerHTML = '';
            this.game.activePowerUps.forEach(powerUp => {
                this.$activePowerups.appendChild(powerUp.element.element);
            });
        }

        updatePowerUps() {
            const now = Date.now();

            for (let i = this.game.activePowerUps.length - 1; i >= 0; i--) {
                const powerUp = this.game.activePowerUps[i];
                const timeLeft = powerUp.endTime - now;

                if (timeLeft <= 0) {
                    this.removePowerUp(powerUp.type);
                    this.game.activePowerUps.splice(i, 1);
                } else {
                    powerUp.element.timer.textContent = Math.ceil(timeLeft / 1000) + 's';
                }
            }

            this.updatePowerUpDisplay();
        }

        removePowerUp(type) {
            switch (type) {
                case 'speed':
                case 'slow':
                    this.game.speed = this.game.originalSpeed;
                    this.restartGameInterval();
                    break;
                case 'invincible':
                    this.game.invincible = false;
                    break;
                case 'doublePoints':
                    this.game.scoreMultiplier = 1;
                    break;
            }
        }

        restartGameInterval() {
            clearInterval(this.startGameInterval);
            this.startGameInterval = setInterval(() => {
                if (this.game.isPaused) return;
                this.updatePowerUps();
                if (!this.detectCollision()) {
                    this.generateSnake();
                } else {
                    this.endGame();
                }
            }, this.game.speed);
        }

        detectCollision() {
            if (this.game.invincible) return false;

            const head = this.snake[0];
            for (let i = 4; i < this.snake.length; i++) {
                if (this.snake[i].x === head.x && this.snake[i].y === head.y) {
                    return true;
                }
            }

            const leftCollision = head.x < 0;
            const topCollision = head.y < 0;
            const rightCollision = head.x >= this.$canvas.width - this.settings.snake.size;
            const bottomCollision = head.y >= this.$canvas.height - this.settings.snake.size;

            return leftCollision || topCollision || rightCollision || bottomCollision;
        }

        endGame() {
            if (this.game.isPaused) return;

            this.playSound('gameOver');

            clearInterval(this.startGameInterval);
            
            // Remove keydown event listener
            document.removeEventListener('keydown', this.handleKeyDown);

            this.$app.classList.remove('game-in-progress');
            this.$app.classList.add('game-over');
            
            // Remove pause overlay if visible
            this.removePauseOverlay();

            this.$startScreen.querySelector('.options h3').innerText = 'Game Over';
            this.$startScreen.querySelector('.options .end-score').innerText = `Final Score: ${this.game.score}`;
            
            // Make start screen visible
            this.$startScreen.style.display = 'block';

            this.setUpGame();
        }
    }

    const snakeGame = new SnakeGame();
});