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

function showMsg(text) {
    const el = document.getElementById('game-messages');
    el.innerText = text;
    el.style.opacity = 1;
    setTimeout(() => { el.style.opacity = 0; }, 2000);
}

// --- SYSTEM PRZECIĄGANIA (Wersja v2 - Naprawiona graficznie) ---
let draggedItemIdx = null;

function handleDragStart(e, index) {
    draggedItemIdx = index;
    const item = inventory[index];
    
    // Tworzymy czysty obrazek pod kursorem (Ghost Image)
    const ghost = document.getElementById('drag-ghost');
    ghost.innerText = item.icon;
    e.dataTransfer.setDragImage(ghost, 25, 25);
    e.dataTransfer.effectAllowed = "move";
    
    // Podświetlamy pasujące sloty
    document.querySelectorAll(`.slot[data-type="${item.type}"]`).forEach(slot => {
        slot.classList.add('highlight');
    });
}

function handleDragEnd() {
    document.querySelectorAll('.slot').forEach(slot => {
        slot.classList.remove('highlight', 'over');
    });
    draggedItemIdx = null;
}

function handleDrop(e, unitIdx, slotType) {
    e.preventDefault();
    if (draggedItemIdx === null) return;

    const item = inventory[draggedItemIdx];
    if (item.type !== slotType) {
        showMsg("To nie ten slot!");
        return;
    }
    if (unitsList[unitIdx].equipment[slotType]) {
        showMsg("Slot zajęty!");
        return;
    }

    unitsList[unitIdx].equipment[slotType] = item;
    inventory.splice(draggedItemIdx, 1);
    
    renderUnits();
    renderInventory();
    updateUI();
    showMsg("Założono: " + item.name);
}

// --- LOGIKA WALKI ---
function defeatEnemy() {
    clearInterval(bossTimerInterval);
    document.getElementById('boss-container').style.display = 'none';
    let reward = Math.floor(maxEnemyHP / 2);
    if (isBoss) reward *= 5;
    gold += reward; totalGoldEarned += reward;

    rollLoot(isBoss ? 3 : 1);

    if (isBoss) {
        isBoss = false; currentWave++; enemyInWave = 1; maxEnemyHP = Math.floor(maxEnemyHP * 2.2);
        if (currentWave > 10) changeBiome();
    } else {
        enemyInWave++; if (enemyInWave > 10) startBossFight();
    }
    currentEnemyHP = maxEnemyHP;
    updateUI();
}

function rollLoot(multi) {
    itemPool.forEach(baseItem => {
        if (Math.random() < (baseItem.chance * multi)) {
            if (inventory.length < maxInvSlots) {
                inventory.push({ ...baseItem, id: Date.now() + Math.random() });
                showMsg("Znaleziono: " + baseItem.name);
            } else {
                showMsg("Magazyn pełny!");
            }
        }
    });
    renderInventory();
}

function changeBiome() {
    currentWave = 1;
    const biomes = ["Las", "Jaskinia", "Wulkan", "Otchłań"];
    currentBiome = biomes[(biomes.indexOf(currentBiome) + 1) % biomes.length];
}

// --- SKLEP I ULEPSZENIA ---
function buyNewUnit() {
    if (gold >= unitBaseCost && unitsList.length < 8) {
        gold -= unitBaseCost;
        unitsList.push({ power: 5, speed: 5000, progress: 0, pCost: 30, sCost: 50, equipment: {} });
        unitBaseCost = Math.floor(unitBaseCost * 2.5);
        renderUnits(); updateUI();
    } else showMsg("Brak złota lub miejsca!");
}

function upgradeInventory() {
    if (gold >= invUpgradeCost) {
        gold -= invUpgradeCost; maxInvSlots += 5; invUpgradeCost *= 3;
        renderInventory(); updateUI();
        showMsg("Powiększono magazyn!");
    }
}

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

// --- RENDERING ---
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
        Object.values(u.equipment).forEach(it => { if(it.power) tP += it.power; if(it.speed) sB += it.speed; });
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

// --- PĘTLA GŁÓWNA ---
setInterval(() => {
    unitsList.forEach((u, i) => {
        let sB = 0; Object.values(u.equipment).forEach(it => { if(it.speed) sB += it.speed; });
        let sp = Math.max(500, u.speed - sB);
        u.progress += 100;
        if (u.progress >= sp) {
            u.progress = 0;
            let p = u.power; Object.values(u.equipment).forEach(it => { if(it.power) p += it.power; });
            dealDamage(p);
        }
        let f = document.getElementById(`fill-${i}`);
        if (f) f.style.width = (u.progress / sp * 100) + "%";
    });
}, 100);

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
    document.querySelectorAll('button').forEach(btn => {
        let costMatch = btn.innerText.match(/\d+/);
        let cost = costMatch ? parseInt(costMatch[0]) : (btn.querySelector('span') ? parseInt(btn.querySelector('span').innerText) : null);
        if (cost) btn.disabled = gold < cost;
    });
}

function upgradeClick() {
    if (gold >= clickUpgradeCost) {
        gold -= clickUpgradeCost; clickPower += 4; clickUpgradeCost = Math.floor(clickUpgradeCost * 2.3);
        updateUI(); showMsg("Zwiększono siłę kliknięcia!");
    }
}

function startBossFight() {
    isBoss = true; timeLeft = 30; maxEnemyHP *= 3.5; currentEnemyHP = maxEnemyHP;
    document.getElementById('boss-container').style.display = 'block';
    bossTimerInterval = setInterval(() => {
        timeLeft--; document.getElementById('timer-sec').innerText = timeLeft;
        document.getElementById('boss-timer-bar').style.width = (timeLeft/30*100) + "%";
        if (timeLeft <= 0) { clearInterval(bossTimerInterval); isBoss = false; enemyInWave = 1; updateUI(); showMsg("Porażka!"); }
    }, 1000);
}

function dealDamage(a) { currentEnemyHP -= a; if (currentEnemyHP <= 0) defeatEnemy(); updateUI(); }
function addGold() { gold += parseInt(document.getElementById('gold-input').value || 0); updateUI(); }

// NAPRAWA BŁĘDU CODEPEN (location.reload zamiast usuwania)
function resetGame() { 
    if(confirm("Czy na pewno chcesz zresetować postęp?")) {
        window.history.go(0); // Alternatywa dla location.reload() bezpieczna w CodePen
    } 
}

window.onload = () => {
    document.getElementById('enemy').onclick = () => {
        dealDamage(clickPower);
        document.getElementById('enemy').style.transform = "scale(0.8)";
        setTimeout(() => document.getElementById('enemy').style.transform = "scale(1)", 50);
    };
    updateUI();
};