# Shopify Announcement Banner App (MERN)

A Shopify embedded app that lets a merchant type an **announcement message** in
the Shopify Admin and have it appear as a **floating banner on every storefront
page** — with a full audit history stored in MongoDB.

### Data flow

```
Admin UI (React + Polaris)
      │  POST /api/announcement { text }
      ▼
Express backend (Node)
      ├─ 1. save { shop, text, createdAt } → MongoDB        (audit history)
      └─ 2. write Shop metafield via Admin GraphQL API      (the "bridge")
            namespace: my_app   key: announcement
                              │
                              ▼
Theme App Extension → App Embed Block (Liquid)
      reads {{ shop.metafields.my_app.announcement }}
      and renders the floating banner on every page
```

No ScriptTags are used — the **Shop metafield** is the bridge between backend
and storefront, as required.

## Tech stack

- **MongoDB** (Atlas) via Mongoose — announcement audit history
- **Express** + `@shopify/shopify-app-express` — backend & OAuth/session
- **React** + **Polaris** + App Bridge — embedded admin UI
- **Theme App Extension** (App Embed Block) — storefront banner

## Project structure

```
.
├── web/
│   ├── index.js                  # Express server + /api/announcement routes
│   ├── shopify.js                # Shopify app config (OAuth, sessions)
│   ├── db.js                     # MongoDB (Mongoose) connection
│   ├── models/Announcement.js    # { shop, text, createdAt } schema
│   ├── announcement-service.js   # writes/reads the Shop metafield (GraphQL)
│   └── frontend/                 # React + Polaris admin app
│       └── pages/index.jsx       # "Announcement Text" input + Save button
└── extensions/
    └── announcement-banner/
        ├── shopify.extension.toml
        └── blocks/announcement.liquid   # App Embed Block (target: body)
```

## Prerequisites

- Node.js 18+ and npm
- A [Shopify Partner account](https://partners.shopify.com) + a development store
- A free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

The Shopify CLI ships as a dependency of this project, so no global install is
needed — `npm run dev` runs it.

## Setup & run locally

1. **Install dependencies**

   ```bash
   npm install
   cd web && npm install
   cd frontend && npm install
   cd ../..
   ```

2. **Configure MongoDB**

   ```bash
   cp .env.example .env
   # edit .env -> MONGODB_URI="mongodb+srv://..."
   ```

   In Atlas: create a free cluster → **Database Access** add a user →
   **Network Access** allow `0.0.0.0/0` → **Connect → Drivers** copy the string
   (add a database name such as `/announcements` before the `?`).

3. **Run the app** (the Shopify CLI handles OAuth, tunneling and env injection)

   ```bash
   npm run dev
   ```

   Log in when the browser opens, pick your dev store, then press `p` to open
   and install the app. You should see `[db] Connected to MongoDB` in the logs.

4. **Enable the storefront banner**

   In your dev store admin: **Online Store → Themes → Customize → App embeds**
   → toggle **Announcement Banner** on → **Save**.

5. **Use it**

   - In the app admin, type a message (e.g. `Sale 50% Off`) and click **Save**.
   - The text is saved to MongoDB and written to the `my_app.announcement`
     Shop metafield.
   - Refresh the storefront — the floating banner shows the message.

## How the metafield is made storefront-readable

On each save the backend calls `metafieldDefinitionCreate` (idempotent) with
`access: { storefront: PUBLIC_READ }` for the `my_app.announcement` SHOP
metafield, then writes the value with `metafieldsSet`. The `PUBLIC_READ`
storefront access is what lets Liquid read
`{{ shop.metafields.my_app.announcement }}` in the theme app extension.

## API

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/announcement` | latest record, last 10 (audit history), live metafield value |
| `POST` | `/api/announcement` | save text → MongoDB, then sync to Shop metafield |
# Sopify-announcement-banner-app
# assigment
