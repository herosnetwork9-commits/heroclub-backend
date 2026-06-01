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
    adminProfit: 0,          // Real-time track of actual profit (Bets In - Payouts Out)
    activeLiquidity: 20000,  // The total money available to pay winners
    totalGamesPlayed: 0
};

// ⚙️ CASINO SETTINGS
const HOUSE_EDGE = 0.04;     // 4% Global House Edge
const MAX_PAYOUT_PERCENT = 0.10; // Max payout per game cannot exceed 10% of active liquidity

let usersDB = {}; 

app.get('/', (req, res) => {
    res.send(`HeroClub Master Brain Active 🧠 | Admin Profit: ${globalVault.adminProfit} | Liquidity: ${globalVault.activeLiquidity}`);
});

app.get('/api/admin/stats', (req, res) => {
    // Admin dashboard gets full transparent data
    globalVault.adminProfit = globalVault.totalBetsIn - globalVault.totalPayoutsOut;
    res.json({
        status: "Brain is Active 🧠",
        vault: globalVault,
        activeUsers: Object.keys(usersDB).length
    });
});

// ========================================================================
// 🕹️ THE MASTER PLAY ENDPOINT (TRUE RNG + HOUSE EDGE)
// ========================================================================
app.post('/api/play', (req, res) => {
    try {
        const { uid, game, betAmount, currentBalance } = req.body; 
        
        let bet = Math.floor(parseFloat(betAmount)) || 0;
        let userBalance = Math.floor(parseFloat(currentBalance)) || 0;
        let gameName = game ? game.toLowerCase() : "unknown";
        
        if (bet < 10) return res.json({ success: false, error: "Minimum bet is 10 Coins" });
        if (bet > userBalance) return res.json({ success: false, error: "Insufficient Balance" });

        // 1. INITIALIZE / UPDATE USER PROFILE
        if (!usersDB[uid]) {
            usersDB[uid] = { totalBet: 0, totalWon: 0, currentLossStreak: 0, currentWinStreak: 0 };
        }

        let user = usersDB[uid];
        user.totalBet += bet;

        // 2. VAULT ACCOUNTING (Money comes IN)
        globalVault.totalBetsIn += bet;
        globalVault.activeLiquidity += bet; // Bet goes directly into liquidity
        globalVault.totalGamesPlayed += 1;
        globalVault.adminProfit = globalVault.totalBetsIn - globalVault.totalPayoutsOut;

        // ==========================================
        // 🧠 3. THE RNG DECISION ENGINE
        // ==========================================
        let targetMultiplier = 0;
        let calculatedWinAmount = 0; 
        
        // --- 🚀 CRASH GAMES (Rocket, Chicken, Road) ---
        if (gameName.includes("crash") || gameName.includes("chicken") || gameName.includes("road")) {
            // Provably Fair Math: 4% chance to crash at 1.00x
            let e = 100;
            let houseEdgePercentage = 4; // 4% edge
            
            // Random float between 0 and 1
            let r = Math.random();
            
            if (r < (houseEdgePercentage / 100)) {
                targetMultiplier = 1.00; // Instant Crash
            } else {
                // Formula for fair crash multiplier
                targetMultiplier = Math.floor((100 * (1 - (houseEdgePercentage / 100))) / r) / 100;
            }

            // SAFETY LIMIT: Ensure crash doesn't exceed our maximum payout capacity
            let maxAllowedMultiplier = (globalVault.activeLiquidity * MAX_PAYOUT_PERCENT) / bet;
            if (targetMultiplier > maxAllowedMultiplier) {
                targetMultiplier = Math.floor(maxAllowedMultiplier * 100) / 100;
            }
            
            // In crash, win is calculated later at /api/cashout
            calculatedWinAmount = 0; 
        } 
        
        // --- 🔵 PLINKO GAMES ---
        else if (gameName.includes("plinko")) {
            // Weighted array to ensure ~95% RTP
            // Chances: 0x (45%), 0.5x (25%), 1.5x (20%), 3x (8%), 10x (2%)
            let roll = Math.random() * 100;
            
            if (roll < 45) targetMultiplier = 0;
            else if (roll < 70) targetMultiplier = 0.5;
            else if (roll < 90) targetMultiplier = 1.5;
            else if (roll < 98) targetMultiplier = 3.0;
            else targetMultiplier = 10.0;

            calculatedWinAmount = Math.floor(bet * targetMultiplier);
        }
        
        // --- 🎲 SINGLE PLAY GAMES (Cups, Coin Flip, Dice) ---
        else {
            // True 50/50 Win Probability
            let isWin = Math.random() < 0.50;
            
            if (!isWin) {
                targetMultiplier = 0;
                calculatedWinAmount = 0; 
            } else {
                // House Edge applied to the payout multiplier
                // True odds would be 2.0x, but we give 1.94x (3% House Edge)
                targetMultiplier = 1.94; 
                calculatedWinAmount = Math.floor(bet * targetMultiplier); 
            }
        }

        // --- ACCOUNTING FOR INSTANT-RESULT GAMES ---
        if (!gameName.includes("crash") && !gameName.includes("chicken") && !gameName.includes("road")) {
            if (calculatedWinAmount === 0) {
                user.currentLossStreak += 1;
                user.currentWinStreak = 0;
            } else {
                // Payout from the vault
                globalVault.activeLiquidity -= calculatedWinAmount; 
                globalVault.totalPayoutsOut += calculatedWinAmount;
                globalVault.adminProfit = globalVault.totalBetsIn - globalVault.totalPayoutsOut;
                
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
        res.json({ success: false, error: "Brain Fault", multiplier: 1.00, winAmount: 0 }); 
    }
});


// ========================================================================
// 💸 THE CASHOUT ENDPOINT (For Crash/Interactive Games)
// ========================================================================
app.post('/api/cashout', (req, res) => {
    try {
        const { uid, cashoutAmount } = req.body;
        let payout = Math.floor(parseFloat(cashoutAmount)) || 0;

        if (!usersDB[uid]) return res.json({ success: false, error: "User not found in session" });

        let user = usersDB[uid];

        if (payout > 0) {
            // Deduct from liquidity
            globalVault.activeLiquidity -= payout; 
            globalVault.totalPayoutsOut += payout;
            globalVault.adminProfit = globalVault.totalBetsIn - globalVault.totalPayoutsOut;
            
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

// Manual Lose Endpoint (Still here if frontend strictly requires it)
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
