const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// 📊 GLOBAL POOL & CASINO MATH
let globalStats = {
    totalBetsReceived: 100000, 
    totalPayoutsGiven: 50000,  
    houseProfit: 50000,        
    totalGamesPlayed: 0
};

// Target Profit. Iske upar jo bhi profit hoga, wo 'Extra Profit Pool' mein jayega free users ko baantne ke liye.
const DESIRED_BASE_PROFIT = 20000; 

let userStats = {}; 
const WITHDRAWAL_LIMIT = 3000;

app.get('/', (req, res) => {
    let extraProfit = Math.max(0, globalStats.houseProfit - DESIRED_BASE_PROFIT);
    res.send(`HeroClub Ultimate Brain Live! 🚀 | House Profit: ${globalStats.houseProfit} | Extra Pool: ${extraProfit}`);
});

app.post('/api/play', (req, res) => {
    try {
        const { uid, game, betAmount, isDepositor, currentBalance } = req.body; 
        
        let depositorStatus = isDepositor || false; 
        let userBalance = parseFloat(currentBalance) || 0; 
        let gameName = game ? game.toLowerCase() : "";
        let bet = parseFloat(betAmount) || 0;

        if (bet <= 0) return res.json({ success: false, error: "Invalid Bet" });

        // Initialize User if new
        if (!userStats[uid]) {
            userStats[uid] = { spins: 0, totalBet: 0, totalWon: 0, lifetimeDeposit: 0 };
        }
        
        if(depositorStatus && userStats[uid].lifetimeDeposit === 0) {
            userStats[uid].lifetimeDeposit = userBalance; 
        }

        userStats[uid].spins += 1;
        userStats[uid].totalBet += bet;
        
        // P&L Logic: Positive means user is in LOSS (Casino is winning)
        // Negative means user is in PROFIT (User is winning)
        let userNetLoss = userStats[uid].totalBet - userStats[uid].totalWon;

        globalStats.totalBetsReceived += bet;
        globalStats.totalGamesPlayed += 1;
        globalStats.houseProfit = globalStats.totalBetsReceived - globalStats.totalPayoutsGiven;

        let extraProfitPool = Math.max(0, globalStats.houseProfit - DESIRED_BASE_PROFIT);
        let isBankrupt = globalStats.houseProfit < (bet * 5); 

        let rnd = Math.random() * 1000000; 
        let multiplier = 0;
        let crashPoint = 0;

        // ========================================================
        // 🛑 THE MASTERMIND LOGIC (Bet-Size & Loop Trap) 🛑
        // ========================================================
        
        let forceLoss = false;
        let forceWin = false;
        let allowHighFlight = false; // For teasing up to 5x-7x

        if (depositorStatus) {
            // 💎 VIP (Depositor) Mode: "Slow Bleed"
            let maxAllowedWin = userNetLoss * 0.75; 
            
            if (userNetLoss < 0) {
                forceLoss = true;
            } else if (bet * 2 <= maxAllowedWin) {
                if (rnd < 400000) forceWin = true; 
            }
            
        } else {
            // 🆓 FREE USER Mode: "The Size Trap & Cross-Game Tracking"
            if (userBalance > WITHDRAWAL_LIMIT * 0.8) {
                if (extraProfitPool > WITHDRAWAL_LIMIT && rnd < 100000) forceWin = true;
                else forceLoss = true; 
            } else {
                // 🔥 NEW: BET-SIZE BASED LOGIC (The Loop Trap) 🔥
                if (bet <= 30) {
                    // 🤏 SMALL BET: Tease them! Give them confidence.
                    if (rnd < 300000) { 
                        allowHighFlight = true; // 30% chance to reach 4x - 7.5x
                    } else if (rnd < 700000) {
                        forceWin = true; // 40% chance to reach 2x - 3.5x
                    }
                } else {
                    // 💰 BIG BET: Trap them!
                    if (userNetLoss < 0) {
                        // User made profit from small bets, now betting big? SMASH HIM!
                        forceLoss = true;
                    } else {
                        // Normal big bet, high chance of early crash
                        if (rnd < 750000) forceLoss = true; // 75% chance to kill early
                    }
                }
            }
        }

        // ========================================================
        // 🎰 CATEGORY B: SPIN GAMES (Slots, Plinko, Vortex)
        // ========================================================
        if (gameName.includes("vortex") || gameName.includes("slot") || gameName.includes("plinko")) {
            if (isBankrupt || forceLoss) {
                multiplier = (Math.random() < 0.8) ? 0 : 1.2; 
            } else if (allowHighFlight) {
                multiplier = 5.0; // Small bet tease in slots
            } else if (forceWin) {
                multiplier = (Math.random() < 0.5) ? 2.0 : 2.5; 
            } else {
                if (rnd < 600000) multiplier = 0; 
                else if (rnd < 850000) multiplier = 1.2; 
                else if (rnd < 970000) multiplier = 2.0; 
                else multiplier = 2.5;
            }
        }
        // ========================================================
        // 🎲 CATEGORY A: FIXED ODDS (Color, Dice, Flip)
        // ========================================================
        else if (gameName.includes("dice") || gameName.includes("toss") || gameName.includes("color") || gameName.includes("cup") || gameName.includes("flip")) {
            if (isBankrupt || forceLoss) {
                multiplier = 0;
            } else if (forceWin || allowHighFlight) {
                multiplier = 1.8; // Fixed odds max is usually 1.8x - 2.0x
            } else {
                let winChance = 42; 
                multiplier = (rnd < (winChance * 10000)) ? 1.8 : 0;
            }
        }
        // ========================================================
        // 💣 CATEGORY C: INTERACTIVE CRASH (Crash, Chicken)
        // ========================================================
        else if (gameName.includes("crash") || gameName.includes("chicken") || gameName.includes("road") || gameName.includes("mine")) {
            if (isBankrupt || forceLoss) {
                // To hide the rig, don't always do 0x. Crash early at 1.01x to 1.15x.
                crashPoint = (Math.random() < 0.3) ? 0 : (1.01 + Math.random() * 0.14); 
                multiplier = crashPoint; 
            } else if (allowHighFlight) {
                // 🔥 THE SMALL BET TEASE FLIGHT (Let them see 4x to 7.5x) 🔥
                crashPoint = 4.0 + Math.random() * 3.5; 
                multiplier = crashPoint;
            } else if (forceWin) {
                crashPoint = 2.0 + Math.random() * 1.5; // Safe 2.0x to 3.5x
                multiplier = crashPoint;
            } else {
                // Normal Distribution (If not trapped)
                if (rnd < 600000) crashPoint = 0;                  
                else if (rnd < 850000) crashPoint = 1.2 + Math.random() * 0.5;   
                else if (rnd < 970000) crashPoint = 1.8 + Math.random() * 1.5;   
                else crashPoint = 2.0 + Math.random() * 1.0; 
                
                multiplier = crashPoint;
            }
        } 

        // ========================================================
        // 💰 INSTANT PAYOUT LOGIC (Only for non-interactive games)
        // ========================================================
        let winAmount = 0;
        
        // Interactive games (Crash, Chicken, Mines) handle cashout in a separate API call.
        if (multiplier > 0 && !gameName.includes("mine") && !gameName.includes("hi-lo") && !gameName.includes("chicken") && !gameName.includes("road") && !gameName.includes("crash")) {
            winAmount = Math.floor(bet * multiplier);
            globalStats.totalPayoutsGiven += winAmount;
            userStats[uid].totalWon += winAmount;
        }

        globalStats.houseProfit = globalStats.totalBetsReceived - globalStats.totalPayoutsGiven;

        res.json({
            success: true,
            multiplier: multiplier,
            winAmount: winAmount
        });

    } catch (error) {
        console.error(error);
        res.json({ success: false, error: "Brain Fault", multiplier: 0, winAmount: 0 });
    }
});

// ========================================================
// 💵 CASHOUT API (For Crash, Chicken, Mines)
// ========================================================
app.post('/api/cashout', (req, res) => {
    try {
        const { uid, cashoutAmount } = req.body;
        let payout = Math.floor(parseFloat(cashoutAmount)) || 0;

        if (payout > 0) {
            globalStats.totalPayoutsGiven += payout;
            globalStats.houseProfit = globalStats.totalBetsReceived - globalStats.totalPayoutsGiven;
            
            if(!userStats[uid]) {
                userStats[uid] = { spins: 0, totalBet: 0, totalWon: 0, lifetimeDeposit: 0 };
            }
            userStats[uid].totalWon += payout;
        }

        res.json({ success: true, houseProfit: globalStats.houseProfit });
    } catch (error) {
        res.json({ success: false });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
