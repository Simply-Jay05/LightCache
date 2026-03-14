import random
import time
import json
from locust import HttpUser, task, between, events
from locust.runners import MasterRunner

# ── Product IDs ───────────────────────────────────────────────────────────────
# These will be populated on startup by fetching from your backend.
# Fallback list used if the fetch fails.
PRODUCT_IDS = []
FALLBACK_IDS = [f"placeholder_{i}" for i in range(40)]

# ── Realistic filter options matching your product data ───────────────────────
GENDERS     = ["Men", "Women"]
CATEGORIES  = ["Top Wear", "Bottom Wear"]
SORT_OPTIONS = ["priceAsc", "priceDesc", "popularity"]
COLLECTIONS = [
    "Everyday Basics", "Summer Essentials", "Winter Essentials",
    "Smart Casual", "Formal Wear", "Denim Edit",
    "Activewear", "Utility Collection", "Evening Edit",
]
COLORS   = ["Red", "Blue", "Black", "Green", "Gray", "White", "Pink", "Beige", "Navy"]
SIZES    = ["XS", "S", "M", "L", "XL", "XXL"]
PRICE_RANGES = [
    (None, None),      # no filter
    (0, 30),           # budget
    (30, 60),          # mid range
    (60, 100),         # premium
]


def zipf_choice(items, skew=1.5):
    """
    Pick an item using a Zipf distribution.
    skew=1.5 means the most popular item is ~1.5x more likely than the 2nd,
    which is ~2.25x more likely than the 3rd — realistic for e-commerce.
    """
    n = len(items)
    weights = [1.0 / (i ** skew) for i in range(1, n + 1)]
    total = sum(weights)
    probs = [w / total for w in weights]
    return random.choices(items, weights=probs, k=1)[0]


# ── Fetch real product IDs from the backend on startup ───────────────────────
@events.init.add_listener
def on_locust_init(environment, **kwargs):
    global PRODUCT_IDS
    host = environment.host or "http://localhost:9000"
    try:
        import urllib.request
        url = f"{host}/api/products"
        with urllib.request.urlopen(url, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            # Handle both array response and object response
            products = data if isinstance(data, list) else []
            PRODUCT_IDS = [p["_id"] for p in products if "_id" in p]
            print(f"\n✅ Loaded {len(PRODUCT_IDS)} product IDs from backend\n")
    except Exception as e:
        print(f"\n⚠️  Could not fetch product IDs ({e})")
        print(f"   Using {len(FALLBACK_IDS)} placeholder IDs")
        print(f"   Make sure your backend is running on {host}\n")
        PRODUCT_IDS = FALLBACK_IDS


def get_product_ids():
    return PRODUCT_IDS if PRODUCT_IDS else FALLBACK_IDS


# ══════════════════════════════════════════════════════════════════════════════
# USER TYPE 1 — Casual Browser (most common, just window shopping)
# Browses home, filters collections, occasionally clicks a product
# ══════════════════════════════════════════════════════════════════════════════
class CasualBrowser(HttpUser):
    weight = 40  # 40% of simulated users
    wait_time = between(2, 8)  # thinks before clicking

    def on_start(self):
        """Called once when a simulated user starts their session."""
        self.gender = random.choice(GENDERS)
        self.session_products_viewed = []

    @task(3)
    def view_home_page(self):
        """Hits the endpoints the home page loads."""
        self.client.get("/api/products/best-seller",
                        name="/api/products/best-seller")

        self.client.get("/api/products/new-arrivals",
                        name="/api/products/new-arrivals")

        self.client.get(
            "/api/products",
            params={"gender": "Women", "category": "Bottom Wear", "limit": 8},
            name="/api/products [home grid]",
        )

    @task(4)
    def browse_collection(self):
        """Browses the collection page with various filters."""
        gender = random.choice(GENDERS)
        params = {"gender": gender}

        # Randomly add extra filters (like a real user would)
        if random.random() < 0.5:
            params["category"] = random.choice(CATEGORIES)
        if random.random() < 0.3:
            params["sortBy"] = random.choice(SORT_OPTIONS)
        if random.random() < 0.2:
            params["color"] = random.choice(COLORS)
        if random.random() < 0.2:
            price_range = random.choice(PRICE_RANGES[1:])  # skip no-filter
            params["minPrice"] = price_range[0]
            params["maxPrice"] = price_range[1]

        self.client.get("/api/products", params=params,
                        name="/api/products [collection]")

    @task(2)
    def view_product_detail(self):
        """Views a product detail page — uses Zipf so popular products hit cache."""
        ids = get_product_ids()
        if not ids:
            return
        product_id = zipf_choice(ids)
        self.session_products_viewed.append(product_id)

        self.client.get(f"/api/products/{product_id}",
                        name="/api/products/:id")

        # 60% chance of also loading similar products (as the page does)
        if random.random() < 0.6:
            self.client.get(f"/api/products/similar/{product_id}",
                            name="/api/products/similar/:id")

    @task(1)
    def search_products(self):
        """Uses the search filter."""
        search_terms = [
            "shirt", "jeans", "linen", "cotton", "slim",
            "oversized", "formal", "casual", "polo", "hoodie"
        ]
        self.client.get(
            "/api/products",
            params={"search": random.choice(search_terms)},
            name="/api/products [search]",
        )


# ══════════════════════════════════════════════════════════════════════════════
# USER TYPE 2 — Deal Hunter (price-focused, filters heavily)
# ══════════════════════════════════════════════════════════════════════════════
class DealHunter(HttpUser):
    weight = 20  # 20% of simulated users
    wait_time = between(1, 4)  # quicker, more purposeful

    @task(2)
    def browse_by_price(self):
        price_range = random.choice(PRICE_RANGES[1:])
        self.client.get(
            "/api/products",
            params={
                "minPrice": price_range[0],
                "maxPrice": price_range[1],
                "sortBy": "priceAsc",
                "gender": random.choice(GENDERS),
            },
            name="/api/products [price filter]",
        )

    @task(3)
    def check_popular_products(self):
        """Deal hunters check the best seller and popular items."""
        self.client.get("/api/products/best-seller",
                        name="/api/products/best-seller")

        # Look at several products quickly
        ids = get_product_ids()
        if not ids:
            return
        for _ in range(random.randint(2, 5)):
            product_id = zipf_choice(ids, skew=1.2)  # less skewed — more variety
            self.client.get(f"/api/products/{product_id}",
                            name="/api/products/:id")

    @task(1)
    def browse_collection_sorted(self):
        self.client.get(
            "/api/products",
            params={
                "sortBy": "popularity",
                "gender": random.choice(GENDERS),
                "category": random.choice(CATEGORIES),
            },
            name="/api/products [sorted collection]",
        )


# ══════════════════════════════════════════════════════════════════════════════
# USER TYPE 3 — Deep Browser (thorough, views many products per session)
# Most valuable for generating similar-product cache data
# ══════════════════════════════════════════════════════════════════════════════
class DeepBrowser(HttpUser):
    weight = 25  # 25% of simulated users
    wait_time = between(1, 3)

    def on_start(self):
        self.gender = random.choice(GENDERS)
        self.category = random.choice(CATEGORIES)

    @task(5)
    def deep_browse_session(self):
        """
        Simulates a user who goes deep: collection → product → similar → another product.
        This is the most cache-warming behaviour.
        """
        ids = get_product_ids()
        if not ids:
            return

        # Step 1: Browse a collection
        self.client.get(
            "/api/products",
            params={"gender": self.gender, "category": self.category},
            name="/api/products [deep browse]",
        )
        time.sleep(random.uniform(0.5, 1.5))

        # Step 2: View a product (Zipf — hot products get hit repeatedly)
        product_id = zipf_choice(ids)
        self.client.get(f"/api/products/{product_id}",
                        name="/api/products/:id")
        time.sleep(random.uniform(0.5, 2))

        # Step 3: Load similar products
        self.client.get(f"/api/products/similar/{product_id}",
                        name="/api/products/similar/:id")
        time.sleep(random.uniform(0.3, 1))

        # Step 4: Click one of the similar products
        another_id = zipf_choice(ids)
        self.client.get(f"/api/products/{another_id}",
                        name="/api/products/:id")

    @task(2)
    def browse_new_arrivals(self):
        self.client.get("/api/products/new-arrivals",
                        name="/api/products/new-arrivals")
        ids = get_product_ids()
        if ids:
            product_id = zipf_choice(ids, skew=2.0)  # strong preference for new
            self.client.get(f"/api/products/{product_id}",
                            name="/api/products/:id")

    @task(1)
    def browse_by_collection(self):
        self.client.get(
            "/api/products",
            params={"collections": random.choice(COLLECTIONS)},
            name="/api/products [by collection]",
        )


# ══════════════════════════════════════════════════════════════════════════════
# USER TYPE 4 — Quick Checker (fast, repeat visits, drives cache hits)
# Simulates return visitors who hit the same pages repeatedly
# ══════════════════════════════════════════════════════════════════════════════
class QuickChecker(HttpUser):
    weight = 15  # 15% of simulated users
    wait_time = between(0.5, 2)  # fast — these users drive your hit rate up

    def on_start(self):
        # Picks a small set of favourite products and keeps revisiting them
        ids = get_product_ids()
        self.favourites = random.sample(ids, min(3, len(ids))) if ids else []

    @task(4)
    def revisit_favourite(self):
        """Repeatedly hits the same products — this is what warms the cache."""
        if not self.favourites:
            return
        product_id = random.choice(self.favourites)
        self.client.get(f"/api/products/{product_id}",
                        name="/api/products/:id [repeat]")

    @task(3)
    def check_home_repeatedly(self):
        self.client.get("/api/products/best-seller",
                        name="/api/products/best-seller")
        self.client.get("/api/products/new-arrivals",
                        name="/api/products/new-arrivals")

    @task(1)
    def quick_collection_check(self):
        self.client.get(
            "/api/products",
            params={"gender": random.choice(GENDERS)},
            name="/api/products [quick check]",
        )
