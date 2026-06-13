const express = require('express');
const cors = require('cors');
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, query, where } = require("firebase/firestore");

const app = express();

// 🔥 CORS FIXED
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// ========================================================================
// 🔥 FIREBASE CONNECTION
// ========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyA1hZFTkTZZ0heung_LwreKD4aSaRtc04w",
    authDomain: "herotube-11076.firebaseapp.com",
    projectId: "herotube-11076"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// ========================================================================
// 🏦 THE GLOBAL CASINO VAULT (LIVE PNL TRACKER)
// ========================================================================
const ADMIN_RESERVE = 2000; // Locked base profit

let globalVault = {
    totalDepositsCoins: 0,
    totalWithdrawalsCoins: 0,
    totalUserLiability: 0,
    houseProfitCoins: 0,      
    effectivePNL: 0,          
    lastSynced: "Fetching..."
};

let usersDB = {}; 

// ========================================================================
// 🔄 BACKGROUND PNL CALCULATOR
// ========================================================================
async function syncHousePNL() {
    try {
        let tDepositsINR = 0, tWithdrawalsINR = 0, tLiabilityCoins = 0;

        const uSnap = await getDocs(collection(db, "users"));
        uSnap.forEach(doc => {
            let data = doc.data();
            if (!data.isBanned && data.coins > 0) tLiabilityCoins += data.coins;
        });

        const cSnap = await getDocs(query(collection(db, "coin_purchases"), where("status", "==", "Success")));
        cSnap.forEach(d => tDepositsINR += parseInt(d.data().amountPaid || d.data().amount || d.data().amountINR || d.data().inr || 0));

        const vSnap = await getDocs(query(collection(db, "vip_purchases"), where("status", "==", "Success")));
        vSnap.forEach(d => tDepositsINR += parseInt(d.data().amountPaid || d.data().amount || d.data().amountINR || 0));

        const rSnap = await getDocs(query(collection(db, "referral_requests"), where("status", "==", "Success")));
        rSnap.forEach(d => tDepositsINR += parseInt(d.data().amountPaid || d.data().amount || d.data().amountINR || 0));

        const wSnap = await getDocs(query(collection(db, "withdrawals"), where("status", "==", "paid")));
        wSnap.forEach(d => tWithdrawalsINR += parseInt(d.data().amount || 0));

        globalVault.totalDepositsCoins = tDepositsINR * 100;
        globalVault.totalWithdrawalsCoins = tWithdrawalsINR * 100;
        globalVault.totalUserLiability = tLiabilityCoins;
        
        globalVault.houseProfitCoins = globalVault.totalDepositsCoins - globalVault.totalWithdrawalsCoins - globalVault.totalUserLiability;
        globalVault.effectivePNL = globalVault.houseProfitCoins - ADMIN_RESERVE;
        globalVault.lastSynced = new Date().toLocaleTimeString();

        console.log(`[SYNCED] Profit: ${globalVault.houseProfitCoins} C | Effective PNL: ${globalVault.effectivePNL} C`);
    } catch (e) {
        console.error("Failed to sync PNL from Firebase:", e.message);
    }
}

syncHousePNL();
setInterval(syncHousePNL, 300000); 

app.get('/', (req, res) => {
    res.send(`HeroClub Master Brain 🧠 | Effective PNL: ${globalVault.effectivePNL} Coins | Sync: ${globalVault.lastSynced} | Status: Online ✅`);
});

// ========================================================================
// 🕹️ THE MASTER PLAY ENDPOINT (REAL CASINO MATH & DOPAMINE ENGINE)
// ========================================================================
app.post('/api/play', (req, res) => {
    try {
        const { uid, game, betAmount, currentBalance } = req.body; 
        
        if (!uid || !betAmount) return res.json({ success: false, error: "Invalid Request Data" });

        let bet = Math.floor(parseFloat(betAmount)) || 0;
        let userBalance = Math.floor(parseFloat(currentBalance)) || 0;
        let gameName = game ? game.toLowerCase() : "unknown";
        
        if (bet < 10) return res.json({ success: false, error: "Minimum bet is 10 Coins" });
        if (bet > userBalance) return res.json({ success: false, error: "Insufficient Balance" });

        if (!usersDB[uid]) usersDB[uid] = { currentLossStreak: 0, currentWinStreak: 0 };
        let user = usersDB[uid];

        // 🛡️ DYNAMIC VAULT EXPOSURE (House never goes broke)
        // Max payout allowed is 10% of our available profit, or minimum 500 coins for new platform
        let maxVaultExposure = Math.max(500, globalVault.effectivePNL * 0.10); 
        let isWhaleBet = bet > (maxVaultExposure * 0.4); // Target users betting too big
        
        let targetMultiplier = 0;
        let calculatedWinAmount = 0; 
        let r = Math.random();
        let isCrashGame = false;

        // ==========================================================
        // 🚀 1. CRASH & CHICKEN GAMES (Aviator Logic)
        // ==========================================================
        if (gameName.includes("crash") || gameName.includes("chicken")) {
            isCrashGame = true;

            if (isWhaleBet) {
                // 🐋 WHALE MODE: If user places a huge bet, we restrict the multiplier
                // It looks like a normal round, but it crashes before they get too rich
                if (r < 0.15) targetMultiplier = 1.00; // 15% Instant Crash
                else if (r < 0.60) targetMultiplier = 1.05 + (Math.random() * 0.45); // 1.05x - 1.50x
                else if (r < 0.90) targetMultiplier = 1.50 + (Math.random() * 1.50); // 1.50x - 3.00x
                else targetMultiplier = 3.00 + (Math.random() * 2.00); // Max ~5.00x
            } else {
                // 🎰 STANDARD CASINO DOPAMINE DISTRIBUTION (For normal bets)
                if (r < 0.03) {
                    // 3% Chance: Instant Crash (Punishes 1.01x auto-cashouts)
                    targetMultiplier = 1.00;
                } else if (r < 0.48) {
                    // 45% Chance: Sweet Spot (1.01x - 2.00x) - Keeps them hooked
                    targetMultiplier = 1.01 + (Math.random() * 0.99);
                } else if (r < 0.88) {
                    // 40% Chance: Mid-Range (2.00x - 10.00x) - Good profits, makes game feel fair
                    targetMultiplier = 2.00 + (Math.random() * 8.00);
                } else {
                    // 12% Chance: THE BIG BAIT (10.00x - 22.00x) - The Lust Generator
                    targetMultiplier = 10.00 + (Math.random() * 12.00);
                }
            }

            // 🛑 ABSOLUTE MAXIMUM CAP: Never exceed 22.00x
            if (targetMultiplier > 22.00) targetMultiplier = 22.00;

            // 🛡️ PNL SAFEGUARD (INVISIBLE WALL): 
            // Ensures even on a lucky run, a user cannot drain the house vault
            let maxAllowedMultiplier = Math.max(1.05, maxVaultExposure / bet);
            if (targetMultiplier > maxAllowedMultiplier) {
                // We randomize it slightly below the max allowed so it doesn't look mathematically rigged
                targetMultiplier = 1.01 + (Math.random() * (maxAllowedMultiplier - 1.01));
            }

            // Round to 2 decimal places
            targetMultiplier = Math.floor(targetMultiplier * 100) / 100;
            calculatedWinAmount = 0; // Handled at cashout
        } 
        
        // ==========================================================
        // 🔵 2. PLINKO GAMES
        // ==========================================================
        else if (gameName.includes("plinko")) {
            let roll = Math.random() * 100;
            
            if (isWhaleBet) {
                // Protect vault from whale Plinko bets
                if (roll < 65) targetMultiplier = 0;
                else if (roll < 95) targetMultiplier = 0.5;
                else targetMultiplier = 1.5;
            } 
            else {
                // Normal Plinko distribution
                if (roll < 45) targetMultiplier = 0;
                else if (roll < 70) targetMultiplier = 0.5;
                else if (roll < 90) targetMultiplier = 1.5;
                else if (roll < 98) targetMultiplier = 3.0;
                else targetMultiplier = 10.0;
            }

            // Strictly enforce max vault exposure for Plinko
            while ((bet * targetMultiplier) > maxVaultExposure && targetMultiplier > 0) {
                if (targetMultiplier === 10.0) targetMultiplier = 3.0;
                else if (targetMultiplier === 3.0) targetMultiplier = 1.5;
                else if (targetMultiplier === 1.5) targetMultiplier = 0.5;
                else targetMultiplier = 0;
            }
            
            calculatedWinAmount = Math.floor(bet * targetMultiplier);
        }
        
        // ==========================================================
        // 🎲 3. SINGLE PLAY GAMES (Lucky Dice, Coin Flip)
        // ==========================================================
        else {
            let winChance = 0.45; // Base casino edge for dice/coins
            
            // If whale, reduce win chance heavily
            if (isWhaleBet || (bet * 1.80 > maxVaultExposure)) {
                winChance = 0.15; // Only 15% chance to win a massive single bet
            } else if (user.currentLossStreak >= 3) {
                winChance = 0.60; // Pity system to keep them engaged
            }

            let isWin = Math.random() < winChance;
            
            if (!isWin) {
                targetMultiplier = 0;
                calculatedWinAmount = 0; 
            } else {
                targetMultiplier = 1.80 + (Math.random() * 0.15); 
                calculatedWinAmount = Math.floor(bet * targetMultiplier); 
            }
        }

        // Streak Trackers
        if (!isCrashGame) {
            if (calculatedWinAmount === 0) {
                user.currentLossStreak += 1; user.currentWinStreak = 0;
            } else {
                user.currentWinStreak += 1; user.currentLossStreak = 0;
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
// 💸 CASHOUT & LOSE ENDPOINTS
// ========================================================================
app.post('/api/cashout', (req, res) => {
    try {
        const { uid, cashoutAmount } = req.body;
        if (!uid) return res.json({ success: false, error: "Missing User ID" });

        let payout = Math.floor(parseFloat(cashoutAmount)) || 0;
        if (!usersDB[uid]) usersDB[uid] = { currentLossStreak: 0, currentWinStreak: 0 };
        
        if (payout > 0) {
            usersDB[uid].currentWinStreak += 1; 
            usersDB[uid].currentLossStreak = 0; 
            res.json({ success: true, payout: payout });
        } else {
            usersDB[uid].currentLossStreak += 1; 
            usersDB[uid].currentWinStreak = 0;
            res.json({ success: true, payout: 0 });
        }
    } catch (error) { res.json({ success: false }); }
});

app.post('/api/lose', (req, res) => {
    try {
        const { uid } = req.body;
        if (uid) {
            if (!usersDB[uid]) usersDB[uid] = { currentLossStreak: 0, currentWinStreak: 0 };
            usersDB[uid].currentLossStreak += 1; 
            usersDB[uid].currentWinStreak = 0;
        }
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`HeroClub Master Brain running on port ${PORT}`));
