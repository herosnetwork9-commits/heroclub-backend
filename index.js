const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// ========================================================================
// 🏦 THE GLOBAL CASINO VAULT (LIQUIDITY POOL)
// ========================================================================
let globalVault = {
    totalBetsIn: 0,          // Duniya bhar ke users ne total kitna lagaya
    totalPayoutsOut: 0,      // Duniya bhar ke users ne total kitna jeeta
    houseReserve: 0,         // TERA PROFIT (15% of every bet locked here forever)
    activeLiquidity: 0,      // Game batne ke liye bacha hua paisa (Haarne walo ka paisa)
    totalGamesPlayed: 0
};

// ⚙️ CASINO SETTINGS
const HOUSE_EDGE_PERCENT = 0.15; // 15% guaranteed profit for the owner
const MAX_PAYOUT_FROM_POOL = 0.40; // Kisi ek jeetne wale ko pool ka max 40% hi milega, taki pool khali na ho

// 👥 USER PROFILES (Database Simulation)
let usersDB = {}; 

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
        user.totalBet += bet;
        let userNetProfit = user.totalWon - user.totalBet; // Negative means user is in Loss (Good for us)

        // 2. VAULT ACCOUNTING (Paisa Aaya)
        globalVault.totalBetsIn += bet;
        globalVault.totalGamesPlayed += 1;
        
        // Take House Edge (Tera Profit) FIRST!
        let houseCut = bet * HOUSE_EDGE_PERCENT;
        globalVault.houseReserve += houseCut;
        
        // Put the rest into the active liquidity pool (Jeetne walo ke liye)
        globalVault.activeLiquidity += (bet - houseCut);

        // 3. THE DECISION ENGINE 🧠 (Win or Lose?)
        let forceWin = false;
        let forceLoss = false;
        let targetMultiplier = 0;

        // --- PSYCHOLOGICAL CHECKS ---
        
        // Check A: Protect the Bank! 
        // Agar bank mein paisa nahi hai, sabko harao.
        if (globalVault.activeLiquidity < (bet * 2)) {
            forceLoss = true;
        } 
        
        // Check B: The Pity System (Keep them hooked)
        // Agar user 2-3 baar se lagatar haar raha hai, aur Bank mein paisa hai, toh usko jeeta do.
        else if (user.currentLossStreak >= 2) {
            let maxAffordableWin = globalVault.activeLiquidity * MAX_PAYOUT_FROM_POOL;
            if (maxAffordableWin > (bet * 1.5)) { 
                forceWin = true; // Bank allow kar raha hai, isko khush kar do!
            } else {
                forceLoss = true; // Bank mein paisa nahi hai isko khush karne ke liye
            }
        }
        
        // Check C: The Whale / Abuser Check
        // Agar user ka net profit bahut zyada ho gaya hai, usko harao.
        else if (userNetProfit > (bet * 20)) {
            forceLoss = true;
        }
        
        // Normal Gameplay (Probability based on Liquidity)
        else {
            let rnd = Math.random();
            // Free user win chance: 35%. VIP win chance: 45%.
            let winChance = user.isVIP ? 0.45 : 0.35; 
            
            if (rnd < winChance) forceWin = true;
            else forceLoss = true;
        }

        // 4. GAME SPECIFIC MULTIPLIER GENERATION
        if (gameName.includes("crash") || gameName.includes("chicken") || gameName.includes("road")) {
            // Interactive Games (Crash Point Generation)
            if (forceLoss) {
                // Harao, par illusion maintain karo (1.01x - 1.25x)
                targetMultiplier = 1.01 + (Math.random() * 0.24);
                user.currentLossStreak += 1;
                user.currentWinStreak = 0;
            } else {
                // Jeetao (Calculate based on how much bank can afford)
                let maxAffordableMultiplier = (globalVault.activeLiquidity * MAX_PAYOUT_FROM_POOL) / bet;
                
                if (maxAffordableMultiplier < 1.5) {
                    // Fallback if math fails
                    targetMultiplier = 1.05 + Math.random() * 0.2; 
                    user.currentLossStreak += 1;
                } else {
                    // Give them a good flight between 1.5x and the max the bank can afford (Capped at 10x for normal wins)
                    let safeMax = Math.min(10.0, maxAffordableMultiplier);
                    targetMultiplier = 1.5 + (Math.random() * (safeMax - 1.5));
                    
                    // Note: We don't reset streaks here because in Crash, they might cash out early or greed out and die.
                    // Streak logic for crash is handled in /api/cashout
                }
            }
        } 
        else {
            // Fixed Odds Games (Color, Dice, Flip - Instant Result)
            if (forceLoss) {
                targetMultiplier = 0;
                user.currentLossStreak += 1;
                user.currentWinStreak = 0;
            } else {
                targetMultiplier = 1.8 + (Math.random() * 0.2); // Typical payout is 1.8x to 2x
                
                // Payout Instantly for Fixed Games
                let winAmount = Math.floor(bet * targetMultiplier);
                globalVault.activeLiquidity -= winAmount; // Paise pool se kate
                globalVault.totalPayoutsOut += winAmount;
                user.totalWon += winAmount;
                
                user.currentWinStreak += 1;
                user.currentLossStreak = 0;
            }
        }

        res.json({
            success: true,
            multiplier: targetMultiplier,
            liquidityHealth: globalVault.activeLiquidity > 5000 ? "Good" : "Low" // For debugging
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
            // User successfully cashed out!
            
            // Security Check: Does the pool have enough?
            if (globalVault.activeLiquidity >= payout) {
                globalVault.activeLiquidity -= payout; // Remove from pool
                globalVault.totalPayoutsOut += payout;
                user.totalWon += payout;
                
                user.currentWinStreak += 1;
                user.currentLossStreak = 0;
                
                res.json({ success: true, payout: payout });
            } else {
                // RARE EMERGENCY: The system messed up and someone won more than the pool has.
                // We have to pay them from the House Reserve (Tera Profit cut jayega thoda)
                globalVault.houseReserve -= payout; 
                globalVault.totalPayoutsOut += payout;
                user.totalWon += payout;
                
                console.log("🚨 WARNING: PAID FROM HOUSE RESERVE!");
                res.json({ success: true, payout: payout });
            }
        } else {
            // User crashed/lost
            user.currentLossStreak += 1;
            user.currentWinStreak = 0;
            res.json({ success: true, payout: 0 });
        }
        
    } catch (error) {
        res.json({ success: false });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Initial House Edge set to: ${HOUSE_EDGE_PERCENT * 100}%`);
});
