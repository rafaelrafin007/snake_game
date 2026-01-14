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

            this.settings = {
                canvas: {
                    width: window.innerWidth,
                    height: window.innerHeight,
                    background: '#09080a',
                    border: '#000000'
                },
                snake: {
                    size: 20,
                    background: '#fac020',
                    border: '#FAB520'
                }
            };

            // Define power-ups with higher probabilities
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
                activePowerUps: []
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
            window.addEventListener('resize', () => {
                this.settings.canvas.width = window.innerWidth;
                this.settings.canvas.height = window.innerHeight;
                if (this.$app.classList.contains('game-in-progress')) {
                    this.resetCanvas();
                    this.drawSnake();
                    if (this.food.active) {
                        this.drawFood();
                    }
                }
            });
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
            const x = 300;
            const y = 300;

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

            this.$activePowerups.innerHTML = '';
            this.resetCanvas();
        }

        startGame() {
            // Reset the start screen text back to "Choose Difficulty"
            this.$startScreen.querySelector('.options h3').innerText = 'Choose Difficulty';
            this.$startScreen.querySelector('.options .end-score').innerText = '';

            // FIXED: Remove any inline display style to let CSS handle visibility
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

            // Remove any existing keydown event listener to prevent duplicates
            document.removeEventListener('keydown', this.handleKeyPress.bind(this));

            // Add keydown event listener
            document.addEventListener('keydown', (event) => {
                this.handleKeyPress(event.keyCode);
            });

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

        handleKeyPress(keyCode) {
            if (keyCode === 32 || keyCode === 80) {
                this.togglePause();
                return;
            }

            if (!this.game.isPaused) {
                this.changeDirection(keyCode);
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
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.$canvas.width, this.$canvas.height);

            this.ctx.fillStyle = '#ff76ff';
            this.ctx.font = 'bold 60px "Press Start 2P"';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.shadowColor = 'rgba(255, 118, 255, 0.5)';
            this.ctx.shadowBlur = 20;

            const centerX = this.$canvas.width / 2;
            const centerY = this.$canvas.height / 2;

            this.ctx.fillText('PAUSED', centerX, centerY - 40);

            this.ctx.font = '20px "Press Start 2P"';
            this.ctx.fillStyle = '#fac020';
            this.ctx.fillText('Press SPACE or P to resume', centerX, centerY + 40);

            this.ctx.shadowBlur = 0;
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
            this.$canvas.width = this.settings.canvas.width;
            this.$canvas.height = this.settings.canvas.height;

            // Create forest-themed background gradient
            const gradient = this.ctx.createLinearGradient(
                0, 0, this.$canvas.width, this.$canvas.height
            );
            gradient.addColorStop(0, '#1a3a1a');
            gradient.addColorStop(0.5, '#0f2a0f');
            gradient.addColorStop(1, '#1a3a1a');

            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.$canvas.width, this.$canvas.height);

            // Add subtle forest floor texture
            this.drawForestFloor();
        }

        drawForestFloor() {
            // Draw subtle forest floor pattern (grass/leaves)
            const gridSize = this.settings.snake.size;

            this.ctx.strokeStyle = 'rgba(74, 124, 74, 0.05)';
            this.ctx.lineWidth = 0.5;

            // Vertical lines
            for (let x = 0; x <= this.$canvas.width; x += gridSize) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, this.$canvas.height);
                this.ctx.stroke();
            }

            // Horizontal lines
            for (let y = 0; y <= this.$canvas.height; y += gridSize) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(this.$canvas.width, y);
                this.ctx.stroke();
            }

            // Add some random "grass" dots
            this.ctx.fillStyle = 'rgba(74, 124, 74, 0.1)';
            for (let i = 0; i < 50; i++) {
                const x = Math.random() * this.$canvas.width;
                const y = Math.random() * this.$canvas.height;
                const size = Math.random() * 2;

                this.ctx.beginPath();
                this.ctx.arc(x, y, size, 0, Math.PI * 2);
                this.ctx.fill();
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
                switch (type) {
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
            const headSize = size * 1.1;

            if (this.game.invincible) {
                this.ctx.fillStyle = '#ffd700';
                this.ctx.shadowColor = 'rgba(255, 215, 0, 0.7)';
                this.ctx.shadowBlur = 15;
            } else {
                // Snake color gradient
                const snakeGradient = this.ctx.createLinearGradient(
                    0, 0, this.$canvas.width, this.$canvas.height
                );
                snakeGradient.addColorStop(0, '#fac020');
                snakeGradient.addColorStop(1, '#ff9a00');
                this.ctx.fillStyle = snakeGradient;
                this.ctx.shadowColor = 'rgba(250, 192, 32, 0.45)';
                this.ctx.shadowBlur = 20;
            }

            // Draw snake body with rounded segments
            for (let i = 0; i < this.snake.length; i++) {
                const segment = this.snake[i];
                const isHead = i === 0;
                const segmentSize = isHead ? headSize : size;

                // Create gradient for each segment
                const segmentGradient = this.ctx.createRadialGradient(
                    segment.x + segmentSize / 2, segment.y + segmentSize / 2, 0,
                    segment.x + segmentSize / 2, segment.y + segmentSize / 2, segmentSize / 2
                );

                if (isHead) {
                    // Head gradient (darker)
                    segmentGradient.addColorStop(0, '#ffcc00');
                    segmentGradient.addColorStop(0.7, '#ff9900');
                    segmentGradient.addColorStop(1, '#cc6600');
                } else {
                    // Body gradient (lighter towards tail)
                    const intensity = 1 - (i / this.snake.length) * 0.4;
                    segmentGradient.addColorStop(0, `rgba(255, 204, 0, ${intensity})`);
                    segmentGradient.addColorStop(1, `rgba(255, 153, 0, ${intensity})`);
                }

                this.ctx.fillStyle = segmentGradient;

                // Draw rounded segment
                this.drawRoundedSegment(segment.x, segment.y, segmentSize, isHead);

                // Draw scales on body (not on head)
                if (!isHead && i % 2 === 0 && !this.game.invincible) {
                    this.drawSnakeScales(segment.x, segment.y, segmentSize);
                }
            }

            // Draw snake head details
            if (!this.game.invincible) {
                this.drawSnakeHead();
            }

            this.ctx.shadowBlur = 0;
            this.game.direction = this.game.nextDirection;
        }

        drawRoundedSegment(x, y, size, isHead) {
            this.ctx.beginPath();

            if (isHead) {
                // Draw head as a more rounded shape
                const radius = size / 2;
                this.ctx.roundRect(x, y, size, size, radius * 1.2);
            } else {
                // Draw body segments with slight rounding
                const radius = size / 4;
                this.ctx.roundRect(x, y, size, size, radius);
            }

            this.ctx.fill();
        }

        drawSnakeScales(x, y, size) {
            const scaleSize = size / 4;
            const scaleSpacing = scaleSize * 1.5;

            // Draw 3 scales on each segment
            for (let i = 0; i < 3; i++) {
                const scaleX = x + (i + 1) * scaleSpacing;
                const scaleY = y + size / 2;

                this.ctx.fillStyle = 'rgba(255, 221, 102, 0.6)';
                this.ctx.beginPath();
                this.ctx.ellipse(scaleX, scaleY, scaleSize / 2, scaleSize / 3, 0, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        drawSnakeHead() {
            const head = this.snake[0];
            const headSize = this.settings.snake.size * 1.1;

            // Draw eyes
            this.ctx.fillStyle = 'white';

            // Position eyes based on direction
            let eye1X, eye1Y, eye2X, eye2Y;
            const eyeOffset = headSize * 0.2;
            const eyeSize = headSize * 0.12;

            switch (this.game.direction) {
                case 'right':
                    eye1X = head.x + headSize * 0.7;
                    eye1Y = head.y + headSize * 0.3;
                    eye2X = head.x + headSize * 0.7;
                    eye2Y = head.y + headSize * 0.7;
                    break;
                case 'left':
                    eye1X = head.x + headSize * 0.3;
                    eye1Y = head.y + headSize * 0.3;
                    eye2X = head.x + headSize * 0.3;
                    eye2Y = head.y + headSize * 0.7;
                    break;
                case 'up':
                    eye1X = head.x + headSize * 0.3;
                    eye1Y = head.y + headSize * 0.3;
                    eye2X = head.x + headSize * 0.7;
                    eye2Y = head.y + headSize * 0.3;
                    break;
                case 'down':
                    eye1X = head.x + headSize * 0.3;
                    eye1Y = head.y + headSize * 0.7;
                    eye2X = head.x + headSize * 0.7;
                    eye2Y = head.y + headSize * 0.7;
                    break;
            }

            // Draw eye whites
            this.ctx.beginPath();
            this.ctx.arc(eye1X, eye1Y, eyeSize, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.beginPath();
            this.ctx.arc(eye2X, eye2Y, eyeSize, 0, Math.PI * 2);
            this.ctx.fill();

            // Draw pupils
            this.ctx.fillStyle = '#333';
            const pupilSize = eyeSize * 0.6;

            this.ctx.beginPath();
            this.ctx.arc(eye1X, eye1Y, pupilSize, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.beginPath();
            this.ctx.arc(eye2X, eye2Y, pupilSize, 0, Math.PI * 2);
            this.ctx.fill();

            // Draw tongue (when moving right/left)
            if (this.game.direction === 'right' || this.game.direction === 'left') {
                this.ctx.strokeStyle = '#ff3366';
                this.ctx.lineWidth = 2;
                this.ctx.lineCap = 'round';

                const tongueStartX = this.game.direction === 'right'
                    ? head.x + headSize
                    : head.x;
                const tongueStartY = head.y + headSize * 0.5;

                this.ctx.beginPath();
                this.ctx.moveTo(tongueStartX, tongueStartY);

                const tongueLength = headSize * 0.4;
                const tongueEndX = this.game.direction === 'right'
                    ? tongueStartX + tongueLength
                    : tongueStartX - tongueLength;

                // Draw forked tongue
                this.ctx.lineTo(tongueEndX, tongueStartY - headSize * 0.1);
                this.ctx.moveTo(tongueStartX, tongueStartY);
                this.ctx.lineTo(tongueEndX, tongueStartY + headSize * 0.1);
                this.ctx.stroke();
            }
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
                // Draw power-up as a diamond shape
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

            document.removeEventListener('keydown', this.handleKeyPress.bind(this));

            this.$app.classList.remove('game-in-progress');
            this.$app.classList.add('game-over');

            // FIXED: Don't set inline display style here
            // Just update the text, the CSS will handle visibility
            this.$startScreen.querySelector('.options h3').innerText = 'Game Over';
            this.$startScreen.querySelector('.options .end-score').innerText = `Final Score: ${this.game.score}`;

            this.setUpGame();
        }
    }

    const snakeGame = new SnakeGame();
});