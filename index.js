const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// 📊 GLOBAL BRAIN MEMORY (Website ka 100% Financial Control)
// Note: Initial "Seed" pool rakha hai taaki pehle player ko hamesha loss na ho
let globalStats = {
    totalBetsReceived: 10000, 
    totalPayoutsGiven: 5000,
    houseProfit: 5000,
    totalGamesPlayed: 0
};

app.get('/', (req, res) => {
    res.send(`HeroClub Master AI Brain is Live! 🚀💰 | Lifetime House Profit: ${globalStats.houseProfit} Coins`);
});

// 🎮 API 1: GAME PLAY LOGIC (Decides Win/Loss & Crash Points)
app.post('/api/play', (req, res) => {
    try {
        const { uid, game, betAmount } = req.body;
        let gameName = game ? game.toLowerCase() : "";
        
        // 1. Brain ne paise receive kiye
        globalStats.totalBetsReceived += betAmount;
        globalStats.totalGamesPlayed += 1;

        let crashPoint = 0; 
        let exactWinAmount = 0; 

        // 🧠 THE 10-4-1 LOGIC (House Edge Protection)
        // Agar casino nuksan mein ja raha hai, toh strictly sabko harao!
        let isHouseSafe = (globalStats.totalBetsReceived - globalStats.totalPayoutsGiven) > (betAmount * 3);
        
        let rnd = Math.random() * 100;

        // ==========================================
        // 🛑 CATEGORY 1: EXACT 1.8X GAMES (50/50 Style)
        // ==========================================
        if (gameName.includes("dice") || gameName.includes("toss") || gameName.includes("color") || gameName.includes("cup") || gameName.includes("flip")) {
            // Safe = 40% Win, Unsafe = 10% Win, Whale (>500 bet) = 20% Win
            let winChance = isHouseSafe ? (betAmount >= 500 ? 20 : 40) : 10; 

            if (rnd < winChance) {
                exactWinAmount = Math.floor(betAmount * 1.8); // FIXED 1.8x
                crashPoint = 1.8;
            } else {
                exactWinAmount = 0;
                crashPoint = 0;
            }
        } 
        
        // ==========================================
        // 🎰 CATEGORY 2: SLOTS & SPIN GAMES
        // ==========================================
        else if (gameName.includes("slot")) { // Mega Slots / VIP Slots
            if (!isHouseSafe) {
                exactWinAmount = 0; // House risk mein hai, seedha loss
            } else {
                if (rnd < 65) exactWinAmount = 0;                                 // 65% Loss
                else if (rnd < 85) exactWinAmount = Math.floor(betAmount * 1.2);  // 20% Small Win
                else if (rnd < 95) exactWinAmount = Math.floor(betAmount * 2.5);  // 10% Medium Win
                else if (rnd < 99) exactWinAmount = Math.floor(betAmount * 5.0);  // 4% Big Win
                else exactWinAmount = Math.floor(betAmount * 20.0);               // 1% Jackpot
            }
            crashPoint = exactWinAmount > 0 ? (exactWinAmount/betAmount) : 0;
        }
        else if (gameName.includes("plinko")) { // Plinko Drop
            if (!isHouseSafe) {
                exactWinAmount = 0;
            } else {
                if (rnd < 50) exactWinAmount = 0;
                else if (rnd < 80) exactWinAmount = Math.floor(betAmount * 1.2);
                else if (rnd < 92) exactWinAmount = Math.floor(betAmount * 1.5);
                else if (rnd < 98) exactWinAmount = Math.floor(betAmount * 2.0);
                else exactWinAmount = Math.floor(betAmount * 3.0);
            }
            crashPoint = exactWinAmount > 0 ? (exactWinAmount/betAmount) : 0;
        }
        else if (gameName.includes("vortex")) { // Vortex Wheel
            if (!isHouseSafe) {
                exactWinAmount = 0;
            } else {
                if (rnd < 60) exactWinAmount = 0;
                else if (rnd < 80) exactWinAmount = Math.floor(betAmount * 1.2);
                else if (rnd < 95) exactWinAmount = Math.floor(betAmount * 1.5);
                else exactWinAmount = Math.floor(betAmount * 3.0);
            }
            crashPoint = exactWinAmount > 0 ? (exactWinAmount/betAmount) : 0;
        }

        // ==========================================
        // 💣 CATEGORY 3: INTERACTIVE GAMES (Mines, Hi-Lo, Chicken Road)
        // ==========================================
        else if (gameName.includes("mine") || gameName.includes("hi-lo") || gameName.includes("chicken") || gameName.includes("road")) {
            // Yahan hum exactly paise nahi dete, bas bataate hain "Kahan jaake fategi"
            if (!isHouseSafe) {
                crashPoint = (rnd < 70) ? 0 : 1.2; // 70% chance ki pehle click pe hi udd jaye
            } else {
                if (rnd < 50) crashPoint = 0;                  // 50% chance pehle step pe blast
                else if (rnd < 75) crashPoint = 1.5;           // 25% chance ki 1.5x tak safe
                else if (rnd < 92) crashPoint = 2.5;           // 17% chance ki 2.5x tak safe
                else crashPoint = 5.0;                         // 8% chance ki 5x tak safe
            }
            exactWinAmount = 0; // Frontend cashout hit karega tab update hoga
        }
        else {
            // Fallback Unknown Games
            exactWinAmount = 0;
            crashPoint = 0;
        }

        // 2. Sirf Fixed games ka payout abhi record kar lo
        if (exactWinAmount > 0) {
            globalStats.totalPayoutsGiven += exactWinAmount;
        }
        globalStats.houseProfit = globalStats.totalBetsReceived - globalStats.totalPayoutsGiven;

        res.json({
            success: true,
            crashPoint: crashPoint,     
            winAmount: exactWinAmount   
        });

    } catch (error) {
        res.json({ success: false, error: "Brain Fault", crashPoint: 0, winAmount: 0 });
    }
});

// 💸 API 2: CASHOUT REPORTER (Only for Mines, Chicken Road, etc.)
// Jab user actually 'Cashout' dabata hai, frontend ye API call karega taaki Global Brain ko hisaab pata chale!
app.post('/api/cashout', (req, res) => {
    try {
        const { uid, game, cashoutAmount } = req.body;
        
        if (cashoutAmount && cashoutAmount > 0) {
            globalStats.totalPayoutsGiven += cashoutAmount;
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
