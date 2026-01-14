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
            
            // Initialize settings
            this.updateCanvasSize();
            
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

            // Load high score from localStorage
            this.highScore = localStorage.getItem('snakeHighScore') || 0;
            
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
                keysPressed: {},
                animationFrame: 0,
                // New properties for food system
                snakeColor: '#fac020', // Default snake color
                lastPowerUpTime: 0, // When last power-up food was generated
                powerUpFoodTimer: 0, // Timer for power-up food expiration
                specialFoodInterval: 25000, // Reduced from 60000 to 25000 (25 seconds)
                specialFoodDuration: 15000, // Stays for 15 seconds
                firstSpecialDelay: 5000, // First special food appears after 5 seconds
                newHighScore: false // Flag for new high score
            };

            this.setUpGame();
            this.init();
        }

        updateCanvasSize() {
            const isMobile = window.innerWidth < 768;
            const isSmallMobile = window.innerWidth < 480;
            
            if (isSmallMobile) {
                this.settings = {
                    canvas: {
                        width: 350,
                        height: 262,
                        background: '#1a3a1a'
                    },
                    snake: {
                        size: 14,
                        background: '#fac020'
                    }
                };
            } else if (isMobile) {
                this.settings = {
                    canvas: {
                        width: 600,
                        height: 450,
                        background: '#1a3a1a'
                    },
                    snake: {
                        size: 20,
                        background: '#fac020'
                    }
                };
            } else {
                this.settings = {
                    canvas: {
                        width: 800,
                        height: 600,
                        background: '#1a3a1a'
                    },
                    snake: {
                        size: 20,
                        background: '#fac020'
                    }
                };
            }
            
            this.$canvas.width = this.settings.canvas.width;
            this.$canvas.height = this.settings.canvas.height;
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
            
            // Update high score display on start screen
            this.updateHighScoreDisplay();
        }

        handleResize() {
            this.updateCanvasSize();
            
            if (this.$app.classList.contains('game-in-progress')) {
                this.resetCanvas();
                this.drawSnake();
                if (this.food.active) {
                    this.drawFood();
                }
                if (this.specialFood.active) {
                    this.drawSpecialFood();
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

        updateHighScoreDisplay() {
            // Create or update high score display in start screen
            let $highScoreDisplay = this.$startScreen.querySelector('.high-score-display');
            
            if (!$highScoreDisplay) {
                $highScoreDisplay = document.createElement('div');
                $highScoreDisplay.className = 'high-score-display';
                this.$startScreen.querySelector('.options').insertBefore($highScoreDisplay, this.$startScreen.querySelector('.options h3'));
            }
            
            $highScoreDisplay.innerHTML = `
                <div class="high-score-container">
                    <div class="high-score-label">🏆 HIGH SCORE</div>
                    <div class="high-score-value">${this.highScore}</div>
                </div>
            `;
        }

        setUpGame() {
            // Calculate starting position based on canvas size
            const gridSize = this.settings.snake.size;
            const x = Math.floor(this.settings.canvas.width / 2 / gridSize) * gridSize;
            const y = Math.floor(this.settings.canvas.height / 2 / gridSize) * gridSize;

            this.snake = [
                { x: x, y: y },
                { x: x - gridSize, y: y },
                { x: x - (gridSize * 2), y: y },
                { x: x - (gridSize * 3), y: y },
                { x: x - (gridSize * 4), y: y }
            ];

            // Regular food (always present)
            this.food = {
                active: false,
                color: '#f8a2ff',
                coordinates: {
                    x: 0,
                    y: 0
                }
            };

            // Special power-up food (appears periodically)
            this.specialFood = {
                active: false,
                type: null,
                color: null,
                coordinates: {
                    x: 0,
                    y: 0
                },
                spawnTime: 0
            };

            this.game.score = 0;
            this.game.direction = 'right';
            this.game.nextDirection = 'right';
            this.game.isPaused = false;
            this.game.scoreMultiplier = 1;
            this.game.invincible = false;
            this.game.activePowerUps = [];
            this.game.keysPressed = {};
            this.game.animationFrame = 0;
            this.game.snakeColor = '#fac020'; // Reset to default
            this.game.lastPowerUpTime = 0;
            this.game.powerUpFoodTimer = 0;
            this.game.newHighScore = false;
            
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
            this.game.newHighScore = false;

            // Clear any existing interval
            if (this.gameLoop) {
                cancelAnimationFrame(this.gameLoop);
            }
            if (this.gameInterval) {
                clearInterval(this.gameInterval);
            }
            if (this.powerUpFoodInterval) {
                clearInterval(this.powerUpFoodInterval);
            }

            // Add keydown event listener
            document.addEventListener('keydown', this.handleKeyDown);

            // Start game loop
            this.lastUpdate = Date.now();
            this.gameLoop = requestAnimationFrame(() => this.update());
            
            // Start game interval for movement
            this.gameInterval = setInterval(() => {
                if (!this.game.isPaused) {
                    this.updatePowerUps();
                    if (!this.detectCollision()) {
                        this.moveSnake();
                    } else {
                        this.endGame();
                    }
                }
            }, this.game.speed);
            
            // Start power-up food timer - FIRST one appears after 5 seconds
            this.game.lastPowerUpTime = Date.now();
            setTimeout(() => {
                if (!this.game.isPaused && this.$app.classList.contains('game-in-progress')) {
                    this.generateSpecialFood();
                }
            }, this.game.firstSpecialDelay);
            
            // Then every 25 seconds
            this.powerUpFoodInterval = setInterval(() => {
                if (!this.game.isPaused && this.$app.classList.contains('game-in-progress')) {
                    this.generateSpecialFood();
                }
            }, this.game.specialFoodInterval);
            
            // Generate initial regular food
            this.generateFood();
        }

        update() {
            const now = Date.now();
            const delta = now - this.lastUpdate;
            this.lastUpdate = now;
            this.game.animationFrame += delta * 0.05; // For smooth animation
            
            // Check if special food should expire (15 seconds)
            if (this.specialFood.active && now - this.specialFood.spawnTime > this.game.specialFoodDuration) {
                this.specialFood.active = false;
                this.game.powerUpFoodTimer = 0;
            } else if (this.specialFood.active) {
                this.game.powerUpFoodTimer = Math.max(0, Math.ceil((this.game.specialFoodDuration - (now - this.specialFood.spawnTime)) / 1000));
            }
            
            if (!this.game.isPaused) {
                this.resetCanvas();
                this.drawSnake();
                if (this.food.active) {
                    this.drawFood();
                }
                if (this.specialFood.active) {
                    this.drawSpecialFood();
                }
            }
            
            this.gameLoop = requestAnimationFrame(() => this.update());
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
                this.removePauseOverlay();
                this.lastUpdate = Date.now(); // Reset timing for smooth animation
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
                this.$canvas.parentNode.appendChild($pauseOverlay);
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
            
            // Draw subtle grid pattern
            this.ctx.strokeStyle = 'rgba(74, 124, 74, 0.1)';
            this.ctx.lineWidth = 1;
            const gridSize = this.settings.snake.size;
            
            // Draw vertical lines
            for (let x = 0; x <= this.$canvas.width; x += gridSize) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, this.$canvas.height);
                this.ctx.stroke();
            }
            
            // Draw horizontal lines
            for (let y = 0; y <= this.$canvas.height; y += gridSize) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(this.$canvas.width, y);
                this.ctx.stroke();
            }
        }

        moveSnake() {
            let coordinate;

            switch (this.game.nextDirection) {
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

            const head = this.snake[0];
            const regularFood = this.food.coordinates;
            const specialFood = this.specialFood.coordinates;

            const ateRegularFood = head.x === regularFood.x && head.y === regularFood.y;
            const ateSpecialFood = this.specialFood.active && head.x === specialFood.x && head.y === specialFood.y;

            if (ateRegularFood) {
                this.food.active = false;

                const points = 10 * this.game.scoreMultiplier;
                this.game.score += points;
                this.$score.innerText = this.game.score;
                this.playSound('score');
                
                // Change snake color to regular food color
                this.game.snakeColor = this.food.color;
                
                // Check for high score during gameplay
                if (this.game.score > this.highScore && !this.game.newHighScore) {
                    this.game.newHighScore = true;
                    this.flashHighScore();
                }
                
                this.generateFood();
            } else if (ateSpecialFood) {
                this.specialFood.active = false;
                this.game.powerUpFoodTimer = 0;

                const points = 20 * this.game.scoreMultiplier;
                this.game.score += points;
                this.$score.innerText = this.game.score;
                
                // Change snake color to special food color
                this.game.snakeColor = this.specialFood.color;
                
                // Check for high score during gameplay
                if (this.game.score > this.highScore && !this.game.newHighScore) {
                    this.game.newHighScore = true;
                    this.flashHighScore();
                }
                
                this.applyPowerUp(this.specialFood.type);
                this.playSound('powerUp');
            } else {
                this.snake.pop();
            }

            if (!this.food.active) {
                this.generateFood();
            }
            
            this.game.direction = this.game.nextDirection;
        }

        // Flash effect when new high score is achieved
        flashHighScore() {
            const $score = this.$score;
            let flashCount = 0;
            const maxFlashes = 6;
            
            const flashInterval = setInterval(() => {
                if (flashCount >= maxFlashes) {
                    clearInterval(flashInterval);
                    $score.style.backgroundColor = 'rgba(42, 90, 42, 0.9)';
                    $score.style.color = '#ffd700';
                    return;
                }
                
                if (flashCount % 2 === 0) {
                    $score.style.backgroundColor = '#ffd700';
                    $score.style.color = '#1a3a1a';
                } else {
                    $score.style.backgroundColor = 'rgba(42, 90, 42, 0.9)';
                    $score.style.color = '#ffd700';
                }
                
                flashCount++;
            }, 200);
        }

        // DRAGON-STYLE SNAKE DRAWING
        drawSnake() {
            const size = this.settings.snake.size;
            const animationFrame = this.game.animationFrame;
            
            // Parse the snake color
            let snakePrimaryColor = this.game.snakeColor;
            let snakeSecondaryColor = this.game.snakeColor;
            
            // Calculate darker and lighter versions for gradient
            const colorMatch = snakePrimaryColor.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
            if (colorMatch) {
                const r = parseInt(colorMatch[1], 16);
                const g = parseInt(colorMatch[2], 16);
                const b = parseInt(colorMatch[3], 16);
                
                // Create darker version for secondary color
                const darkR = Math.max(0, r - 40);
                const darkG = Math.max(0, g - 40);
                const darkB = Math.max(0, b - 40);
                snakeSecondaryColor = `rgb(${darkR}, ${darkG}, ${darkB})`;
                
                // Create lighter version for accent
                const lightR = Math.min(255, r + 50);
                const lightG = Math.min(255, g + 50);
                const lightB = Math.min(255, b + 50);
                const snakeAccentColor = `rgb(${lightR}, ${lightG}, ${lightB})`;
                
                // Draw dragon body with animation
                for (let i = 0; i < this.snake.length; i++) {
                    const segment = this.snake[i];
                    const isHead = i === 0;
                    const isTail = i === this.snake.length - 1;
                    
                    if (this.game.invincible) {
                        // Golden dragon when invincible
                        const pulse = Math.sin(animationFrame * 0.1) * 0.3 + 0.7;
                        const primaryColor = `rgb(${Math.floor(255 * pulse)}, ${Math.floor(215 * pulse)}, 0)`;
                        const secondaryColor = `rgb(${Math.floor(200 * pulse)}, ${Math.floor(180 * pulse)}, 0)`;
                        const accentColor = `rgb(${Math.floor(255 * pulse)}, ${Math.floor(230 * pulse)}, 100)`;
                        
                        if (isHead) {
                            this.drawDragonHead(segment.x, segment.y, size, primaryColor, secondaryColor, accentColor);
                        } else if (isTail) {
                            this.drawDragonTail(segment.x, segment.y, size, primaryColor, secondaryColor);
                        } else {
                            this.drawDragonBody(segment.x, segment.y, size, i, primaryColor, secondaryColor, animationFrame);
                        }
                    } else {
                        // Use snake color with gradient
                        const t = i / this.snake.length;
                        const currentR = Math.floor(r * (1 - t) + darkR * t);
                        const currentG = Math.floor(g * (1 - t) + darkG * t);
                        const currentB = Math.floor(b * (1 - t) + darkB * t);
                        
                        const primaryColor = `rgb(${currentR}, ${currentG}, ${currentB})`;
                        const secondaryColor = `rgb(${Math.max(0, currentR - 30)}, ${Math.max(0, currentG - 30)}, ${Math.max(0, currentB - 10)})`;
                        const accentColor = `rgb(${Math.min(255, currentR + 50)}, ${Math.min(255, currentG + 50)}, ${currentB})`;
                        
                        if (isHead) {
                            this.drawDragonHead(segment.x, segment.y, size, primaryColor, secondaryColor, accentColor);
                        } else if (isTail) {
                            this.drawDragonTail(segment.x, segment.y, size, primaryColor, secondaryColor);
                        } else {
                            this.drawDragonBody(segment.x, segment.y, size, i, primaryColor, secondaryColor, animationFrame);
                        }
                    }
                }
            }
        }

        drawDragonHead(x, y, size, primaryColor, secondaryColor, accentColor) {
            this.ctx.save();
            
            // Draw dragon head (larger than body segments)
            const headSize = size * 1.2;
            const headX = x - (headSize - size) / 2;
            const headY = y - (headSize - size) / 2;
            
            // Dragon head shape (diamond-like for dragon feel)
            this.ctx.fillStyle = primaryColor;
            
            // Main head shape - diamond
            this.ctx.beginPath();
            this.ctx.moveTo(headX + headSize/2, headY);
            this.ctx.lineTo(headX + headSize, headY + headSize/2);
            this.ctx.lineTo(headX + headSize/2, headY + headSize);
            this.ctx.lineTo(headX, headY + headSize/2);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Add dragon scales on head
            this.ctx.fillStyle = secondaryColor;
            for (let i = 0; i < 3; i++) {
                const scaleX = headX + headSize/2;
                const scaleY = headY + headSize/3 + (i * headSize/6);
                const scaleSize = headSize/8;
                
                this.ctx.beginPath();
                this.ctx.ellipse(scaleX, scaleY, scaleSize, scaleSize * 0.7, 0, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // Dragon eyes
            const eyeSize = size / 4;
            this.ctx.fillStyle = '#FFFFFF';
            
            switch(this.game.direction) {
                case 'right':
                    this.ctx.beginPath();
                    this.ctx.arc(headX + headSize - eyeSize, headY + headSize/3, eyeSize, 0, Math.PI * 2);
                    this.ctx.arc(headX + headSize - eyeSize, headY + 2*headSize/3, eyeSize, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // Eye pupils
                    this.ctx.fillStyle = '#000000';
                    this.ctx.beginPath();
                    this.ctx.arc(headX + headSize - eyeSize/2, headY + headSize/3, eyeSize/2, 0, Math.PI * 2);
                    this.ctx.arc(headX + headSize - eyeSize/2, headY + 2*headSize/3, eyeSize/2, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // Dragon horns
                    this.ctx.fillStyle = accentColor;
                    this.ctx.beginPath();
                    // Top horn
                    this.ctx.moveTo(headX + headSize/2, headY);
                    this.ctx.lineTo(headX + headSize/2 - size/3, headY - size/2);
                    this.ctx.lineTo(headX + headSize/2 + size/3, headY - size/4);
                    this.ctx.closePath();
                    this.ctx.fill();
                    
                    // Bottom horn
                    this.ctx.beginPath();
                    this.ctx.moveTo(headX + headSize/2, headY + headSize);
                    this.ctx.lineTo(headX + headSize/2 - size/3, headY + headSize + size/2);
                    this.ctx.lineTo(headX + headSize/2 + size/3, headY + headSize + size/4);
                    this.ctx.closePath();
                    this.ctx.fill();
                    break;
                    
                case 'left':
                    this.ctx.beginPath();
                    this.ctx.arc(headX + eyeSize, headY + headSize/3, eyeSize, 0, Math.PI * 2);
                    this.ctx.arc(headX + eyeSize, headY + 2*headSize/3, eyeSize, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    this.ctx.fillStyle = '#000000';
                    this.ctx.beginPath();
                    this.ctx.arc(headX + eyeSize*1.5, headY + headSize/3, eyeSize/2, 0, Math.PI * 2);
                    this.ctx.arc(headX + eyeSize*1.5, headY + 2*headSize/3, eyeSize/2, 0, Math.PI * 2);
                    this.ctx.fill();
                    break;
                    
                case 'up':
                    this.ctx.beginPath();
                    this.ctx.arc(headX + headSize/3, headY + eyeSize, eyeSize, 0, Math.PI * 2);
                    this.ctx.arc(headX + 2*headSize/3, headY + eyeSize, eyeSize, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    this.ctx.fillStyle = '#000000';
                    this.ctx.beginPath();
                    this.ctx.arc(headX + headSize/3, headY + eyeSize*1.5, eyeSize/2, 0, Math.PI * 2);
                    this.ctx.arc(headX + 2*headSize/3, headY + eyeSize*1.5, eyeSize/2, 0, Math.PI * 2);
                    this.ctx.fill();
                    break;
                    
                case 'down':
                    this.ctx.beginPath();
                    this.ctx.arc(headX + headSize/3, headY + headSize - eyeSize, eyeSize, 0, Math.PI * 2);
                    this.ctx.arc(headX + 2*headSize/3, headY + headSize - eyeSize, eyeSize, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    this.ctx.fillStyle = '#000000';
                    this.ctx.beginPath();
                    this.ctx.arc(headX + headSize/3, headY + headSize - eyeSize*1.5, eyeSize/2, 0, Math.PI * 2);
                    this.ctx.arc(headX + 2*headSize/3, headY + headSize - eyeSize*1.5, eyeSize/2, 0, Math.PI * 2);
                    this.ctx.fill();
                    break;
            }
            
            // Dragon mouth
            this.ctx.strokeStyle = '#8B0000';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            
            switch(this.game.direction) {
                case 'right':
                    this.ctx.moveTo(headX + headSize, headY + headSize/2);
                    this.ctx.lineTo(headX + headSize + size/3, headY + headSize/2);
                    break;
                case 'left':
                    this.ctx.moveTo(headX, headY + headSize/2);
                    this.ctx.lineTo(headX - size/3, headY + headSize/2);
                    break;
                case 'up':
                    this.ctx.moveTo(headX + headSize/2, headY);
                    this.ctx.lineTo(headX + headSize/2, headY - size/3);
                    break;
                case 'down':
                    this.ctx.moveTo(headX + headSize/2, headY + headSize);
                    this.ctx.lineTo(headX + headSize/2, headY + headSize + size/3);
                    break;
            }
            this.ctx.stroke();
            
            this.ctx.restore();
        }

        drawDragonBody(x, y, size, segmentIndex, primaryColor, secondaryColor, animationFrame) {
            this.ctx.save();
            
            // Make body segments wider for dragon look
            const bodyWidth = size * 1.1;
            const bodyHeight = size * 0.9;
            const offsetX = (size - bodyWidth) / 2;
            const offsetY = (size - bodyHeight) / 2;
            
            // Main body segment with rounded corners
            this.ctx.fillStyle = primaryColor;
            this.ctx.beginPath();
            this.ctx.roundRect(x + offsetX, y + offsetY, bodyWidth, bodyHeight, size/4);
            this.ctx.fill();
            
            // Dragon scales pattern
            this.ctx.fillStyle = secondaryColor;
            const scaleCount = 3;
            const scaleSpacing = bodyHeight / (scaleCount + 1);
            
            for (let i = 1; i <= scaleCount; i++) {
                const scaleY = y + offsetY + (i * scaleSpacing);
                const scaleWidth = bodyWidth * 0.7;
                const scaleHeight = scaleSpacing * 0.5;
                const scaleX = x + offsetX + (bodyWidth - scaleWidth) / 2;
                
                // Animate scales with slight movement
                const scaleOffset = Math.sin(animationFrame * 0.1 + segmentIndex * 0.5) * 2;
                
                // Draw individual scale
                this.ctx.beginPath();
                this.ctx.ellipse(
                    scaleX + scaleWidth/2 + scaleOffset,
                    scaleY,
                    scaleWidth/2,
                    scaleHeight,
                    0, 0, Math.PI * 2
                );
                this.ctx.fill();
                
                // Add scale highlight
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                this.ctx.beginPath();
                this.ctx.ellipse(
                    scaleX + scaleWidth/3 + scaleOffset,
                    scaleY - scaleHeight/4,
                    scaleWidth/6,
                    scaleHeight/3,
                    0, 0, Math.PI * 2
                );
                this.ctx.fill();
                this.ctx.fillStyle = secondaryColor;
            }
            
            // Dragon spine/spikes
            this.ctx.fillStyle = '#8B4513'; // Brown spikes
            const spikeCount = 3;
            const spikeWidth = bodyWidth / 6;
            const spikeHeight = bodyHeight * 0.4;
            const spikeSpacing = bodyWidth / (spikeCount + 1);
            
            for (let i = 1; i <= spikeCount; i++) {
                const spikeX = x + offsetX + (i * spikeSpacing);
                
                this.ctx.beginPath();
                this.ctx.moveTo(spikeX, y + offsetY - spikeHeight/3);
                this.ctx.lineTo(spikeX - spikeWidth/2, y + offsetY + spikeHeight/3);
                this.ctx.lineTo(spikeX + spikeWidth/2, y + offsetY + spikeHeight/3);
                this.ctx.closePath();
                this.ctx.fill();
            }
            
            this.ctx.restore();
        }

        drawDragonTail(x, y, size, primaryColor, secondaryColor) {
            this.ctx.save();
            
            // Dragon tail - tapered and spiked
            const tailWidth = size * 0.8;
            const tailHeight = size * 0.8;
            const offsetX = (size - tailWidth) / 2;
            const offsetY = (size - tailHeight) / 2;
            
            // Main tail shape
            this.ctx.fillStyle = primaryColor;
            this.ctx.beginPath();
            
            switch(this.game.direction) {
                case 'right':
                    this.ctx.moveTo(x + offsetX, y + offsetY);
                    this.ctx.lineTo(x + offsetX + tailWidth, y + offsetY + tailHeight/2);
                    this.ctx.lineTo(x + offsetX, y + offsetY + tailHeight);
                    break;
                case 'left':
                    this.ctx.moveTo(x + offsetX + tailWidth, y + offsetY);
                    this.ctx.lineTo(x + offsetX, y + offsetY + tailHeight/2);
                    this.ctx.lineTo(x + offsetX + tailWidth, y + offsetY + tailHeight);
                    break;
                case 'up':
                    this.ctx.moveTo(x + offsetX, y + offsetY + tailHeight);
                    this.ctx.lineTo(x + offsetX + tailWidth/2, y + offsetY);
                    this.ctx.lineTo(x + offsetX + tailWidth, y + offsetY + tailHeight);
                    break;
                case 'down':
                    this.ctx.moveTo(x + offsetX, y + offsetY);
                    this.ctx.lineTo(x + offsetX + tailWidth/2, y + offsetY + tailHeight);
                    this.ctx.lineTo(x + offsetX + tailWidth, y + offsetY);
                    break;
            }
            
            this.ctx.closePath();
            this.ctx.fill();
            
            // Tail tip/spade
            const tipSize = size / 3;
            this.ctx.fillStyle = '#8B0000'; // Dark red for tail tip
            
            switch(this.game.direction) {
                case 'right':
                    this.ctx.beginPath();
                    this.ctx.moveTo(x + offsetX + tailWidth, y + offsetY + tailHeight/2);
                    this.ctx.lineTo(x + offsetX + tailWidth + tipSize, y + offsetY + tailHeight/4);
                    this.ctx.lineTo(x + offsetX + tailWidth + tipSize, y + offsetY + 3*tailHeight/4);
                    this.ctx.closePath();
                    break;
                case 'left':
                    this.ctx.beginPath();
                    this.ctx.moveTo(x + offsetX, y + offsetY + tailHeight/2);
                    this.ctx.lineTo(x + offsetX - tipSize, y + offsetY + tailHeight/4);
                    this.ctx.lineTo(x + offsetX - tipSize, y + offsetY + 3*tailHeight/4);
                    this.ctx.closePath();
                    break;
                case 'up':
                    this.ctx.beginPath();
                    this.ctx.moveTo(x + offsetX + tailWidth/2, y + offsetY);
                    this.ctx.lineTo(x + offsetX + tailWidth/4, y + offsetY - tipSize);
                    this.ctx.lineTo(x + offsetX + 3*tailWidth/4, y + offsetY - tipSize);
                    this.ctx.closePath();
                    break;
                case 'down':
                    this.ctx.beginPath();
                    this.ctx.moveTo(x + offsetX + tailWidth/2, y + offsetY + tailHeight);
                    this.ctx.lineTo(x + offsetX + tailWidth/4, y + offsetY + tailHeight + tipSize);
                    this.ctx.lineTo(x + offsetX + 3*tailWidth/4, y + offsetY + tailHeight + tipSize);
                    this.ctx.closePath();
                    break;
            }
            
            this.ctx.fill();
            
            this.ctx.restore();
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

        generateFood() {
            const gridSize = this.settings.snake.size;
            const xMax = this.settings.canvas.width - gridSize;
            const yMax = this.settings.canvas.height - gridSize;

            const x = Math.round((Math.random() * xMax) / gridSize) * gridSize;
            const y = Math.round((Math.random() * yMax) / gridSize) * gridSize;

            // Check for collision with snake
            let conflict = false;
            for (const segment of this.snake) {
                if (segment.x === x && segment.y === y) {
                    conflict = true;
                    break;
                }
            }

            // Check for collision with special food
            if (this.specialFood.active) {
                if (this.specialFood.coordinates.x === x && this.specialFood.coordinates.y === y) {
                    conflict = true;
                }
            }

            if (conflict) {
                this.generateFood();
                return;
            }

            this.food.active = true;
            this.food.color = '#f8a2ff';
            this.food.coordinates.x = x;
            this.food.coordinates.y = y;
        }

        generateSpecialFood() {
            if (this.specialFood.active) return; // Don't generate if one is already active
            
            const gridSize = this.settings.snake.size;
            const xMax = this.settings.canvas.width - gridSize;
            const yMax = this.settings.canvas.height - gridSize;

            const x = Math.round((Math.random() * xMax) / gridSize) * gridSize;
            const y = Math.round((Math.random() * yMax) / gridSize) * gridSize;

            // Check for collision with snake
            let conflict = false;
            for (const segment of this.snake) {
                if (segment.x === x && segment.y === y) {
                    conflict = true;
                    break;
                }
            }

            // Check for collision with regular food
            if (this.food.active) {
                if (this.food.coordinates.x === x && this.food.coordinates.y === y) {
                    conflict = true;
                }
            }

            if (conflict) {
                this.generateSpecialFood();
                return;
            }

            // Randomly select a power-up type based on probabilities
            const powerUpRand = Math.random();
            let cumulative = 0;
            let selectedType = null;

            for (const [type, powerUp] of Object.entries(this.powerUps)) {
                cumulative += powerUp.probability;
                if (powerUpRand <= cumulative) {
                    selectedType = type;
                    break;
                }
            }

            if (!selectedType) {
                selectedType = 'doublePoints'; // Default fallback
            }

            const powerUp = this.powerUps[selectedType];
            
            this.specialFood.active = true;
            this.specialFood.type = selectedType;
            this.specialFood.color = powerUp.color;
            this.specialFood.coordinates.x = x;
            this.specialFood.coordinates.y = y;
            this.specialFood.spawnTime = Date.now();
        }

        drawFood() {
            const size = this.settings.snake.size;
            const x = this.food.coordinates.x;
            const y = this.food.coordinates.y;
            const animationFrame = this.game.animationFrame;

            // Animate food with pulsing effect
            const pulse = Math.sin(animationFrame * 0.2) * 0.2 + 0.8;

            // Draw regular food as apple with shine
            this.ctx.shadowColor = 'rgba(248, 162, 255, .35)';
            this.ctx.shadowBlur = 20;
            this.ctx.fillStyle = this.food.color;
            
            // Apple body
            this.ctx.beginPath();
            this.ctx.ellipse(x + size/2, y + size/2, size/2 * pulse, size/2 * pulse, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Apple shine
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.beginPath();
            this.ctx.ellipse(x + size/3, y + size/3, size/6, size/8, Math.PI/4, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Apple stem
            this.ctx.fillStyle = '#8b4513';
            this.ctx.fillRect(x + size/2 - 1, y, 2, size/4);

            this.ctx.shadowBlur = 0;
        }

        drawSpecialFood() {
            const size = this.settings.snake.size;
            const x = this.specialFood.coordinates.x;
            const y = this.specialFood.coordinates.y;
            const animationFrame = this.game.animationFrame;

            // Animate food with pulsing effect
            const pulse = Math.sin(animationFrame * 0.2) * 0.2 + 0.8;

            // Draw special power-up food as diamond with glow
            this.ctx.shadowColor = this.specialFood.color + '80';
            this.ctx.shadowBlur = 15;
            this.ctx.fillStyle = this.specialFood.color;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x + size/2, y);
            this.ctx.lineTo(x + size, y + size/2);
            this.ctx.lineTo(x + size/2, y + size);
            this.ctx.lineTo(x, y + size/2);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Add inner shine
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.beginPath();
            this.ctx.ellipse(x + size/2, y + size/3, size/6 * pulse, size/8 * pulse, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw timer countdown (15 seconds)
            if (this.game.powerUpFoodTimer > 0) {
                this.ctx.fillStyle = '#FFFFFF';
                this.ctx.font = 'bold 12px "Press Start 2P"';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(this.game.powerUpFoodTimer.toString(), x + size/2, y + 2*size/3);
            }

            this.ctx.shadowBlur = 0;
        }

        applyPowerUp(type) {
            const powerUp = this.powerUps[type];
            if (!powerUp) return;

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
            clearInterval(this.gameInterval);
            this.gameInterval = setInterval(() => {
                if (this.game.isPaused) return;
                this.updatePowerUps();
                if (!this.detectCollision()) {
                    this.moveSnake();
                } else {
                    this.endGame();
                }
            }, this.game.speed);
        }

        detectCollision() {
            if (this.game.invincible) return false;

            const head = this.snake[0];
            
            // Check self collision
            for (let i = 4; i < this.snake.length; i++) {
                if (this.snake[i].x === head.x && this.snake[i].y === head.y) {
                    return true;
                }
            }

            // Check wall collision
            const leftCollision = head.x < 0;
            const topCollision = head.y < 0;
            const rightCollision = head.x >= this.$canvas.width - this.settings.snake.size;
            const bottomCollision = head.y >= this.$canvas.height - this.settings.snake.size;

            return leftCollision || topCollision || rightCollision || bottomCollision;
        }

        endGame() {
            this.playSound('gameOver');

            clearInterval(this.gameInterval);
            clearInterval(this.powerUpFoodInterval);
            cancelAnimationFrame(this.gameLoop);
            
            // Check and update high score
            if (this.game.score > this.highScore) {
                this.highScore = this.game.score;
                localStorage.setItem('snakeHighScore', this.highScore);
                this.game.newHighScore = true;
            }
            
            // Remove keydown event listener
            document.removeEventListener('keydown', this.handleKeyDown);

            this.$app.classList.remove('game-in-progress');
            this.$app.classList.add('game-over');
            
            // Remove pause overlay if visible
            this.removePauseOverlay();

            this.$startScreen.querySelector('.options h3').innerText = 'Game Over';
            
            // Show high score message
            let endScoreText = `Final Score: ${this.game.score}`;
            if (this.game.newHighScore) {
                endScoreText += `<br><span class="new-high-score">🏆 NEW HIGH SCORE! 🏆</span>`;
            } else {
                endScoreText += `<br><span class="high-score-info">High Score: ${this.highScore}</span>`;
            }
            
            this.$startScreen.querySelector('.options .end-score').innerHTML = endScoreText;
            
            // Update high score display
            this.updateHighScoreDisplay();
            
            // Make start screen visible
            this.$startScreen.style.display = 'block';

            this.setUpGame();
        }
    }

    const snakeGame = new SnakeGame();
    
    // Add roundedRect support for older browsers
    if (!CanvasRenderingContext2D.prototype.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
            if (width < 2 * radius) radius = width / 2;
            if (height < 2 * radius) radius = height / 2;
            this.beginPath();
            this.moveTo(x + radius, y);
            this.arcTo(x + width, y, x + width, y + height, radius);
            this.arcTo(x + width, y + height, x, y + height, radius);
            this.arcTo(x, y + height, x, y, radius);
            this.arcTo(x, y, x + width, y, radius);
            this.closePath();
            return this;
        };
    }
});