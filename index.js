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
    lastSynced: "Never"
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
// 🕹️ THE MASTER PLAY ENDPOINT (WHALE PROTECTION + NEW SAFEGUARD)
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

        // 🛡️ NEW SAFEGUARD: Activates when PNL drops below 3000 Coins!
        let isSafeguardMode = globalVault.effectivePNL < 3000; 
        let isEngagementMode = globalVault.effectivePNL > 20000; 
        
        // 🐋 WHALE PROTECTION LIMIT: Max payout cannot exceed 10% of total Vault PNL
        let maxVaultExposure = Math.max(500, globalVault.effectivePNL * 0.10); 
        let isWhaleBet = bet > (maxVaultExposure * 0.5); // Identify abnormally large bets
        
        let targetMultiplier = 0;
        let calculatedWinAmount = 0; 
        let r = Math.random();
        let isCrashGame = false;

        // ==========================================================
        // 🚀 1. CRASH & CHICKEN GAMES
        // ==========================================================
        if (gameName.includes("crash") || gameName.includes("chicken")) {
            isCrashGame = true;
            
            let dynamicEdge = 0.04; 
            
            if (isSafeguardMode) dynamicEdge = 0.08; 
            else if (isEngagementMode) dynamicEdge = 0.02; 

            if (user.currentLossStreak >= 3 && !isSafeguardMode && !isWhaleBet) {
                dynamicEdge = 0.01; 
            }

            // WHALE PENALTY: If user places a huge bet, increase edge drastically to force a loss
            if (isWhaleBet) {
                dynamicEdge = 0.20; // 20% instant crash chance for massive bets
            }

            if (r < dynamicEdge) {
                targetMultiplier = 1.00; 
            } else {
                targetMultiplier = Math.floor((100 * (1 - dynamicEdge)) / r) / 100;
            }

            if (!isSafeguardMode && targetMultiplier > 1.01 && targetMultiplier < 1.15 && !isWhaleBet) {
                if (Math.random() > 0.4) {
                    targetMultiplier = 1.25 + (Math.random() * 0.55); 
                }
            }

            // STRICT MAX CAP: Impossible to bypass Vault Limit
            let maxAllowedMultiplier = maxVaultExposure / bet;
            if (targetMultiplier > maxAllowedMultiplier) {
                targetMultiplier = Math.max(1.00, Math.floor(maxAllowedMultiplier * 100) / 100);
            }

            calculatedWinAmount = 0; 
        } 
        
        // ==========================================================
        // 🔵 2. PLINKO GAMES
        // ==========================================================
        else if (gameName.includes("plinko")) {
            let roll = Math.random() * 100;
            
            if (isSafeguardMode || isWhaleBet) {
                // Whale or Poor House: Lock high multipliers out
                if (roll < 65) targetMultiplier = 0;
                else if (roll < 95) targetMultiplier = 0.5;
                else targetMultiplier = 1.5;
            } 
            else if (isEngagementMode || user.currentLossStreak >= 3) {
                if (roll < 30) targetMultiplier = 0;
                else if (roll < 60) targetMultiplier = 0.5;
                else if (roll < 85) targetMultiplier = 1.5;
                else if (roll < 97) targetMultiplier = 3.0;
                else targetMultiplier = 10.0;
            } 
            else {
                if (roll < 45) targetMultiplier = 0;
                else if (roll < 70) targetMultiplier = 0.5;
                else if (roll < 90) targetMultiplier = 1.5;
                else if (roll < 98) targetMultiplier = 3.0;
                else targetMultiplier = 10.0;
            }

            // STRICT MAX CAP for Plinko
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
            let winChance = 0.48; 
            
            if (isSafeguardMode) winChance = 0.35; 
            else if (isEngagementMode) winChance = 0.52; 

            if (user.currentLossStreak >= 3 && !isSafeguardMode && !isWhaleBet) winChance = 0.65; 

            // WHALE PENALTY
            if (isWhaleBet || (bet * 1.80 > maxVaultExposure)) {
                winChance = 0.10; // Only 10% chance to win a massive single bet
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
