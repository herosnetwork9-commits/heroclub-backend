const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// 📊 1. THE GLOBAL BRAIN MEMORY (Track everything!)
let globalStats = {
    totalBetsReceived: 10000, // Seed money taaki naya server turant loss mode mein na jaye
    totalPayoutsGiven: 2000,
    houseProfit: 8000,
    totalGamesPlayed: 0
};

app.get('/', (req, res) => {
    res.send(`HeroClub Master AI Brain is Live! 🚀💰 | Total House Profit: ${globalStats.houseProfit}`);
});

// 🎮 API 1: PLAY (Decides Win/Loss & Crash Points)
app.post('/api/play', (req, res) => {
    try {
        const { uid, game, betAmount } = req.body;
        let gameName = game ? game.toLowerCase() : "";
        let bet = parseFloat(betAmount) || 0;

        if (bet <= 0) return res.json({ success: false, error: "Invalid Bet" });

        // Update Global Pool (Paise andar aaye)
        globalStats.totalBetsReceived += bet;
        globalStats.totalGamesPlayed += 1;
        globalStats.houseProfit = globalStats.totalBetsReceived - globalStats.totalPayoutsGiven;

        // 🛡️ BANKRUPT PROTECTION (Agar profit bet ke 3 guna se kam ho gaya, toh sabko harao)
        let isBankrupt = globalStats.houseProfit < (bet * 3); 

        let rnd = Math.random() * 100;
        let multiplier = 0;
        let winAmount = 0;
        let crashPoint = 0;

        // ========================================================
        // 🎲 CATEGORY A: FIXED MULTIPLIER (Dice, Toss, Color, Cups) -> 1.8X Fixed
        // ========================================================
        if (gameName.includes("dice") || gameName.includes("toss") || gameName.includes("color") || gameName.includes("cup") || gameName.includes("flip")) {
            let winChance = isBankrupt ? 5 : (bet >= 500 ? 25 : 42); // Whales get 25%, Normals 42%

            if (rnd < winChance) {
                multiplier = 1.8;
                winAmount = Math.floor(bet * 1.8); 
            } else {
                multiplier = 0;
                winAmount = 0;
            }
            // Record payout immediately
            globalStats.totalPayoutsGiven += winAmount;
        } 
        
        // ========================================================
        // 🎰 CATEGORY B: SPIN / DROP GAMES (Vortex, Slots, Plinko)
        // ========================================================
        else if (gameName.includes("vortex") || gameName.includes("slot") || gameName.includes("plinko")) {
            if (isBankrupt) {
                multiplier = 0; // Force Loss Mode
            } else {
                if (rnd < 65) multiplier = 0;                           // 65% Loss
                else if (rnd < 85) multiplier = 1.2;                    // 20% Small Win
                else if (rnd < 96) multiplier = 2.0;                    // 11% Medium Win
                else multiplier = 5.0;                                  // 4% Big Win
            }
            winAmount = Math.floor(bet * multiplier);
            globalStats.totalPayoutsGiven += winAmount; // Record payout immediately
        }

        // ========================================================
        // 💣 CATEGORY C: INTERACTIVE (Mines, Hi-Lo, Chicken Road)
        // ========================================================
        else if (gameName.includes("mine") || gameName.includes("hi-lo") || gameName.includes("hilo") || gameName.includes("chicken") || gameName.includes("road")) {
            if (isBankrupt) {
                crashPoint = (rnd < 70) ? 0 : 1.2; // 70% chance to blast immediately
            } else {
                if (rnd < 50) crashPoint = 0;                  // 50% chance: Blast on step 1
                else if (rnd < 75) crashPoint = 1.5;           // 25% chance: Safe till 1.5x
                else if (rnd < 92) crashPoint = 2.5;           // 17% chance: Safe till 2.5x
                else crashPoint = 5.0;                         // 8% chance: Go far
            }
            // We DO NOT set winAmount here. Frontend will call /api/cashout when they stop.
            multiplier = 0; 
            winAmount = 0; 
        } 
        else {
            multiplier = 0; winAmount = 0; crashPoint = 0;
        }

        // Final profit update
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

// 💸 API 2: CASHOUT SYNC (Strictly for Mines, Chicken Road, etc.)
app.post('/api/cashout', (req, res) => {
    try {
        const { uid, game, cashoutAmount } = req.body;
        let payout = parseFloat(cashoutAmount) || 0;

        if (payout > 0) {
            globalStats.totalPayoutsGiven += payout;
            globalStats.houseProfit = globalStats.totalBetsReceived - globalStats.totalPayoutsGiven;
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
