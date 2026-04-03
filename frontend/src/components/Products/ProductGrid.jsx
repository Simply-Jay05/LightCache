import { Link } from "react-router-dom";

const ProductGrid = ({ products, loading, error }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i}>
            <div
              className="skeleton w-full"
              style={{ height: "360px", borderRadius: "2px" }}
            />
            <div className="skeleton mt-3 h-4 w-3/4" />
            <div className="skeleton mt-2 h-4 w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p style={{ color: "#c0392b", marginBottom: "1rem" }}>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {products.map((product, index) => (
        <Link
          key={index}
          to={`/product/${product._id}`}
          style={{ textDecoration: "none" }}
          className="card-lift block group"
        >
          {/* Image */}
          <div
            className="overflow-hidden mb-3"
            style={{ borderRadius: "2px", background: "var(--parchment-dark)" }}
          >
            <img
              src={product.images[0].url}
              alt={product.images[0].altText || product.name}
              className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
              style={{ height: "340px" }}
            />
          </div>
          {/* Info */}
          <h3
            style={{
              color: "var(--ink)",
              fontSize: "0.85rem",
              fontWeight: 400,
              marginBottom: "0.25rem",
              fontFamily: "var(--ff-sans)",
            }}
          >
            {product.name}
          </h3>
          <p
            style={{
              color: "var(--gold)",
              fontSize: "0.82rem",
              fontWeight: 500,
            }}
          >
            ${product.price}
          </p>
        </Link>
      ))}
    </div>
  );
};

export default ProductGrid;
