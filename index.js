const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const app = express();
app.use(cors());
app.use(express.json());

// 1. Firebase Database se connection jodna (Teri chupi hui Key se)
try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Connected Successfully! 🔥");
} catch (error) {
    console.error("Firebase Key Error! Check your FIREBASE_KEY secret.", error);
}

const db = admin.firestore();

// Server Check Route
app.get("/", (req, res) => {
    res.send("HeroClub Master AI Brain is Live! 🚀💰");
});

// 🔥 THE MAIN GAME CONTROLLER API (Puri website ko control karega) 🔥
app.post("/api/play", async (req, res) => {
    try {
        const { uid, game, betAmount } = req.body;
        if (!uid || !betAmount || !game) {
            return res.status(400).json({ error: "Invalid Data" });
        }

        // 1. User aur House (Tera Khazana) ka Data nikalna
        const userRef = db.collection("users").doc(uid);
        const vaultRef = db.collection("GlobalData").doc("Vault");

        const [userSnap, vaultSnap] = await Promise.all([
            userRef.get(),
            vaultRef.get(),
        ]);

        let userData = userSnap.exists
            ? userSnap.data()
            : { coins: 0, deposited: false };
        let houseProfit = vaultSnap.exists ? vaultSnap.data().profit || 0 : 0;
        let hasDeposited = userData.deposited || false;

        let resultMultiplier = 0;
        let rnd = Math.random() * 100000;

        // 2. 🧠 GLOBAL AI LOGIC (Tere rules ke hisaab se)
        let isFreeUserNearCap =
            !hasDeposited && userData.coins >= 2000 && userData.coins < 3500;

        if (isFreeUserNearCap) {
            // Free user trap (Bina deposit withdraw rokne ke liye)
            if (rnd < 60000)
                resultMultiplier = 0; // 60% Loss
            else resultMultiplier = 1.2; // 40% small win tease
        } else if (betAmount >= 500) {
            // Whale (Badi Bet) -> Pehle House ko bachao
            let potentialPayout = betAmount * 2;
            if (houseProfit < potentialPayout) {
                if (rnd < 70000)
                    resultMultiplier = 0; // 70% Loss
                else resultMultiplier = 1.5;
            } else {
                if (rnd < 50000) resultMultiplier = 0;
                else resultMultiplier = 2;
            }
        } else {
            // Normal Player -> Illusion of Fairness
            if (rnd < 55000)
                resultMultiplier = 0; // 55% Loss
            else if (rnd < 80000) resultMultiplier = 1.2;
            else if (rnd < 95000) resultMultiplier = 1.5;
            else resultMultiplier = 2.5;

            // JACKPOT RULE (0.01%) - Sirf tab jab House rich ho
            if (houseProfit > betAmount * 100 && rnd < 10) {
                resultMultiplier = 10;
            }
        }

        // 3. Database Updates (Coins server pe calculate honge, koi hack nahi kar payega)
        let winAmt = Math.floor(betAmount * resultMultiplier);
        let netProfitForHouse = betAmount - winAmt;

        const batch = db.batch();
        // User ka balance update
        batch.update(userRef, {
            coins: admin.firestore.FieldValue.increment(winAmt - betAmount),
        });
        // Tera Vault (Khazana) update
        batch.set(
            vaultRef,
            { profit: admin.firestore.FieldValue.increment(netProfitForHouse) },
            { merge: true },
        );

        // History Save Karna
        const historyRef = db
            .collection("users")
            .doc(uid)
            .collection("history")
            .doc();
        batch.set(historyRef, {
            task: `${game} Played`,
            bet: betAmount,
            won: winAmt,
            multiplier: resultMultiplier,
            date: new Date(),
            type: winAmt > 0 ? "credit" : "debit",
        });

        await batch.commit();

        // 4. Send final decision to Frontend
        res.json({
            success: true,
            multiplier: resultMultiplier,
            winAmount: winAmt,
        });
    } catch (error) {
        console.error("Game Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log("HeroClub Server Started Successfully! 🚀");
});
