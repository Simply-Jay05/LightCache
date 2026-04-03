import { useEffect, useRef, useState } from "react";
import { FaFilter } from "react-icons/fa";
import FilterSlidebar from "../components/Products/FilterSlidebar";
import SortOptions from "../components/Products/SortOptions";
import ProductGrid from "../components/Products/ProductGrid";
import { useParams, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchProductByFilters } from "../redux/slices/productsSlice";

const CollectionPage = () => {
  const { collection } = useParams();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const { products, loading, error } = useSelector((s) => s.products);
  const queryParams = Object.fromEntries([...searchParams]);

  const sideBarRef = useRef(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchProductByFilters({ collection, ...queryParams }));
  }, [dispatch, collection, searchParams]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleClickOutside = (e) => {
    if (sideBarRef.current && !sideBarRef.current.contains(e.target)) {
      setIsSidebarOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className="flex flex-col lg:flex-row"
      style={{
        minHeight: "calc(100vh - 72px)",
        backgroundColor: "var(--parchment)",
      }}
    >
      {/* Mobile filter button */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden flex items-center gap-2 m-4 self-start"
        style={{
          border: "1px solid rgba(15,17,23,0.18)",
          borderRadius: "2px",
          padding: "0.5rem 1rem",
          fontSize: "0.72rem",
          fontWeight: 500,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontFamily: "var(--ff-sans)",
          color: "var(--ink)",
          background: "transparent",
          cursor: "pointer",
        }}
      >
        <FaFilter style={{ fontSize: "0.7rem", color: "var(--gold)" }} />
        Filters
      </button>

      {/* Filter sidebar — mobile overlay + desktop static */}
      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: "rgba(15,17,23,0.4)" }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <div
        ref={sideBarRef}
        className={`${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto transition-transform duration-300 lg:static lg:translate-x-0 lg:w-64 xl:w-72 lg:flex-shrink-0`}
        style={{
          backgroundColor: "var(--parchment)",
          borderRight: "1px solid rgba(15,17,23,0.08)",
          padding: "2rem 1.5rem",
        }}
      >
        <FilterSlidebar />
      </div>

      {/* Main content */}
      <div className="flex-grow p-6 lg:p-8">
        {/* Page heading */}
        <div className="flex items-center gap-6 mb-8">
          <div>
            <p className="section-label mb-1">Browse</p>
            <h2
              style={{
                fontFamily: "var(--ff-serif)",
                fontSize: "clamp(1.4rem, 3vw, 1.8rem)",
                fontWeight: 400,
                color: "var(--ink)",
                lineHeight: 1.2,
              }}
            >
              All Collection
            </h2>
          </div>
          {!loading && products?.length > 0 && (
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--muted)",
                fontFamily: "var(--ff-sans)",
                marginTop: "auto",
                paddingBottom: "0.2rem",
              }}
            >
              {products.length} item{products.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <SortOptions />

        {/* Empty state — no products match current filters */}
        {!loading && !error && products.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "5rem 2rem",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "4rem",
                height: "4rem",
                borderRadius: "50%",
                border: "1px solid rgba(201,168,76,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.25rem",
                fontSize: "1.5rem",
                color: "var(--gold)",
              }}
            >
              ∅
            </div>
            <p
              style={{
                fontFamily: "var(--ff-serif)",
                fontSize: "1.25rem",
                fontWeight: 400,
                color: "var(--ink)",
                marginBottom: "0.5rem",
              }}
            >
              No products found
            </p>
            <p
              style={{
                fontSize: "0.82rem",
                color: "var(--muted)",
                maxWidth: "34ch",
                lineHeight: 1.7,
              }}
            >
              Try adjusting your filters or search term to find what you're
              looking for.
            </p>
          </div>
        )}

        {/* Product Grid — renders for loading/error states or when results exist */}
        {(loading || error || products.length > 0) && (
          <ProductGrid products={products} loading={loading} error={error} />
        )}
      </div>
    </div>
  );
};

export default CollectionPage;
