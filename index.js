const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send("HeroClub Master AI Brain is Live! 🚀💰");
});

app.post('/api/play', (req, res) => {
    try {
        const { uid, game, betAmount } = req.body;
        
        let multiplier = 0;
        let rnd = Math.random() * 100;
        
        // Game ka naam properly read karna (chhoti ABCD mein)
        let gameName = game ? game.toLowerCase() : "";

        // 🛑 1. STRICT 1.8X PAYOUT GAMES (Dice, Color, Toss, Flip, Cups)
        if (gameName.includes("dice") || gameName.includes("color") || gameName.includes("toss") || gameName.includes("flip") || gameName.includes("cup")) {
            let winChance = (betAmount >= 500) ? 20 : 40; // Whales ko sirf 20% win chance, normals ko 40%
            multiplier = (rnd < winChance) ? 1.8 : 0; 
        } 
        // 🛑 2. VIP SLOTS / MEGA SLOTS
        else if (gameName.includes("slot")) {
            if (rnd < 70) multiplier = 0;           // 70% Loss
            else if (rnd < 90) multiplier = 1.2;    // 20% Small Win
            else if (rnd < 97) multiplier = 2.5;    // 7% Medium Win
            else if (rnd < 99.5) multiplier = 5.0;  // 2.5% Big Win
            else multiplier = 20.0;                 // 0.5% Jackpot
        }
        // 🛑 3. PLINKO PRO
        else if (gameName.includes("plinko")) {
            if (rnd < 45) multiplier = 0;
            else if (rnd < 80) multiplier = 1.2;
            else if (rnd < 93) multiplier = 1.4;
            else if (rnd < 98) multiplier = 1.6;
            else multiplier = 2.0;
        }
        // 🛑 4. VORTEX PRO
        else if (gameName.includes("vortex")) {
            if (rnd < 65) multiplier = 0;           // 65% Loss
            else if (rnd < 85) multiplier = 1.2;
            else if (rnd < 96) multiplier = 1.5;
            else multiplier = 2.0;
        }
        // 🛑 5. INTERACTIVE GAMES (Mines, Hi-Lo, Chicken Road) - Target Limits
        else if (gameName.includes("mine") || gameName.includes("hi-lo") || gameName.includes("chicken") || gameName.includes("road")) {
            if (rnd < 50) multiplier = 0;        // 50% chance: Crash on 1st/2nd step
            else if (rnd < 75) multiplier = 1.5; // 25% chance: Lock at 1.5x max
            else if (rnd < 92) multiplier = 2.5; // 17% chance: Lock at 2.5x max
            else multiplier = 5.0;               // 8% chance: Let them go far
        }
        else {
            // FALLBACK SAFETY: Agar game name detect na ho, toh default LOSS ya low win
            multiplier = (rnd < 30) ? 1.2 : 0; 
        }

        // EXACT WIN AMOUNT CALCULATION
        let winAmount = Math.floor(betAmount * multiplier);

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
