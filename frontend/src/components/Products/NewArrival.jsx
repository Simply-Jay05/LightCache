import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { Link } from "react-router-dom";

const NewArrival = () => {
  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [newArrivals, setNewArrivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNewArrivals = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/products/new-arrivals`,
      );
      setNewArrivals(response.data);
    } catch {
      setError("Failed to load new arrivals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNewArrivals();
  }, []);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const x = e.pageX - scrollRef.current.offsetLeft;
    scrollRef.current.scrollLeft = scrollLeft - (x - startX);
  };
  const handleMouseUpOrLeave = () => setIsDragging(false);

  const scroll = (dir) =>
    scrollRef.current.scrollBy({
      left: dir === "left" ? -300 : 300,
      behavior: "smooth",
    });

  const updateScrollButtons = () => {
    const c = scrollRef.current;
    if (!c) return;
    setCanScrollLeft(c.scrollLeft > 0);
    setCanScrollRight(c.scrollWidth > c.scrollLeft + c.clientWidth);
  };

  useEffect(() => {
    const c = scrollRef.current;
    if (!c) return;
    c.addEventListener("scroll", updateScrollButtons);
    updateScrollButtons();
    return () => c.removeEventListener("scroll", updateScrollButtons);
  }, [newArrivals]);

  const scrollBtnStyle = (active) => ({
    width: "2.25rem",
    height: "2.25rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: `1px solid ${active ? "var(--gold)" : "rgba(15,17,23,0.15)"}`,
    borderRadius: "2px",
    color: active ? "var(--gold)" : "var(--muted)",
    background: "transparent",
    cursor: active ? "pointer" : "not-allowed",
    transition: "border-color 0.2s, color 0.2s",
  });

  return (
    <section className="py-20 px-4 lg:px-0">
      <div className="container mx-auto">
        {/* Header row */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="section-label mb-2">Just Landed</p>
            <h2
              className="font-serif font-normal"
              style={{
                fontFamily: "var(--ff-serif)",
                fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
                color: "var(--ink)",
                lineHeight: 1.2,
              }}
            >
              New Arrivals
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              style={scrollBtnStyle(canScrollLeft)}
            >
              <FiChevronLeft size={18} />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              style={scrollBtnStyle(canScrollRight)}
            >
              <FiChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Skeleton */}
        {loading && (
          <div className="flex space-x-5 overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="min-w-[100%] sm:min-w-[50%] lg:min-w-[31%]"
              >
                <div className="skeleton w-full" style={{ height: "440px" }} />
                <div className="skeleton mt-3 h-4 w-2/3" />
                <div className="skeleton mt-2 h-4 w-1/3" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-12">
            <p style={{ color: "#c0392b", marginBottom: "1rem" }}>{error}</p>
            <button onClick={fetchNewArrivals} className="btn-primary">
              Try Again
            </button>
          </div>
        )}

        {/* Scroll track */}
        {!loading && !error && (
          <div
            ref={scrollRef}
            className="flex space-x-5 overflow-x-scroll pb-2"
            style={{
              cursor: isDragging ? "grabbing" : "grab",
              scrollbarWidth: "none",
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
          >
            {newArrivals.map((product) => (
              <div
                key={product._id}
                className="min-w-[100%] sm:min-w-[50%] lg:min-w-[30%] relative overflow-hidden group"
                style={{ borderRadius: "2px", flexShrink: 0 }}
              >
                <img
                  src={product.images[0]?.url}
                  alt={product.images[0]?.altText || product.name}
                  className="w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  style={{ height: "460px" }}
                  draggable="false"
                />
                {/* Overlay */}
                <div
                  className="absolute bottom-0 left-0 right-0 p-5"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(15,17,23,0.85) 0%, transparent 100%)",
                  }}
                >
                  <Link
                    to={`/product/${product._id}`}
                    style={{ textDecoration: "none" }}
                  >
                    <h4
                      style={{
                        color: "var(--parchment)",
                        fontFamily: "var(--ff-serif)",
                        fontSize: "1.1rem",
                        fontWeight: 400,
                        marginBottom: "0.25rem",
                      }}
                    >
                      {product.name}
                    </h4>
                    <p
                      style={{
                        color: "var(--gold)",
                        fontSize: "0.85rem",
                        fontWeight: 500,
                      }}
                    >
                      ${product.price}
                    </p>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default NewArrival;
