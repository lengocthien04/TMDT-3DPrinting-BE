# Admin API Guide - 3D Printing E-Commerce Backend

Access api docs: http://localhost:3000/api/docs

## Authentication

### Getting Access Token

**Request:**

```bash
POST /auth/login
{
  "email": "admin@hcmut.com",
  "password": "Admin123!"
}
```

**Response:**

```json
{
  "user": {...},
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

Then copy access token and paste in Authorize bearer

---

## Common Admin Tasks

### Task 1: Add New Product with Variants

1. **Create Product**

   ```bash
   POST /products
   {
     "name": "New Product",
     "description": "...",
     "basePrice": 29.99,
     "images": ["url1", "url2"]
   }
   ```

2. **Create Materials**

   ```bash
   POST /materials
   {
     "name": "Material 1",
     "priceFactor": 1.0
   }
   ```

3. **Create Variants**
   ```bash
   POST /variants
   {
     "productId": "product-id",
     "materialId": "material-id",
     "name": "Variant Name",
     "stock": 50
   }
   ```

### Task 2: Add Item to Cart

1. **View Cart Summary**

   ```bash
   GET /carts
   ```

2. **Add Item to Cart**

   ```bash
   POST /carts/items
   {
     "variantId": "variant-id",
     "quantity": 2
   }
   ```

3. **Update Cart Item Quantity**

   ```bash
   PATCH /carts/items/:itemId
   {
     "quantity": 5
   }
   ```

4. **Remove Item from Cart**

   ```bash
   DELETE /carts/items/:itemId
   ```
