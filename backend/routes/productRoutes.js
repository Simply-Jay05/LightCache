const express = require("express");
const Product = require("../models/Product");
const { protect, admin } = require("../middleware/authMiddleware");
const { cacheMiddleware } = require("../middleware/cacheMiddleware");
const { cacheDelPattern } = require("../config/redis");

const router = express.Router();


// WRITE ROUTES (invalidate cache on change)

// @route POST /api/products
// @desc Create a new Product
// @access Private/Admin
router.post("/", protect, admin, async (req, res) => {
  try {
    const product = new Product({ ...req.body, user: req.user._id });
    const createdProduct = await product.save();
    await cacheDelPattern("products:*");
    console.log("🗑️  Cache invalidated after product create");
    res.status(201).json(createdProduct);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

// @route PUT /api/products/:id
// @desc Update an existing product by its ID
// @access Private/Admin
router.put("/:id", protect, admin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    const fields = [
      "name","description","price","discountPrice","countInStock",
      "category","brand","sizes","colors","collections","material",
      "gender","images","isFeatured","isPublished","tags","dimensions","weight","sku",
    ];
    fields.forEach((f) => { if (req.body[f] !== undefined) product[f] = req.body[f]; });
    const updatedProduct = await product.save();
    await cacheDelPattern("products:*");
    console.log("🗑️  Cache invalidated after product update");
    res.json(updatedProduct);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

// @route DELETE /api/products/:id
// @desc Delete a product by its ID
// @access Private/Admin
router.delete("/:id", protect, admin, async (req, res) => {
  try {
    // Find the product by ID
    const product = await Product.findById(req.params.id);

    if (!product) return res.status(404).json({ message: "Product not found" });
    await product.deleteOne();
    await cacheDelPattern("products:*");
    console.log("🗑️  Cache invalidated after product delete");
    res.json({ message: "Product removed" });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});





// READ ROUTES (cached) — specific paths BEFORE /:id


// @route GET /api/products/best-seller
// @desc Retrieve the product with highest rating
// @acess Public
router.get("/best-seller", cacheMiddleware("best_seller"), async (req, res) => {
  try {
    const bestSeller = await Product.findOne().sort({ rating: -1 });
    if (bestSeller) {
      res.json(bestSeller);
    } else {
      res.status(404).json({ message: "No best seller found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});


// @route GET /api/products/new-arrivals
// @desc Retrieve latest 8 product -Creation date
// @access Public
router.get("/new-arrivals", cacheMiddleware("new_arrivals"), async (req, res) => {
  try {
    // Fetch latest 8 products
    const newArrivals = await Product.find().sort({ createdAt: -1 }).limit(8);
    res.json(newArrivals);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});


// @route GET /api/products/similar/:id
// @desc Retrieve similar products based on the current product's gender and category
// @access Public
router.get("/similar/:id", cacheMiddleware("similar_products"), async (req, res) => {
  const { id } = req.params;
  try {
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product Not Found" });
    }

    const similarProducts = await Product.find({
      _id: { $ne: id }, // Exclude the current product ID
      gender: product.gender,
      category: product.category,
    }).limit(4);

    res.json(similarProducts);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});


// @route GET /api/products
// @desc Get all products with optional query
// @access Public
router.get("/", cacheMiddleware("products_list"), async (req, res) => {
  try {
    const {
      collection,
      size,
      color,
      gender,
      minPrice,
      maxPrice,
      sortBy,
      search,
      category,
      material,
      brand,
      limit,
    } = req.query;

    let query = {};

    // Filter logic
    if (collection && collection.toLocaleLowerCase() !== "all") {
      query.collections = collection;
    }

    if (category && category.toLocaleLowerCase() !== "all") {
      query.category = category;
    }

    if (material) {
      query.material = { $in: material.split(",") };
    }

    if (brand) {
      query.brand = { $in: brand.split(",") };
    }

    if (size) {
      query.sizes = { $in: size.split(",") };
    }

    if (color) {
      query.colors = { $in: [color] };
    }

    if (gender) {
      query.gender = gender;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Sort Logic
    let sort = {};
    if (sortBy) {
      switch (sortBy) {
        case "priceAsc":
          sort = { price: 1 };
          break;
        case "priceDesc":
          sort = { price: -1 };
          break;
        case "popularity":
          sort = { rating: -1 };
          break;
        default:
          break;
      }
    }

    // Fetch products and apply sorting and limit
    let products = await Product.find(query)
      .sort(sort)
      .limit(Number(limit) || 0);
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});


// @route GET /api/products/:id
// @desc Get a single product
// @access Public
router.get("/:id", cacheMiddleware("product_single"), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: "Product Not Found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});


module.exports = router;
