import shopify from "./shopify.js";

export const METAFIELD_NAMESPACE = "my_app";
export const METAFIELD_KEY = "announcement";
const METAFIELD_TYPE = "single_line_text_field";

async function getShopId(client) {
  const res = await client.request(`query { shop { id } }`);
  return res.data.shop.id;
}

export async function ensureMetafieldDefinition(session) {
  const client = new shopify.api.clients.Graphql({ session });

  const res = await client.request(
    `mutation CreateDefinition($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition { id }
        userErrors { field message code }
      }
    }`,
    {
      variables: {
        definition: {
          name: "App Announcement",
          namespace: METAFIELD_NAMESPACE,
          key: METAFIELD_KEY,
          type: METAFIELD_TYPE,
          ownerType: "SHOP",
          access: { storefront: "PUBLIC_READ" },
        },
      },
    }
  );

  const errors = res.data?.metafieldDefinitionCreate?.userErrors ?? [];
  const fatal = errors.filter((e) => e.code !== "TAKEN");
  if (fatal.length) {
    throw new Error(`metafieldDefinitionCreate: ${JSON.stringify(fatal)}`);
  }
}

export async function syncAnnouncementToShopify(session, text) {
  const client = new shopify.api.clients.Graphql({ session });
  const ownerId = await getShopId(client);

  const res = await client.request(
    `mutation SetMetafield($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id namespace key value }
        userErrors { field message }
      }
    }`,
    {
      variables: {
        metafields: [
          {
            ownerId,
            namespace: METAFIELD_NAMESPACE,
            key: METAFIELD_KEY,
            type: METAFIELD_TYPE,
            value: text,
          },
        ],
      },
    }
  );

  const errors = res.data?.metafieldsSet?.userErrors ?? [];
  if (errors.length) {
    throw new Error(`metafieldsSet: ${JSON.stringify(errors)}`);
  }

  return res.data.metafieldsSet.metafields[0];
}

export async function getAnnouncementFromShopify(session) {
  const client = new shopify.api.clients.Graphql({ session });
  const res = await client.request(
    `query {
      shop {
        metafield(namespace: "${METAFIELD_NAMESPACE}", key: "${METAFIELD_KEY}") {
          value
        }
      }
    }`
  );
  return res.data?.shop?.metafield?.value ?? null;
}
