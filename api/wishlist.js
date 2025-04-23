import axios from 'axios';

const { SHOPIFY_ACCESS_TOKEN, SHOPIFY_STORE } = process.env;
export default async function handler(req, res) {
  const { method } = req;

  const customerId = req.method === 'GET' ? req.query.customerId : req.body?.customerId;
  const productId = req.body?.productId;

  if (!customerId || (method !== 'GET' && !productId)) {
    return res.status(400).json({ error: 'Missing customerId or productId', customerId:customerId, productId:productId });
  }

  const headers = {
    "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
  };

  try {
    const metafieldsRes = await axios.get(
      `https://${SHOPIFY_STORE}/admin/api/2025-04/customers/${customerId}/metafields.json`,
      { headers }
    );

    let metafield = metafieldsRes.data.metafields.find(
      (m) => m.namespace === "wishlist" && m.key === "items"
    );

    let wishlist = metafield ? JSON.parse(metafield.value) : [];

    if (method === 'GET') {
      return res.json({ wishlist });
    }

    if (method === 'POST') {
      if (!wishlist.includes(productId)) wishlist.push(productId);
    }

    if (method === 'DELETE') {
      wishlist = wishlist.filter((item) => item !== productId);
    }

    const metafieldPayload = {
      metafield: {
        value: JSON.stringify(wishlist),
        value_type: 'json_string',
      },
    };

    if (metafield) {
      metafieldPayload.metafield.id = metafield.id;
      await axios.put(
        `https://${SHOPIFY_STORE}/admin/api/2025-04/metafields/${metafield.id}.json`,
        metafieldPayload,
        { headers }
      );
    } else if (method === 'POST') {
      await axios.post(
        `https://${SHOPIFY_STORE}/admin/api/2025-04/metafields.json`,
        {
          metafield: {
            namespace: 'wishlist',
            key: 'items',
            type: 'json',
            value: JSON.stringify(wishlist),
            owner_id: customerId,
            owner_resource: 'customer',
          },
        },
        { headers }
      );
    }

    return res.json({ success: true, wishlist });
  } catch (error) {
    console.error(error.response?.data || error.message);
    return res.status(500).json({ error: error.response?.data || error.message, SHOPIFY_STORE:SHOPIFY_STORE, customerId:customerId });
  }
}
