import "./env.js";
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";

import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import PrivacyWebhookHandlers from "./privacy.js";

import { connectToDatabase } from "./db.js";
import Announcement from "./models/Announcement.js";
import {
  ensureMetafieldDefinition,
  syncAnnouncementToShopify,
  getAnnouncementFromShopify,
} from "./announcement-service.js";

await connectToDatabase();

const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3000",
  10
);

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const app = express();

app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: PrivacyWebhookHandlers })
);

app.use("/api/*", shopify.validateAuthenticatedSession());

app.use(express.json());

app.get("/api/products/count", async (_req, res) => {
  const client = new shopify.api.clients.Graphql({
    session: res.locals.shopify.session,
  });

  const countData = await client.request(`
    query shopifyProductCount {
      productsCount {
        count
      }
    }
  `);

  res.status(200).send({ count: countData.data.productsCount.count });
});

app.post("/api/products", async (_req, res) => {
  let status = 200;
  let error = null;

  try {
    await productCreator(res.locals.shopify.session);
  } catch (e) {
    status = 500;
    error = e.message;
  }
  res.status(status).send({ success: status === 200, error });
});

app.get("/api/announcement", async (_req, res) => {
  const session = res.locals.shopify.session;

  const [latest, history] = await Promise.all([
    Announcement.findOne({ shop: session.shop }).sort({ createdAt: -1 }).lean(),
    Announcement.find({ shop: session.shop })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);

  let metafieldValue = null;
  try {
    metafieldValue = await getAnnouncementFromShopify(session);
  } catch (e) {
    console.error("Failed to read metafield:", e.message);
  }

  res.status(200).send({ latest, history, metafieldValue });
});

app.post("/api/announcement", async (req, res) => {
  const session = res.locals.shopify.session;
  const text = (req.body?.text ?? "").toString();

  try {
    const record = await Announcement.create({ shop: session.shop, text });
    await ensureMetafieldDefinition(session);
    const metafield = await syncAnnouncementToShopify(session, text);
    res.status(200).send({ success: true, record, metafield });
  } catch (e) {
    console.error("Failed to save announcement:", e);
    res.status(500).send({ success: false, error: e.message });
  }
});

app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(
      readFileSync(join(STATIC_PATH, "index.html"))
        .toString()
        .replace("%VITE_SHOPIFY_API_KEY%", process.env.SHOPIFY_API_KEY || "")
    );
});

app.listen(PORT);
