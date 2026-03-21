import random
import time
import json
from locust import HttpUser, task, between, events


PRODUCT_IDS = []
FALLBACK_IDS = [f"placeholder_{i}" for i in range(40)]

GENDERS      = ["Men", "Women"]
CATEGORIES   = ["Top Wear", "Bottom Wear"]
SORT_OPTIONS = ["priceAsc", "priceDesc", "popularity"]
COLORS       = ["Red", "Blue", "Black", "Green", "Gray", "White", "Pink", "Beige", "Navy"]
PRICE_RANGES = [
    (None, None),
    (0, 30),
    (30, 60),
    (60, 100),
]


def zipf_choice(items, skew=1.5):
    n = len(items)
    weights = [1.0 / (i ** skew) for i in range(1, n + 1)]
    total = sum(weights)
    probs = [w / total for w in weights]
    return random.choices(items, weights=probs, k=1)[0]


@events.init.add_listener
def on_locust_init(environment, **kwargs):
    global PRODUCT_IDS
    host = environment.host or "http://localhost:3000"
    try:
        import urllib.request
        url = f"{host}/api/products"
        with urllib.request.urlopen(url, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            products = data if isinstance(data, list) else []
            PRODUCT_IDS = [p["_id"] for p in products if "_id" in p]
            print(f"\nLoaded {len(PRODUCT_IDS)} product IDs\n")
    except Exception as e:
        print(f"\nCould not fetch product IDs: {e}")
        PRODUCT_IDS = FALLBACK_IDS


def get_product_ids():
    return PRODUCT_IDS if PRODUCT_IDS else FALLBACK_IDS



# USER TYPE 1 — Casual Browser
# Real users spend 5–20 seconds between page loads

class CasualBrowser(HttpUser):
    weight = 40
    wait_time = between(5, 20)  # was between(2, 8

    def on_start(self):
        self.gender = random.choice(GENDERS)

    @task(3)
    def view_home_page(self):
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
        gender = random.choice(GENDERS)
        params = {"gender": gender}
        if random.random() < 0.5:
            params["category"] = random.choice(CATEGORIES)
        if random.random() < 0.3:
            params["sortBy"] = random.choice(SORT_OPTIONS)
        if random.random() < 0.2:
            params["color"] = random.choice(COLORS)
        if random.random() < 0.2:
            price_range = random.choice(PRICE_RANGES[1:])
            params["minPrice"] = price_range[0]
            params["maxPrice"] = price_range[1]
        self.client.get("/api/products", params=params,
                        name="/api/products [collection]")

    @task(2)
    def view_product_detail(self):
        ids = get_product_ids()
        if not ids:
            return
        product_id = zipf_choice(ids)
        self.client.get(f"/api/products/{product_id}",
                        name="/api/products/:id")
        if random.random() < 0.6:
            self.client.get(f"/api/products/similar/{product_id}",
                            name="/api/products/similar/:id")

    @task(1)
    def search_products(self):
        search_terms = [
            "shirt", "jeans", "linen", "cotton", "slim",
            "oversized", "formal", "casual", "polo", "hoodie"
        ]
        self.client.get(
            "/api/products",
            params={"search": random.choice(search_terms)},
            name="/api/products [search]",
        )



# USER TYPE 2 — Deal Hunter
class DealHunter(HttpUser):
    weight = 20
    wait_time = between(4, 12)  # was between(1, 4)

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
        self.client.get("/api/products/best-seller",
                        name="/api/products/best-seller")
        ids = get_product_ids()
        if not ids:
            return
        for _ in range(random.randint(2, 4)):
            product_id = zipf_choice(ids, skew=1.2)
            self.client.get(f"/api/products/{product_id}",
                            name="/api/products/:id")
            time.sleep(random.uniform(2, 6))  # pause between product views

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



# USER TYPE 3 — Deep Browser
class DeepBrowser(HttpUser):
    weight = 25
    wait_time = between(3, 10)  # was between(1, 3)

    def on_start(self):
        self.gender   = random.choice(GENDERS)
        self.category = random.choice(CATEGORIES)

    @task(5)
    def deep_browse_session(self):
        ids = get_product_ids()
        if not ids:
            return

        self.client.get(
            "/api/products",
            params={"gender": self.gender, "category": self.category},
            name="/api/products [deep browse]",
        )
        time.sleep(random.uniform(3, 8))   # was 0.5–1.5

        product_id = zipf_choice(ids)
        self.client.get(f"/api/products/{product_id}",
                        name="/api/products/:id")
        time.sleep(random.uniform(5, 15))  # was 0.5–2

        self.client.get(f"/api/products/similar/{product_id}",
                        name="/api/products/similar/:id")
        time.sleep(random.uniform(3, 8))   # was 0.3–1

        another_id = zipf_choice(ids)
        self.client.get(f"/api/products/{another_id}",
                        name="/api/products/:id")

    @task(2)
    def browse_new_arrivals(self):
        self.client.get("/api/products/new-arrivals",
                        name="/api/products/new-arrivals")
        ids = get_product_ids()
        if ids:
            product_id = zipf_choice(ids, skew=2.0)
            self.client.get(f"/api/products/{product_id}",
                            name="/api/products/:id")

    @task(1)
    def browse_by_collection(self):
        collections = [
            "Everyday Basics", "Summer Essentials", "Smart Casual",
            "Denim Edit", "Activewear", "Formal Wear",
        ]
        self.client.get(
            "/api/products",
            params={"collections": random.choice(collections)},
            name="/api/products [by collection]",
        )



# USER TYPE 4 — Quick Checker
# Still faster than others but realistic — not sub-second
class QuickChecker(HttpUser):
    weight = 15
    wait_time = between(3, 10)  # was between(0.5, 2) — this was the main problem

    def on_start(self):
        ids = get_product_ids()
        self.favourites = random.sample(ids, min(3, len(ids))) if ids else []

    @task(4)
    def revisit_favourite(self):
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