// Wrap everything in DOMContentLoaded to ensure DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    class SnakeGame {
        constructor() {
            this.$app = document.querySelector('#app');
            this.$canvas = this.$app.querySelector('canvas');
            this.ctx = this.$canvas.getContext('2d');
            this.$startScreen = this.$app.querySelector('.start-screen');
            this.$score = this.$app.querySelector('.score');

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

            this.game = {
                speed: 100,
                keyCodes: {
                    87: 'up',     // W
                    83: 'down',   // S
                    68: 'right',  // D
                    65: 'left',   // A
                    38: 'up',     // Up Arrow
                    40: 'down',   // Down Arrow
                    39: 'right',  // Right Arrow
                    37: 'left',   // Left Arrow
                    32: 'pause',  // Spacebar
                    80: 'pause'   // P key
                },
                isPaused: false
            };

            this.soundEffects = {
                score: new Audio('https://arcade.arealalien.com/games/snake/sounds/score.mp3'),
                gameOver: new Audio('https://arcade.arealalien.com/games/snake/sounds/game-over.mp3')
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
                        this.drawFood(this.food.coordinates.x, this.food.coordinates.y);
                    }
                    // Redraw pause overlay if game is paused
                    if (this.game.isPaused) {
                        this.drawPauseOverlay();
                    }
                }
            });
        }

        chooseDifficulty(event) {
            const difficulty = event.target.dataset.difficulty;
            if (difficulty) {
                this.game.speed = parseInt(difficulty);
                this.$startScreen.querySelectorAll('.options button').forEach(btn => btn.classList.remove('active'));
                event.target.classList.add('active');
            }
        }

        setUpGame() {
            // The snake starts off with 5 pieces
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
                background: '#f8a2ff',
                border: '#f8a2ff',
                coordinates: {
                    x: 0,
                    y: 0
                }
            };

            this.game.score = 0;
            this.game.direction = 'right';
            this.game.nextDirection = 'right';
            this.game.isPaused = false;
            
            // Reset canvas size
            this.resetCanvas();
        }

        startGame() {
            // Stop the game over sound effect if a new game was restarted quickly before it could end
            this.soundEffects.gameOver.pause();
            this.soundEffects.gameOver.currentTime = 0;

            // Reset a few things from the prior game
            this.$app.classList.add('game-in-progress');
            this.$app.classList.remove('game-over');
            this.$score.innerText = 0;
            this.game.isPaused = false;

            this.generateSnake();

            this.startGameInterval = setInterval(() => {
                // Don't update game if paused
                if (this.game.isPaused) return;
                
                if (!this.detectCollision()) {
                    this.generateSnake();
                } else {
                    this.endGame();
                }
            }, this.game.speed);

            // Change direction
            document.addEventListener('keydown', (event) => {
                this.handleKeyPress(event.keyCode);
            });
        }

        handleKeyPress(keyCode) {
            // Handle pause key (Spacebar or P)
            if (keyCode === 32 || keyCode === 80) {
                this.togglePause();
                return;
            }
            
            // Only process direction keys if game is not paused
            if (!this.game.isPaused) {
                this.changeDirection(keyCode);
            }
        }

        togglePause() {
            // Only allow pausing if game is in progress
            if (!this.$app.classList.contains('game-in-progress')) return;
            
            this.game.isPaused = !this.game.isPaused;
            
            if (this.game.isPaused) {
                this.drawPauseOverlay();
            } else {
                // Clear pause overlay
                this.resetCanvas();
                this.drawSnake();
                if (this.food.active) {
                    this.drawFood(this.food.coordinates.x, this.food.coordinates.y);
                }
            }
        }

        drawPauseOverlay() {
            // Draw semi-transparent overlay
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.$canvas.width, this.$canvas.height);
            
            // Draw pause text
            this.ctx.fillStyle = '#ff76ff';
            this.ctx.font = 'bold 60px "Press Start 2P"';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.shadowColor = 'rgba(255, 118, 255, 0.5)';
            this.ctx.shadowBlur = 20;
            
            const centerX = this.$canvas.width / 2;
            const centerY = this.$canvas.height / 2;
            
            this.ctx.fillText('PAUSED', centerX, centerY - 40);
            
            // Draw instruction text
            this.ctx.font = '20px "Press Start 2P"';
            this.ctx.fillStyle = '#fac020';
            this.ctx.fillText('Press SPACE or P to resume', centerX, centerY + 40);
            
            // Reset shadow
            this.ctx.shadowBlur = 0;
        }

        changeDirection(keyCode) {
            const validKeyPress = Object.keys(this.game.keyCodes).includes(keyCode.toString());

            if (validKeyPress && this.validateDirectionChange(this.game.keyCodes[keyCode], this.game.direction)) {
                this.game.nextDirection = this.game.keyCodes[keyCode];
            }
        }

        // When already moving in one direction snake shouldn't be allowed to move in the opposite direction
        validateDirectionChange(keyPress, currentDirection) {
            return (keyPress === 'left' && currentDirection !== 'right') ||
                (keyPress === 'right' && currentDirection !== 'left') ||
                (keyPress === 'up' && currentDirection !== 'down') ||
                (keyPress === 'down' && currentDirection !== 'up');
        }

        resetCanvas() {
            // Full screen size
            this.$canvas.width = this.settings.canvas.width;
            this.$canvas.height = this.settings.canvas.height;

            // Background
            this.ctx.fillStyle = this.settings.canvas.background;
            this.ctx.fillRect(0, 0, this.$canvas.width, this.$canvas.height);
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

            // The snake moves by adding a piece to the beginning "this.snake.unshift(coordinate)" and removing the last piece "this.snake.pop()"
            this.snake.unshift(coordinate);
            this.resetCanvas();

            const ateFood = this.snake[0].x === this.food.coordinates.x && this.snake[0].y === this.food.coordinates.y;

            if (ateFood) {
                this.food.active = false;
                this.game.score += 10;
                this.$score.innerText = this.game.score;
                this.soundEffects.score.play();
            } else {
                this.snake.pop();
            }

            this.generateFood();
            this.drawSnake();
        }

        drawSnake() {
            const size = this.settings.snake.size;

            this.ctx.fillStyle = this.settings.snake.background;
            this.ctx.shadowColor = 'rgba(250, 192, 32, .45)';
            this.ctx.shadowBlur = 20;

            // Draw each piece
            this.snake.forEach(coordinate => {
                this.ctx.fillRect(coordinate.x, coordinate.y, size, size);
                this.ctx.shadowColor = 'rgba(250, 192, 32, .45)';
                this.ctx.shadowBlur = 20;
            });

            this.game.direction = this.game.nextDirection;
        }

        generateFood() {
            // If there is uneaten food on the canvas there's no need to regenerate it
            if (this.food.active) {
                this.drawFood(this.food.coordinates.x, this.food.coordinates.y);
                return;
            }

            const gridSize = this.settings.snake.size;
            const xMax = this.settings.canvas.width - gridSize;
            const yMax = this.settings.canvas.height - gridSize;

            const x = Math.round((Math.random() * xMax) / gridSize) * gridSize;
            const y = Math.round((Math.random() * yMax) / gridSize) * gridSize;

            // Make sure the generated coordinates do not conflict with the snake's present location
            let conflict = false;
            this.snake.forEach(coordinate => {
                if (coordinate.x == x && coordinate.y == y) {
                    conflict = true;
                }
            });

            if (conflict) {
                this.generateFood();
            } else {
                this.drawFood(x, y);
            }
        }

        drawFood(x, y) {
            const size = this.settings.snake.size;

            this.ctx.fillStyle = this.food.background;
            this.ctx.shadowColor = 'rgba(248, 162, 255, .35)';
            this.ctx.shadowBlur = 20;

            this.ctx.fillRect(x, y, size, size);

            this.food.active = true;
            this.food.coordinates.x = x;
            this.food.coordinates.y = y;
        }

        detectCollision() {
            // Self collison
            for (let i = 4; i < this.snake.length; i++) {
                const selfCollison = this.snake[i].x === this.snake[0].x && this.snake[i].y === this.snake[0].y;

                if (selfCollison) {
                    return true;
                }
            }

            // Wall collison
            const leftCollison = this.snake[0].x < 0;
            const topCollison = this.snake[0].y < 0;
            const rightCollison = this.snake[0].x > this.$canvas.width - this.settings.snake.size;
            const bottomCollison = this.snake[0].y > this.$canvas.height - this.settings.snake.size;

            return leftCollison || topCollison || rightCollison || bottomCollison;
        }

        endGame() {
            // Don't end game if it's paused
            if (this.game.isPaused) return;
            
            this.soundEffects.gameOver.play();

            clearInterval(this.startGameInterval);

            this.$app.classList.remove('game-in-progress');
            this.$app.classList.add('game-over');
            this.$startScreen.querySelector('.options h3').innerText = 'Game Over';
            this.$startScreen.querySelector('.options .end-score').innerText = `Score: ${this.game.score}`;

            this.setUpGame();
        }
    }

    // Create game instance
    const snakeGame = new SnakeGame();
});