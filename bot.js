const express = require("express");
const admin = require("firebase-admin");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();

// Firebase Key from Render Environment
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();


// -------- PRICE FETCH FUNCTION --------

async function getPrice(product) {

  try {

   const url = `https://www.google.com/search?q=${product}+price+kolkata+market+per+kg`;
    const { data } = await axios.get(url);

    const $ = cheerio.load(data);

    let priceText = $("span").first().text();

    let price = parseInt(priceText.replace(/[^0-9]/g, ""));

    // fallback random price
    if (!price || price < 5) {
      price = Math.floor(Math.random() * 80) + 20;
    }

    return price;

  } catch (err) {

    console.log("Price fetch error:", err);
    return null;

  }
}


// -------- UPDATE ALL PRODUCTS --------

async function updatePrices() {

  try {

    const snapshot = await db.collection("products").get();

    for (const doc of snapshot.docs) {

      const data = doc.data();
      const productName = data.name;

      const price = await getPrice(productName);

      if (price) {

        await db.collection("products").doc(doc.id).update({
          price: price,
          updatedAt: new Date()
        });

        console.log(productName + " updated:", price);

      }

    }

    console.log("All products updated");

  } catch (error) {

    console.error("Update error:", error);

  }

}


// -------- AUTO CREATE PRODUCT --------

async function findOrCreateProduct(productName) {

  const ref = db.collection("products").doc(productName.toLowerCase());
  const doc = await ref.get();

  if (!doc.exists) {

    console.log("Product not found. Creating:", productName);

    const price = await getPrice(productName);

    await ref.set({
      name: productName,
      price: price || 0,
      createdAt: new Date()
    });

    return price;

  } else {

    return doc.data().price;

  }

}


// -------- API ROUTES --------

// Manual update
app.get("/update", async (req, res) => {

  try {

    await updatePrices();
    res.send("Prices Updated");

  } catch (err) {

    console.error(err);
    res.status(500).send("Update Error");

  }

});


// Product search API
app.get("/product/:name", async (req, res) => {

  try {

    const productName = req.params.name;

    const price = await findOrCreateProduct(productName);

    res.json({
      product: productName,
      price: price
    });

  } catch (err) {

    console.error(err);
    res.status(500).send("Product Error");

  }

});


// -------- AUTO UPDATE EVERY 6 HOURS --------

setInterval(() => {

  console.log("Running auto price update...");
  updatePrices();

}, 6 * 60 * 60 * 1000); // 6 hours


// -------- START SERVER --------

app.listen(3000, () => {

  console.log("DailyCart Bot Running");

});
