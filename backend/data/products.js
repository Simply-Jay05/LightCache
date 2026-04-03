const products = [
  // ─── PRODUCT 1 ───────────────────────────────────────────────────────────

  {
    name: "Classic White Oxford Shirt",
    description:
      "A timeless wardrobe essential crafted from 100% premium cotton. This Oxford shirt features a button-down collar, a clean chest pocket, and a slightly relaxed fit that works effortlessly from desk to weekend. The breathable weave keeps you comfortable all day, while the crisp finish ensures you always look put-together.",
    price: 49.99,
    discountPrice: 39.99,
    countInStock: 30,
    sku: "MTW-001",
    category: "Top Wear",
    brand: "Modern Fit",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["White", "Blue", "Gray"],
    collections: "Everyday Basics",
    material: "Cotton",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845914/lightcache/products/men-classic-white-oxford-shirt.jpg",
        altText: "Classic White Oxford Shirt Front View",
      },
    ],
    isFeatured: true,
    isPublished: true,
    rating: 4.7,
    numReviews: 34,
    tags: ["shirt", "oxford", "classic", "formal", "minimal"],
  },

  // ─── PRODUCT 2 ───────────────────────────────────────────────────────────

  {
    name: "Flowy Palazzo Pants",
    description:
      "Airy and elegant, these palazzo pants are cut from lightweight fabric for maximum flow. High waist with an elasticated back for comfort, and a wide leg that creates an elongating silhouette. Perfect for warm days when you want to look effortlessly chic.",
    price: 54.99,
    discountPrice: 46.99,
    countInStock: 22,
    sku: "WBW-006",
    category: "Bottom Wear",
    brand: "ChicStyle",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Green", "White", "Beige", "Black"],
    collections: "Summer Essentials",
    material: "Linen",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845940/lightcache/products/women-flowy-palazzo-pants.png",
        altText: "Flowy Palazzo Pants Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.6,
    numReviews: 27,
    tags: ["palazzo", "wide leg", "flowy", "summer"],
  },

  // ─── PRODUCT 3 ───────────────────────────────────────────────────────────

  {
    name: "Relaxed Linen Shirt",
    description:
      "Lightweight and effortlessly cool, this relaxed linen shirt is designed for warm days. The slightly oversized fit allows airflow, while the soft linen fabric drapes naturally. Features a full button-down front, long sleeves you can roll up, and a curved hem.",
    price: 59.99,
    discountPrice: 49.99,
    countInStock: 20,
    sku: "MTW-005",
    category: "Top Wear",
    brand: "Beach Breeze",
    sizes: ["S", "M", "L", "XL"],
    colors: ["White", "Beige", "Blue"],
    collections: "Summer Essentials",
    material: "Linen",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845921/lightcache/products/men-relaxed-linen-shirt.jpg",
        altText: "Relaxed Linen Shirt Front View",
      },
    ],
    isFeatured: true,
    isPublished: true,
    rating: 4.7,
    numReviews: 18,
    tags: ["linen", "summer", "relaxed", "casual"],
  },

  // ─── PRODUCT 4 ───────────────────────────────────────────────────────────

  {
    name: "High Waist Skinny Jeans",
    description:
      "Flattering high-waist skinny jeans in a stretch denim that moves with you. The zip fly and five-pocket styling keep it classic, while the clean finish makes them easy to dress up or down. A staple you'll reach for constantly.",
    price: 69.99,
    discountPrice: 59.99,
    countInStock: 40,
    sku: "WBW-001",
    category: "Bottom Wear",
    brand: "Street Style",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Blue", "Black", "Gray"],
    collections: "Denim Edit",
    material: "Denim",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845943/lightcache/products/women-high-waist-skinny-jeans.jpg",
        altText: "High Waist Skinny Jeans Front View",
      },
    ],
    isFeatured: true,
    isPublished: true,
    rating: 4.8,
    numReviews: 58,
    tags: ["jeans", "skinny", "high waist", "denim"],
  },

  // ─── PRODUCT 5 ───────────────────────────────────────────────────────────

  {
    name: "Slim Fit Chino Trousers",
    description:
      "A wardrobe cornerstone crafted from stretch cotton twill. These slim-fit chinos sit at the natural waist with clean front and back pockets. The versatile silhouette dresses up with a shirt or down with a tee — the definition of smart casual.",
    price: 64.99,
    discountPrice: 54.99,
    countInStock: 35,
    sku: "MBW-001",
    category: "Bottom Wear",
    brand: "Modern Fit",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Black", "Beige", "Navy", "Green"],
    collections: "Smart Casual",
    material: "Cotton",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845930/lightcache/products/slim-fit-chino-trousers.jpg",
        altText: "Slim Fit Chino Trousers Front View",
      },
    ],
    isFeatured: true,
    isPublished: true,
    rating: 4.8,
    numReviews: 38,
    tags: ["chino", "trousers", "smart casual", "slim fit"],
  },

  // ─── PRODUCT 6 ───────────────────────────────────────────────────────────

  {
    name: "Fitted Ribbed Crewneck Top",
    description:
      "A sleek, form-fitting ribbed top made from a soft cotton-modal blend. The crew neckline and clean seams give it a refined, minimal look. Wear it tucked into high-waisted trousers for a polished everyday outfit or layer under a blazer for effortless dressing.",
    price: 34.99,
    discountPrice: 28.99,
    countInStock: 40,
    sku: "WTW-001",
    category: "Top Wear",
    brand: "Fashionista",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Beige", "White", "Black", "Pink"],
    collections: "Everyday Basics",
    material: "Cotton",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845938/lightcache/products/women-fitted%20-ribbed-crewneck-top.jpg",
        altText: "Fitted Ribbed Crewneck Top Front View",
      },
    ],
    isFeatured: true,
    isPublished: true,
    rating: 4.8,
    numReviews: 47,
    tags: ["ribbed", "fitted", "crewneck", "basics"],
  },

  // ─── PRODUCT 7 ───────────────────────────────────────────────────────────

  {
    name: "Slim Fit Dark Wash Jeans",
    description:
      "Classic five-pocket denim jeans in a flattering slim fit. The dark wash gives them a clean, versatile look that transitions easily from day to night. Made with a touch of stretch for all-day comfort without sacrificing structure.",
    price: 74.99,
    discountPrice: 64.99,
    countInStock: 40,
    sku: "MBW-002",
    category: "Bottom Wear",
    brand: "Street Style",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Navy", "Blue", "Black"],
    collections: "Denim Edit",
    material: "Denim",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845932/lightcache/products/slim-fit-dark-wash-jeans.jpg",
        altText: "Slim Fit Dark Wash Jeans Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.7,
    numReviews: 44,
    tags: ["jeans", "denim", "dark wash", "slim fit"],
  },

  // ─── PRODUCT 8 ───────────────────────────────────────────────────────────

  {
    name: "Oversized Knit Sweater",
    description:
      "A chunky, relaxed knit sweater with dropped shoulders and a wide crew neckline. Made from a soft wool blend that's warm without being itchy. Pairs naturally with skinny jeans, leggings, or midi skirts.",
    price: 64.99,
    discountPrice: 54.99,
    countInStock: 22,
    sku: "WTW-007",
    category: "Top Wear",
    brand: "ChicStyle",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Gray", "White", "Beige", "Pink", "Green"],
    collections: "Winter Essentials",
    material: "Wool",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845944/lightcache/products/women-oversized-knit-sweater.jpg",
        altText: "Oversized Knit Sweater Front View",
      },
    ],
    isFeatured: true,
    isPublished: true,
    rating: 4.9,
    numReviews: 52,
    tags: ["knit", "sweater", "oversized", "cozy", "winter"],
  },

  // ─── PRODUCT 9 ───────────────────────────────────────────────────────────

  {
    name: "Essential Polo Shirt",
    description:
      "Built on a classic silhouette, this polo shirt is made from breathable piqué cotton with ribbed collar and cuffs. A three-button placket and a slightly tapered body give it a modern edge. Versatile enough for the office, a round of golf, or a relaxed weekend.",
    price: 34.99,
    discountPrice: 29.99,
    countInStock: 45,
    sku: "MTW-004",
    category: "Top Wear",
    brand: "Modern Fit",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black", "White", "Navy", "Green"],
    collections: "Everyday Basics",
    material: "Cotton",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845916/lightcache/products/men-essential-polo-shirt.jpg",
        altText: "Essential Polo Shirt Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.6,
    numReviews: 29,
    tags: ["polo", "smart casual", "piqué", "cotton"],
  },

  // ─── PRODUCT 10 ──────────────────────────────────────────────────────────

  {
    name: "Wide Leg Tailored Trousers",
    description:
      "Elegant wide-leg trousers with a high waist and fluid drape. Cut from a lightweight polyester blend that falls beautifully. The clean silhouette transitions from office to evening with ease — wear with a fitted top or tucked-in blouse.",
    price: 69.99,
    discountPrice: 59.99,
    countInStock: 28,
    sku: "WBW-002",
    category: "Bottom Wear",
    brand: "ChicStyle",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Beige", "Black", "White", "Navy"],
    collections: "Smart Casual",
    material: "Polyester",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845961/lightcache/products/women-wide-leg-tailored-trousers.webp",
        altText: "Wide Leg Tailored Trousers Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.7,
    numReviews: 32,
    tags: ["wide leg", "trousers", "tailored", "smart"],
  },

  // ─── PRODUCT 11 ──────────────────────────────────────────────────────────

  {
    name: "Slim Fit Crew Neck Tee",
    description:
      "Cut from soft, medium-weight cotton jersey, this crew neck tee is the backbone of any minimal wardrobe. The slim fit follows the body without being restrictive, and the reinforced collar holds its shape wash after wash. Available in versatile neutral tones that pair with everything.",
    price: 24.99,
    discountPrice: 19.99,
    countInStock: 60,
    sku: "MTW-002",
    category: "Top Wear",
    brand: "Urban Threads",
    sizes: ["S", "M", "L", "XL"],
    colors: ["White", "Black", "Gray", "Navy"],
    collections: "Everyday Basics",
    material: "Cotton",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845925/lightcache/products/men-slim-fit-crew-neck-tee.webp",
        altText: "Slim Fit Crew Neck Tee Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.8,
    numReviews: 52,
    tags: ["tee", "basic", "cotton", "everyday"],
  },

  // ─── PRODUCT 12 ──────────────────────────────────────────────────────────

  {
    name: "Pleated Midi Skirt",
    description:
      "A graceful midi skirt with knife pleats that give it beautiful movement. Sits at the natural waist with a concealed zip. The below-the-knee length and flowy fabric make it equally suited to the office, brunch, or a casual evening.",
    price: 59.99,
    discountPrice: 49.99,
    countInStock: 25,
    sku: "WBW-003",
    category: "Bottom Wear",
    brand: "Fashionista",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Beige", "Gray", "Black", "Pink", "Green"],
    collections: "Everyday Basics",
    material: "Polyester",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845946/lightcache/products/women-pleated-midi-skirt.jpg",
        altText: "Pleated Midi Skirt Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.8,
    numReviews: 39,
    tags: ["midi skirt", "pleated", "feminine", "elegant"],
  },

  // ─── PRODUCT 13 ──────────────────────────────────────────────────────────

  {
    name: "Tapered Jogger Pants",
    description:
      "Elevated joggers made from a soft cotton-blend fleece. Tapered from the knee down for a clean silhouette, these feature an elasticated waist with a drawstring, side pockets, and a small zip back pocket. Comfortable enough for lounging, sharp enough for the street.",
    price: 49.99,
    discountPrice: 42.99,
    countInStock: 30,
    sku: "MBW-003",
    category: "Bottom Wear",
    brand: "Urban Threads",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Black", "Gray", "Navy"],
    collections: "Everyday Basics",
    material: "Fleece",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845933/lightcache/products/tapered-jogger-pants.avif",
        altText: "Tapered Jogger Pants Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.6,
    numReviews: 27,
    tags: ["joggers", "tapered", "casual", "streetwear"],
  },

  // ─── PRODUCT 14 ──────────────────────────────────────────────────────────

  {
    name: "Relaxed Linen Button-Up Shirt",
    description:
      "An effortless linen shirt with a slightly oversized silhouette and a relaxed feel. Features a classic collar, full button-down front, and a straight hem you can wear tucked or loose. The natural linen texture makes every wear feel effortlessly put-together.",
    price: 54.99,
    discountPrice: 44.99,
    countInStock: 25,
    sku: "WTW-002",
    category: "Top Wear",
    brand: "Beach Breeze",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Blue", "White", "Beige", "Green", "Blue"],
    collections: "Summer Essentials",
    material: "Linen",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845951/lightcache/products/women-relaxed-linen-button-up-shirt.jpg",
        altText: "Relaxed Linen Button-Up Shirt Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.7,
    numReviews: 33,
    tags: ["linen", "shirt", "oversized", "summer"],
  },

  // ─── PRODUCT 15 ──────────────────────────────────────────────────────────

  {
    name: "Relaxed Fit Cargo Pants",
    description:
      "Utility-inspired cargo pants with a relaxed fit and multiple pockets for function. Made from durable cotton canvas, they feature an adjustable waistband, side cargo pockets, and tapered ankle cuffs. Style them with a clean white tee for a balanced look.",
    price: 69.99,
    discountPrice: 59.99,
    countInStock: 20,
    sku: "MBW-004",
    category: "Bottom Wear",
    brand: "Street Style",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Beige", "Brown", "Green", "Black"],
    collections: "Utility Collection",
    material: "Cotton",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845920/lightcache/products/men-relaxed-fit-cargo-pants.webp",
        altText: "Relaxed Fit Cargo Pants Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.5,
    numReviews: 22,
    tags: ["cargo", "utility", "relaxed", "pockets"],
  },

  // ─── PRODUCT 16 ──────────────────────────────────────────────────────────

  {
    name: "Classic White Tee",
    description:
      "The perfect white tee — nothing more, nothing less. Cut from thick, soft cotton so it doesn't turn sheer, with a slightly oversized fit that looks great tucked or untucked. An absolute essential in any wardrobe.",
    price: 22.99,
    discountPrice: 18.99,
    countInStock: 70,
    sku: "WTW-003",
    category: "Top Wear",
    brand: "Urban Threads",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["White", "Black", "Gray"],
    collections: "Everyday Basics",
    material: "Cotton",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845937/lightcache/products/women-classic-white-tee.png",
        altText: "Classic White Tee Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.9,
    numReviews: 65,
    tags: ["tee", "white", "basic", "cotton", "essential"],
  },

  // ─── PRODUCT 17 ──────────────────────────────────────────────────────────

  {
    name: "Slim Fit Stretch Shirt",
    description:
      "A refined take on casual dressing, this slim-fit shirt is woven from stretch cotton for ease of movement. The subtle texture adds depth without compromising the clean aesthetic. Features a spread collar, single chest pocket, and a straight hem you can tuck or leave out.",
    price: 54.99,
    discountPrice: 44.99,
    countInStock: 25,
    sku: "MTW-003",
    category: "Top Wear",
    brand: "Modern Fit",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Beige", "White"],
    collections: "Smart Casual",
    material: "Cotton",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181147/lightcache/products/men-slim-fit-stretch-shirt.jpg",
        altText: "Slim Fit Stretch Chino Shirt Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.5,
    numReviews: 21,
    tags: ["shirt", "smart casual", "stretch", "slim fit"],
  },

  // ─── PRODUCT 18 ──────────────────────────────────────────────────────────

  {
    name: "High Rise Straight Leg Jeans",
    description:
      "The straight-leg silhouette re-imagined with a high-rise waist and clean five-pocket design in a rigid denim that holds its shape. The straight cut from hip to hem creates a long, lean line that works with everything.",
    price: 74.99,
    discountPrice: 64.99,
    countInStock: 35,
    sku: "WBW-004",
    category: "Bottom Wear",
    brand: "Street Style",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Blue", "Black", "Navy"],
    collections: "Denim Edit",
    material: "Denim",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845942/lightcache/products/women-high-rise-straight-leg-jeans.webp",
        altText: "High Rise Straight Leg Jeans Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.7,
    numReviews: 46,
    tags: ["jeans", "straight leg", "high rise", "denim"],
  },

  // ─── PRODUCT 19 ──────────────────────────────────────────────────────────

  {
    name: "Ribbed Knit Henley",
    description:
      "A refined casual staple made from soft ribbed cotton. The Henley neckline with a two-button placket adds subtle detail to an otherwise clean silhouette. Slim fit with long sleeves, ideal for layering under a jacket or wearing solo on mild days.",
    price: 39.99,
    discountPrice: 34.99,
    countInStock: 35,
    sku: "MTW-006",
    category: "Top Wear",
    brand: "Urban Threads",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Beige", "Gray", "White", "Brown"],
    collections: "Everyday Basics",
    material: "Cotton",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845924/lightcache/products/men-ribbed-knit-henleyy.avif",
        altText: "Ribbed Knit Henley Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.5,
    numReviews: 23,
    tags: ["henley", "knit", "ribbed", "layering"],
  },

  // ─── PRODUCT 20 ──────────────────────────────────────────────────────────

  {
    name: "Soft Stretch Leggings",
    description:
      "High-performance leggings made from a buttery-soft 4-way stretch fabric. High waist with a wide flat waistband that stays in place. Whether you're working out or running errands, these move with you and look sleek all day.",
    price: 44.99,
    discountPrice: 37.99,
    countInStock: 55,
    sku: "WBW-005",
    category: "Bottom Wear",
    brand: "Fashionista",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Gray", "Black", "Pink", "Navy"],
    collections: "Activewear",
    material: "Polyester",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845957/lightcache/products/women-soft-stretch-leggings.avif",
        altText: "Soft Stretch Leggings Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.9,
    numReviews: 72,
    tags: ["leggings", "stretch", "activewear", "high waist"],
  },

  // ─── PRODUCT 21 ──────────────────────────────────────────────────────────

  {
    name: "Classic Denim Shirt",
    description:
      "A versatile denim shirt in a comfortable regular fit. Made from lightweight chambray denim, it works as a top or open layer over a tee. Features chest pockets, button-roll sleeves, and a straight hem. A go-to piece for casual, effortless dressing.",
    price: 64.99,
    discountPrice: 54.99,
    countInStock: 18,
    sku: "MTW-007",
    category: "Top Wear",
    brand: "Street Style",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Blue", "Navy"],
    collections: "Denim Edit",
    material: "Denim",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845911/lightcache/products/men-classic-denim-shirt.jpg",
        altText: "Classic Denim Shirt Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.4,
    numReviews: 17,
    tags: ["denim", "casual", "shirt", "layering"],
  },

  // ─── PRODUCT 22 ──────────────────────────────────────────────────────────

  {
    name: "V-Neck Wrap Blouse",
    description:
      "A graceful wrap blouse with a deep V-neckline and a self-tie waist that flatters all body types. Made from lightweight woven fabric that drapes beautifully. Ideal for the office or evening out — easily one of those pieces you wear on repeat.",
    price: 49.99,
    discountPrice: 42.99,
    countInStock: 28,
    sku: "WTW-004",
    category: "Top Wear",
    brand: "ChicStyle",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Beige", "White", "Pink", "Blue"],
    collections: "Smart Casual",
    material: "Polyester",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845960/lightcache/products/women-v-neck-wrap-blouse.jpg",
        altText: "V-Neck Wrap Blouse Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.7,
    numReviews: 29,
    tags: ["wrap", "blouse", "v-neck", "feminine"],
  },

  // ─── PRODUCT 23 ──────────────────────────────────────────────────────────

  {
    name: "Tailored Slim Trousers",
    description:
      "Sharp, slim-cut trousers designed for effortless formal dressing. Cut from a lightweight wool fabric with a smooth finish, they feature a flat front, belt loops, and a clean hem. Pair with a dress shirt or a simple knit for a put-together look.",
    price: 79.99,
    discountPrice: 69.99,
    countInStock: 18,
    sku: "MBW-005",
    category: "Bottom Wear",
    brand: "Modern Fit",
    sizes: ["M", "L", "XL"],
    colors: ["Navy", "Blue", "Black", "Gray"],
    collections: "Formal Wear",
    material: "Wool",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845929/lightcache/products/men-tailored-slim-trousers.webp",
        altText: "Tailored Slim Trousers Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.9,
    numReviews: 13,
    tags: ["trousers", "formal", "tailored", "slim"],
  },

  // ─── PRODUCT 24 ──────────────────────────────────────────────────────────

  {
    name: "Paperbag Waist Shorts",
    description:
      "Elevated shorts with a paperbag waist, tied belt, and wide-leg cut. The high-waist silhouette is flattering and versatile — pair with a tucked-in blouse for a polished summer look or a simple tee for laid-back weekends.",
    price: 39.99,
    discountPrice: 33.99,
    countInStock: 30,
    sku: "WBW-007",
    category: "Bottom Wear",
    brand: "Beach Breeze",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Beige", "White", "Black"],
    collections: "Summer Essentials",
    material: "Cotton",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845945/lightcache/products/women-paperbag-waist-shorts.jpg",
        altText: "Paperbag Waist Shorts Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.5,
    numReviews: 24,
    tags: ["shorts", "paperbag", "summer", "belted"],
  },

  // ─── PRODUCT 25 ──────────────────────────────────────────────────────────

  {
    name: "Oversized Drop-Shoulder Tee",
    description:
      "A relaxed, oversized tee with a drop-shoulder seam and a boxy silhouette. Made from heavyweight 100% cotton for structure and durability. Minimal branding, clean lines — wear it tucked, untucked, or tied at the waist.",
    price: 29.99,
    discountPrice: 24.99,
    countInStock: 50,
    sku: "MTW-008",
    category: "Top Wear",
    brand: "Urban Threads",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Brown", "Black", "Gray", "White"],
    collections: "Everyday Basics",
    material: "Cotton",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845919/lightcache/products/men-oversized-drop-shoulder-tee.jpg",
        altText: "Oversized Drop-Shoulder Tee Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.6,
    numReviews: 41,
    tags: ["oversized", "tee", "drop shoulder", "boxy"],
  },

  // ─── PRODUCT 26 ──────────────────────────────────────────────────────────

  {
    name: "Sleeveless Knit Vest Top",
    description:
      "A minimal knit vest top with a ribbed texture and a relaxed, slightly cropped fit. Pair it with high-waisted jeans or wide-leg trousers for a clean, contemporary look. The sleeveless cut keeps things light while the knit adds structure.",
    price: 39.99,
    discountPrice: 33.99,
    countInStock: 35,
    sku: "WTW-005",
    category: "Top Wear",
    brand: "Fashionista",
    sizes: ["XS", "S", "M", "L"],
    colors: ["White", "Black", "Beige", "Pink"],
    collections: "Everyday Basics",
    material: "Cotton",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845956/lightcache/products/women-sleeveless-knit-vest-top.jpg",
        altText: "Sleeveless Knit Vest Top Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.6,
    numReviews: 36,
    tags: ["knit", "vest", "sleeveless", "cropped"],
  },

  // ─── PRODUCT 27 ──────────────────────────────────────────────────────────

  {
    name: "Classic Track Pants",
    description:
      "Clean, minimal track pants with side stripes and an elasticated waistband. Made from smooth polyester with a slight sheen, these are as comfortable as they look sharp. Great for athleisure styling or a sporty casual look.",
    price: 44.99,
    discountPrice: 37.99,
    countInStock: 25,
    sku: "MBW-006",
    category: "Bottom Wear",
    brand: "Urban Threads",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Red", "Navy", "Gray"],
    collections: "Activewear",
    material: "Polyester",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845913/lightcache/products/men-classic-track-pants.jpg",
        altText: "Classic Track Pants Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.3,
    numReviews: 20,
    tags: ["track pants", "sport", "athleisure", "activewear"],
  },

  // ─── PRODUCT 28 ──────────────────────────────────────────────────────────

  {
    name: "Long Sleeve Fitted Turtleneck",
    description:
      "A smooth, fitted turtleneck in a soft cotton blend. The slim silhouette makes it a perfect layering base under coats and blazers, or a standout piece on its own. Clean, polished, and endlessly versatile.",
    price: 44.99,
    discountPrice: 37.99,
    countInStock: 30,
    sku: "WTW-006",
    category: "Top Wear",
    brand: "ChicStyle",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Black", "White", "Beige", "Pink"],
    collections: "Winter Essentials",
    material: "Cotton",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772849069/lightcache/products/women-long-sleeve-fitted-turtleneck.jpg",
        altText: "Long Sleeve Fitted Turtleneck Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.8,
    numReviews: 41,
    tags: ["turtleneck", "fitted", "long sleeve", "winter"],
  },

  // ─── PRODUCT 29 ──────────────────────────────────────────────────────────

  {
    name: "Long Sleeve Waffle Knit Top",
    description:
      "A cozy long-sleeve top in a textured waffle knit fabric. Slim-fitting with a crew neckline, it layers seamlessly under shirts or jackets. The natural cotton blend gives warmth without bulk — a cold-weather essential.",
    price: 34.99,
    discountPrice: 28.99,
    countInStock: 28,
    sku: "MTW-009",
    category: "Top Wear",
    brand: "Urban Threads",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Gray", "White", "Green", "Navy"],
    collections: "Winter Essentials",
    material: "Cotton",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845918/lightcache/products/men-long-sleeve-waffle-knit-top.jpg",
        altText: "Long Sleeve Waffle Knit Top Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.4,
    numReviews: 19,
    tags: ["waffle knit", "long sleeve", "layering", "winter"],
  },

  // ─── PRODUCT 30 ──────────────────────────────────────────────────────────

  {
    name: "Satin Camisole Top",
    description:
      "A luxurious satin camisole with adjustable thin straps and a smooth, fluid drape. Wear it solo for an evening-ready look or layer under blazers for day. The minimal cut and lustrous fabric make it one of those wardrobe heroes that goes anywhere.",
    price: 39.99,
    discountPrice: 32.99,
    countInStock: 30,
    sku: "WTW-008",
    category: "Top Wear",
    brand: "Fashionista",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Black", "Beige", "White", "Pink"],
    collections: "Evening Edit",
    material: "Silk",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845955/lightcache/products/women-satin-camisole-top.webp",
        altText: "Satin Camisole Top Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.7,
    numReviews: 38,
    tags: ["satin", "cami", "evening", "minimal"],
  },

  // ─── PRODUCT 31 ──────────────────────────────────────────────────────────

  {
    name: "Formal Slim Fit Dress Shirt",
    description:
      "Polished and precise, this slim-fit dress shirt is tailored in a smooth cotton fabric that stays crisp all day. Features a classic point collar, double-button barrel cuffs, and a clean front placket. Perfect for the boardroom or evening events.",
    price: 69.99,
    discountPrice: 59.99,
    countInStock: 22,
    sku: "MTW-010",
    category: "Top Wear",
    brand: "Modern Fit",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Navy", "Blue", "Black"],
    collections: "Formal Wear",
    material: "Cotton",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845907/lightcache/products/formal-slim-fit-dress-shirt.jpg",
        altText: "Formal Slim Fit Dress Shirt Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.9,
    numReviews: 15,
    tags: ["formal", "dress shirt", "office", "slim fit"],
  },

  // ─── PRODUCT 32 ──────────────────────────────────────────────────────────

  {
    name: "Classic Striped Breton Top",
    description:
      "A Breton-inspired long-sleeve top in fine jersey cotton with classic horizontal stripes. The relaxed crew neckline and easy fit make it an effortless go-to for casual days. Pairs flawlessly with jeans, shorts, or a tailored trouser.",
    price: 34.99,
    discountPrice: 29.99,
    countInStock: 45,
    sku: "WTW-009",
    category: "Top Wear",
    brand: "Beach Breeze",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Beige", "Gray", "Red"],
    collections: "Everyday Basics",
    material: "Cotton",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845936/lightcache/products/women-classic-striped-breton-top.jpg",
        altText: "Classic Striped Breton Top Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.6,
    numReviews: 43,
    tags: ["striped", "breton", "classic", "casual"],
  },

  // ─── PRODUCT 33 ──────────────────────────────────────────────────────────

  {
    name: "Relaxed Sweatpants",
    description:
      "Made from ultra-soft heavyweight fleece, these relaxed-fit sweatpants are your go-to for comfort without compromising style. Features a wide waistband with internal drawstring and ribbed ankle cuffs. Minimally designed — no loud prints, just clean everyday comfort.",
    price: 44.99,
    discountPrice: 38.99,
    countInStock: 32,
    sku: "MBW-007",
    category: "Bottom Wear",
    brand: "Urban Threads",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Gray", "Black", "White"],
    collections: "Everyday Basics",
    material: "Fleece",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845923/lightcache/products/men-relaxed-sweatpants.webp",
        altText: "Relaxed Sweatpants Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.5,
    numReviews: 31,
    tags: ["sweatpants", "lounge", "fleece", "comfort"],
  },

  // ─── PRODUCT 34 ──────────────────────────────────────────────────────────

  {
    name: "Classic High Rise Culottes",
    description:
      "Wide-leg culottes with a cropped length that hits just below the knee. The high waist and clean lines give them a sophisticated edge, while the relaxed fit keeps things comfortable. Style with strappy sandals or clean white trainers.",
    price: 54.99,
    discountPrice: 46.99,
    countInStock: 20,
    sku: "WBW-008",
    category: "Bottom Wear",
    brand: "ChicStyle",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Black", "White", "Red"],
    collections: "Smart Casual",
    material: "Polyester",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845935/lightcache/products/women-classic-high-rise-culottes.webp",
        altText: "Classic High Rise Culottes Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.6,
    numReviews: 21,
    tags: ["culottes", "wide leg", "cropped", "chic"],
  },

  // ─── PRODUCT 35 ──────────────────────────────────────────────────────────

  {
    name: "Casual Cotton Shorts",
    description:
      "Lightweight casual shorts cut from soft cotton with a mid-thigh length. Features an elastic waist with a drawstring and two side pockets. Minimal and clean — perfect for warm days, weekends, or light exercise.",
    price: 34.99,
    discountPrice: 28.99,
    countInStock: 38,
    sku: "MBW-008",
    category: "Bottom Wear",
    brand: "Beach Breeze",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Green", "Black", "Gray", "Beige"],
    collections: "Summer Essentials",
    material: "Cotton",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845909/lightcache/products/men-casual-cotton-shorts.jpg",
        altText: "Casual Cotton Shorts Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.4,
    numReviews: 26,
    tags: ["shorts", "summer", "casual", "cotton"],
  },

  // ─── PRODUCT 36 ──────────────────────────────────────────────────────────

  {
    name: "Relaxed Cotton Hoodie",
    description:
      "A clean, minimal hoodie made from heavyweight brushed cotton. Features a front kangaroo pocket, an adjustable drawstring hood, and ribbed cuffs. Zero logos, zero fuss — just a perfect everyday layer.",
    price: 59.99,
    discountPrice: 49.99,
    countInStock: 35,
    sku: "WTW-010",
    category: "Top Wear",
    brand: "Urban Threads",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Gray", "Black", "White", "Pink"],
    collections: "Everyday Basics",
    material: "Cotton",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845948/lightcache/products/women-relaxed-cotton-hoodie.jpg",
        altText: "Relaxed Cotton Hoodie Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.8,
    numReviews: 55,
    tags: ["hoodie", "cotton", "relaxed", "everyday"],
  },

  // ─── PRODUCT 37 ──────────────────────────────────────────────────────────

  {
    name: "Straight Leg Light Wash Jeans",
    description:
      "A relaxed straight-leg silhouette in a clean light wash denim. Five-pocket styling with a zip fly and a mid-rise waist. This versatile pair works year-round — roll the hem up in summer or keep it long in winter.",
    price: 69.99,
    discountPrice: 59.99,
    countInStock: 30,
    sku: "MBW-009",
    category: "Bottom Wear",
    brand: "Street Style",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Navy", "Blue", "Gray"],
    collections: "Denim Edit",
    material: "Denim",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845928/lightcache/products/men-straight-leg-light-wash-jeans.jpg",
        altText: "Straight Leg Light Wash Jeans Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.6,
    numReviews: 19,
    tags: ["jeans", "straight leg", "light wash", "denim"],
  },

  // ─── PRODUCT 38 ──────────────────────────────────────────────────────────

  {
    name: "High Rise Joggers",
    description:
      "Comfortable high-rise joggers with an elasticated waistband and tapered leg. Made from a brushed cotton blend that's soft against the skin. Features side pockets and ribbed ankle cuffs. Clean, minimal, and made for real life.",
    price: 44.99,
    discountPrice: 38.99,
    countInStock: 32,
    sku: "WBW-009",
    category: "Bottom Wear",
    brand: "Fashionista",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Black", "Gray", "Pink", "Green"],
    collections: "Everyday Basics",
    material: "Cotton",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845941/lightcache/products/women-high-rise-joggers.webp",
        altText: "High Rise Joggers Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.5,
    numReviews: 30,
    tags: ["joggers", "high rise", "tapered", "comfort"],
  },

  // ─── PRODUCT 39 ──────────────────────────────────────────────────────────

  {
    name: "Drawstring Linen Trousers",
    description:
      "Breezy linen trousers with a relaxed wide-leg cut and a simple drawstring waist. The natural linen fabric softens with each wash, becoming even more comfortable over time. Effortlessly chic for warm-weather dressing.",
    price: 59.99,
    discountPrice: 49.99,
    countInStock: 22,
    sku: "MBW-010",
    category: "Bottom Wear",
    brand: "Beach Breeze",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Beige", "White", "Green"],
    collections: "Summer Essentials",
    material: "Linen",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845915/lightcache/products/men-drawstring-linen-trousers.jpg",
        altText: "Drawstring Linen Trousers Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.5,
    numReviews: 14,
    tags: ["linen", "trousers", "summer", "relaxed"],
  },

  // ─── PRODUCT 40 ──────────────────────────────────────────────────────────

  {
    name: "Tailored Pleated Trousers",
    description:
      "Sophisticated pleated trousers with a wide waistband and a relaxed, flowing leg. Made from a lightweight wool suiting fabric with a smooth finish. Whether worn to a meeting or a dinner, these trousers always deliver.",
    price: 79.99,
    discountPrice: 68.99,
    countInStock: 18,
    sku: "WBW-010",
    category: "Bottom Wear",
    brand: "Fashionista",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Beige", "Black", "White", "Gray"],
    collections: "Formal Wear",
    material: "Wool",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1772845959/lightcache/products/women-tailored-pleated-trousers.avif",
        altText: "Tailored Pleated Trousers Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.9,
    numReviews: 16,
    tags: ["trousers", "pleated", "tailored", "formal"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW PRODUCTS (41–120)
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── PRODUCT 41 ──────────────────────────────────────────────────────────

  {
    name: "Viscose Relaxed Shirt",
    description:
      "A lightweight viscose shirt that drapes effortlessly and keeps you cool in warm weather. The relaxed silhouette features a classic collar, chest pocket, and button-roll sleeves perfect for vacation or casual Fridays. Its subtle sheen elevates the everyday shirt to something more refined.",
    price: 52.99,
    discountPrice: 44.99,
    countInStock: 28,
    sku: "MTW-011",
    category: "Top Wear",
    brand: "Beach Breeze",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black", "Blue", "Beige"],
    collections: "Summer Essentials",
    material: "Viscose",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181164/lightcache/products/men-viscose-relaxed-shirt.webp",
        altText: "Men's Viscose Relaxed Shirt Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.5,
    numReviews: 22,
    tags: ["viscose", "relaxed", "shirt", "summer", "casual"],
  },

  // ─── PRODUCT 42 ──────────────────────────────────────────────────────────

  {
    name: "Women's Silk Slip Dress",
    description:
      "A fluid silk slip dress cut on the bias for a beautiful drape that follows the body. The adjustable spaghetti straps and subtle V-neckline create a look that's equal parts sensual and refined. Wear alone or over a fitted turtleneck for a layered look.",
    price: 89.99,
    discountPrice: 74.99,
    countInStock: 16,
    sku: "WBW-011",
    category: "Bottom Wear",
    brand: "ChicStyle",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Beige", "Black", "Pink"],
    collections: "Evening Edit",
    material: "Silk",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181208/lightcache/products/women-silk-slip-dress.avif",
        altText: "Women's Silk Slip Dress Front View",
      },
    ],
    isFeatured: true,
    isPublished: true,
    rating: 4.8,
    numReviews: 31,
    tags: ["silk", "slip dress", "evening", "feminine", "luxury"],
  },

  // ─── PRODUCT 43 ──────────────────────────────────────────────────────────

  {
    name: "Wool Crewneck Sweater",
    description:
      "A classic crewneck sweater knit from soft merino wool for warmth without weight. The clean ribbed collar, cuffs, and hem give it a polished finish, while the relaxed fit allows comfortable layering over shirts or tees. A cold-weather wardrobe anchor.",
    price: 79.99,
    discountPrice: 67.99,
    countInStock: 24,
    sku: "MTW-012",
    category: "Top Wear",
    brand: "Modern Fit",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Brown", "Navy", "Beige", "Black"],
    collections: "Winter Essentials",
    material: "Wool",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181167/lightcache/products/men-wool-crewneck-sweater.webp",
        altText: "Men's Wool Crewneck Sweater Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.7,
    numReviews: 28,
    tags: ["wool", "crewneck", "sweater", "winter", "layering"],
  },

  // ─── PRODUCT 44 ──────────────────────────────────────────────────────────

  {
    name: "Linen Wide-Leg Trousers",
    description:
      "Breezy wide-leg linen trousers with a relaxed, airy silhouette. The elasticated waistband ensures all-day comfort, while the natural linen fabric keeps you cool. Pair with a fitted tank or a tucked blouse for a polished warm-weather look.",
    price: 62.99,
    discountPrice: 52.99,
    countInStock: 26,
    sku: "WBW-012",
    category: "Bottom Wear",
    brand: "Beach Breeze",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["White", "Beige", "Green"],
    collections: "Summer Essentials",
    material: "Linen",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181197/lightcache/products/women-linen-wide-leg-trousers.webp",
        altText: "Women's Linen Wide-Leg Trousers Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.6,
    numReviews: 24,
    tags: ["linen", "wide leg", "summer", "trousers", "breezy"],
  },

  // ─── PRODUCT 45 ──────────────────────────────────────────────────────────

  {
    name: "Graphic Cotton Tee",
    description:
      "A statement tee printed on heavy cotton with a bold minimal graphic on the chest. The relaxed fit and drop shoulder give it a streetwear edge, while the quality cotton ensures a soft feel and lasting print. The kind of tee people ask about.",
    price: 32.99,
    discountPrice: 26.99,
    countInStock: 45,
    sku: "MTW-013",
    category: "Top Wear",
    brand: "Street Style",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Blue", "Black", "Gray"],
    collections: "Street Collection",
    material: "Cotton",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181131/lightcache/products/men-graphic-cotton-tee.webp",
        altText: "Men's Graphic Cotton Tee Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.5,
    numReviews: 37,
    tags: ["graphic tee", "streetwear", "cotton", "printed"],
  },

  // ─── PRODUCT 46 ──────────────────────────────────────────────────────────

  {
    name: "Viscose Wrap Dress",
    description:
      "A versatile wrap dress in silky viscose that drapes beautifully and flatters every silhouette. The adjustable tie waist cinches perfectly, while the midi length adds elegance. Transitions seamlessly from office to evening with a simple change of accessories.",
    price: 67.99,
    discountPrice: 55.99,
    countInStock: 22,
    sku: "WBW-013",
    category: "Bottom Wear",
    brand: "Fashionista",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Red", "Black", "Blue", "Pink"],
    collections: "Smart Casual",
    material: "Viscose",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181216/lightcache/products/women-viscose-wrap-dress.jpg",
        altText: "Women's Viscose Wrap Dress Front View",
      },
    ],
    isFeatured: true,
    isPublished: true,
    rating: 4.8,
    numReviews: 43,
    tags: ["wrap dress", "viscose", "midi", "feminine", "versatile"],
  },

  // ─── PRODUCT 47 ──────────────────────────────────────────────────────────

  {
    name: "Fleece Zip-Up Hoodie",
    description:
      "A premium fleece zip-up hoodie with a clean minimal design. The full-length zip, kangaroo pockets, and adjustable hood offer practicality without sacrificing style. Soft brushed interior keeps you warm on cool days while the structured exterior stays sharp.",
    price: 69.99,
    discountPrice: 57.99,
    countInStock: 30,
    sku: "MTW-014",
    category: "Top Wear",
    brand: "Urban Threads",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Green", "Black", "Navy", "Gray"],
    collections: "Everyday Basics",
    material: "Fleece",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181129/lightcache/products/men-fleece-zip-up-hoodie.webp",
        altText: "Men's Fleece Zip-Up Hoodie Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.6,
    numReviews: 33,
    tags: ["hoodie", "fleece", "zip-up", "casual", "layering"],
  },

  // ─── PRODUCT 48 ──────────────────────────────────────────────────────────

  {
    name: "Polyester Pleated Mini Skirt",
    description:
      "A flirty pleated mini skirt with a high waist and smooth polyester fabric that holds its shape. The A-line silhouette and movement of the pleats make it playful yet polished. Style with a fitted top and ankle boots for a modern look.",
    price: 44.99,
    discountPrice: 36.99,
    countInStock: 32,
    sku: "WBW-014",
    category: "Bottom Wear",
    brand: "Fashionista",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Green", "Pink", "Navy", "Red"],
    collections: "Everyday Basics",
    material: "Polyester",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181202/lightcache/products/women-polyester-pleated-mini-skirt.jpg",
        altText: "Women's Polyester Pleated Mini Skirt Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.5,
    numReviews: 29,
    tags: ["mini skirt", "pleated", "playful", "high waist"],
  },

  // ─── PRODUCT 49 ──────────────────────────────────────────────────────────

  {
    name: "Denim Slim Shorts",
    description:
      "Slim-fit denim shorts with a mid-thigh cut and classic five-pocket styling. The stretch denim moves with you, making them as comfortable as they are sharp. A summer essential that pairs with virtually any top in your wardrobe.",
    price: 49.99,
    discountPrice: 41.99,
    countInStock: 35,
    sku: "MBW-011",
    category: "Bottom Wear",
    brand: "Street Style",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Blue", "Black", "Gray"],
    collections: "Denim Edit",
    material: "Denim",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181124/lightcache/products/men-denim-slim-shorts.jpg",
        altText: "Men's Denim Slim Shorts Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.4,
    numReviews: 25,
    tags: ["denim", "shorts", "slim", "summer", "casual"],
  },

  // ─── PRODUCT 50 ──────────────────────────────────────────────────────────

  {
    name: "Cotton Crop Top",
    description:
      "A clean and minimal cropped tee in soft cotton jersey. The slightly boxy cut and short length make it perfect for high-waisted bottoms. Simple, versatile, and endlessly wearable — the everyday crop top done right.",
    price: 24.99,
    discountPrice: 19.99,
    countInStock: 55,
    sku: "WTW-011",
    category: "Top Wear",
    brand: "Urban Threads",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Red", "Black", "Pink", "Yellow", "Beige"],
    collections: "Everyday Basics",
    material: "Cotton",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181176/lightcache/products/women-cotton-crop-top.jpg",
        altText: "Women's Cotton Crop Top Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.7,
    numReviews: 60,
    tags: ["crop top", "cotton", "minimal", "basic"],
  },

  // ─── PRODUCT 51 ──────────────────────────────────────────────────────────

  {
    name: "Linen Drawstring Shorts",
    description:
      "Lightweight and breathable linen shorts with an easy drawstring waist and a relaxed fit. The natural fabric moves freely and looks better with each wash. Ideal for beach days, casual outings, or simply keeping cool when it matters.",
    price: 39.99,
    discountPrice: 33.99,
    countInStock: 30,
    sku: "MBW-012",
    category: "Bottom Wear",
    brand: "Beach Breeze",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Green", "White", "Blue", "Beige"],
    collections: "Summer Essentials",
    material: "Linen",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181133/lightcache/products/men-linen-drawstring-shorts.webp",
        altText: "Men's Linen Drawstring Shorts Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.5,
    numReviews: 20,
    tags: ["linen", "shorts", "summer", "beach", "drawstring"],
  },

  // ─── PRODUCT 52 ──────────────────────────────────────────────────────────

  {
    name: "Denim Boyfriend Jeans",
    description:
      "Relaxed boyfriend jeans with a lived-in feel and a slightly distressed finish. The mid-rise waist and straight leg give them a casual, effortless appeal. Roll the hem, tuck in a tee, and you're done — the jeans that go with everything.",
    price: 72.99,
    discountPrice: 61.99,
    countInStock: 33,
    sku: "WBW-015",
    category: "Bottom Wear",
    brand: "Street Style",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Blue", "Gray", "Black"],
    collections: "Denim Edit",
    material: "Denim",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181185/lightcache/products/women-denim-boyfriend-jeans.webp",
        altText: "Women's Denim Boyfriend Jeans Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.6,
    numReviews: 41,
    tags: ["boyfriend jeans", "denim", "relaxed", "casual"],
  },

  // ─── PRODUCT 53 ──────────────────────────────────────────────────────────

  {
    name: "Polyester Performance Tee",
    description:
      "A technical performance tee made from moisture-wicking polyester for active lifestyles. The slim athletic fit moves with the body, while the breathable fabric keeps you dry during workouts. Smooth seams prevent chafing — built for serious training.",
    price: 34.99,
    discountPrice: 28.99,
    countInStock: 40,
    sku: "MTW-015",
    category: "Top Wear",
    brand: "Urban Threads",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Blue", "Navy", "Gray", "Green"],
    collections: "Activewear",
    material: "Polyester",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181140/lightcache/products/men-polyester-performance-tee.webp",
        altText: "Men's Polyester Performance Tee Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.5,
    numReviews: 32,
    tags: ["performance", "activewear", "polyester", "moisture-wicking", "gym"],
  },

  // ─── PRODUCT 54 ──────────────────────────────────────────────────────────

  {
    name: "Silk Blouse",
    description:
      "An understated silk blouse with a relaxed button-down front and cuffed sleeves. The natural sheen and fluid drape of silk give it an effortlessly elevated look. Wear tucked into tailored trousers or loose over straight jeans for smart casual dressing.",
    price: 84.99,
    discountPrice: 69.99,
    countInStock: 18,
    sku: "WTW-012",
    category: "Top Wear",
    brand: "ChicStyle",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Green", "Black", "Beige", "Pink"],
    collections: "Smart Casual",
    material: "Silk",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181205/lightcache/products/women-silk-blouse.jpg",
        altText: "Women's Silk Blouse Front View",
      },
    ],
    isFeatured: true,
    isPublished: true,
    rating: 4.9,
    numReviews: 26,
    tags: ["silk", "blouse", "luxury", "smart casual", "button-down"],
  },

  // ─── PRODUCT 55 ──────────────────────────────────────────────────────────

  {
    name: "Cotton Roll-Neck Sweater",
    description:
      "A refined roll-neck sweater in a soft cotton knit that sits comfortably without being bulky. The clean, streamlined silhouette works as a standalone statement or under a blazer. Minimal styling that speaks to enduring taste.",
    price: 57.99,
    discountPrice: 47.99,
    countInStock: 26,
    sku: "MTW-016",
    category: "Top Wear",
    brand: "Modern Fit",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Black", "White", "Gray", "Beige"],
    collections: "Winter Essentials",
    material: "Cotton",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181119/lightcache/products/men-cotton-roll-neck-sweater.avif",
        altText: "Men's Cotton Roll-Neck Sweater Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.6,
    numReviews: 21,
    tags: ["roll-neck", "sweater", "cotton", "minimal", "winter"],
  },

  // ─── PRODUCT 56 ──────────────────────────────────────────────────────────

  {
    name: "Fleece Oversized Sweatshirt",
    description:
      "A cozy, generously oversized sweatshirt in ultra-soft brushed fleece. The boxy drop-shoulder silhouette and ribbed hem give it a relaxed, street-ready aesthetic. No logos — just clean comfort you'll want to live in all day.",
    price: 54.99,
    discountPrice: 45.99,
    countInStock: 38,
    sku: "WTW-013",
    category: "Top Wear",
    brand: "Urban Threads",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Beige", "Brown", "White", "Pink", "Gray"],
    collections: "Everyday Basics",
    material: "Fleece",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181193/lightcache/products/women-fleece-oversized-sweatshirt.jpg",
        altText: "Women's Fleece Oversized Sweatshirt Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.8,
    numReviews: 54,
    tags: ["sweatshirt", "fleece", "oversized", "cozy", "casual"],
  },

  // ─── PRODUCT 57 ──────────────────────────────────────────────────────────

  {
    name: "Smart Chino Shorts",
    description:
      "Tailored cotton chino shorts with a smart finish for elevated casual dressing. The slim cut sits just above the knee, and the flat-front styling with clean pockets keeps things sharp. Pair with a polo or linen shirt for a put-together summer look.",
    price: 44.99,
    discountPrice: 36.99,
    countInStock: 33,
    sku: "MBW-013",
    category: "Bottom Wear",
    brand: "Modern Fit",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Beige", "Brown", "White", "Navy"],
    collections: "Smart Casual",
    material: "Cotton",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181151/lightcache/products/men-smart-chino-shorts.jpg",
        altText: "Men's Smart Chino Shorts Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.5,
    numReviews: 28,
    tags: ["chino shorts", "smart casual", "summer", "cotton"],
  },

  // ─── PRODUCT 58 ──────────────────────────────────────────────────────────

  {
    name: "Wool Turtleneck Sweater",
    description:
      "A luxuriously warm turtleneck sweater knit from a fine wool blend. The slim silhouette and high neck create a sleek, polished look that works as a base layer or a statement piece on its own. A winter wardrobe essential that never goes out of style.",
    price: 82.99,
    discountPrice: 69.99,
    countInStock: 20,
    sku: "WTW-014",
    category: "Top Wear",
    brand: "ChicStyle",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Gray", "Beige", "Black", "Red"],
    collections: "Winter Essentials",
    material: "Wool",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181218/lightcache/products/women-wool-turtleneck-sweater.jpg",
        altText: "Women's Wool Turtleneck Sweater Front View",
      },
    ],
    isFeatured: true,
    isPublished: true,
    rating: 4.9,
    numReviews: 35,
    tags: ["wool", "turtleneck", "sweater", "winter", "luxury"],
  },

  // ─── PRODUCT 59 ──────────────────────────────────────────────────────────

  {
    name: "Polyester Windbreaker Jacket",
    description:
      "A lightweight polyester windbreaker with a zip-front closure and an adjustable hem. The packable design makes it easy to carry on the go, while the water-resistant shell offers protection from the elements. Clean, functional, and sharply styled.",
    price: 74.99,
    discountPrice: 61.99,
    countInStock: 22,
    sku: "MTW-017",
    category: "Top Wear",
    brand: "Urban Threads",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Green", "Navy", "Black", "Red"],
    collections: "Activewear",
    material: "Polyester",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181143/lightcache/products/men-polyester-windbreaker.webp",
        altText: "Men's Polyester Windbreaker Jacket Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.6,
    numReviews: 27,
    tags: ["windbreaker", "jacket", "polyester", "activewear", "outdoor"],
  },

  // ─── PRODUCT 60 ──────────────────────────────────────────────────────────

  {
    name: "Denim Mini Skirt",
    description:
      "A classic denim mini skirt with a high waist, button-front closure, and raw-edge hem. Made from stretch denim that fits perfectly and stays comfortable all day. Pair with an oversized top for a balanced, effortlessly cool look.",
    price: 54.99,
    discountPrice: 45.99,
    countInStock: 30,
    sku: "WBW-016",
    category: "Bottom Wear",
    brand: "Street Style",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Blue", "Navy", "Gray"],
    collections: "Denim Edit",
    material: "Denim",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181189/lightcache/products/women-denim-mini-skirt.webp",
        altText: "Women's Denim Mini Skirt Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.7,
    numReviews: 38,
    tags: ["denim", "mini skirt", "casual", "high waist", "street"],
  },

  // ─── PRODUCT 61 ──────────────────────────────────────────────────────────

  {
    name: "Viscose Camp Collar Shirt",
    description:
      "A relaxed camp collar shirt in a lightweight viscose fabric with a subtle texture. The open collar, chest pocket, and straight hem create a resort-ready aesthetic that works as a standalone top or open over a tee. Effortless cool for warm weather.",
    price: 56.99,
    discountPrice: 46.99,
    countInStock: 24,
    sku: "MTW-018",
    category: "Top Wear",
    brand: "Beach Breeze",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Black", "Blue", "White", "Beige"],
    collections: "Summer Essentials",
    material: "Viscose",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181155/lightcache/products/men-viscose-camp-collar-shirt.webp",
        altText: "Men's Viscose Camp Collar Shirt Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.6,
    numReviews: 19,
    tags: ["camp collar", "viscose", "summer", "resort", "casual"],
  },

  // ─── PRODUCT 62 ──────────────────────────────────────────────────────────

  {
    name: "Viscose Bias-Cut Midi Skirt",
    description:
      "A graceful bias-cut midi skirt in fluid viscose that drapes beautifully with every step. The elasticated waist ensures a comfortable, flattering fit for all body types. Dress it up with heels and a silk blouse or keep it casual with a simple cotton tee.",
    price: 58.99,
    discountPrice: 48.99,
    countInStock: 25,
    sku: "WBW-017",
    category: "Bottom Wear",
    brand: "Fashionista",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Green", "Red", "Beige", "Navy"],
    collections: "Everyday Basics",
    material: "Viscose",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181213/lightcache/products/women-viscose-midi-skirt.jpg",
        altText: "Women's Viscose Bias-Cut Midi Skirt Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.7,
    numReviews: 33,
    tags: ["bias-cut", "midi skirt", "viscose", "fluid", "elegant"],
  },

  // ─── PRODUCT 63 ──────────────────────────────────────────────────────────

  {
    name: "Cotton Fleece Sweatshirt",
    description:
      "A classic crew-neck sweatshirt made from soft cotton-fleece blend. The relaxed fit and clean, unbranded design make it an everyday essential. Whether layered under a jacket or worn alone, this sweatshirt delivers effortless casual dressing.",
    price: 49.99,
    discountPrice: 41.99,
    countInStock: 42,
    sku: "MTW-019",
    category: "Top Wear",
    brand: "Urban Threads",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Gray", "Black", "Navy", "White"],
    collections: "Everyday Basics",
    material: "Fleece",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181113/lightcache/products/men-cotton-fleece-sweatshirt.webp",
        altText: "Men's Cotton Fleece Sweatshirt Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.6,
    numReviews: 44,
    tags: ["sweatshirt", "fleece", "crew neck", "casual", "everyday"],
  },

  // ─── PRODUCT 64 ──────────────────────────────────────────────────────────

  {
    name: "Polyester Active Shorts",
    description:
      "High-performance active shorts in lightweight polyester with a 4-way stretch. The wide waistband sits securely at the hips, and the inner liner provides full coverage during movement. Designed for the gym, running, or any active pursuit.",
    price: 37.99,
    discountPrice: 30.99,
    countInStock: 48,
    sku: "WBW-018",
    category: "Bottom Wear",
    brand: "Fashionista",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Blue", "Navy", "Pink", "Gray"],
    collections: "Activewear",
    material: "Polyester",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181199/lightcache/products/women-polyester-active-shorts.jpg",
        altText: "Women's Polyester Active Shorts Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.7,
    numReviews: 49,
    tags: ["active shorts", "gym", "polyester", "activewear", "performance"],
  },

  // ─── PRODUCT 65 ──────────────────────────────────────────────────────────

  {
    name: "Slim Fit Wool Blazer",
    description:
      "A sharp, slim-fit blazer tailored from a fine wool blend. The structured silhouette, notched lapels, and welt pockets make it boardroom-ready, while the modern slim cut keeps it feeling contemporary. Pair over a dress shirt or a clean white tee for a smart-casual look.",
    price: 119.99,
    discountPrice: 99.99,
    countInStock: 15,
    sku: "MTW-020",
    category: "Top Wear",
    brand: "Modern Fit",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Black", "Navy", "Gray"],
    collections: "Formal Wear",
    material: "Wool",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181149/lightcache/products/men-slim-fit-wool-blazer.avif",
        altText: "Men's Slim Fit Wool Blazer Front View",
      },
    ],
    isFeatured: true,
    isPublished: true,
    rating: 4.8,
    numReviews: 22,
    tags: ["blazer", "wool", "formal", "slim fit", "smart"],
  },

  // ─── PRODUCT 66 ──────────────────────────────────────────────────────────

  {
    name: "Linen Wrap Skirt",
    description:
      "A breezy linen wrap skirt that ties at the side for an adjustable, flattering fit. The midi length and natural texture give it an effortless bohemian quality, while the clean lines keep it versatile. Perfect for holidays, brunches, and warm-weather events.",
    price: 52.99,
    discountPrice: 43.99,
    countInStock: 27,
    sku: "WBW-019",
    category: "Bottom Wear",
    brand: "Beach Breeze",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["White", "Beige", "Green", "Blue"],
    collections: "Summer Essentials",
    material: "Linen",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181198/lightcache/products/women-linen-wrap-skirt.avif",
        altText: "Women's Linen Wrap Skirt Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.6,
    numReviews: 28,
    tags: ["linen", "wrap skirt", "summer", "midi", "bohemian"],
  },

  // ─── PRODUCT 67 ──────────────────────────────────────────────────────────

  {
    name: "Relaxed Linen Trousers",
    description:
      "Easy linen trousers with a wide-leg, relaxed cut and an elasticated waistband. The breathable fabric and generous fit make these ideal for hot days when comfort is non-negotiable. Style with a fitted linen shirt for a coordinated summer look.",
    price: 62.99,
    discountPrice: 52.99,
    countInStock: 24,
    sku: "MBW-014",
    category: "Bottom Wear",
    brand: "Beach Breeze",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Gray", "White", "Navy", "Green"],
    collections: "Summer Essentials",
    material: "Linen",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181144/lightcache/products/men-relaxed-linen-trousers.jpg",
        altText: "Men's Relaxed Linen Trousers Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.5,
    numReviews: 18,
    tags: ["linen", "trousers", "relaxed", "summer", "breathable"],
  },

  // ─── PRODUCT 68 ──────────────────────────────────────────────────────────

  {
    name: "Cotton Jogger Shorts",
    description:
      "Soft, comfortable jogger shorts made from a lightweight cotton blend with an elasticated waist and drawstring. The relaxed fit and functional side pockets make them your go-to for lounging, errands, or easy weekend mornings.",
    price: 32.99,
    discountPrice: 26.99,
    countInStock: 42,
    sku: "WBW-020",
    category: "Bottom Wear",
    brand: "Urban Threads",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Blue", "Black", "Pink", "White"],
    collections: "Everyday Basics",
    material: "Cotton",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181179/lightcache/products/women-cotton-jogger-shorts.webp",
        altText: "Women's Cotton Jogger Shorts Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.6,
    numReviews: 36,
    tags: ["jogger shorts", "cotton", "lounge", "casual", "comfort"],
  },

  // ─── PRODUCT 69 ──────────────────────────────────────────────────────────

  {
    name: "Formal Wool Trousers",
    description:
      "Impeccably cut formal trousers in a premium wool blend with a crisp pleat front and high waist. The tapered leg and clean hem make them ideal for business meetings or formal events. A sophisticated investment in your formal wardrobe.",
    price: 89.99,
    discountPrice: 74.99,
    countInStock: 16,
    sku: "MBW-015",
    category: "Bottom Wear",
    brand: "Modern Fit",
    sizes: ["M", "L", "XL"],
    colors: ["Brown", "Black", "Gray"],
    collections: "Formal Wear",
    material: "Wool",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181130/lightcache/products/men-formal-wool-trousers.jpg",
        altText: "Men's Formal Wool Trousers Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.8,
    numReviews: 14,
    tags: ["wool", "formal", "trousers", "business", "tailored"],
  },

  // ─── PRODUCT 70 ──────────────────────────────────────────────────────────

  {
    name: "Silk Printed Blouse",
    description:
      "A statement silk blouse with a subtle all-over print and a relaxed, elegant fit. The lightweight fabric drapes beautifully and feels luxurious against the skin. Pair with wide-leg trousers for a coordinated office look or tucked into jeans for relaxed sophistication.",
    price: 92.99,
    discountPrice: 77.99,
    countInStock: 14,
    sku: "WTW-015",
    category: "Top Wear",
    brand: "Fashionista",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Pink", "Blue", "Beige"],
    collections: "Smart Casual",
    material: "Silk",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181206/lightcache/products/women-silk-printed-blouse.jpg",
        altText: "Women's Silk Printed Blouse Front View",
      },
    ],
    isFeatured: true,
    isPublished: true,
    rating: 4.9,
    numReviews: 19,
    tags: ["silk", "blouse", "printed", "luxury", "elegant"],
  },

  // ─── PRODUCT 71 ──────────────────────────────────────────────────────────

  {
    name: "Cotton Varsity Sweatshirt",
    description:
      "A sporty varsity-style sweatshirt made from heavyweight cotton with contrast rib detailing at the collar, cuffs, and hem. The regular fit and classic aesthetic give it a timeless collegiate feel that's easy to style with jeans or joggers.",
    price: 54.99,
    discountPrice: 44.99,
    countInStock: 36,
    sku: "MTW-021",
    category: "Top Wear",
    brand: "Street Style",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Green", "Red", "Gray", "Black"],
    collections: "Street Collection",
    material: "Cotton",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181154/lightcache/products/men-varsity-sweatshirt.avif",
        altText: "Men's Cotton Varsity Sweatshirt Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.5,
    numReviews: 30,
    tags: ["varsity", "sweatshirt", "collegiate", "cotton", "streetwear"],
  },

  // ─── PRODUCT 72 ──────────────────────────────────────────────────────────

  {
    name: "Polyester Flare Trousers",
    description:
      "Elegant flare trousers in a smooth polyester fabric that skims the body through the hip and flares dramatically from the knee. The high waist and wide hem create a bold, retro silhouette that turns heads. Style with a fitted top and platform shoes.",
    price: 64.99,
    discountPrice: 54.99,
    countInStock: 23,
    sku: "WBW-021",
    category: "Bottom Wear",
    brand: "Fashionista",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Black", "Navy", "Beige", "Red"],
    collections: "Smart Casual",
    material: "Polyester",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181201/lightcache/products/women-polyester-flare-trousers.jpg",
        altText: "Women's Polyester Flare Trousers Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.7,
    numReviews: 26,
    tags: ["flare trousers", "polyester", "retro", "bold", "elegant"],
  },

  // ─── PRODUCT 73 ──────────────────────────────────────────────────────────

  {
    name: "Striped Cotton Polo",
    description:
      "A classic polo with bold horizontal stripes woven into soft piqué cotton. The ribbed collar and two-button placket maintain the timeless polo structure, while the stripe pattern adds personality. A sharp choice for casual weekend dressing.",
    price: 39.99,
    discountPrice: 32.99,
    countInStock: 34,
    sku: "MTW-022",
    category: "Top Wear",
    brand: "Modern Fit",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Navy", "Blue", "White"],
    collections: "Everyday Basics",
    material: "Cotton",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181152/lightcache/products/men-striped-cotton-polo.jpg",
        altText: "Men's Striped Cotton Polo Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.5,
    numReviews: 23,
    tags: ["polo", "striped", "cotton", "classic", "casual"],
  },

  // ─── PRODUCT 74 ──────────────────────────────────────────────────────────

  {
    name: "Cotton Button-Front Midi Skirt",
    description:
      "A flattering button-front midi skirt in a crisp cotton fabric. The A-line silhouette and below-knee length strike the perfect balance between casual and polished. Wear with a tucked-in top and loafers for an easy everyday look.",
    price: 56.99,
    discountPrice: 46.99,
    countInStock: 28,
    sku: "WBW-022",
    category: "Bottom Wear",
    brand: "ChicStyle",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["White", "Beige", "Black", "Green"],
    collections: "Everyday Basics",
    material: "Cotton",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181175/lightcache/products/women-cotton-button-front-midi-skirt.webp",
        altText: "Women's Cotton Button-Front Midi Skirt Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.6,
    numReviews: 31,
    tags: ["midi skirt", "cotton", "button-front", "a-line", "casual"],
  },

  // ─── PRODUCT 75 ──────────────────────────────────────────────────────────

  {
    name: "Denim Overshirt",
    description:
      "A heavyweight denim overshirt designed to be worn open as a light layer or closed as a shirt. The regular fit, chest pockets, and sturdy buttons make it a versatile wardrobe workhorse for transitional weather styling.",
    price: 72.99,
    discountPrice: 61.99,
    countInStock: 20,
    sku: "MTW-023",
    category: "Top Wear",
    brand: "Street Style",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Blue", "Black", "Gray"],
    collections: "Denim Edit",
    material: "Denim",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181121/lightcache/products/men-denim-overshirt.webp",
        altText: "Men's Denim Overshirt Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.6,
    numReviews: 18,
    tags: ["denim", "overshirt", "layer", "casual", "street"],
  },

  // ─── PRODUCT 76 ──────────────────────────────────────────────────────────

  {
    name: "Denim Flare Jeans",
    description:
      "A retro-inspired denim flare with a high waist and a dramatic flared leg from the knee down. Made from stretch denim for a flattering, comfortable fit. Pair with a tucked-in blouse and platform heels for a classic '70s-inspired look.",
    price: 77.99,
    discountPrice: 65.99,
    countInStock: 28,
    sku: "WBW-023",
    category: "Bottom Wear",
    brand: "ChicStyle",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Blue", "Navy", "Black"],
    collections: "Denim Edit",
    material: "Denim",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181188/lightcache/products/women-denim-flare-jeans.webp",
        altText: "Women's Denim Flare Jeans Front View",
      },
    ],
    isFeatured: true,
    isPublished: true,
    rating: 4.8,
    numReviews: 44,
    tags: ["flare jeans", "denim", "retro", "high waist", "70s"],
  },

  // ─── PRODUCT 77 ──────────────────────────────────────────────────────────

  {
    name: "Wool Cardigan",
    description:
      "A classic open-front cardigan in a fine merino wool knit. The button-through front, ribbed hem, and V-neck silhouette make it a versatile layering piece over shirts, tees, or turtlenecks. Warm, refined, and timeless.",
    price: 84.99,
    discountPrice: 69.99,
    countInStock: 20,
    sku: "MTW-024",
    category: "Top Wear",
    brand: "Modern Fit",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Yellow", "Beige", "Navy", "Black"],
    collections: "Winter Essentials",
    material: "Wool",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181165/lightcache/products/men-wool-cardigan.jpg",
        altText: "Men's Wool Cardigan Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.7,
    numReviews: 20,
    tags: ["cardigan", "wool", "v-neck", "winter", "layering"],
  },

  // ─── PRODUCT 78 ──────────────────────────────────────────────────────────

  {
    name: "Linen Cropped Shirt",
    description:
      "A relaxed, cropped linen shirt with a classic collar and chest pocket. The shorter length pairs perfectly with high-waisted jeans, shorts, or skirts. The natural texture and breathability of linen make it your best companion for warm days.",
    price: 47.99,
    discountPrice: 39.99,
    countInStock: 32,
    sku: "WTW-016",
    category: "Top Wear",
    brand: "Beach Breeze",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["White", "Beige", "Blue", "Pink"],
    collections: "Summer Essentials",
    material: "Linen",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181196/lightcache/products/women-linen-cropped-shirt.webp",
        altText: "Women's Linen Cropped Shirt Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.7,
    numReviews: 35,
    tags: ["linen", "cropped", "shirt", "summer", "casual"],
  },

  // ─── PRODUCT 79 ──────────────────────────────────────────────────────────

  {
    name: "Cotton Utility Shorts",
    description:
      "Rugged cotton utility shorts with multiple pockets, a secure zip fly, and a relaxed fit. Built for active days where you need storage and durability without sacrificing style. The clean cut keeps them from looking too workwear, making them fully street-ready.",
    price: 47.99,
    discountPrice: 39.99,
    countInStock: 30,
    sku: "MBW-016",
    category: "Bottom Wear",
    brand: "Street Style",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Gray", "Black", "Beige", "Navy"],
    collections: "Utility Collection",
    material: "Cotton",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181120/lightcache/products/men-cotton-utility-shorts.webp",
        altText: "Men's Cotton Utility Shorts Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.4,
    numReviews: 22,
    tags: ["utility shorts", "cotton", "multi-pocket", "outdoor", "casual"],
  },

  // ─── PRODUCT 80 ──────────────────────────────────────────────────────────

  {
    name: "Cotton Off-Shoulder Top",
    description:
      "A relaxed off-shoulder top in soft cotton with a wide, elasticated neckline that sits comfortably off the shoulders. The loose, breezy fit and cropped length make it ideal for summer days when you want something effortless and feminine.",
    price: 34.99,
    discountPrice: 28.99,
    countInStock: 40,
    sku: "WTW-017",
    category: "Top Wear",
    brand: "Beach Breeze",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Black", "Pink", "White", "Beige"],
    collections: "Summer Essentials",
    material: "Cotton",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181180/lightcache/products/women-cotton-off-shoulder-top.avif",
        altText: "Women's Cotton Off-Shoulder Top Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.6,
    numReviews: 40,
    tags: ["off-shoulder", "cotton", "summer", "feminine", "casual"],
  },

  // ─── PRODUCT 81 ──────────────────────────────────────────────────────────

  {
    name: "Slim Fit Polyester Joggers",
    description:
      "Sleek polyester joggers with a smooth, tapered fit and an elasticated drawstring waist. The lightweight, quick-dry fabric makes them a great choice for the gym or athleisure dressing. Side zip pockets add function without bulk.",
    price: 46.99,
    discountPrice: 38.99,
    countInStock: 35,
    sku: "MBW-017",
    category: "Bottom Wear",
    brand: "Urban Threads",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Black", "Navy", "Gray"],
    collections: "Activewear",
    material: "Polyester",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181146/lightcache/products/men-slim-fit-polyester-joggers.jpg",
        altText: "Men's Slim Fit Polyester Joggers Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.4,
    numReviews: 28,
    tags: ["joggers", "polyester", "slim", "activewear", "gym"],
  },

  // ─── PRODUCT 82 ──────────────────────────────────────────────────────────

  {
    name: "Wool Wrap Coat",
    description:
      "A sophisticated wrap coat in a premium wool blend with a wide lapel, self-tie belt, and clean A-line silhouette. The structured yet fluid form makes it a statement outerwear piece for cold-weather dressing. A true investment in timeless style.",
    price: 134.99,
    discountPrice: 114.99,
    countInStock: 12,
    sku: "WTW-018",
    category: "Top Wear",
    brand: "ChicStyle",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Beige", "Brown", "Red", "Gray"],
    collections: "Winter Essentials",
    material: "Wool",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181219/lightcache/products/women-wool-wrap-coat.avif",
        altText: "Women's Wool Wrap Coat Front View",
      },
    ],
    isFeatured: true,
    isPublished: true,
    rating: 4.9,
    numReviews: 17,
    tags: ["coat", "wool", "wrap", "winter", "luxury"],
  },

  // ─── PRODUCT 83 ──────────────────────────────────────────────────────────

  {
    name: "Cotton Longline Tee",
    description:
      "A contemporary longline tee with a curved hem that falls slightly longer at the back. Cut from heavyweight cotton for structure and opacity, the slim-to-regular fit creates a clean, modern silhouette. Great for layering or wearing solo with joggers.",
    price: 32.99,
    discountPrice: 26.99,
    countInStock: 44,
    sku: "MTW-025",
    category: "Top Wear",
    brand: "Street Style",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Yellow", "Beige", "Gray"],
    collections: "Street Collection",
    material: "Cotton",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181115/lightcache/products/men-cotton-longline-tee.jpg",
        altText: "Men's Cotton Longline Tee Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.5,
    numReviews: 39,
    tags: ["longline", "tee", "curved hem", "cotton", "streetwear"],
  },

  // ─── PRODUCT 84 ──────────────────────────────────────────────────────────

  {
    name: "Silk Satin Trousers",
    description:
      "Luxurious wide-leg trousers in a smooth silk satin fabric. The high waist and fluid drape create a silhouette that's equal parts powerful and elegant. Perfect for formal occasions or elevated evening looks when you want maximum impact.",
    price: 97.99,
    discountPrice: 82.99,
    countInStock: 14,
    sku: "WBW-024",
    category: "Bottom Wear",
    brand: "ChicStyle",
    sizes: ["XS", "S", "M", "L"],
    colors: ["White", "Black", "Beige"],
    collections: "Evening Edit",
    material: "Silk",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181207/lightcache/products/women-silk-satin-trousers.jpg",
        altText: "Women's Silk Satin Trousers Front View",
      },
    ],
    isFeatured: true,
    isPublished: true,
    rating: 4.9,
    numReviews: 12,
    tags: ["silk", "satin", "trousers", "wide leg", "evening"],
  },

  // ─── PRODUCT 85 ──────────────────────────────────────────────────────────

  {
    name: "Cotton Oxford Joggers",
    description:
      "A refined take on the classic jogger, made from structured cotton-twill with a clean tapered leg and elasticated ankle. The slim fit and minimal branding make them versatile enough for smart casual dressing, while the drawstring waist ensures comfort all day.",
    price: 52.99,
    discountPrice: 43.99,
    countInStock: 28,
    sku: "MBW-018",
    category: "Bottom Wear",
    brand: "Modern Fit",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Yellow", "Black", "Beige"],
    collections: "Smart Casual",
    material: "Cotton",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181116/lightcache/products/men-cotton-oxford-joggers.jpg",
        altText: "Men's Cotton Oxford Joggers Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.5,
    numReviews: 24,
    tags: ["joggers", "cotton", "smart casual", "tapered", "minimal"],
  },

  // ─── PRODUCT 86 ──────────────────────────────────────────────────────────

  {
    name: "Viscose Smocked Top",
    description:
      "A soft, feminine smocked top in lightweight viscose with delicate gathered fabric at the chest. The elasticated smocking creates a flattering, adjustable fit, while the flowing fabric hangs beautifully below. Pair with jeans or a skirt for an easy feminine look.",
    price: 41.99,
    discountPrice: 33.99,
    countInStock: 36,
    sku: "WTW-019",
    category: "Top Wear",
    brand: "Fashionista",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Yellow", "Pink", "Blue", "White"],
    collections: "Summer Essentials",
    material: "Viscose",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181215/lightcache/products/women-viscose-smocked-top.avif",
        altText: "Women's Viscose Smocked Top Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.7,
    numReviews: 38,
    tags: ["smocked", "viscose", "feminine", "summer", "flowy"],
  },

  // ─── PRODUCT 87 ──────────────────────────────────────────────────────────

  {
    name: "Fleece Lined Cargo Trousers",
    description:
      "Technical cargo trousers with a brushed fleece lining for warmth in cold conditions. Multiple cargo pockets provide functional storage, while the adjustable ankle cuffs and drawstring waist ensure a secure fit. Tough, warm, and adventure-ready.",
    price: 79.99,
    discountPrice: 66.99,
    countInStock: 18,
    sku: "MBW-019",
    category: "Bottom Wear",
    brand: "Street Style",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Green", "Black", "Navy"],
    collections: "Utility Collection",
    material: "Fleece",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181127/lightcache/products/men-fleece-lined-cargo-trousers.webp",
        altText: "Men's Fleece Lined Cargo Trousers Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.5,
    numReviews: 16,
    tags: ["cargo", "fleece", "winter", "utility", "technical"],
  },

  // ─── PRODUCT 88 ──────────────────────────────────────────────────────────

  {
    name: "Cotton Drawstring Cargo Pants",
    description:
      "On-trend cargo trousers with a relaxed fit, low-slung side cargo pockets, and a soft drawstring waist. Made from durable cotton, they have a utility-inspired look that's been elevated with clean lines and a flattering high-waisted cut.",
    price: 64.99,
    discountPrice: 53.99,
    countInStock: 24,
    sku: "WBW-025",
    category: "Bottom Wear",
    brand: "Street Style",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Brown", "Black", "Beige", "Gray"],
    collections: "Utility Collection",
    material: "Cotton",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181177/lightcache/products/women-cotton-drawstring-cargo-pants.webp",
        altText: "Women's Cotton Drawstring Cargo Pants Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.6,
    numReviews: 27,
    tags: ["cargo", "cotton", "utility", "relaxed", "trendy"],
  },

  // ─── PRODUCT 89 ──────────────────────────────────────────────────────────

  {
    name: "Silk Satin Shirt",
    description:
      "A statement shirt made from lustrous silk satin with a classic camp collar and subtle drape. The smooth, fluid fabric catches the light beautifully, making it an instant conversation piece. Wear solo for an evening look or over a white tee for relaxed luxury.",
    price: 94.99,
    discountPrice: 79.99,
    countInStock: 14,
    sku: "MTW-026",
    category: "Top Wear",
    brand: "Modern Fit",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Red", "Beige", "Navy", "White"],
    collections: "Evening Edit",
    material: "Silk",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181145/lightcache/products/men-silk-satin-shirt.jpg",
        altText: "Men's Silk Satin Shirt Front View",
      },
    ],
    isFeatured: true,
    isPublished: true,
    rating: 4.8,
    numReviews: 15,
    tags: ["silk", "satin", "camp collar", "evening", "luxury"],
  },

  // ─── PRODUCT 90 ──────────────────────────────────────────────────────────

  {
    name: "Fleece Zip-Through Jacket",
    description:
      "A practical yet stylish zip-through fleece jacket with a high collar, two side pockets, and a clean minimal aesthetic. The soft fleece fabric provides warmth without bulk, making it an ideal mid-layer for cooler days or a standalone top for milder temperatures.",
    price: 67.99,
    discountPrice: 55.99,
    countInStock: 26,
    sku: "WTW-020",
    category: "Top Wear",
    brand: "Urban Threads",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Black", "Gray", "Green", "Navy"],
    collections: "Everyday Basics",
    material: "Fleece",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181194/lightcache/products/women-fleece-zip-through-jacket.webp",
        altText: "Women's Fleece Zip-Through Jacket Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.6,
    numReviews: 31,
    tags: ["fleece", "jacket", "zip-through", "layering", "casual"],
  },

  // ─── PRODUCT 91 ──────────────────────────────────────────────────────────

  {
    name: "Wool Slim Fit Cardigan",
    description:
      "A slim-fit V-neck cardigan in fine-ribbed merino wool. The tailored silhouette and button-through front make it ideal for smart casual dressing — wear it over a collared shirt or a plain tee. Warm, polished, and effortlessly classic.",
    price: 87.99,
    discountPrice: 72.99,
    countInStock: 18,
    sku: "MTW-027",
    category: "Top Wear",
    brand: "Modern Fit",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Green", "Gray", "Black", "Beige"],
    collections: "Winter Essentials",
    material: "Wool",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181169/lightcache/products/men-wool-slim-fit-cardigan.jpg",
        altText: "Men's Wool Slim Fit Cardigan Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.7,
    numReviews: 17,
    tags: ["cardigan", "wool", "slim fit", "v-neck", "winter"],
  },

  // ─── PRODUCT 92 ──────────────────────────────────────────────────────────

  {
    name: "Viscose Cold-Shoulder Top",
    description:
      "A stylish cold-shoulder top in fluid viscose with cut-out shoulder details that add a subtle flirty edge. The loose, flowing body hangs beautifully and keeps you comfortable in warm weather. Pair with slim jeans or a sleek skirt.",
    price: 43.99,
    discountPrice: 35.99,
    countInStock: 30,
    sku: "WTW-021",
    category: "Top Wear",
    brand: "Fashionista",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Blue", "White", "Red", "Blue"],
    collections: "Summer Essentials",
    material: "Viscose",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181211/lightcache/products/women-viscose-cold-shoulder-top.webp",
        altText: "Women's Viscose Cold-Shoulder Top Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.6,
    numReviews: 29,
    tags: ["cold shoulder", "viscose", "summer", "feminine", "trendy"],
  },

  // ─── PRODUCT 93 ──────────────────────────────────────────────────────────

  {
    name: "Polyester Athletic Shorts",
    description:
      "Performance-focused athletic shorts with a 7-inch inseam, drawstring waist, and breathable polyester fabric. The mesh-lined interior and lightweight construction make them ideal for running, training, or any active pursuit. Clean lines, zero distractions.",
    price: 36.99,
    discountPrice: 29.99,
    countInStock: 45,
    sku: "MBW-020",
    category: "Bottom Wear",
    brand: "Urban Threads",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Green", "Navy", "Gray", "Black"],
    collections: "Activewear",
    material: "Polyester",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181139/lightcache/products/men-polyester-athletic-shorts.jpg",
        altText: "Men's Polyester Athletic Shorts Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.5,
    numReviews: 42,
    tags: ["athletic shorts", "polyester", "running", "gym", "activewear"],
  },

  // ─── PRODUCT 94 ──────────────────────────────────────────────────────────

  {
    name: "Linen Blazer",
    description:
      "A relaxed, unstructured linen blazer with a single button closure and patch pockets. The breathable fabric and easy silhouette make it a summer-office essential — pair over a slip dress or with linen trousers for a complete, considered look.",
    price: 99.99,
    discountPrice: 84.99,
    countInStock: 16,
    sku: "WTW-022",
    category: "Top Wear",
    brand: "ChicStyle",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Beige", "White", "Black"],
    collections: "Smart Casual",
    material: "Linen",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181195/lightcache/products/women-linen-blazer.jpg",
        altText: "Women's Linen Blazer Front View",
      },
    ],
    isFeatured: true,
    isPublished: true,
    rating: 4.8,
    numReviews: 21,
    tags: ["blazer", "linen", "unstructured", "summer", "smart casual"],
  },

  // ─── PRODUCT 95 ──────────────────────────────────────────────────────────

  {
    name: "Denim Straight Cargo Pants",
    description:
      "A utility-meets-denim hybrid: straight-cut denim trousers with added cargo pockets at the thigh. The sturdy denim fabric and relaxed fit make them durable for daily wear, while the clean silhouette keeps them stylish for casual outings.",
    price: 77.99,
    discountPrice: 65.99,
    countInStock: 20,
    sku: "MBW-021",
    category: "Bottom Wear",
    brand: "Street Style",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Blue", "Black", "Gray"],
    collections: "Utility Collection",
    material: "Denim",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181126/lightcache/products/men-denim-straight-cargo-pants.jpg",
        altText: "Men's Denim Straight Cargo Pants Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.5,
    numReviews: 19,
    tags: ["denim", "cargo", "straight leg", "utility", "street"],
  },

  // ─── PRODUCT 96 ──────────────────────────────────────────────────────────

  {
    name: "Cotton Broderie Blouse",
    description:
      "A charming cotton blouse with delicate broderie anglaise embroidery throughout. The tiered design, smocked back, and flutter sleeves create a romantic, feminine silhouette. Pair with tailored trousers for contrast or a linen skirt for a summer celebration.",
    price: 55.99,
    discountPrice: 45.99,
    countInStock: 26,
    sku: "WTW-023",
    category: "Top Wear",
    brand: "Fashionista",
    sizes: ["XS", "S", "M", "L"],
    colors: ["White", "Beige", "Pink"],
    collections: "Summer Essentials",
    material: "Cotton",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181173/lightcache/products/women-cotton-broderie-blouse.avif",
        altText: "Women's Cotton Broderie Blouse Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.7,
    numReviews: 32,
    tags: ["broderie", "blouse", "cotton", "feminine", "summer"],
  },

  // ─── PRODUCT 97 ──────────────────────────────────────────────────────────

  {
    name: "Viscose Printed Shirt",
    description:
      "A bold printed shirt in lightweight viscose, cut with a relaxed regular fit and camp collar for a laid-back resort aesthetic. The fluid fabric and vibrant print make it a confident statement piece that's easy to wear and hard to ignore.",
    price: 58.99,
    discountPrice: 48.99,
    countInStock: 22,
    sku: "MTW-028",
    category: "Top Wear",
    brand: "Beach Breeze",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Blue", "White", "Red"],
    collections: "Summer Essentials",
    material: "Viscose",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181162/lightcache/products/men-viscose-printed-shirt.png",
        altText: "Men's Viscose Printed Shirt Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.4,
    numReviews: 20,
    tags: ["printed shirt", "viscose", "resort", "camp collar", "summer"],
  },

  // ─── PRODUCT 98 ──────────────────────────────────────────────────────────

  {
    name: "Polyester Sport Leggings",
    description:
      "Compression-fit sport leggings made from a smooth, high-performance polyester blend with 4-way stretch. The high waist, flat seams, and sculpting panels make them as flattering as they are functional. From pilates to gym sessions, these leggings move with you.",
    price: 49.99,
    discountPrice: 41.99,
    countInStock: 48,
    sku: "WBW-026",
    category: "Bottom Wear",
    brand: "Fashionista",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Gray", "Navy", "Black", "Pink"],
    collections: "Activewear",
    material: "Polyester",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181203/lightcache/products/women-polyester-sport-leggings.jpg",
        altText: "Women's Polyester Sport Leggings Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.8,
    numReviews: 62,
    tags: ["sport leggings", "polyester", "compression", "gym", "activewear"],
  },

  // ─── PRODUCT 99 ──────────────────────────────────────────────────────────

  {
    name: "Linen Overshirt",
    description:
      "A refined linen overshirt designed to be worn as a light jacket or a relaxed shirt. The structured collar, chest pockets, and roll-tab sleeves give it functional versatility, while the natural linen fabric keeps things cool and effortless.",
    price: 67.99,
    discountPrice: 56.99,
    countInStock: 20,
    sku: "MTW-029",
    category: "Top Wear",
    brand: "Beach Breeze",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Beige", "White", "Blue", "Green"],
    collections: "Summer Essentials",
    material: "Linen",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181134/lightcache/products/men-linen-overshirt.webp",
        altText: "Men's Linen Overshirt Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.6,
    numReviews: 16,
    tags: ["linen", "overshirt", "summer", "layering", "casual"],
  },

  // ─── PRODUCT 100 ─────────────────────────────────────────────────────────

  {
    name: "Cotton Smock Dress",
    description:
      "A relaxed smock dress in soft cotton with a square neckline, billowy sleeves, and a tiered skirt. The smocked bodice creates a comfortable, adjustable fit while the midi length keeps it versatile for casual days, holidays, or relaxed gatherings.",
    price: 62.99,
    discountPrice: 52.99,
    countInStock: 24,
    sku: "WBW-027",
    category: "Bottom Wear",
    brand: "Beach Breeze",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Red", "Pink", "Yellow", "White"],
    collections: "Summer Essentials",
    material: "Cotton",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181183/lightcache/products/women-cotton-smock-dress.webp",
        altText: "Women's Cotton Smock Dress Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.7,
    numReviews: 34,
    tags: ["smock dress", "cotton", "midi", "feminine", "summer"],
  },

  // ─── PRODUCT 101 ─────────────────────────────────────────────────────────

  {
    name: "Merino Wool Quarter-Zip",
    description:
      "A premium quarter-zip pullover knit from fine merino wool for exceptional warmth and softness. The clean collarless zip neck and slim profile make it a sophisticated layering piece under a jacket or a standalone statement on its own.",
    price: 92.99,
    discountPrice: 77.99,
    countInStock: 16,
    sku: "MTW-030",
    category: "Top Wear",
    brand: "Modern Fit",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Red", "Gray", "Black", "Green"],
    collections: "Winter Essentials",
    material: "Wool",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181138/lightcache/products/men-merino-wool-quarter-zip.jpg",
        altText: "Men's Merino Wool Quarter-Zip Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.8,
    numReviews: 18,
    tags: ["merino", "wool", "quarter-zip", "winter", "premium"],
  },

  // ─── PRODUCT 102 ─────────────────────────────────────────────────────────

  {
    name: "Denim Utility Jacket",
    description:
      "A structured denim utility jacket with a collar, multiple front pockets, and a zip-through closure. The boxy fit and stiff denim construction give it an intentional, workwear-inspired aesthetic. Layer over hoodies, dresses, or anything in between.",
    price: 84.99,
    discountPrice: 69.99,
    countInStock: 18,
    sku: "WTW-024",
    category: "Top Wear",
    brand: "Street Style",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Blue", "Black", "Gray"],
    collections: "Utility Collection",
    material: "Denim",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181190/lightcache/products/women-denim-utility-jacket.webp",
        altText: "Women's Denim Utility Jacket Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.6,
    numReviews: 24,
    tags: ["denim jacket", "utility", "workwear", "casual", "layer"],
  },

  // ─── PRODUCT 103 ─────────────────────────────────────────────────────────

  {
    name: "Cotton Printed Shorts",
    description:
      "Fun and bold cotton shorts with an all-over print and a relaxed mid-thigh fit. The elasticated drawstring waist and side pockets keep things practical, while the pattern makes a statement. The perfect conversation starter for casual summer days.",
    price: 38.99,
    discountPrice: 31.99,
    countInStock: 36,
    sku: "MBW-022",
    category: "Bottom Wear",
    brand: "Beach Breeze",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Blue", "Green", "Red"],
    collections: "Summer Essentials",
    material: "Cotton",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181117/lightcache/products/men-cotton-printed-shorts.jpg",
        altText: "Men's Cotton Printed Shorts Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.4,
    numReviews: 26,
    tags: ["printed shorts", "cotton", "summer", "beach", "casual"],
  },

  // ─── PRODUCT 104 ─────────────────────────────────────────────────────────

  {
    name: "Wool Straight Skirt",
    description:
      "A sleek, straight-cut midi skirt in fine wool suiting fabric. The clean lines, back slit for ease of movement, and invisible zip closure give it a precise, tailored finish. A sophisticated piece that anchors any formal or smart casual outfit.",
    price: 74.99,
    discountPrice: 62.99,
    countInStock: 18,
    sku: "WBW-028",
    category: "Bottom Wear",
    brand: "ChicStyle",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Gray", "Black", "Navy", "Beige"],
    collections: "Formal Wear",
    material: "Wool",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181217/lightcache/products/women-wool-straight-skirt.webp",
        altText: "Women's Wool Straight Skirt Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.8,
    numReviews: 16,
    tags: ["wool", "straight skirt", "midi", "tailored", "formal"],
  },

  // ─── PRODUCT 105 ─────────────────────────────────────────────────────────

  {
    name: "Polyester Quilted Vest",
    description:
      "A sleek quilted vest in a lightweight polyester shell for warmth without bulk. The zip-through front, side pockets, and clean boxy fit make it a functional and stylish layering piece for transitional weather. Wear over a hoodie or under a jacket.",
    price: 59.99,
    discountPrice: 49.99,
    countInStock: 24,
    sku: "MTW-031",
    category: "Top Wear",
    brand: "Urban Threads",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Navy", "Black", "Green"],
    collections: "Everyday Basics",
    material: "Polyester",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181142/lightcache/products/men-polyester-quilted-vest.webp",
        altText: "Men's Polyester Quilted Vest Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.5,
    numReviews: 21,
    tags: ["quilted vest", "polyester", "layering", "transitional", "outdoor"],
  },

  // ─── PRODUCT 106 ─────────────────────────────────────────────────────────

  {
    name: "Cotton Ribbed Lounge Set",
    description:
      "A matching ribbed cotton lounge set comprising a fitted long-sleeve crop top and wide-leg trousers. The coordinated look transitions easily from home lounging to casual outings. The soft rib texture and relaxed fit make this an everyday uniform you'll love.",
    price: 74.99,
    discountPrice: 62.99,
    countInStock: 28,
    sku: "WTW-025",
    category: "Top Wear",
    brand: "Fashionista",
    sizes: ["XS", "S", "M", "L"],
    colors: ["White", "Pink", "Beige", "Gray"],
    collections: "Everyday Basics",
    material: "Cotton",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181182/lightcache/products/women-cotton-ribbed-lounge-set.webp",
        altText: "Women's Cotton Ribbed Lounge Set Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.8,
    numReviews: 47,
    tags: ["lounge set", "ribbed", "cotton", "matching set", "cozy"],
  },

  // ─── PRODUCT 107 ─────────────────────────────────────────────────────────

  {
    name: "Linen Safari Shirt",
    description:
      "A classic safari shirt cut from breathable linen with a button-through front, four chest pockets, and a belted waist option. The relaxed fit and earthy tones give it an adventurous, outdoorsy appeal that works equally well for city exploration.",
    price: 64.99,
    discountPrice: 54.99,
    countInStock: 20,
    sku: "MTW-032",
    category: "Top Wear",
    brand: "Beach Breeze",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Navy", "Biege", "White"],
    collections: "Summer Essentials",
    material: "Linen",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181135/lightcache/products/men-linen-safari-shirt.webp",
        altText: "Men's Linen Safari Shirt Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.5,
    numReviews: 18,
    tags: ["safari shirt", "linen", "summer", "outdoor", "casual"],
  },

  // ─── PRODUCT 108 ─────────────────────────────────────────────────────────

  {
    name: "Silk Wide-Leg Pyjama Trousers",
    description:
      "Luxurious wide-leg silk trousers that work as well out of the house as they do in it. The elasticated waist, fluid drape, and side pockets make them equal parts practical and indulgent. Pair with a silk camisole or an oversized knit for effortless elegance.",
    price: 89.99,
    discountPrice: 75.99,
    countInStock: 14,
    sku: "WBW-029",
    category: "Bottom Wear",
    brand: "ChicStyle",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Pink", "Beige", "Black", "White"],
    collections: "Evening Edit",
    material: "Silk",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181210/lightcache/products/women-silk-wide-leg-pyjama-trousers.jpg",
        altText: "Women's Silk Wide-Leg Pyjama Trousers Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.9,
    numReviews: 13,
    tags: ["silk", "wide leg", "pyjama trousers", "luxury", "lounge"],
  },

  // ─── PRODUCT 109 ─────────────────────────────────────────────────────────

  {
    name: "Denim Relaxed Jeans",
    description:
      "Classic relaxed-fit jeans with a mid-rise waist and a straight leg that sits easy through the thigh. Made from durable denim with a touch of stretch, these offer the classic jeans look without restriction. The quintessential go-with-everything pair.",
    price: 67.99,
    discountPrice: 57.99,
    countInStock: 38,
    sku: "MBW-023",
    category: "Bottom Wear",
    brand: "Street Style",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black", "Blue", "Gray"],
    collections: "Denim Edit",
    material: "Denim",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181123/lightcache/products/men-denim-relaxed-jeans.jpg",
        altText: "Men's Denim Relaxed Jeans Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.6,
    numReviews: 35,
    tags: ["jeans", "denim", "relaxed", "straight leg", "classic"],
  },

  // ─── PRODUCT 110 ─────────────────────────────────────────────────────────

  {
    name: "Viscose Gathered Midi Dress",
    description:
      "A romantic gathered midi dress in fluid viscose with a square neckline and adjustable tie straps. The full, gathered skirt provides beautiful movement, while the fitted bodice flatters the waist. Dress it up or down depending on the occasion.",
    price: 72.99,
    discountPrice: 60.99,
    countInStock: 20,
    sku: "WBW-030",
    category: "Bottom Wear",
    brand: "Fashionista",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Red", "Blue", "Pink", "Black"],
    collections: "Everyday Basics",
    material: "Viscose",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181212/lightcache/products/women-viscose-gathered-midi-dress.avif",
        altText: "Women's Viscose Gathered Midi Dress Front View",
      },
    ],
    isFeatured: true,
    isPublished: true,
    rating: 4.8,
    numReviews: 44,
    tags: ["midi dress", "viscose", "gathered", "feminine", "romantic"],
  },

  // ─── PRODUCT 111 ─────────────────────────────────────────────────────────

  {
    name: "Cotton Field Jacket",
    description:
      "A utilitarian field jacket in durable cotton canvas with a full-zip front, multiple external pockets, and a stand collar. The clean, structured silhouette keeps it looking sharp, while the versatile design makes it a practical everyday outerwear choice.",
    price: 97.99,
    discountPrice: 82.99,
    countInStock: 16,
    sku: "MTW-033",
    category: "Top Wear",
    brand: "Street Style",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Green", "Black", "Beige", "Navy"],
    collections: "Utility Collection",
    material: "Cotton",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181112/lightcache/products/men-cotton-field-jacket.webp",
        altText: "Men's Cotton Field Jacket Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.7,
    numReviews: 19,
    tags: ["field jacket", "cotton", "utility", "outerwear", "casual"],
  },

  // ─── PRODUCT 112 ─────────────────────────────────────────────────────────

  {
    name: "Cotton Wrap Top",
    description:
      "A flattering wrap top in soft cotton with a V-neckline and self-tie waist that creates a customizable fit. The relaxed body and flutter sleeves add movement and femininity. Pair with jeans, trousers, or a skirt for an effortlessly pulled-together look.",
    price: 38.99,
    discountPrice: 31.99,
    countInStock: 34,
    sku: "WTW-026",
    category: "Top Wear",
    brand: "Fashionista",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Black", "Pink", "White", "Blue"],
    collections: "Everyday Basics",
    material: "Cotton",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181184/lightcache/products/women-cotton-wrap-top.webp",
        altText: "Women's Cotton Wrap Top Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.6,
    numReviews: 37,
    tags: ["wrap top", "cotton", "v-neck", "feminine", "versatile"],
  },

  // ─── PRODUCT 113 ─────────────────────────────────────────────────────────

  {
    name: "Slim Fit Wool Trousers",
    description:
      "Elegantly cut slim-fit trousers in a premium wool suiting fabric with a fine texture. The flat-front design, clean hem, and tailored taper give them a polished, modern silhouette ideal for business occasions or sophisticated casual dressing.",
    price: 84.99,
    discountPrice: 71.99,
    countInStock: 16,
    sku: "MBW-024",
    category: "Bottom Wear",
    brand: "Modern Fit",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Brown", "Black", "Gray"],
    collections: "Formal Wear",
    material: "Wool",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181150/lightcache/products/men-slim-fit-wool-trousers%2C.avif",
        altText: "Men's Slim Fit Wool Trousers Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.8,
    numReviews: 14,
    tags: ["wool trousers", "slim fit", "formal", "tailored", "business"],
  },

  // ─── PRODUCT 114 ─────────────────────────────────────────────────────────

  {
    name: "Fleece Lounge Pants",
    description:
      "Indulgently soft fleece lounge pants with a wide elasticated waistband and straight leg. The heavyweight brushed interior provides exceptional warmth, while the clean silhouette keeps them from feeling sloppy. Your new favourite lazy-day essential.",
    price: 47.99,
    discountPrice: 39.99,
    countInStock: 36,
    sku: "WBW-031",
    category: "Bottom Wear",
    brand: "Urban Threads",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Pink", "Gray", "Black", "White"],
    collections: "Everyday Basics",
    material: "Fleece",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181191/lightcache/products/women-fleece-lounge-pants.jpg",
        altText: "Women's Fleece Lounge Pants Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.7,
    numReviews: 42,
    tags: ["lounge pants", "fleece", "cozy", "relaxed", "comfort"],
  },

  // ─── PRODUCT 115 ─────────────────────────────────────────────────────────

  {
    name: "Cotton Puffer Jacket",
    description:
      "A lightweight puffer jacket in a smooth cotton outer with a quilted pattern and zip-through closure. The channel-stitched fill provides warmth without excessive bulk, and the clean minimal design makes it a versatile everyday outerwear choice.",
    price: 89.99,
    discountPrice: 74.99,
    countInStock: 18,
    sku: "MTW-034",
    category: "Top Wear",
    brand: "Urban Threads",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Beige", "Navy", "Black"],
    collections: "Winter Essentials",
    material: "Cotton",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181118/lightcache/products/men-cotton-puffer-jacket.avif",
        altText: "Men's Cotton Puffer Jacket Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.6,
    numReviews: 23,
    tags: ["puffer jacket", "cotton", "winter", "outerwear", "warm"],
  },

  // ─── PRODUCT 116 ─────────────────────────────────────────────────────────

  {
    name: "Silk Kimono Robe Top",
    description:
      "A statement silk kimono-style top with wide sleeves, a wrap front, and a luxurious drape. The rich silk fabric and bold silhouette make it a versatile statement piece — wear it over jeans for a casual look or with silk trousers for a dressed-up occasion.",
    price: 104.99,
    discountPrice: 88.99,
    countInStock: 12,
    sku: "WTW-027",
    category: "Top Wear",
    brand: "ChicStyle",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Yellow", "Red", "Beige", "Blue"],
    collections: "Evening Edit",
    material: "Silk",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181171/lightcache/products/omen-silk-kimono-robe-top.jpg",
        altText: "Women's Silk Kimono Robe Top Front View",
      },
    ],
    isFeatured: true,
    isPublished: true,
    rating: 4.9,
    numReviews: 15,
    tags: ["kimono", "silk", "statement", "evening", "luxury"],
  },

  // ─── PRODUCT 117 ─────────────────────────────────────────────────────────

  {
    name: "Linen Slim Fit Trousers",
    description:
      "Refined linen trousers with a slim cut and clean flat-front design. The natural linen fabric breathes beautifully in warm weather, while the tailored silhouette keeps them looking sharp. A great alternative to chinos when you want something lighter and more textured.",
    price: 67.99,
    discountPrice: 56.99,
    countInStock: 22,
    sku: "MBW-025",
    category: "Bottom Wear",
    brand: "Modern Fit",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Blue", "White", "Navy", "Gray"],
    collections: "Smart Casual",
    material: "Linen",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181136/lightcache/products/men-linen-slim-fit-trousers.avif",
        altText: "Men's Linen Slim Fit Trousers Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.6,
    numReviews: 17,
    tags: ["linen", "trousers", "slim fit", "smart casual", "summer"],
  },

  // ─── PRODUCT 118 ─────────────────────────────────────────────────────────

  {
    name: "Cotton High-Neck Long Sleeve Top",
    description:
      "A clean, form-fitting long-sleeve top with a high round neckline in a soft cotton blend. The minimal design and flattering slim cut make it a perfect base layer under blazers and coats, or a confident standalone choice for smart casual outfits.",
    price: 36.99,
    discountPrice: 29.99,
    countInStock: 40,
    sku: "WTW-028",
    category: "Top Wear",
    brand: "ChicStyle",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Black", "White", "Navy", "Beige"],
    collections: "Everyday Basics",
    material: "Cotton",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181178/lightcache/products/women-cotton-high-neck-long-sleeve-top.jpg",
        altText: "Women's Cotton High-Neck Long Sleeve Top Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.7,
    numReviews: 38,
    tags: ["high neck", "long sleeve", "cotton", "fitted", "minimal"],
  },

  // ─── PRODUCT 119 ─────────────────────────────────────────────────────────

  {
    name: "Cotton Blazer",
    description:
      "A relaxed, unstructured cotton blazer with a two-button front, notched lapels, and a clean, minimal aesthetic. The breathable fabric and easy drape make it ideal for smart casual occasions in warm weather. Pair with chinos or jeans and a white tee.",
    price: 104.99,
    discountPrice: 88.99,
    countInStock: 16,
    sku: "MTW-035",
    category: "Top Wear",
    brand: "Modern Fit",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Beige", "Navy", "Black", "White"],
    collections: "Smart Casual",
    material: "Cotton",
    gender: "Men",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181110/lightcache/products/men-cotton-blazer.avif",
        altText: "Men's Cotton Blazer Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.7,
    numReviews: 16,
    tags: ["blazer", "cotton", "unstructured", "smart casual", "summer"],
  },

  // ─── PRODUCT 120 ─────────────────────────────────────────────────────────

  {
    name: "Denim Carpenter Jeans",
    description:
      "Relaxed carpenter-style jeans with a wide straight leg, a hammer loop on the thigh, and multiple functional pockets. Made from sturdy denim with a worn-in look and a comfortable mid-rise. The relaxed utilitarian aesthetic makes them a standout everyday pair.",
    price: 79.99,
    discountPrice: 67.99,
    countInStock: 24,
    sku: "WBW-032",
    category: "Bottom Wear",
    brand: "Street Style",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Blue", "Black", "Gray"],
    collections: "Utility Collection",
    material: "Denim",
    gender: "Women",
    images: [
      {
        url: "https://res.cloudinary.com/dnamxjefh/image/upload/v1775181187/lightcache/products/women-denim-carpenter-jeans.jpg",
        altText: "Women's Denim Carpenter Jeans Front View",
      },
    ],
    isFeatured: false,
    isPublished: true,
    rating: 4.7,
    numReviews: 30,
    tags: ["carpenter jeans", "denim", "utility", "wide leg", "street"],
  },
];

module.exports = products;
