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
    activeLiquidity: 20000,  // 🔥 FIX: 20k Buffer to stop instant-crushing on server reboot
    totalGamesPlayed: 0
};

// ⚙️ CASINO SETTINGS
const HOUSE_EDGE_PERCENT = 0.15; 
const WITHDRAWAL_LIMIT = 3000; // 30 INR

let usersDB = {}; 

app.get('/', (req, res) => {
    res.send(`HeroClub Master Brain Active 🧠 | House Reserve: ${globalVault.houseReserve} Coins | Liquidity: ${globalVault.activeLiquidity}`);
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
        
        // 🔥 FIX: ANTI-NaN SHIELD. Strictly parse numbers to prevent database corruption.
        let bet = Math.floor(parseFloat(betAmount)) || 0;
        let userBalance = Math.floor(parseFloat(currentBalance)) || 0;
        let gameName = game ? game.toLowerCase() : "unknown";
        
        if (bet < 10) return res.json({ success: false, error: "Minimum bet is 10 Coins" });
        if (bet > userBalance) return res.json({ success: false, error: "Insufficient Balance" }); // Stop double-betting bugs

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
        let userNetProfit = user.totalWon - user.totalBet; 

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

        // --- A. THE STREAK BREAKER (Stop infinite winning) ---
        if (user.currentWinStreak >= 2) {
            if (rnd < 0.85) forceLoss = true; // 85% chance to lose after 2 wins
        }
        
        // --- B. PROTECT THE BANK ---
        if (globalVault.activeLiquidity < (bet * 2) && bet > 100) {
            forceLoss = true; // Pool is empty, crush big bets.
        } 

        // --- C. THE WITHDRAWAL GUARD (Trap free users near 3000 limit) ---
        if (userBalance >= 2500 && userBalance < WITHDRAWAL_LIMIT && !user.isVIP) {
            if (rnd < 0.80) forceLoss = true; // Slightly lowered to 80% to give them false hope
        }

        // --- D. BET SIZE LOGIC (If not already forced to lose) ---
        if (!forceLoss) {
            if (bet <= 300) {
                // 🤏 SMALL BETS (<= ₹3): Let them play, build addiction
                if (rnd < 0.55) {
                    forceLoss = true; // 55% lose
                } else if (rnd < 0.85) {
                    forceWin = true; // 30% normal win (2x-3x)
                } else {
                    allowHighFlight = true; // 15% high flight (4x-7x)
                }
            } 
            else if (bet <= 1000) {
                // 💵 MEDIUM BETS (₹3 - ₹10): Harder to win
                if (userNetProfit > 0) {
                    forceLoss = true; // If they are in overall profit, take it back
                } else {
                    if (rnd < 0.70) forceLoss = true; // 70% lose
                    else forceWin = true; 
                }
            } 
            else {
                // 💰 BIG BETS (> ₹10 / 1000+ Coins): Brutal Mode
                if (user.isVIP && userNetProfit < -(bet * 3)) {
                    // Pity for big VIP losers so they don't rage quit
                    if (rnd < 0.40) forceWin = true;
                    else forceLoss = true;
                } else {
                    // Crush free users or profitable VIPs trying to win big
                    if (rnd < 0.90) forceLoss = true; 
                    else forceWin = true;
                }
            }
        }

        // --- E. PITY SYSTEM OVERRIDE ---
        // Break long loss streaks to keep them engaged
        if (user.currentLossStreak >= 3 && globalVault.activeLiquidity > (bet * 3) && !forceWin) {
            forceLoss = false;
            forceWin = true;
            allowHighFlight = false;
        }

        // 4. GAME SPECIFIC MULTIPLIER GENERATION
        if (gameName.includes("crash") || gameName.includes("chicken") || gameName.includes("road")) {
            
            if (forceLoss) {
                targetMultiplier = 1.01 + (Math.random() * 0.19); // Crash between 1.01x - 1.20x
            } else if (allowHighFlight) {
                targetMultiplier = 4.5 + (Math.random() * 3.0); // 4.5x - 7.5x
            } else if (forceWin) {
                targetMultiplier = 1.8 + (Math.random() * 1.7); // 1.8x - 3.5x
            } else {
                targetMultiplier = 1.1 + (Math.random() * 0.5); // Fallback safe crash
            }
            
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

        // Send accurate Math format back to frontend
        res.json({
            success: true,
            multiplier: parseFloat(targetMultiplier.toFixed(2))
        });

    } catch (error) {
        console.error("Play API Error:", error);
        res.json({ success: false, error: "Brain Fault", multiplier: 1.05 }); // Safe fallback
    }
});


// ========================================================================
// 💸 THE CASHOUT ENDPOINT (For Crash / Chicken / Mines)
// ========================================================================
app.post('/api/cashout', (req, res) => {
    try {
        const { uid, cashoutAmount } = req.body;
        // 🔥 FIX: Strict Number Parsing
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
            // Cashout called with 0 (Lost)
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
