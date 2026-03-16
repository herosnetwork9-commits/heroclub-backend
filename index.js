const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send("HeroClub Master AI Brain is Live! 🚀💰");
});

app.post('/api/play', (req, res) => {
    const { uid, game, betAmount } = req.body;
    
    let multiplier = 0;
    let rnd = Math.random() * 100;

    // 1. EXACT 1.8X PAYOUT GAMES (Dice, Color, Flip, Cups)
    if (game === "Lucky Dice" || game === "Lucky Color" || game === "Coin Flip" || game === "Magic Cups") {
        multiplier = (rnd < 45) ? 1.8 : 0; // 45% Win Chance, Exact 1.8x Payout
    } 
    // 2. VIP SLOTS MATH
    else if (game === "VIP Slots") {
        if (rnd < 65) multiplier = 0;
        else if (rnd < 90) multiplier = 1.2;
        else if (rnd < 98) multiplier = 2.5;
        else if (rnd < 99.5) multiplier = 5.0;
        else multiplier = 20.0;
    }
    // 3. PLINKO MATH
    else if (game === "Plinko Pro") {
        if (rnd < 40) multiplier = 0;
        else if (rnd < 75) multiplier = 1.2;
        else if (rnd < 90) multiplier = 1.4;
        else if (rnd < 97) multiplier = 1.6;
        else multiplier = 2.0;
    }
    // 4. VORTEX MATH
    else if (game === "Vortex") {
        if (rnd < 60) multiplier = 0;
        else if (rnd < 85) multiplier = 1.2;
        else if (rnd < 95) multiplier = 1.5;
        else multiplier = 2.0;
    }
    // 5. INTERACTIVE GAMES (Mines, Hi-Lo, Chicken Road) - Target Limits
    else if (game === "VIP Hi-Lo" || game === "VIP Mines" || game === "Chicken Road") {
        if (rnd < 40) multiplier = 0;        // 40% chance: Crash Immediately
        else if (rnd < 70) multiplier = 1.5; // 30% chance: Let them win a little
        else if (rnd < 90) multiplier = 2.5; // 20% chance: Medium win
        else multiplier = 5.0;               // 10% chance: Big win
    }
    else {
        multiplier = (rnd < 40) ? 1.5 : 0; // Default safety fallback
    }

    let winAmount = Math.floor(betAmount * multiplier);

    res.json({
        success: true,
        multiplier: multiplier,
        winAmount: winAmount
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
