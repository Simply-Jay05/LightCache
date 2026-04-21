import random
from locust import HttpUser, task, between, TaskSet

# Real product IDs extracted from dataset
PRODUCT_IDS = [
    "69d834fe53a968049eec94ea", "69d834fe53a968049eec94ec", "69d834fe53a968049eec94ee",
    "69d834fe53a968049eec94f0", "69d834fe53a968049eec94f2", "69d834fe53a968049eec94f4",
    "69d834fe53a968049eec94f6", "69d834fe53a968049eec94f8", "69d834fe53a968049eec94fa",
    "69d834fe53a968049eec94fc", "69d834fe53a968049eec94fe", "69d834fe53a968049eec9500",
    "69d834fe53a968049eec9502", "69d834fe53a968049eec9504", "69d834fe53a968049eec9506",
    "69d834fe53a968049eec9508", "69d834fe53a968049eec950a", "69d834fe53a968049eec950c",
    "69d834fe53a968049eec950e", "69d834fe53a968049eec9510", "69d834fe53a968049eec9512",
    "69d834fe53a968049eec9514", "69d834fe53a968049eec9516", "69d834fe53a968049eec9518",
    "69d834fe53a968049eec951a", "69d834fe53a968049eec951e", "69d834fe53a968049eec9520",
    "69d834fe53a968049eec9522", "69d834fe53a968049eec9524", "69d834fe53a968049eec9526",
    "69d834fe53a968049eec9528", "69d834fe53a968049eec952a", "69d834fe53a968049eec952c",
    "69d834fe53a968049eec952e", "69d834fe53a968049eec9532", "69d834fe53a968049eec9536",
    "69d834fe53a968049eec9538", "69d834fe53a968049eec953a", "69d834fe53a968049eec953c",
    "69d834fe53a968049eec953e", "69d834fe53a968049eec9542", "69d834fe53a968049eec9544",
    "69d834fe53a968049eec9546", "69d834fe53a968049eec9548", "69d834fe53a968049eec954a",
    "69d834fe53a968049eec954c", "69d834fe53a968049eec9556", "69d834fe53a968049eec9558",
    "69d834fe53a968049eec955e", "69d834fe53a968049eec9560", "69d834fe53a968049eec9562",
    "69d834fe53a968049eec9564", "69d834fe53a968049eec9566", "69d834fe53a968049eec956a",
    "69d834fe53a968049eec9570", "69d834fe53a968049eec9576", "69d834fe53a968049eec9578",
    "69d834fe53a968049eec957a", "69d834fe53a968049eec957e", "69d834fe53a968049eec9580",
    "69d834fe53a968049eec9584", "69d834fe53a968049eec9586", "69d834fe53a968049eec958a",
    "69d834fe53a968049eec958e", "69d834fe53a968049eec9594", "69d834fe53a968049eec9596",
    "69d834fe53a968049eec959c", "69d834fe53a968049eec95a2", "69d834fe53a968049eec95a4",
    "69d834fe53a968049eec95a6", "69d834fe53a968049eec95aa", "69d834fe53a968049eec95ae",
    "69d834fe53a968049eec95b2", "69d834fe53a968049eec95b6", "69d834fe53a968049eec95ba",
    "69d834fe53a968049eec95bc", "69d834fe53a968049eec95be", "69d834fe53a968049eec95c0",
    "69d834fe53a968049eec95c2", "69d834fe53a968049eec95c4", "69d834fe53a968049eec95c6",
    "69d834fe53a968049eec95ca", "69d834fe53a968049eec95ce", "69d834fe53a968049eec95d0",
    "69d834fe53a968049eec95d2", "69d834fe53a968049eec95d4", "69d834fe53a968049eec95d6",
    "69d834fe53a968049eec95d8", "69d834fe53a968049eec95d6",
]

# Most accessed item (appeared 100+ times in dataset — simulate "hot" product)
HOT_PRODUCT = "69d834fe53a968049eec94f8"

# URL builders — matching exact cache key patterns observed

def product_url(item_id: str) -> str:
    return f"/api/products/{item_id}"

def similar_url(item_id: str) -> str:
    return f"/api/products/{item_id}/similar"

def _pick_item(hot_weight: float = 0.35) -> str:
    """Pick a product ID: hot product gets 35% of traffic (matches dataset pattern)."""
    if random.random() < hot_weight:
        return HOT_PRODUCT
    return random.choice(PRODUCT_IDS)


# Observed products_list query patterns with relative weights 
# Derived from cache key frequency analysis of the full dataset

def _list_url() -> str:
    """Return a products_list URL matching dataset distribution."""
    roll = random.random()

    # Tier 1: Simple gender-only browse (most common, ~30%) 
    if roll < 0.12:
        return "/api/products?gender=Men"
    if roll < 0.22:
        return "/api/products?gender=Women&limit=8&category=Bottom+Wear"
    if roll < 0.30:
        return "/api/products?gender=Women"

    # Tier 2: All-products browse (~15%) 
    if roll < 0.35:
        return "/api/products"
    if roll < 0.38:
        return "/api/products?collection=all"

    # Tier 3: Category + gender (~15%) 
    if roll < 0.42:
        return "/api/products?gender=Women&category=Top+Wear"
    if roll < 0.46:
        return "/api/products?gender=Men&category=Top+Wear"
    if roll < 0.49:
        return "/api/products?gender=Men&category=Bottom+Wear"
    if roll < 0.52:
        return "/api/products?gender=Women&category=Bottom+Wear"

    # Tier 4: Sort variants (~8%) 
    if roll < 0.54:
        return "/api/products?gender=Men&sortBy=priceAsc"
    if roll < 0.56:
        return "/api/products?sortBy=priceAsc"
    if roll < 0.575:
        return "/api/products?gender=Men&sortBy=priceDesc"
    if roll < 0.59:
        return "/api/products?gender=Women&sortBy=priceAsc"
    if roll < 0.60:
        return "/api/products?sortBy=popularity"
    if roll < 0.61:
        return "/api/products?gender=Men&sortBy=popularity"

    # Tier 5: Price filter (~8%) 
    if roll < 0.63:
        price = random.choice([27, 28, 29, 30, 31, 32, 35, 38, 40, 42, 45, 48, 100])
        return f"/api/products?gender=Men&maxPrice={price}"
    if roll < 0.65:
        return "/api/products?gender=Men&maxPrice=100&category=Top+Wear"
    if roll < 0.67:
        return "/api/products?gender=Men&maxPrice=100&category=Bottom+Wear"
    if roll < 0.685:
        return "/api/products?gender=Women&maxPrice=100&category=Top+Wear"

    # Tier 6: Multi-filter (size + price + gender) (~8%) 
    if roll < 0.70:
        size = random.choice(["M", "L", "XL", "XXL", "M%2CL", "XL%2CM"])
        return f"/api/products?gender=Women&maxPrice=100&size={size}&category=Top+Wear"
    if roll < 0.715:
        size = random.choice(["M", "L", "XL", "XXL"])
        return f"/api/products?gender=Men&maxPrice=100&size={size}"
    if roll < 0.73:
        return "/api/products?size=XXL&gender=Men&maxPrice=100"

    # Tier 7: Deep filter (color + material + brand) (~5%) 
    if roll < 0.74:
        color = random.choice(["Black", "Blue", "White"])
        return f"/api/products?gender=Men&maxPrice=100&size=XL&color={color}&category=Top+Wear"
    if roll < 0.75:
        material = random.choice(["Cotton", "Linen", "Viscose", "Silk", "Wool", "Denim", "Polyester"])
        return f"/api/products?gender=Men&maxPrice=100&material={material}"
    if roll < 0.755:
        material = random.choice(["Cotton", "Linen", "Silk"])
        return f"/api/products?gender=Women&maxPrice=100&material={material}"
    if roll < 0.76:
        # Full filter combo (observed in dataset)
        materials = "Cotton%2CWool%2CDenim%2CPolyester%2CSilk%2CLinen%2CFleece%2CViscose"
        brands = "Street+Style%2CModern+Fit%2CUrban+Threads%2CBeach+Breeze%2CFashionista%2CChicStyle"
        return f"/api/products?size=XL&color=Blue&gender=Men&maxPrice=100&material={materials}&brand={brands}&category=Top+Wear"

    # Tier 8: Search queries (~4%) 
    searches = [
        "Jeans", "Leggins", "Ties", "Sweater+vest", "Baggy+jeans",
        "Shoe", "boxers", "How+much+is+a+cargo+jane"
    ]
    query = random.choice(searches)
    if roll < 0.78:
        return f"/api/products?search={query}"
    if roll < 0.80:
        return f"/api/products?collection=all&search={query}"

    # --- Tier 9: Category without gender (~3%) ---
    if roll < 0.82:
        return "/api/products?category=Bottom+Wear"
    if roll < 0.84:
        return "/api/products?category=Top+Wear"
    if roll < 0.855:
        return "/api/products?category=Bottom+Wear&sortBy=popularity"

    # Fallback: bare list 
    return "/api/products"


# Task sets representing real user journey patterns

class ProductDetailJourney(TaskSet):
    """
    User opens a product page → both product detail + similar products
    are fetched together (observed always paired in dataset).
    This is the most common pattern (~40% of all events).
    """

    @task(3)
    def view_hot_product(self):
        """Hot product (69d834fe53a968049eec94f8) — appears in ~15% of all single events."""
        item = HOT_PRODUCT
        with self.client.get(product_url(item), name="/api/products/[id]", catch_response=True) as r:
            r.success()
        with self.client.get(similar_url(item), name="/api/products/[id]/similar", catch_response=True) as r:
            r.success()

    @task(7)
    def view_random_product(self):
        """Random product from the observed ID pool."""
        item = _pick_item(hot_weight=0.0)  # exclude hot — handled by view_hot_product
        with self.client.get(product_url(item), name="/api/products/[id]", catch_response=True) as r:
            r.success()
        with self.client.get(similar_url(item), name="/api/products/[id]/similar", catch_response=True) as r:
            r.success()

    @task(2)
    def browse_then_detail(self):
        """User browses a list then clicks a product — realistic funnel."""
        self.client.get(_list_url(), name="/api/products?[filters]")
        item = _pick_item()
        self.client.get(product_url(item), name="/api/products/[id]")
        self.client.get(similar_url(item), name="/api/products/[id]/similar")

    @task(1)
    def stop(self):
        self.interrupt()


class HomepageJourney(TaskSet):
    """
    Homepage loads 3 endpoints simultaneously:
      - /api/products/new-arrivals
      - /api/products/best-seller
      - /api/products?gender=Women&limit=8&category=Bottom+Wear
    Observed as a consistent bundle throughout the dataset (~20% of events).
    """

    @task(5)
    def load_homepage(self):
        self.client.get("/api/products/new-arrivals",  name="/api/products/new-arrivals")
        self.client.get("/api/products/best-seller",   name="/api/products/best-seller")
        self.client.get(
            "/api/products?gender=Women&limit=8&category=Bottom+Wear",
            name="/api/products?[homepage-widget]"
        )

    @task(2)
    def homepage_then_browse(self):
        """User lands on homepage, then clicks through to a collection."""
        self.client.get("/api/products/new-arrivals", name="/api/products/new-arrivals")
        self.client.get("/api/products/best-seller",  name="/api/products/best-seller")
        self.client.get(
            "/api/products?gender=Women&limit=8&category=Bottom+Wear",
            name="/api/products?[homepage-widget]"
        )
        self.client.get(_list_url(), name="/api/products?[filters]")

    @task(1)
    def stop(self):
        self.interrupt()


class BrowseJourney(TaskSet):
    """
    User browses collections, applies filters, sorts.
    Mirrors the products_list patterns (~30% of events).
    """

    @task(6)
    def browse_collection(self):
        self.client.get(_list_url(), name="/api/products?[filters]")

    @task(3)
    def browse_then_sort(self):
        """User browses → applies sort (observed sequentially in dataset)."""
        gender = random.choice(["Men", "Women"])
        self.client.get(f"/api/products?gender={gender}", name="/api/products?[filters]")
        sort = random.choice(["priceAsc", "priceDesc", "popularity"])
        self.client.get(
            f"/api/products?gender={gender}&sortBy={sort}",
            name="/api/products?[filters]"
        )

    @task(2)
    def browse_with_progressive_filters(self):
        """
        Observed heavily in dataset: user progressively adds filters
        (gender → category → price → size → material → brand).
        Each step creates a new cache key.
        """
        gender = random.choice(["Men", "Women"])
        cat    = random.choice(["Top+Wear", "Bottom+Wear"])
        price  = random.choice([30, 40, 50, 100])
        size   = random.choice(["M", "L", "XL", "XXL"])

        self.client.get(f"/api/products?gender={gender}", name="/api/products?[filters]")
        self.client.get(f"/api/products?gender={gender}&category={cat}", name="/api/products?[filters]")
        self.client.get(
            f"/api/products?gender={gender}&maxPrice={price}&category={cat}",
            name="/api/products?[filters]"
        )
        self.client.get(
            f"/api/products?gender={gender}&maxPrice={price}&size={size}&category={cat}",
            name="/api/products?[filters]"
        )

    @task(1)
    def search(self):
        q = random.choice([
            "Jeans", "Leggins", "Ties", "Sweater+vest",
            "Baggy+jeans", "Shoe", "boxers"
        ])
        self.client.get(f"/api/products?search={q}", name="/api/products?search=[q]")
        self.client.get(f"/api/products?collection=all&search={q}", name="/api/products?search=[q]")

    @task(1)
    def stop(self):
        self.interrupt()


# Main user class

class LightCacheUser(HttpUser):

    host = "https://lightcache.org"

    # Think time between tasks: mirrors short-burst inter-request gaps (~1.5s avg)
    wait_time = between(1, 4)

    # Task weights reflecting route distribution in dataset:
    # product_detail+similar  ~40% of events  → weight 4
    # homepage bundle         ~20% of events  → weight 2
    # products_list browse    ~30% of events  → weight 3
    # standalone best-seller  ~5%             → weight 1
    # standalone new-arrivals ~5%             → weight 1
    tasks = {
        ProductDetailJourney: 4,
        HomepageJourney:       2,
        BrowseJourney:         3,
    }

    @task(1)
    def best_seller_standalone(self):
        """Direct /best-seller hit (observed standalone outside homepage bundle)."""
        self.client.get("/api/products/best-seller", name="/api/products/best-seller")

    @task(1)
    def new_arrivals_standalone(self):
        """Direct /new-arrivals hit."""
        self.client.get("/api/products/new-arrivals", name="/api/products/new-arrivals")