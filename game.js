// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOver');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const finalScoreElement = document.getElementById('finalScore');
const levelElement = document.getElementById('level');

// Set canvas size
canvas.width = 800;
canvas.height = 600;

// Game state
let gameRunning = false;
let score = 0;
let lives = 3;
let level = 0;

// Player object
const player = {
    x: canvas.width / 2,
    y: canvas.height - 60,
    width: 40,
    height: 40,
    speed: 5,
    color: '#4a90e2'
};

// Arrays for game objects
const bullets = [];
const rockets = [];
const enemies = [];
const explosions = [];
const levelUpEffects = [];

// Input handling
const keys = {};
let mouseX = canvas.width / 2;
let isShooting = false;
let lastShootTime = 0;
let lastRocketTime = 0;
const shootCooldown = 50; // milliseconds between shots (much faster)
const rocketCooldown = 300; // milliseconds between rockets

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === ' ' && gameRunning) {
        isShooting = true;
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
    if (e.key === ' ') {
        isShooting = false;
    }
});

// Mouse movement for player control
canvas.addEventListener('mousemove', (e) => {
    if (gameRunning) {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        // Keep player within canvas bounds
        mouseX = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, mouseX));
    }
});

// Game functions
function startGame() {
    gameRunning = true;
    score = 0;
    lives = 3;
    level = 20; // Start at level 20
    bullets.length = 0;
    rockets.length = 0;
    enemies.length = 0;
    explosions.length = 0;
    levelUpEffects.length = 0;
    
    // Reset player position and mouse
    player.x = canvas.width / 2;
    player.y = canvas.height - 60;
    mouseX = canvas.width / 2;
    isShooting = false;
    
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    
    updateUI();
    gameLoop();
}

function restartGame() {
    // Keep current level when restarting
    const currentLevel = level;
    startGame();
    level = currentLevel; // Restore the level that was set
    updateUI();
}

function gameOver() {
    console.log('Game Over triggered! Lives:', lives, 'Score:', score);
    gameRunning = false;
    finalScoreElement.textContent = score;
    gameOverScreen.style.display = 'flex';
}

function updateUI() {
    scoreElement.textContent = score;
    livesElement.textContent = lives;
    levelElement.textContent = level;
}

function changeLevel(delta) {
    level = Math.max(0, level + delta);
    updateUI();
}

function shoot() {
    // 5-direction spread shot
    const bulletCount = 5;
    const spreadAngle = 20; // degrees between each bullet
    
    for (let i = 0; i < bulletCount; i++) {
        const angle = (i - 2) * spreadAngle * Math.PI / 180; // -40, -20, 0, 20, 40 degrees
        const speed = 8;
        
        bullets.push({
            x: player.x + player.width / 2 - 2,
            y: player.y,
            width: 4,
            height: 10,
            speedX: Math.sin(angle) * speed,
            speedY: -Math.cos(angle) * speed,
            speed: speed,
            color: '#ffeb3b'
        });
    }
}

function shootRocket() {
    if (enemies.length > 0) {
        rockets.push({
            x: player.x + player.width / 2 - 3,
            y: player.y,
            width: 6,
            height: 12,
            speed: 18, // Very fast speed
            color: '#ff4444',
            homing: true,
            angle: 0 // Track rotation angle
        });
    }
}

function createEnemy() {
    // Spawn rate based on current level
    const spawnRate = 0.01 + (level * 0.005);
    if (Math.random() < spawnRate) {
        enemies.push({
            x: Math.random() * (canvas.width - 30),
            y: -30,
            width: 30,
            height: 30,
            speed: 2 + Math.random() * 2 + (level * 0.5),
            color: '#e74c3c'
        });
    }
}

function updatePlayer() {
    // Mouse control for horizontal movement
    player.x = mouseX - player.width / 2;
    
    // Keyboard control for vertical movement
    if (keys['ArrowUp'] && player.y > 0) {
        player.y -= player.speed;
    }
    if (keys['ArrowDown'] && player.y < canvas.height - player.height) {
        player.y += player.speed;
    }
    
    // Auto-shooting when spacebar is held
    if (isShooting && gameRunning) {
        const currentTime = Date.now();
        if (currentTime - lastShootTime >= shootCooldown) {
            shoot();
            lastShootTime = currentTime;
        }
    }
    
    // Auto-rocket firing
    if (gameRunning) {
        const currentTime = Date.now();
        if (currentTime - lastRocketTime >= rocketCooldown) {
            shootRocket();
            lastRocketTime = currentTime;
        }
    }
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // Update bullet position with X and Y movement
        bullet.x += bullet.speedX || 0;
        bullet.y += bullet.speedY || -bullet.speed;
        
        // Remove bullets that go off screen
        if (bullet.y < 0 || bullet.x < 0 || bullet.x > canvas.width) {
            bullets.splice(i, 1);
        }
    }
}

function updateRockets() {
    for (let i = rockets.length - 1; i >= 0; i--) {
        const rocket = rockets[i];
        
        if (rocket.homing && enemies.length > 0) {
            // Find nearest enemy for this rocket
            let targetEnemy = null;
            let minDistance = Infinity;
            
            for (let j = 0; j < enemies.length; j++) {
                const enemy = enemies[j];
                const distance = Math.sqrt(
                    Math.pow(rocket.x - enemy.x, 2) + 
                    Math.pow(rocket.y - enemy.y, 2)
                );
                
                if (distance < minDistance) {
                    minDistance = distance;
                    targetEnemy = enemy;
                }
            }
            
            if (targetEnemy) {
                // Predict target position based on enemy speed
                const predictedX = targetEnemy.x;
                const predictedY = targetEnemy.y + (targetEnemy.speed * 2); // Predict 2 frames ahead
                
                // Calculate direction to predicted target
                const dx = predictedX - rocket.x;
                const dy = predictedY - rocket.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0) {
                    // Calculate angle for rocket rotation
                    rocket.angle = Math.atan2(dy, dx);
                    
                    // Normalize and apply speed
                    const speedX = (dx / distance) * rocket.speed;
                    const speedY = (dy / distance) * rocket.speed;
                    
                    rocket.x += speedX;
                    rocket.y += speedY;
                }
            } else {
                // No enemies, move straight up
                rocket.y -= rocket.speed;
                rocket.angle = -Math.PI / 2; // Point upward
            }
        } else {
            // Non-homing rockets move straight up
            rocket.y -= rocket.speed;
            rocket.angle = -Math.PI / 2; // Point upward
        }
        
        // Remove rockets that go off screen
        if (rocket.y < 0 || rocket.x < 0 || rocket.x > canvas.width || rocket.y > canvas.height) {
            rockets.splice(i, 1);
        }
    }
}

function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].y += enemies[i].speed;
        if (enemies[i].y > canvas.height) {
            enemies.splice(i, 1);
            lives--;
            console.log('Enemy passed bottom. Lives remaining:', lives);
            updateUI();
            if (lives <= 0) {
                gameOver();
                return;
            }
        }
    }
}

function checkCollisions() {
    // Bullet-Enemy collisions
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (bullets[i] && enemies[j] && 
                bullets[i].x < enemies[j].x + enemies[j].width &&
                bullets[i].x + bullets[i].width > enemies[j].x &&
                bullets[i].y < enemies[j].y + enemies[j].height &&
                bullets[i].y + bullets[i].height > enemies[j].y) {
                
                // Create explosion
                explosions.push({
                    x: enemies[j].x + enemies[j].width / 2,
                    y: enemies[j].y + enemies[j].height / 2,
                    radius: 20,
                    life: 10
                });
                
                // Remove bullet and enemy
                bullets.splice(i, 1);
                enemies.splice(j, 1);
                score += 10;
                
                // Check for level up every 1000 points
                const newLevel = Math.floor(score / 1000) + 20; // Start from level 20
                if (newLevel > level) {
                    level = newLevel;
                    showLevelUpEffect();
                }
                
                updateUI();
                break;
            }
        }
    }
    
    // Rocket-Enemy collisions
    for (let i = rockets.length - 1; i >= 0; i--) {
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (rockets[i] && enemies[j] && 
                rockets[i].x < enemies[j].x + enemies[j].width &&
                rockets[i].x + rockets[i].width > enemies[j].x &&
                rockets[i].y < enemies[j].y + enemies[j].height &&
                rockets[i].y + rockets[i].height > enemies[j].y) {
                
                // Create larger explosion for rockets
                explosions.push({
                    x: enemies[j].x + enemies[j].width / 2,
                    y: enemies[j].y + enemies[j].height / 2,
                    radius: 50,
                    life: 25,
                    type: 'rocket'
                });
                
                // Remove rocket and enemy
                rockets.splice(i, 1);
                enemies.splice(j, 1);
                score += 20; // Rockets give more points
                
                // Check for level up every 1000 points
                const newLevel = Math.floor(score / 1000) + 20; // Start from level 20
                if (newLevel > level) {
                    level = newLevel;
                    showLevelUpEffect();
                }
                
                updateUI();
                break;
            }
        }
    }
    
    // Player-Enemy collisions
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (player.x < enemies[i].x + enemies[i].width &&
            player.x + player.width > enemies[i].x &&
            player.y < enemies[i].y + enemies[i].height &&
            player.y + player.height > enemies[i].y) {
            
            // Create explosion
            explosions.push({
                x: enemies[i].x + enemies[i].width / 2,
                y: enemies[i].y + enemies[i].height / 2,
                radius: 25,
                life: 15
            });
            
            enemies.splice(i, 1);
            lives--;
            console.log('Player hit by enemy. Lives remaining:', lives);
            updateUI();
            if (lives <= 0) {
                gameOver();
                return;
            }
        }
    }
}

function updateExplosions() {
    for (let i = explosions.length - 1; i >= 0; i--) {
        explosions[i].life--;
        if (explosions[i].life <= 0) {
            explosions.splice(i, 1);
        }
    }
}

function showLevelUpEffect() {
    levelUpEffects.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        text: `LEVEL ${level}!`,
        life: 60,
        alpha: 1
    });
}

function updateLevelUpEffects() {
    for (let i = levelUpEffects.length - 1; i >= 0; i--) {
        levelUpEffects[i].life--;
        levelUpEffects[i].alpha = levelUpEffects[i].life / 60;
        if (levelUpEffects[i].life <= 0) {
            levelUpEffects.splice(i, 1);
        }
    }
}

function drawPlayer() {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Draw player details
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(player.x + 5, player.y + 10, 30, 5);
    ctx.fillRect(player.x + 15, player.y + 5, 10, 10);
}

function drawBullets() {
    bullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
}

function drawRockets() {
    rockets.forEach(rocket => {
        ctx.save();
        ctx.translate(rocket.x + rocket.width / 2, rocket.y + rocket.height / 2);
        ctx.rotate(rocket.angle);
        
        // Draw rocket trail (300px long) in direction of movement
        const trailSegments = 60; // More segments for longer trail
        
        for (let i = 0; i < trailSegments; i++) {
            const alpha = 1 - (i / trailSegments);
            const trailX = -3 - (i * 5); // Longer spacing
            const trailY = 6 + (i * 5);
            const trailWidth = 8 - (i * 0.1); // Wider trail
            const trailHeight = 10 - (i * 0.15);
            
            ctx.globalAlpha = alpha;
            // Gradient colors for longer trail
            let trailColor;
            if (i < 5) {
                trailColor = '#ffffff'; // White core
            } else if (i < 15) {
                trailColor = '#ffaa00'; // Bright yellow
            } else if (i < 30) {
                trailColor = '#ff6600'; // Orange
            } else {
                trailColor = '#ff4400'; // Dark orange
            }
            ctx.fillStyle = trailColor;
            ctx.fillRect(trailX, trailY, trailWidth, trailHeight);
        }
        ctx.globalAlpha = 1;
        
        // Draw rocket body
        ctx.fillStyle = rocket.color;
        ctx.fillRect(-rocket.width / 2, -rocket.height / 2, rocket.width, rocket.height);
        
        // Draw rocket tip
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-rocket.width / 2 + 1, -rocket.height / 2, 4, 3);
        
        // Draw rocket fins
        ctx.fillStyle = '#cccccc';
        ctx.fillRect(-rocket.width / 2 - 2, -rocket.height / 2 + 8, 2, 4);
        ctx.fillRect(rocket.width / 2, -rocket.height / 2 + 8, 2, 4);
        
        ctx.restore();
    });
}

function drawEnemies() {
    enemies.forEach(enemy => {
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        
        // Draw enemy details
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(enemy.x + 5, enemy.y + 5, 20, 5);
        ctx.fillRect(enemy.x + 10, enemy.y + 15, 10, 10);
    });
}

function drawExplosions() {
    explosions.forEach(explosion => {
        const maxLife = explosion.type === 'rocket' ? 25 : 15;
        const alpha = explosion.life / maxLife;
        ctx.globalAlpha = alpha;
        
        if (explosion.type === 'rocket') {
            // Multi-layered rocket explosion
            const colors = ['#ff4444', '#ffaa00', '#ffff00'];
            const radii = [explosion.radius, explosion.radius * 0.7, explosion.radius * 0.4];
            
            for (let i = 0; i < colors.length; i++) {
                ctx.fillStyle = colors[i];
                ctx.beginPath();
                ctx.arc(explosion.x, explosion.y, radii[i], 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Add sparkles
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const sparkX = explosion.x + Math.cos(angle) * explosion.radius * 0.8;
                const sparkY = explosion.y + Math.sin(angle) * explosion.radius * 0.8;
                
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sparkX - 1, sparkY - 1, 2, 2);
            }
        } else {
            // Regular bullet explosion
            ctx.fillStyle = '#ffeb3b';
            ctx.beginPath();
            ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.globalAlpha = 1;
    });
}

function drawLevelUpEffects() {
    levelUpEffects.forEach(effect => {
        ctx.globalAlpha = effect.alpha;
        ctx.fillStyle = '#4a90e2';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(effect.text, effect.x, effect.y);
        ctx.globalAlpha = 1;
    });
}

function drawStars() {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 50; i++) {
        const x = (i * 17) % canvas.width;
        const y = (i * 23 + Date.now() * 0.01) % canvas.height;
        ctx.fillRect(x, y, 1, 1);
    }
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background stars
    drawStars();
    
    // Draw game objects
    drawPlayer();
    drawBullets();
    drawRockets();
    drawEnemies();
    drawExplosions();
    drawLevelUpEffects();
}

function update() {
    if (!gameRunning) return;
    
    updatePlayer();
    updateBullets();
    updateRockets();
    updateEnemies();
    createEnemy();
    checkCollisions();
    updateExplosions();
    updateLevelUpEffects();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Initialize game
updateUI(); 