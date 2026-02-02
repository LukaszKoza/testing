let gold = 0;
let totalGoldEarned = 0;
let clickPower = 1;
let clickUpgradeCost = 10;
let unitsList = [];
let unitBaseCost = 50;
let inventory = [];
let maxInvSlots = 10;
let invUpgradeCost = 100;

let currentEnemyHP = 10;
let maxEnemyHP = 10;
let enemyInWave = 1;
let currentWave = 1;
let currentBiome = "Las";
let isBoss = false;
let timeLeft = 30;
let bossTimerInterval;

const monsters = { "Las": "👹", "Jaskinia": "🦇", "Wulkan": "🐉", "Boss": "🐲" };
const slotTypes = ["bron", "pancerz", "buty", "helm", "rekawice", "pierscien", "amulet"];

const itemPool = [
    { type: "bron", name: "Miecz", icon: "⚔️", power: 12, rarity: "common", chance: 0.2 },
    { type: "pancerz", name: "Zbroja", icon: "🛡️", power: 10, rarity: "common", chance: 0.15 },
    { type: "buty", name: "Buty", icon: "👟", speed: 600, rarity: "common", chance: 0.15 },
    { type: "helm", name: "Hełm", icon: "🪖", power: 7, rarity: "common", chance: 0.2 },
    { type: "rekawice", name: "Rękawice", icon: "🧤", power: 15, rarity: "rare", chance: 0.1 },
    { type: "pierscien", name: "Sygnet", icon: "💍", power: 25, rarity: "rare", chance: 0.05 },
    { type: "amulet", name: "Amulet", icon: "🧿", speed: 1500, rarity: "legendary", chance: 0.02 }
];

const achievements = [
    { id: 'g1', title: "Zbieracz", desc: "Zdobądź 500 złota", check: () => totalGoldEarned >= 500, unlocked: false },
    { id: 'u1', title: "Mała Armia", desc: "Miej 4 jednostki", check: () => unitsList.length >= 4, unlocked: false },
    { id: 'b1', title: "Pogromca", desc: "Pokonaj pierwszego Bossa", check: () => currentWave >= 2, unlocked: false }
];

function showMsg(text) {
    const el = document.getElementById('game-messages');
    el.innerText = text; el.style.opacity = 1;
    setTimeout(() => { el.style.opacity = 0; }, 2000);
}

// --- TOOLTIP POSITIONING ---
function positionTooltip(e) {
    const tooltip = e.currentTarget.querySelector('.item-tooltip');
    if (!tooltip) return;
    
    let x = e.clientX + 15;
    let y = e.clientY - 40;

    // Sprawdź czy nie wychodzi poza prawą krawędź
    if (x + 160 > window.innerWidth) {
        x = e.clientX - 160;
    }
    // Sprawdź czy nie wychodzi poza górę
    if (y < 0) y = 10;

    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
}

// --- DRAG & DROP ---
let draggedItemIdx = null;

function handleDragStart(e, index) {
    draggedItemIdx = index;
    const item = inventory[index];
    const ghost = document.getElementById('drag-ghost');
    ghost.innerText = item.icon;
    e.dataTransfer.setDragImage(ghost, 25, 25);
    document.querySelectorAll(`.slot[data-type="${item.type}"]`).forEach(s => s.classList.add('highlight'));
}

function handleDragEnd() {
    document.querySelectorAll('.slot').forEach(s => s.classList.remove('highlight', 'over'));
    draggedItemIdx = null;
}

function handleDrop(e, unitIdx, slotType) {
    e.preventDefault();
    if (draggedItemIdx === null) return;
    const item = inventory[draggedItemIdx];
    if (item.type !== slotType || unitsList[unitIdx].equipment[slotType]) {
        showMsg("Nie można założyć!"); return;
    }
    unitsList[unitIdx].equipment[slotType] = item;
    inventory.splice(draggedItemIdx, 1);
    renderUnits(); renderInventory(); updateUI();
}

// --- LOGIKA GRY ---
function defeatEnemy() {
    clearInterval(bossTimerInterval);
    document.getElementById('boss-container').style.display = 'none';
    let reward = Math.floor(maxEnemyHP / 2) * (isBoss ? 5 : 1);
    gold += reward; totalGoldEarned += reward;
    rollLoot(isBoss ? 3 : 1);
    if (isBoss) {
        isBoss = false; currentWave++; enemyInWave = 1; maxEnemyHP = Math.floor(maxEnemyHP * 2.2);
        if (currentWave > 10) changeBiome();
    } else {
        enemyInWave++; if (enemyInWave > 10) startBossFight();
    }
    currentEnemyHP = maxEnemyHP;
    checkAchievements(); updateUI();
}

function changeBiome() {
    currentWave = 1;
    const b = ["Las", "Jaskinia", "Wulkan", "Otchłań"];
    currentBiome = b[(b.indexOf(currentBiome) + 1) % b.length];
}

function rollLoot(multi) {
    itemPool.forEach(it => {
        if (Math.random() < (it.chance * multi) && inventory.length < maxInvSlots) {
            inventory.push({ ...it, id: Date.now() + Math.random() });
            showMsg("Znalazłeś: " + it.name);
        }
    });
    renderInventory();
}

// --- SKLEP ---
function buyNewUnit() {
    if (gold >= unitBaseCost && unitsList.length < 8) {
        gold -= unitBaseCost;
        unitsList.push({ power: 5, speed: 5000, progress: 0, pCost: 30, sCost: 50, equipment: {} });
        unitBaseCost = Math.floor(unitBaseCost * 2.5);
        renderUnits(); checkAchievements(); updateUI();
    }
}

function upgradeInventory() {
    if (gold >= invUpgradeCost) {
        gold -= invUpgradeCost; maxInvSlots += 5; invUpgradeCost *= 3;
        renderInventory(); updateUI();
    }
}

// --- RENDEROWANIE ---
function renderInventory() {
    const cont = document.getElementById('inventory-slots');
    cont.innerHTML = '';
    inventory.forEach((item, idx) => {
        const div = document.createElement('div');
        div.className = `item rarity-${item.rarity}`;
        div.draggable = true;
        const stats = item.power ? `+${item.power} Ataku` : `+${(item.speed/1000).toFixed(1)}s Tempo`;
        div.innerHTML = `${item.icon}<div class="item-tooltip"><b>${item.name}</b><br>${stats}</div>`;
        
        div.addEventListener('dragstart', (e) => handleDragStart(e, idx));
        div.addEventListener('dragend', handleDragEnd);
        div.addEventListener('mousemove', positionTooltip); // Dynamiczna pozycja
        cont.appendChild(div);
    });
    document.getElementById('inv-count').innerText = inventory.length;
    document.getElementById('inv-max').innerText = maxInvSlots;
}

function renderUnits() {
    const cont = document.getElementById('units-container');
    cont.innerHTML = '';
    unitsList.forEach((u, i) => {
        let tP = u.power; let sB = 0;
        Object.values(u.equipment).forEach(it => { tP += it.power || 0; sB += it.speed || 0; });
        let cS = Math.max(500, u.speed - sB);

        const card = document.createElement('div');
        card.className = 'unit-card';
        card.innerHTML = `
            <b>Bohater ${i+1}</b><br><small>ATK: ${tP} | ${(cS/1000).toFixed(1)}s</small>
            <div class="unit-equipment-grid">
                ${slotTypes.map(type => `
                    <div class="slot" data-type="${type}" 
                         ondragover="event.preventDefault(); this.classList.add('over')" 
                         ondragleave="this.classList.remove('over')"
                         ondrop="handleDrop(event, ${i}, '${type}')">
                        ${u.equipment[type] ? u.equipment[type].icon : ''}
                    </div>`).join('')}
            </div>
            <div class="unit-progress-bg"><div id="fill-${i}" class="unit-progress-fill"></div></div>
            <div class="unit-btns">
                <button onclick="upgradeUnitPower(${i})">Siła (${u.pCost})</button>
                <button onclick="upgradeUnitSpeed(${i})">Tempo (${u.sCost})</button>
            </div>`;
        cont.appendChild(card);
    });
}

function renderAchievements() {
    const cont = document.getElementById('achievements-list');
    cont.innerHTML = '';
    achievements.forEach(a => {
        const div = document.createElement('div');
        div.className = `achievement ${a.unlocked ? 'unlocked' : ''}`;
        div.innerHTML = `<span>${a.unlocked ? '✅' : '🔒'} ${a.title}</span><br><small>${a.desc}</small>`;
        cont.appendChild(div);
    });
}

function checkAchievements() {
    achievements.forEach(a => {
        if (!a.unlocked && a.check()) {
            a.unlocked = true; showMsg("Osiągnięcie: " + a.title);
        }
    });
    renderAchievements();
}

// --- SYSTEMY POMOCNICZE ---
function upgradeUnitPower(idx) {
    if (gold >= unitsList[idx].pCost) {
        gold -= unitsList[idx].pCost; unitsList[idx].power += 5;
        unitsList[idx].pCost = Math.floor(unitsList[idx].pCost * 1.8);
        renderUnits(); updateUI();
    }
}

function upgradeUnitSpeed(idx) {
    if (gold >= unitsList[idx].sCost && unitsList[idx].speed > 1000) {
        gold -= unitsList[idx].sCost; unitsList[idx].speed -= 400;
        unitsList[idx].sCost = Math.floor(unitsList[idx].sCost * 2.2);
        renderUnits(); updateUI();
    }
}

function upgradeClick() {
    if (gold >= clickUpgradeCost) {
        gold -= clickUpgradeCost; clickPower += 4; clickUpgradeCost = Math.floor(clickUpgradeCost * 2.3);
        updateUI();
    }
}

function startBossFight() {
    isBoss = true; timeLeft = 30; maxEnemyHP *= 3.5; currentEnemyHP = maxEnemyHP;
    document.getElementById('boss-container').style.display = 'block';
    bossTimerInterval = setInterval(() => {
        timeLeft--; document.getElementById('timer-sec').innerText = timeLeft;
        document.getElementById('boss-timer-bar').style.width = (timeLeft/30*100) + "%";
        if (timeLeft <= 0) { clearInterval(bossTimerInterval); isBoss = false; enemyInWave = 1; updateUI(); }
    }, 1000);
}

function updateUI() {
    document.getElementById('gold').innerText = Math.floor(gold);
    document.getElementById('biome').innerText = currentBiome;
    document.getElementById('wave-info').innerText = isBoss ? "BOSS!" : `Fala ${currentWave} (${enemyInWave}/10)`;
    document.getElementById('unit-cost').innerText = unitBaseCost;
    document.getElementById('click-cost').innerText = clickUpgradeCost;
    document.getElementById('inv-cost').innerText = invUpgradeCost;
    document.getElementById('enemy').innerText = isBoss ? monsters["Boss"] : monsters[currentBiome];
    let hpPerc = (currentEnemyHP / maxEnemyHP) * 100;
    document.getElementById('hp-bar').style.width = Math.max(0, hpPerc) + "%";
    document.getElementById('hp-text').innerText = `HP: ${Math.ceil(currentEnemyHP)} / ${maxEnemyHP}`;
}

setInterval(() => {
    unitsList.forEach((u, i) => {
        let sB = 0; Object.values(u.equipment).forEach(it => sB += it.speed || 0);
        let sp = Math.max(500, u.speed - sB);
        u.progress += 100;
        if (u.progress >= sp) {
            u.progress = 0;
            let p = u.power; Object.values(u.equipment).forEach(it => p += it.power || 0);
            currentEnemyHP -= p; if (currentEnemyHP <= 0) defeatEnemy(); updateUI();
        }
        let f = document.getElementById(`fill-${i}`);
        if (f) f.style.width = (u.progress / sp * 100) + "%";
    });
}, 100);

function addGold() { gold += parseInt(document.getElementById('gold-input').value || 0); totalGoldEarned += gold; updateUI(); checkAchievements(); }
function resetGame() { if(confirm("Zresetować?")) window.history.go(0); }

window.onload = () => {
    document.getElementById('enemy').onclick = () => {
        currentEnemyHP -= clickPower; if (currentEnemyHP <= 0) defeatEnemy(); updateUI();
    };
    renderAchievements(); updateUI();
};
