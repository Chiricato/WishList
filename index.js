const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const app = express();

const { SHOPIFY_ACCESS_TOKEN, SHOPIFY_STORE } = process.env;
const PORT = 3000;

app.use(bodyParser.json());

// GET wishlist (lấy danh sách wishlist)
app.get('/wishlist', async (req, res) => {
  const customerId = req.query.customerId;

  if (!customerId) return res.status(400).json({ error: 'Missing customerId' });

  try {
    const metafieldsRes = await axios.get(
      `https://${SHOPIFY_STORE}/admin/api/2023-10/customers/${customerId}/metafields.json`,
      {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
        },
      }
    );

    const metafield = metafieldsRes.data.metafields.find(
      (m) => m.namespace === "wishlist" && m.key === "items"
    );

    const wishlist = metafield ? JSON.parse(metafield.value) : [];
    res.json({ wishlist });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

// POST wishlist (thêm sản phẩm)
app.post('/wishlist', async (req, res) => {
  const { customerId, productId } = req.body;

  if (!customerId || !productId) {
    return res.status(400).json({ error: 'Missing customerId or productId' });
  }

  try {
    const metafieldsRes = await axios.get(
      `https://${SHOPIFY_STORE}/admin/api/2023-10/customers/${customerId}/metafields.json`,
      {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
        },
      }
    );

    let metafield = metafieldsRes.data.metafields.find(
      (m) => m.namespace === "wishlist" && m.key === "items"
    );

    let wishlist = metafield ? JSON.parse(metafield.value) : [];

    if (!wishlist.includes(productId)) {
      wishlist.push(productId);
    }

    if (metafield) {
      await axios.put(
        `https://${SHOPIFY_STORE}/admin/api/2023-10/metafields/${metafield.id}.json`,
        {
          metafield: {
            id: metafield.id,
            value: JSON.stringify(wishlist),
            value_type: 'json_string',
          },
        },
        {
          headers: {
            "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
          },
        }
      );
    } else {
      await axios.post(
        `https://${SHOPIFY_STORE}/admin/api/2023-10/metafields.json`,
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
        {
          headers: {
            "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
          },
        }
      );
    }

    res.json({ success: true, wishlist });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to update wishlist' });
  }
});

// DELETE wishlist (xoá sản phẩm)
app.delete('/wishlist', async (req, res) => {
  const { customerId, productId } = req.body;

  if (!customerId || !productId) {
    return res.status(400).json({ error: 'Missing customerId or productId' });
  }

  try {
    const metafieldsRes = await axios.get(
      `https://${SHOPIFY_STORE}/admin/api/2023-10/customers/${customerId}/metafields.json`,
      {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
        },
      }
    );

    const metafield = metafieldsRes.data.metafields.find(
      (m) => m.namespace === "wishlist" && m.key === "items"
    );

    if (!metafield) return res.json({ message: 'No wishlist to update' });

    const currentWishlist = JSON.parse(metafield.value);
    const updatedWishlist = currentWishlist.filter((item) => item !== productId);

    await axios.put(
      `https://${SHOPIFY_STORE}/admin/api/2023-10/metafields/${metafield.id}.json`,
      {
        metafield: {
          id: metafield.id,
          value: JSON.stringify(updatedWishlist),
          value_type: "json_string",
        },
      },
      {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
        },
      }
    );

    res.json({ success: true, wishlist: updatedWishlist });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to delete wishlist item' });
  }
});

app.listen(PORT, () => {
  console.log(`App Proxy server running at http://localhost:${PORT}`);
});
