const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// ========================================================================
// 🏦 THE GLOBAL CASINO VAULT (LIQUIDITY POOL)
// ========================================================================
let globalVault = {
    totalBetsIn: 0,          
    totalPayoutsOut: 0,      
    houseReserve: 0,         
    activeLiquidity: 20000,  const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// ========================================================================
// 🏦 THE GLOBAL CASINO VAULT (LIQUIDITY POOL)
// ========================================================================
let globalVault = {
    totalBetsIn: 0,          
    totalPayoutsOut: 0,      
    houseReserve: 0,         
    activeLiquidity: 20000,  // 20k Buffer intact
    totalGamesPlayed: 0
};

// ⚙️ CASINO SETTINGS
const HOUSE_EDGE_PERCENT = 0.15; 
const WITHDRAWAL_LIMIT = 3000; 

let usersDB = {}; 

app.get('/', (req, res) => {
    res.send(`HeroClub Master Brain Active 🧠 | House Profit: ${globalVault.houseReserve} | User Liquidity Pool: ${globalVault.activeLiquidity}`);
});

app.get('/api/admin/stats', (req, res) => {
    res.json({
        status: "Brain is Active 🧠",
        vault: globalVault,
        activeUsers: Object.keys(usersDB).length
    });
});

// ========================================================================
// 🕹️ THE MASTER PLAY ENDPOINT (AI DECISION ENGINE)
// ========================================================================
app.post('/api/play', (req, res) => {
    try {
        const { uid, game, betAmount, isDepositor, currentBalance } = req.body; 
        
        let bet = Math.floor(parseFloat(betAmount)) || 0;
        let userBalance = Math.floor(parseFloat(currentBalance)) || 0;
        let gameName = game ? game.toLowerCase() : "unknown";
        
        if (bet < 10) return res.json({ success: false, error: "Minimum bet is 10 Coins" });
        if (bet > userBalance) return res.json({ success: false, error: "Insufficient Balance" });

        // 1. INITIALIZE / UPDATE USER PROFILE
        if (!usersDB[uid]) {
            usersDB[uid] = { 
                totalBet: 0, totalWon: 0, 
                currentLossStreak: 0, currentWinStreak: 0,
                isVIP: isDepositor || false
            };
        }

        let user = usersDB[uid];
        if (isDepositor) user.isVIP = true; 
        
        user.totalBet += bet;
        let userNetProfit = user.totalWon - user.totalBet; 

        // 2. VAULT ACCOUNTING
        globalVault.totalBetsIn += bet;
        globalVault.totalGamesPlayed += 1;
        
        let houseCut = bet * HOUSE_EDGE_PERCENT;
        globalVault.houseReserve += houseCut;
        globalVault.activeLiquidity += (bet - houseCut);

        // ==========================================
        // 🧠 3. THE AI DECISION ENGINE (60/40 & VIP Logic intact)
        // ==========================================
        let forceWin = false;
        let forceLoss = false;
        let allowHighFlight = false; 
        let bigWinMultiplier = 0; 
        let targetMultiplier = 0;
        let isFreeUser = !user.isVIP;

        let rnd = Math.random(); 

        // --- RULE 1: STRICT VAULT PROTECTION ---
        if (globalVault.activeLiquidity < (bet * 2)) forceLoss = true; 

        // --- RULE 2: FREE USER 12% LUCKY ALLOWANCE ---
        if (!forceLoss && isFreeUser && userBalance >= 2500 && userBalance < WITHDRAWAL_LIMIT) {
            if (globalVault.activeLiquidity > 10000 && rnd < 0.12) {
                forceWin = true; allowHighFlight = true; 
            } else {
                if (Math.random() < 0.85) forceLoss = true;
            }
        }

        // --- RULE 3: VIP RECOVERY ---
        if (!forceLoss && !isFreeUser && userNetProfit < -(bet * 10)) {
            if (rnd < 0.25 && globalVault.activeLiquidity > Math.abs(userNetProfit)) {
                forceWin = true; allowHighFlight = true;
                let neededMult = Math.abs(userNetProfit) / bet;
                bigWinMultiplier = Math.min(neededMult, 15.0); 
            }
        }

        // --- RULE 4: GENERAL GAMEPLAY (60/40 Split) ---
        if (!forceWin && !forceLoss && bigWinMultiplier === 0) {
            if (bet <= 300) {
                if (rnd < 0.60) forceLoss = true; 
                else if (rnd < 0.85) forceWin = true; 
                else allowHighFlight = true; 
            } 
            else if (bet <= 1000) {
                if (userNetProfit > 0) forceLoss = true; 
                else {
                    if (rnd < 0.70) forceLoss = true;
                    else forceWin = true; 
                }
            } 
            else {
                if (rnd < 0.80) forceLoss = true; 
                else forceWin = true;
            }
        }

        // --- RULE 5: ANTI-STREAK LOGIC ---
        if (user.currentWinStreak >= 3) forceLoss = true; 
        if (user.currentLossStreak >= 4 && globalVault.activeLiquidity > (bet * 3) && !forceLoss) {
            forceWin = true; 
        }

        // ==========================================
        // 🚀 4. GENERATING EXACT MULTIPLIER BY GAME TYPE
        // ==========================================
        let calculatedWinAmount = 0; 

        if (gameName.includes("crash") || gameName.includes("chicken") || gameName.includes("road")) {
            // 🔥 1. CRASH GAMES (Random Decimals)
            if (forceLoss) targetMultiplier = 1.01 + (Math.random() * 0.19);
            else if (bigWinMultiplier > 0) {
                targetMultiplier = bigWinMultiplier * (0.8 + (Math.random() * 0.4)); 
                if(targetMultiplier < 2.0) targetMultiplier = 2.0; 
            } 
            else if (allowHighFlight) targetMultiplier = 4.5 + (Math.random() * 6.5); 
            else if (forceWin) targetMultiplier = 1.5 + (Math.random() * 2.0); 
            else targetMultiplier = 1.15 + (Math.random() * 0.35); 
            
            calculatedWinAmount = 0; // Win amount calculated at Cashout
        } 
        else if (gameName.includes("plinko")) {
            // 🔥 2. PLINKO GAMES (Strict Array Multipliers)
            if (forceLoss) {
                targetMultiplier = 0;
            } else if (allowHighFlight || bigWinMultiplier > 0) {
                let highMults = [10, 3, 2.5];
                targetMultiplier = highMults[Math.floor(Math.random() * highMults.length)];
            } else {
                let winMults = [2, 1.6, 1.4, 1.2];
                targetMultiplier = winMults[Math.floor(Math.random() * winMults.length)];
            }
            calculatedWinAmount = Math.floor(bet * targetMultiplier);
        }
        else {
            // 🔥 3. SINGLE PLAY GAMES (Cups, Coin Flip, Dice) - STRICT 1.8x
            if (forceLoss) {
                targetMultiplier = 0;
                calculatedWinAmount = 0; 
            } else {
                targetMultiplier = 1.8; // EXACTLY 1.8x
                calculatedWinAmount = Math.floor(bet * 1.8); 
            }
        }

        // --- ACCOUNTING FOR NON-CRASH GAMES ---
        if (!gameName.includes("crash") && !gameName.includes("chicken") && !gameName.includes("road")) {
            if (targetMultiplier === 0) {
                user.currentLossStreak += 1;
                user.currentWinStreak = 0;
            } else {
                globalVault.activeLiquidity -= calculatedWinAmount; 
                globalVault.totalPayoutsOut += calculatedWinAmount;
                user.totalWon += calculatedWinAmount;
                user.currentWinStreak += 1; 
                user.currentLossStreak = 0;
            }
        }

        res.json({
            success: true,
            multiplier: parseFloat(targetMultiplier.toFixed(2)),
            winAmount: calculatedWinAmount 
        });

    } catch (error) {
        console.error("Play API Error:", error);
        res.json({ success: false, error: "Brain Fault", multiplier: 1.05, winAmount: 0 }); 
    }
});


// ========================================================================
// 💸 THE CASHOUT ENDPOINT (For Crash Games)
// ========================================================================
app.post('/api/cashout', (req, res) => {
    try {
        const { uid, cashoutAmount } = req.body;
        let payout = Math.floor(parseFloat(cashoutAmount)) || 0;

        if (!usersDB[uid]) return res.json({ success: false, error: "User not found in session" });

        let user = usersDB[uid];

        if (payout > 0) {
            if (globalVault.activeLiquidity >= payout) globalVault.activeLiquidity -= payout; 
            else globalVault.houseReserve -= payout; 
            
            globalVault.totalPayoutsOut += payout;
            user.totalWon += payout;
            user.currentWinStreak += 1;
            user.currentLossStreak = 0;
            
            res.json({ success: true, payout: payout });
        } else {
            user.currentLossStreak += 1;
            user.currentWinStreak = 0;
            res.json({ success: true, payout: 0 });
        }
    } catch (error) {
        console.error("Cashout API Error:", error);
        res.json({ success: false });
    }
});

// Explicit Lose Endpoint
app.post('/api/lose', (req, res) => {
    try {
        const { uid } = req.body;
        if (usersDB[uid]) {
            usersDB[uid].currentLossStreak += 1;
            usersDB[uid].currentWinStreak = 0;
        }
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
    totalGamesPlayed: 0
};

// ⚙️ CASINO SETTINGS
const HOUSE_EDGE_PERCENT = 0.15; 
const WITHDRAWAL_LIMIT = 3000; 

let usersDB = {}; 

app.get('/', (req, res) => {
    res.send(`HeroClub Master Brain Active 🧠 | House Profit: ${globalVault.houseReserve} | User Liquidity Pool: ${globalVault.activeLiquidity}`);
});

app.get('/api/admin/stats', (req, res) => {
    res.json({
        status: "Brain is Active 🧠",
        vault: globalVault,
        activeUsers: Object.keys(usersDB).length
    });
});

// ========================================================================
// 🕹️ THE MASTER PLAY ENDPOINT (AI DECISION ENGINE)
// ========================================================================
app.post('/api/play', (req, res) => {
    try {
        const { uid, game, betAmount, isDepositor, currentBalance } = req.body; 
        
        let bet = Math.floor(parseFloat(betAmount)) || 0;
        let userBalance = Math.floor(parseFloat(currentBalance)) || 0;
        let gameName = game ? game.toLowerCase() : "unknown";
        
        if (bet < 10) return res.json({ success: false, error: "Minimum bet is 10 Coins" });
        if (bet > userBalance) return res.json({ success: false, error: "Insufficient Balance" });

        // 1. INITIALIZE / UPDATE USER PROFILE
        if (!usersDB[uid]) {
            usersDB[uid] = { 
                totalBet: 0, totalWon: 0, 
                currentLossStreak: 0, currentWinStreak: 0,
                isVIP: isDepositor || false
            };
        }

        let user = usersDB[uid];
        if (isDepositor) user.isVIP = true; 
        
        user.totalBet += bet;
        let userNetProfit = user.totalWon - user.totalBet; 

        // 2. VAULT ACCOUNTING
        globalVault.totalBetsIn += bet;
        globalVault.totalGamesPlayed += 1;
        
        let houseCut = bet * HOUSE_EDGE_PERCENT;
        globalVault.houseReserve += houseCut;
        globalVault.activeLiquidity += (bet - houseCut);

        // ==========================================
        // 🧠 3. THE AI DECISION ENGINE
        // ==========================================
        let forceWin = false;
        let forceLoss = false;
        let allowHighFlight = false; 
        let bigWinMultiplier = 0; 
        let targetMultiplier = 0;
        let isFreeUser = !user.isVIP;

        let rnd = Math.random(); 

        // --- RULE 1: STRICT VAULT PROTECTION ---
        if (globalVault.activeLiquidity < (bet * 2)) {
            forceLoss = true; 
        }

        // --- RULE 2: FREE USER 12% LUCKY ALLOWANCE ---
        if (!forceLoss && isFreeUser && userBalance >= 2500 && userBalance < WITHDRAWAL_LIMIT) {
            if (globalVault.activeLiquidity > 10000 && rnd < 0.12) {
                forceWin = true;
                allowHighFlight = true; 
            } else {
                if (Math.random() < 0.85) forceLoss = true;
            }
        }

        // --- RULE 3: VIP "OWN MONEY BACK" RECOVERY ---
        if (!forceLoss && !isFreeUser && userNetProfit < -(bet * 10)) {
            if (rnd < 0.25 && globalVault.activeLiquidity > Math.abs(userNetProfit)) {
                forceWin = true;
                allowHighFlight = true;
                let neededMult = Math.abs(userNetProfit) / bet;
                bigWinMultiplier = Math.min(neededMult, 15.0); 
            }
        }

        // --- RULE 4: GENERAL GAMEPLAY (Standard 60/40 Split) ---
        if (!forceWin && !forceLoss && bigWinMultiplier === 0) {
            if (bet <= 300) {
                if (rnd < 0.60) forceLoss = true; 
                else if (rnd < 0.85) forceWin = true; 
                else allowHighFlight = true; 
            } 
            else if (bet <= 1000) {
                if (userNetProfit > 0) forceLoss = true; 
                else {
                    if (rnd < 0.70) forceLoss = true;
                    else forceWin = true; 
                }
            } 
            else {
                if (rnd < 0.80) forceLoss = true; 
                else forceWin = true;
            }
        }

        // --- RULE 5: ANTI-STREAK LOGIC ---
        if (user.currentWinStreak >= 3) forceLoss = true; 
        if (user.currentLossStreak >= 4 && globalVault.activeLiquidity > (bet * 3) && !forceLoss) {
            forceWin = true; 
        }

        // ==========================================
        // 🚀 4. GENERATING MULTIPLIER & CALCULATING WIN AMOUNT
        // ==========================================
        let calculatedWinAmount = 0; // 🔥 FIX: Properly initializing winAmount

        if (gameName.includes("crash") || gameName.includes("chicken") || gameName.includes("road")) {
            if (forceLoss) targetMultiplier = 1.01 + (Math.random() * 0.19);
            else if (bigWinMultiplier > 0) {
                targetMultiplier = bigWinMultiplier * (0.8 + (Math.random() * 0.4)); 
                if(targetMultiplier < 2.0) targetMultiplier = 2.0; 
            } 
            else if (allowHighFlight) targetMultiplier = 4.5 + (Math.random() * 6.5); 
            else if (forceWin) targetMultiplier = 1.5 + (Math.random() * 2.0); 
            else targetMultiplier = 1.15 + (Math.random() * 0.35); 
            
            // For Crash, WinAmount is handled during /cashout endpoint
            calculatedWinAmount = 0; 
        } 
        else {
            // Logic for Fixed Odds Games (Plinko, Cups, Dice)
            if (forceLoss) {
                targetMultiplier = 0;
                user.currentLossStreak += 1;
                user.currentWinStreak = 0;
                calculatedWinAmount = 0; // Lost
            } else {
                targetMultiplier = 1.8 + (Math.random() * 0.2); 
                calculatedWinAmount = Math.floor(bet * targetMultiplier); // 🔥 FIX: Calculating correct win
                
                globalVault.activeLiquidity -= calculatedWinAmount; 
                globalVault.totalPayoutsOut += calculatedWinAmount;
                user.totalWon += calculatedWinAmount;
                
                user.currentWinStreak += 1; 
                user.currentLossStreak = 0;
            }
        }

        // Send accurate Math format back to frontend with the MISSING winAmount!
        res.json({
            success: true,
            multiplier: parseFloat(targetMultiplier.toFixed(2)),
            winAmount: calculatedWinAmount // 🔥 THE FIX THAT SAVES ACCOUNTS
        });

    } catch (error) {
        console.error("Play API Error:", error);
        res.json({ success: false, error: "Brain Fault", multiplier: 1.05, winAmount: 0 }); 
    }
});


// ========================================================================
// 💸 THE CASHOUT ENDPOINT (For Crash Games)
// ========================================================================
app.post('/api/cashout', (req, res) => {
    try {
        const { uid, cashoutAmount } = req.body;
        let payout = Math.floor(parseFloat(cashoutAmount)) || 0;

        if (!usersDB[uid]) return res.json({ success: false, error: "User not found in session" });

        let user = usersDB[uid];

        if (payout > 0) {
            if (globalVault.activeLiquidity >= payout) globalVault.activeLiquidity -= payout; 
            else globalVault.houseReserve -= payout; 
            
            globalVault.totalPayoutsOut += payout;
            user.totalWon += payout;
            user.currentWinStreak += 1;
            user.currentLossStreak = 0;
            
            res.json({ success: true, payout: payout });
        } else {
            user.currentLossStreak += 1;
            user.currentWinStreak = 0;
            res.json({ success: true, payout: 0 });
        }
    } catch (error) {
        console.error("Cashout API Error:", error);
        res.json({ success: false });
    }
});

// Explicit Lose Endpoint
app.post('/api/lose', (req, res) => {
    try {
        const { uid } = req.body;
        if (usersDB[uid]) {
            usersDB[uid].currentLossStreak += 1;
            usersDB[uid].currentWinStreak = 0;
        }
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
