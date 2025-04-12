
        // Game configuration
        const config = {
            fps: 60,
            roadWidth: 250,
            laneCount: 3,
            obstacleSpeed: 3,
            obstacleSpawnRate: 0.01,
            coinSpawnRate: 0.015,
            accelerationRate: 0.00002, // Reduced even further for slower speed increase
            initialPlayerSpeed: 0.7,
            idleEarningRate: 1,
            collisionTolerance: 0.8 // New setting for more forgiving collisions (80% of actual size)
        };

        // Game state
        const state = {
            running: false,
            score: 0,
            collectedCoins: 0, // Add this to track collected coins as a number
            coins: [], // This stays as an array for coin objects
            totalCoins: 0,
            speed: 1,
            lastTimestamp: 0,
            lastSaveTime: Date.now(),
            obstacles: [],
            roadOffset: 0,
            player: {
                lane: 1, // 0 = left, 1 = center, 2 = right
                width: 40,
                height: 60,
                x: 0,
                y: 0,
                invulnerable: false
            },
            upgrades: {
                speed: { level: 1, cost: 100, value: 1 },
                handling: { level: 1, cost: 100, value: 1 },
                coinMultiplier: { level: 1, cost: 100, value: 1 }
            }
        };

        // Canvas setup
        const canvas = document.getElementById('game-canvas');
        const ctx = canvas.getContext('2d');
        
        // Screen elements
        const startScreen = document.getElementById('start-screen');
        const gameOverScreen = document.getElementById('game-over-screen');
        const upgradeScreen = document.getElementById('upgrade-screen');
        const hudElement = document.getElementById('hud');
        
        // Buttons
        const startButton = document.getElementById('start-button');
        const restartButton = document.getElementById('restart-button');
        const upgradeButton = document.getElementById('upgrade-button');
        const backButton = document.getElementById('back-button');
        const upgradeSpeedButton = document.getElementById('upgrade-speed');
        const upgradeHandlingButton = document.getElementById('upgrade-handling');
        const upgradeCoinButton = document.getElementById('upgrade-coin');
        
        // HUD elements
        const scoreElement = document.getElementById('score');
        const coinsElement = document.getElementById('coins');
        const speedElement = document.getElementById('speed');
        const finalScoreElement = document.getElementById('final-score');
        const coinsCollectedElement = document.getElementById('coins-collected');
        const totalCoinsElement = document.getElementById('total-coins');
        
        // Ensure canvas dimensions match container size
        function resizeCanvas() {
            const container = document.getElementById('game-container');
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            // Recalculate player position after resize
            positionPlayer();
        }

        // Initialize the game
        function init() {
            resizeCanvas();
            window.addEventListener('resize', resizeCanvas);
            
            // Load game data from localStorage
            loadGameData();
            
            // Calculate offline earnings
            calculateOfflineEarnings();
            
            // Set up event listeners
            setupEventListeners();
            
            // Show start screen
            showStartScreen();
        }

        function setupEventListeners() {
            // Keyboard controls
            document.addEventListener('keydown', (e) => {
                // Game controls when running
                if (state.running) {
                    if (e.key === 'ArrowLeft' && state.player.lane > 0) {
                        state.player.lane--;
                        positionPlayer();
                    } else if (e.key === 'ArrowRight' && state.player.lane < config.laneCount - 1) {
                        state.player.lane++;
                        positionPlayer();
                    } else if (e.key === ' ' || e.key === 'Spacebar') {
                        // Pause/resume game with spacebar
                        togglePause();
                    }
                } else {
                    // Controls when not running (on screens)
                    if (e.key === 'Enter') {
                        // If on start screen or game over screen, start game
                        if (!startScreen.classList.contains('hidden')) {
                            startGame();
                        } else if (!gameOverScreen.classList.contains('hidden')) {
                            startGame();
                        }
                    }
                }
            });
            
            // Touch controls
            canvas.addEventListener('touchstart', (e) => {
                if (!state.running) return;
                
                const touch = e.touches[0];
                const touchX = touch.clientX - canvas.getBoundingClientRect().left;
                
                if (touchX < canvas.width / 2) {
                    // Left side of screen
                    if (state.player.lane > 0) {
                        state.player.lane--;
                        positionPlayer();
                    }
                } else {
                    // Right side of screen
                    if (state.player.lane < config.laneCount - 1) {
                        state.player.lane++;
                        positionPlayer();
                    }
                }
            });
            
            // Button event listeners
            startButton.addEventListener('click', startGame);
            restartButton.addEventListener('click', startGame);
            upgradeButton.addEventListener('click', showUpgradeScreen);
            backButton.addEventListener('click', showStartScreen);
            
            // Upgrade buttons
            upgradeSpeedButton.addEventListener('click', () => upgradeAttribute('speed'));
            upgradeHandlingButton.addEventListener('click', () => upgradeAttribute('handling'));
            upgradeCoinButton.addEventListener('click', () => upgradeAttribute('coinMultiplier'));
        }

        function showStartScreen() {
            startScreen.classList.remove('hidden');
            gameOverScreen.classList.add('hidden');
            upgradeScreen.classList.add('hidden');
            hudElement.classList.add('hidden');
            
            // Update UI
            updateUpgradeScreen();
        }

        function showGameOverScreen() {
            startScreen.classList.add('hidden');
            gameOverScreen.classList.remove('hidden');
            upgradeScreen.classList.add('hidden');
            hudElement.classList.add('hidden');
            
            // Update UI
            finalScoreElement.textContent = `SCORE: ${Math.floor(state.score)}`;
            coinsCollectedElement.textContent = `COINS: ${Math.floor(state.collectedCoins)}`;
            
            // Add coins to total
            state.totalCoins += state.collectedCoins;
            saveGameData();
        }

        function showUpgradeScreen() {
            startScreen.classList.add('hidden');
            gameOverScreen.classList.add('hidden');
            upgradeScreen.classList.remove('hidden');
            hudElement.classList.add('hidden');
            
            // Update UI
            updateUpgradeScreen();
        }

        function updateUpgradeScreen() {
            // Update total coins display
            totalCoinsElement.textContent = `TOTAL COINS: ${state.totalCoins}`;
            
            // Update upgrade displays
            document.getElementById('speed-level').textContent = state.upgrades.speed.level;
            document.getElementById('handling-level').textContent = state.upgrades.handling.level;
            document.getElementById('coin-level').textContent = state.upgrades.coinMultiplier.level;
            
            document.getElementById('speed-cost').textContent = state.upgrades.speed.cost;
            document.getElementById('handling-cost').textContent = state.upgrades.handling.cost;
            document.getElementById('coin-cost').textContent = state.upgrades.coinMultiplier.cost;
            
            // Enable/disable upgrade buttons based on available coins
            upgradeSpeedButton.disabled = state.totalCoins < state.upgrades.speed.cost;
            upgradeHandlingButton.disabled = state.totalCoins < state.upgrades.handling.cost;
            upgradeCoinButton.disabled = state.totalCoins < state.upgrades.coinMultiplier.cost;
        }

        function upgradeAttribute(attribute) {
            const upgrade = state.upgrades[attribute];
            
            if (state.totalCoins >= upgrade.cost) {
                state.totalCoins -= upgrade.cost;
                upgrade.level++;
                upgrade.value = 1 + (upgrade.level - 1) * 0.2; // 20% increase per level
                upgrade.cost = Math.floor(upgrade.cost * 1.5); // 50% cost increase per level
                
                // Save game data
                saveGameData();
                
                // Update UI
                updateUpgradeScreen();
            }
        }

        function startGame() {
            // Cancel any existing animation frame
            if (state.animationId) {
                cancelAnimationFrame(state.animationId);
                state.animationId = null;
            }
            
            // Reset game state
            state.running = true;
            state.score = 0;
            state.collectedCoins = 0;
            state.speed = config.initialPlayerSpeed * state.upgrades.speed.value; // Use initialPlayerSpeed
            state.obstacles = [];
            state.coins = [];
            state.roadOffset = 0;
            state.player.invulnerable = false;
            
            // Position player
            positionPlayer();
            
            // Hide screens
            startScreen.classList.add('hidden');
            gameOverScreen.classList.add('hidden');
            upgradeScreen.classList.add('hidden');
            hudElement.classList.remove('hidden');
            
            // Start game loop
            state.lastTimestamp = performance.now();
            gameLoop(state.lastTimestamp);
        }

        function positionPlayer() {
            const laneWidth = config.roadWidth / config.laneCount;
            const roadLeftEdge = (canvas.width - config.roadWidth) / 2;
            
            state.player.x = roadLeftEdge + (state.player.lane * laneWidth) + (laneWidth / 2) - (state.player.width / 2);
            state.player.y = canvas.height - state.player.height - 20;
        }

        function gameLoop(timestamp) {
            // Calculate delta time
            const deltaTime = timestamp - state.lastTimestamp;
            state.lastTimestamp = timestamp;
            
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (state.running) {
                // Update game state
                update(deltaTime);
                
                // Draw game elements
                draw();
                
                // Schedule next frame
                state.animationId = requestAnimationFrame(gameLoop);
            }
        }

        function update(deltaTime) {
            // Increase score based on time
            state.score += deltaTime * 0.01 * state.speed;
            
            // Gradually increase speed over time
            state.speed += config.accelerationRate * deltaTime * state.upgrades.speed.value;
            
            // Update road offset (for scrolling effect)
            state.roadOffset += state.speed * deltaTime * 0.1;
            if (state.roadOffset > 40) {
                state.roadOffset = 0;
            }
            
            // Spawn obstacles
            if (Math.random() < config.obstacleSpawnRate * state.speed * (deltaTime / 16.67)) {
                spawnObstacle();
            }
            
            // Spawn coins
            if (Math.random() < config.coinSpawnRate * state.speed * (deltaTime / 16.67)) {
                spawnCoin();
            }
            
            // Update obstacles
            updateObstacles(deltaTime);
            
            // Update coins
            updateCoins(deltaTime);
            
            // Check for collisions
            checkCollisions();
            
            // Update HUD
            updateHUD();
            
            // Periodically save game data
            if (Date.now() - state.lastSaveTime > 60000) { // Every minute
                saveGameData();
                state.lastSaveTime = Date.now();
            }
        }

        function spawnObstacle() {
            const laneWidth = config.roadWidth / config.laneCount;
            const roadLeftEdge = (canvas.width - config.roadWidth) / 2;
            const lane = Math.floor(Math.random() * config.laneCount);
            
            // Add a minimum distance check to prevent obstacles from spawning too close together
            let tooClose = false;
            for (const obstacle of state.obstacles) {
                if (obstacle.y < 100) { // Don't spawn if there's an obstacle in the first 100px
                    tooClose = true;
                    break;
                }
            }
            
            if (!tooClose) {
                const obstacle = {
                    x: roadLeftEdge + (lane * laneWidth) + (laneWidth / 2) - 20,
                    y: -40,
                    width: 40,
                    height: 40,
                    speed: config.obstacleSpeed * state.speed
                };
                
                state.obstacles.push(obstacle);
            }
        }

        function spawnCoin() {
            const laneWidth = config.roadWidth / config.laneCount;
            const roadLeftEdge = (canvas.width - config.roadWidth) / 2;
            const lane = Math.floor(Math.random() * config.laneCount);
            
            const coin = {
                x: roadLeftEdge + (lane * laneWidth) + (laneWidth / 2) - 10,
                y: -20,
                width: 20,
                height: 20,
                speed: config.obstacleSpeed * state.speed
            };
            
            state.coins.push(coin);
        }

        function updateObstacles(deltaTime) {
            for (let i = state.obstacles.length - 1; i >= 0; i--) {
                const obstacle = state.obstacles[i];
                obstacle.y += obstacle.speed * (deltaTime / 16.67);
                
                // Remove obstacles that are off-screen
                if (obstacle.y > canvas.height) {
                    state.obstacles.splice(i, 1);
                }
            }
        }

        function updateCoins(deltaTime) {
            for (let i = state.coins.length - 1; i >= 0; i--) {
                const coin = state.coins[i];
                coin.y += coin.speed * (deltaTime / 16.67);
                
                // Remove coins that are off-screen
                if (coin.y > canvas.height) {
                    state.coins.splice(i, 1);
                }
            }
        }

        function checkCollisions() {
            if (state.player.invulnerable) return;
            
            // Check obstacle collisions with more forgiving hitbox
            for (let i = state.obstacles.length - 1; i >= 0; i--) {
                const obstacle = state.obstacles[i];
                
                // Calculate hitbox dimensions (smaller than visual elements)
                const playerHitboxWidth = state.player.width * config.collisionTolerance;
                const playerHitboxHeight = state.player.height * config.collisionTolerance;
                const obstacleHitboxWidth = obstacle.width * config.collisionTolerance;
                const obstacleHitboxHeight = obstacle.height * config.collisionTolerance;
                
                // Calculate hitbox positions (centered within visual elements)
                const playerHitboxX = state.player.x + (state.player.width - playerHitboxWidth) / 2;
                const playerHitboxY = state.player.y + (state.player.height - playerHitboxHeight) / 2;
                const obstacleHitboxX = obstacle.x + (obstacle.width - obstacleHitboxWidth) / 2;
                const obstacleHitboxY = obstacle.y + (obstacle.height - obstacleHitboxHeight) / 2;
                
                if (
                    playerHitboxX < obstacleHitboxX + obstacleHitboxWidth &&
                    playerHitboxX + playerHitboxWidth > obstacleHitboxX &&
                    playerHitboxY < obstacleHitboxY + obstacleHitboxHeight &&
                    playerHitboxY + playerHitboxHeight > obstacleHitboxY
                ) {
                    // Collision detected
                    handleCrash();
                    break;
                }
            }
            
            // Check coin collisions (keep these more generous)
            for (let i = state.coins.length - 1; i >= 0; i--) {
                const coin = state.coins[i];
                
                if (
                    state.player.x < coin.x + coin.width &&
                    state.player.x + state.player.width > coin.x &&
                    state.player.y < coin.y + coin.height &&
                    state.player.y + state.player.height > coin.y
                ) {
                    // Coin collected
                    collectCoin(i);
                }
            }
        }

        function handleCrash() {
            // Game over
            state.running = false;
            cancelAnimationFrame(state.animationId);
            state.animationId = null;
            
            // Show game over screen
            showGameOverScreen();
        }

        function collectCoin(index) {
            // Add coins based on multiplier
            state.collectedCoins += 1 * state.upgrades.coinMultiplier.value;
            
            // Remove collected coin
            state.coins.splice(index, 1);
        }

        function updateHUD() {
            scoreElement.textContent = `SCORE: ${Math.floor(state.score)}`;
            coinsElement.textContent = `COINS: ${Math.floor(state.collectedCoins)}`;
            speedElement.textContent = `SPEED: ${state.speed.toFixed(1)}x`;
        }

        function draw() {
            // Draw background
            drawBackground();
            
            // Draw road
            drawRoad();
            
            // Draw obstacles
            drawObstacles();
            
            // Draw coins
            drawCoins();
            
            // Draw player car
            drawPlayer();
        }

        function drawBackground() {
            // Sky
            ctx.fillStyle = '#333366';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        function drawRoad() {
            const roadWidth = config.roadWidth;
            const roadLeftEdge = (canvas.width - roadWidth) / 2;
            
            // Road background
            ctx.fillStyle = '#444';
            ctx.fillRect(roadLeftEdge, 0, roadWidth, canvas.height);
            
            // Road lines
            ctx.fillStyle = '#FFF';
            
            // Draw lane dividers
            const laneWidth = roadWidth / config.laneCount;
            
            for (let i = 1; i < config.laneCount; i++) {
                const x = roadLeftEdge + (i * laneWidth);
                
                // Draw dashed lines
                for (let y = -state.roadOffset; y < canvas.height; y += 40) {
                    ctx.fillRect(x - 2, y, 4, 20);
                }
            }
            
            // Draw road edges
            ctx.fillStyle = '#FF0';
            ctx.fillRect(roadLeftEdge - 5, 0, 5, canvas.height);
            ctx.fillRect(roadLeftEdge + roadWidth, 0, 5, canvas.height);
        }

        function drawObstacles() {
            ctx.fillStyle = '#F33';
            
            for (const obstacle of state.obstacles) {
                ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            }
        }

        function drawCoins() {
            ctx.fillStyle = '#FF0';
            
            for (const coin of state.coins) {
                ctx.beginPath();
                ctx.arc(coin.x + coin.width / 2, coin.y + coin.height / 2, coin.width / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        function drawPlayer() {
            // Car body
            ctx.fillStyle = '#0AF';
            ctx.fillRect(state.player.x, state.player.y, state.player.width, state.player.height);
            
            // Windows
            ctx.fillStyle = '#8CF';
            ctx.fillRect(state.player.x + 5, state.player.y + 5, state.player.width - 10, 15);
            
            // Wheels
            ctx.fillStyle = '#000';
            ctx.fillRect(state.player.x - 3, state.player.y + 10, 6, 15);
            ctx.fillRect(state.player.x - 3, state.player.y + 35, 6, 15);
            ctx.fillRect(state.player.x + state.player.width - 3, state.player.y + 10, 6, 15);
            ctx.fillRect(state.player.x + state.player.width - 3, state.player.y + 35, 6, 15);
        }

        function saveGameData() {
            const gameData = {
                totalCoins: state.totalCoins,
                upgrades: state.upgrades,
                lastSaveTime: Date.now()
            };
            
            localStorage.setItem('retroRushData', JSON.stringify(gameData));
        }

        function loadGameData() {
            const savedData = localStorage.getItem('retroRushData');
            
            if (savedData) {
                const gameData = JSON.parse(savedData);
                state.totalCoins = gameData.totalCoins || 0;
                state.upgrades = gameData.upgrades || state.upgrades;
                state.lastSaveTime = gameData.lastSaveTime || Date.now();
            }
        }

        function calculateOfflineEarnings() {
            const savedData = localStorage.getItem('retroRushData');
            
            if (savedData) {
                const gameData = JSON.parse(savedData);
                const timeElapsed = Date.now() - gameData.lastSaveTime;
                
                if (timeElapsed > 60000) { // At least 1 minute
                    const minutesElapsed = timeElapsed / 60000;
                    const earnings = Math.floor(minutesElapsed * config.idleEarningRate * state.upgrades.coinMultiplier.value);
                    
                    if (earnings > 0) {
                        state.totalCoins += earnings;
                        alert(`You earned ${earnings} coins while away!`);
                    }
                }
            }
        }

        // Add toggle pause function
        function togglePause() {
            if (state.running) {
                state.running = false;
                cancelAnimationFrame(state.animationId);
                
                // Show pause indicator
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                ctx.fillStyle = '#FFF';
                ctx.font = '20px "Press Start 2P", system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
                ctx.font = '12px "Press Start 2P", system-ui, sans-serif';
                ctx.fillText('Press SPACE to resume', canvas.width / 2, canvas.height / 2 + 30);
            } else {
                state.running = true;
                state.lastTimestamp = performance.now();
                gameLoop(state.lastTimestamp);
            }
        }

        // Start the game initialization when page loads
        window.addEventListener('load', init);