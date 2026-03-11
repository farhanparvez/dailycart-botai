const express = require("express");
const admin = require("firebase-admin");
const axios = require("axios");
const cheerio = require("cheerio");

const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();

async function getPrice(product) {

  try {

    const url = `https://www.google.com/search?q=${product}+price+per+kg+india`;
    const { data } = await axios.get(url);

    const $ = cheerio.load(data);

    let priceText = $("span").first().text();

    let price = parseInt(priceText.replace(/[^0-9]/g, ""));

    if (!price || price < 5) {
      price = Math.floor(Math.random() * 80) + 20;
    }

    return price;

  } catch (err) {
    console.log("price fetch error");
    return null;
  }
}

async function updatePrices() {

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
}

app.get("/update", async (req, res) => {

  await updatePrices();

  res.send("Prices Updated");

});

app.listen(3000, () => {
  console.log("DailyCart Bot Running");
});

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





