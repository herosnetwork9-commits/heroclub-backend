const express = require('express');
const cors = require('cors');
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, query, where } = require("firebase/firestore");

const app = express();

// 🔥 CORS FIXED: Har device aur frontend se connect hone ke liye
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// ========================================================================
// 🔥 FIREBASE CONNECTION (HeroClub Backend)
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
const ADMIN_RESERVE = 10000; // 10,000 Coins Minimum Base Profit (Locked!)

let globalVault = {
    totalDepositsCoins: 0,
    totalWithdrawalsCoins: 0,
    totalUserLiability: 0,
    houseProfitCoins: 0,      
    effectivePNL: 0,          // House Profit - Admin Reserve
    lastSynced: "Never"
};

let usersDB = {}; // Session database for tracking streaks

// ========================================================================
// 🔄 BACKGROUND PNL CALCULATOR (BILLING SHIELD ENABLED)
// ========================================================================
async function syncHousePNL() {
    try {
        let tDepositsINR = 0, tWithdrawalsINR = 0, tLiabilityCoins = 0;

        // 1. Calculate Liability
        const uSnap = await getDocs(collection(db, "users"));
        uSnap.forEach(doc => {
            let data = doc.data();
            if (!data.isBanned && data.coins > 0) tLiabilityCoins += data.coins;
        });

        // 2. Calculate Real Deposits
        const cSnap = await getDocs(query(collection(db, "coin_purchases"), where("status", "==", "Success")));
        cSnap.forEach(d => tDepositsINR += parseInt(d.data().amountPaid || d.data().amount || d.data().amountINR || d.data().inr || 0));

        const vSnap = await getDocs(query(collection(db, "vip_purchases"), where("status", "==", "Success")));
        vSnap.forEach(d => tDepositsINR += parseInt(d.data().amountPaid || d.data().amount || d.data().amountINR || 0));

        const rSnap = await getDocs(query(collection(db, "referral_requests"), where("status", "==", "Success")));
        rSnap.forEach(d => tDepositsINR += parseInt(d.data().amountPaid || d.data().amount || d.data().amountINR || 0));

        // 3. Calculate Real Withdrawals
        const wSnap = await getDocs(query(collection(db, "withdrawals"), where("status", "==", "paid")));
        wSnap.forEach(d => tWithdrawalsINR += parseInt(d.data().amount || 0));

        // 4. Update Vault Stats
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

// 🔥 Start auto-sync loop (Updated to 5 Minutes to save Firebase Costs)
syncHousePNL();
setInterval(syncHousePNL, 300000); // 300000 ms = 5 Minutes

// ========================================================================
// 📡 SERVER ROUTES
// ========================================================================
app.get('/', (req, res) => {
    res.send(`HeroClub Master Brain 🧠 | Effective PNL: ${globalVault.effectivePNL} Coins | Sync: ${globalVault.lastSynced} | Status: Online ✅`);
});

// ========================================================================
// 🕹️ THE MASTER PLAY ENDPOINT (DYNAMIC RNG + SAFEGUARD MODE)
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

        let isSafeguardMode = globalVault.effectivePNL < 0; 
        let targetMultiplier = 0;
        let calculatedWinAmount = 0; 
        let r = Math.random();
        let isCrashGame = false;

        // --- 🚀 CRASH GAMES ---
        if (gameName.includes("crash") || gameName.includes("chicken")) {
            isCrashGame = true;
            if (isSafeguardMode) {
                let emergencyHouseEdge = 8; // 8% instant crash
                if (r < (emergencyHouseEdge / 100)) {
                    targetMultiplier = 1.00;
                } else {
                    targetMultiplier = Math.floor((100 * (1 - (emergencyHouseEdge / 100))) / r) / 100;
                }
                if (targetMultiplier > 2.50) {
                    targetMultiplier = 1.15 + (Math.random() * 1.0);
                }
            } else {
                let normalHouseEdge = 4; // 4% instant crash
                if (r < (normalHouseEdge / 100)) {
                    targetMultiplier = 1.00; 
                } else {
                    targetMultiplier = Math.floor((100 * (1 - (normalHouseEdge / 100))) / r) / 100;
                }

                let maxAllowedMultiplier = (globalVault.effectivePNL * 0.15) / bet;
                if (targetMultiplier > maxAllowedMultiplier && maxAllowedMultiplier > 1.2) {
                    targetMultiplier = Math.floor(maxAllowedMultiplier * 100) / 100;
                }
            }
            calculatedWinAmount = 0; // Calculated strictly on cashout
        } 
        
        // --- 🔵 PLINKO GAMES ---
        else if (gameName.includes("plinko")) {
            let roll = Math.random() * 100;
            
            if (isSafeguardMode) {
                if (roll < 60) targetMultiplier = 0;
                else if (roll < 85) targetMultiplier = 0.5;
                else targetMultiplier = 1.5;
            } else {
                if (roll < 45) targetMultiplier = 0;
                else if (roll < 70) targetMultiplier = 0.5;
                else if (roll < 90) targetMultiplier = 1.5;
                else if (roll < 98) targetMultiplier = 3.0;
                else targetMultiplier = 10.0;
                
                if (targetMultiplier === 10.0 && (bet * 10) > (globalVault.effectivePNL * 0.15)) {
                    targetMultiplier = 3.0;
                }
            }
            calculatedWinAmount = Math.floor(bet * targetMultiplier);
        }
        
        // --- 🎲 SINGLE PLAY GAMES (Lucky Dice, Coin Flip) ---
        else {
            let winChance = isSafeguardMode ? 0.35 : 0.48; // 35% win chance in safeguard, 48% normal
            let isWin = Math.random() < winChance;
            
            if (!isWin) {
                targetMultiplier = 0;
                calculatedWinAmount = 0; 
            } else {
                targetMultiplier = 1.80; 
                calculatedWinAmount = Math.floor(bet * targetMultiplier); 
            }
        }

        // Streak Tracker logic (Only for non-crash games, Crash relies on cashout)
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
// 💸 THE CASHOUT ENDPOINT (For Crash/Interactive Games)
// ========================================================================
app.post('/api/cashout', (req, res) => {
    try {
        const { uid, cashoutAmount } = req.body;
        if (!uid) return res.json({ success: false, error: "Missing User ID" });

        let payout = Math.floor(parseFloat(cashoutAmount)) || 0;

        if (!usersDB[uid]) usersDB[uid] = { currentLossStreak: 0, currentWinStreak: 0 };
        let user = usersDB[uid];

        if (payout > 0) {
            user.currentWinStreak += 1; 
            user.currentLossStreak = 0;
            res.json({ success: true, payout: payout });
        } else {
            user.currentLossStreak += 1; 
            user.currentWinStreak = 0;
            res.json({ success: true, payout: 0 });
        }
    } catch (error) {
        console.error("Cashout API Error:", error);
        res.json({ success: false });
    }
});

app.post('/api/lose', (req, res) => {
    try {
        const { uid } = req.body;
        if (uid && usersDB[uid]) {
            usersDB[uid].currentLossStreak += 1;
            usersDB[uid].currentWinStreak = 0;
        }
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`HeroClub Master Brain running on port ${PORT}`);
});
