const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// 📊 GLOBAL POOL (Saare games ka ek hi Matka)
let globalStats = {
    totalBetsReceived: 50000,   // Initial buffer taaki server shuru mein hi block na mare
    totalPayoutsGiven: 20000,
    houseProfit: 30000,
    totalGamesPlayed: 0
};

// 👤 USER MEMORY
let userStats = {}; 
const WITHDRAWAL_LIMIT = 3000; // 🛑 3000 Coins ka Lock

app.get('/', (req, res) => {
    res.send(`HeroClub Ultimate Brain Live! 🚀 | House Profit: ${globalStats.houseProfit}`);
});

app.post('/api/play', (req, res) => {
    try {
        const { uid, game, betAmount, isDepositor, currentBalance } = req.body; 
        
        let depositorStatus = isDepositor || false; 
        let userBalance = parseFloat(currentBalance) || 0; 
        let gameName = game ? game.toLowerCase() : "";
        let bet = parseFloat(betAmount) || 0;

        if (bet <= 0) return res.json({ success: false, error: "Invalid Bet" });

        // 1. CREATE USER PROFILE IF NEW
        if (!userStats[uid]) {
            userStats[uid] = { spins: 0, totalBet: 0, totalWon: 0 };
        }

        // 2. UPDATE STATS
        userStats[uid].spins += 1;
        userStats[uid].totalBet += bet;
        let userNetLoss = userStats[uid].totalBet - userStats[uid].totalWon;

        globalStats.totalBetsReceived += bet;
        globalStats.totalGamesPlayed += 1;
        globalStats.houseProfit = globalStats.totalBetsReceived - globalStats.totalPayoutsGiven;

        // 3. CHECK HOUSE SAFETY
        let isBankrupt = globalStats.houseProfit < (bet * 5); 

        // 🎲 RANDOM NUMBER GENERATOR
        let rnd = Math.random() * 1000000; 
        let multiplier = 0;
        let winAmount = 0;
        let crashPoint = 0;

        // ========================================================
        // 🎰 CATEGORY B: SPIN GAMES (Slots, Vortex, Plinko)
        // ========================================================
        if (gameName.includes("vortex") || gameName.includes("slot") || gameName.includes("plinko")) {
            if (isBankrupt) {
                multiplier = (rnd < 800000) ? 0 : 1.2; 
            } else {
                if (rnd < 600000) multiplier = 0; // 60% Loss
                else if (rnd < 850000) multiplier = 1.2; // 25% Small Win
                else if (rnd < 970000) multiplier = 2.0; // 12% Medium Win
                else {
                    // BIG MULTIPLIERS (Locked behind conditions)
                    if (rnd < 100 && depositorStatus && userStats[uid].spins >= 1000) multiplier = 100.0;
                    else if (rnd < 1000 && depositorStatus && userStats[uid].spins >= 300 && userNetLoss >= (bet * 20)) multiplier = 20.0;
                    else if (rnd < 10000 && userNetLoss >= (bet * 5)) multiplier = 5.0;
                    else multiplier = 2.0;
                }
            }
        }
        // ========================================================
        // 🎲 CATEGORY A: FIXED ODDS (Dice, Toss, Color, Cups, Flip)
        // ========================================================
        else if (gameName.includes("dice") || gameName.includes("toss") || gameName.includes("color") || gameName.includes("cup") || gameName.includes("flip")) {
            let winChance = isBankrupt ? 5 : 42; 
            multiplier = (rnd < (winChance * 10000)) ? 1.8 : 0;
        }
        // ========================================================
        // 💣 CATEGORY C: INTERACTIVE (Mines, Hi-Lo, Chicken Road)
        // ========================================================
        else if (gameName.includes("mine") || gameName.includes("hi-lo") || gameName.includes("chicken") || gameName.includes("road")) {
            if (isBankrupt) {
                crashPoint = (rnd < 800000) ? 0 : 1.2; 
            } else {
                if (rnd < 600000) crashPoint = 0;                  
                else if (rnd < 850000) crashPoint = 1.5;           
                else if (rnd < 970000) crashPoint = 2.5;           
                else crashPoint = (userNetLoss >= (bet * 5)) ? 5.0 : 2.5;
            }
        } 

        // ========================================================
        // 🛑 THE SMART "REAL ECONOMY" GATEKEEPER 🛑
        // ========================================================
        let potentialWin = (multiplier > 0) ? (bet * multiplier) : (bet * crashPoint);
        let projectedBalance = userBalance - bet + potentialWin;

        // Kya user 3000 limit cross karne wala hai?
        if (projectedBalance >= WITHDRAWAL_LIMIT) {
            let allowedToPass = false;

            if (depositorStatus === true) {
                // Depositor: Agar profit > 10k hai, toh 80% pass karne do
                if (globalStats.houseProfit > 10000 && Math.random() < 0.80) allowedToPass = true;
            } else {
                // Free Player: Agar profit > 50k hai, toh sirf 15% logo ko pass karne do (Marketing)
                if (globalStats.houseProfit > 50000 && Math.random() < 0.15) allowedToPass = true;
            }

            // Agar Gatekeeper ne block kiya, toh force loss karo
            if (!allowedToPass) {
                if (multiplier > 0) multiplier = (gameName.includes("dice") || gameName.includes("color") || gameName.includes("toss")) ? 0 : ((Math.random() < 0.5) ? 0 : 1.2);
                if (crashPoint > 0) crashPoint = (Math.random() < 0.5) ? 0 : 1.2;
            }
        }

        // ========================================================
        // 💰 FINAL PAYOUT & SYNC (For Fixed & Spin Games Only)
        // ========================================================
        if (multiplier > 0 && !gameName.includes("mine") && !gameName.includes("hi-lo") && !gameName.includes("chicken") && !gameName.includes("road")) {
            winAmount = Math.floor(bet * multiplier);
            globalStats.totalPayoutsGiven += winAmount;
            userStats[uid].totalWon += winAmount;
        }

        // Final house profit update
        globalStats.houseProfit = globalStats.totalBetsReceived - globalStats.totalPayoutsGiven;

        res.json({
            success: true,
            multiplier: multiplier,
            winAmount: winAmount,
            crashPoint: crashPoint
        });

    } catch (error) {
        console.error(error);
        res.json({ success: false, error: "Brain Fault", multiplier: 0, winAmount: 0, crashPoint: 0 });
    }
});

// 💸 API 2: CASHOUT SYNC (For Mines/Chicken Road)
app.post('/api/cashout', (req, res) => {
    try {
        const { uid, cashoutAmount } = req.body;
        let payout = Math.floor(parseFloat(cashoutAmount)) || 0;

        if (payout > 0) {
            globalStats.totalPayoutsGiven += payout;
            globalStats.houseProfit = globalStats.totalBetsReceived - globalStats.totalPayoutsGiven;
            if(userStats[uid]) userStats[uid].totalWon += payout;
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
