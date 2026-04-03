import { useEffect, useState } from "react";
import { toast } from "sonner";
import ProductGrid from "./ProductGrid";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchProductDetails,
  fetchSimilarProducts,
} from "../../redux/slices/productsSlice";
import { addToCart } from "../../redux/slices/cartSlice";

const ProductDetails = ({ productId }) => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { selectedProduct, loading, error, similarProducts } = useSelector(
    (s) => s.products,
  );
  const { user, guestId } = useSelector((s) => s.auth);
  const [mainImage, setMainImage] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);

  const productFetchId = productId || id;

  useEffect(() => {
    if (productFetchId) {
      dispatch(fetchProductDetails(productFetchId));
      dispatch(fetchSimilarProducts({ id: productFetchId }));
    }
  }, [dispatch, productFetchId]);

  useEffect(() => {
    if (selectedProduct?.images?.length > 0)
      setMainImage(selectedProduct.images[0].url);
  }, [selectedProduct]);

  const handleQuantityChange = (action) => {
    if (action === "plus") setQuantity((p) => p + 1);
    if (action === "minus" && quantity > 1) setQuantity((p) => p - 1);
  };

  const handleAddToCart = () => {
    if (!selectedSize || !selectedColor) {
      toast.error("Please select a size and color before adding to cart.", {
        duration: 1000,
      });
      return;
    }
    setIsButtonDisabled(true);
    dispatch(
      addToCart({
        productId: productFetchId,
        quantity,
        size: selectedSize,
        color: selectedColor,
        guestId,
        userId: user?._id,
      }),
    )
      .then(() => toast.success("Product added to cart!", { duration: 1000 }))
      .finally(() => setIsButtonDisabled(false));
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row gap-10 animate-pulse">
          <div
            className="md:w-1/2 skeleton"
            style={{ height: "520px", borderRadius: "2px" }}
          />
          <div className="md:w-1/2 space-y-4 pt-4">
            {[
              ["3/4", "h-8"],
              ["1/4", "h-6"],
              ["full", "h-4"],
              ["5/6", "h-4"],
              ["4/6", "h-4"],
            ].map(([w, h], i) => (
              <div key={i} className={`skeleton ${h} w-${w}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p style={{ color: "#c0392b", marginBottom: "1rem" }}>
          Failed to load product details.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  const qtyBtn = {
    width: "2rem",
    height: "2rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid rgba(15,17,23,0.15)",
    borderRadius: "2px",
    fontSize: "1rem",
    background: "transparent",
    cursor: "pointer",
    color: "var(--ink)",
    transition: "border-color 0.2s",
  };

  return (
    <div className="py-10 px-4">
      {selectedProduct && (
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row gap-10">
            {/* Thumbnails — desktop */}
            <div className="hidden md:flex flex-col space-y-3">
              {selectedProduct.images.map((image, i) => (
                <img
                  key={i}
                  src={image.url}
                  alt={image.altText || `Thumbnail ${i}`}
                  onClick={() => setMainImage(image.url)}
                  className="object-cover cursor-pointer transition-all duration-200"
                  style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "2px",
                    border: `1px solid ${mainImage === image.url ? "var(--gold)" : "rgba(15,17,23,0.12)"}`,
                    opacity: mainImage === image.url ? 1 : 0.65,
                  }}
                />
              ))}
            </div>

            {/* Main image */}
            <div className="md:w-1/2">
              <img
                src={mainImage}
                alt="Main Product"
                className="w-full object-cover"
                style={{ borderRadius: "2px", maxHeight: "620px" }}
              />
              {/* Mobile thumbnails */}
              <div className="md:hidden flex overflow-x-auto space-x-3 mt-3">
                {selectedProduct.images.map((image, i) => (
                  <img
                    key={i}
                    src={image.url}
                    alt={image.altText || `Thumb ${i}`}
                    onClick={() => setMainImage(image.url)}
                    className="object-cover cursor-pointer flex-shrink-0"
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "2px",
                      border: `1px solid ${mainImage === image.url ? "var(--gold)" : "rgba(15,17,23,0.12)"}`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Right — details */}
            <div className="md:w-1/2">
              <h1
                className="font-serif font-normal mb-3"
                style={{
                  fontFamily: "var(--ff-serif)",
                  fontSize: "clamp(1.5rem, 3vw, 2rem)",
                  color: "var(--ink)",
                  lineHeight: 1.2,
                }}
              >
                {selectedProduct.name}
              </h1>

              {selectedProduct.originalPrice && (
                <p
                  style={{
                    color: "var(--muted)",
                    fontSize: "0.85rem",
                    textDecoration: "line-through",
                    marginBottom: "0.25rem",
                  }}
                >
                  ${selectedProduct.originalPrice}
                </p>
              )}
              <p
                style={{
                  color: "var(--gold)",
                  fontSize: "1.25rem",
                  fontWeight: 500,
                  marginBottom: "1.25rem",
                }}
              >
                ${selectedProduct.price}
              </p>
              <p
                style={{
                  color: "var(--muted)",
                  fontSize: "0.875rem",
                  lineHeight: 1.8,
                  marginBottom: "1.75rem",
                }}
              >
                {selectedProduct.description}
              </p>

              <hr className="divider-gold mb-6" />

              {/* Color */}
              <div className="mb-5">
                <p
                  style={{
                    color: "var(--ink)",
                    fontSize: "0.72rem",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    fontWeight: 500,
                    marginBottom: "0.75rem",
                  }}
                >
                  Color
                </p>
                <div className="flex gap-2">
                  {selectedProduct.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      style={{
                        width: "2rem",
                        height: "2rem",
                        borderRadius: "50%",
                        backgroundColor: color.toLowerCase(),
                        filter: "brightness(0.6)",
                        border:
                          selectedColor === color
                            ? "2px solid var(--gold)"
                            : "2px solid rgba(15,17,23,0.15)",
                        cursor: "pointer",
                        transition: "border-color 0.2s",
                        outline:
                          selectedColor === color
                            ? "1px solid var(--gold)"
                            : "none",
                        outlineOffset: "2px",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Size */}
              <div className="mb-5">
                <p
                  style={{
                    color: "var(--ink)",
                    fontSize: "0.72rem",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    fontWeight: 500,
                    marginBottom: "0.75rem",
                  }}
                >
                  Size
                </p>
                <div className="flex gap-2 flex-wrap">
                  {selectedProduct.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      style={{
                        padding: "0.375rem 0.875rem",
                        fontSize: "0.75rem",
                        fontFamily: "var(--ff-sans)",
                        border: `1px solid ${selectedSize === size ? "var(--ink)" : "rgba(15,17,23,0.18)"}`,
                        borderRadius: "2px",
                        background:
                          selectedSize === size ? "var(--ink)" : "transparent",
                        color:
                          selectedSize === size
                            ? "var(--parchment)"
                            : "var(--ink)",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        fontWeight: 500,
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div className="mb-7">
                <p
                  style={{
                    color: "var(--ink)",
                    fontSize: "0.72rem",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    fontWeight: 500,
                    marginBottom: "0.75rem",
                  }}
                >
                  Quantity
                </p>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleQuantityChange("minus")}
                    style={qtyBtn}
                  >
                    −
                  </button>
                  <span
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 500,
                      minWidth: "1.5rem",
                      textAlign: "center",
                    }}
                  >
                    {quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange("plus")}
                    style={qtyBtn}
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={isButtonDisabled}
                className="btn-primary w-full mb-6"
              >
                {isButtonDisabled ? "Adding…" : "Add to Cart"}
              </button>

              {/* Characteristics */}
              <div
                style={{
                  borderTop: "1px solid rgba(15,17,23,0.08)",
                  paddingTop: "1.5rem",
                }}
              >
                <p
                  style={{
                    color: "var(--ink)",
                    fontSize: "0.72rem",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    fontWeight: 500,
                    marginBottom: "1rem",
                  }}
                >
                  Details
                </p>
                <table style={{ width: "100%", fontSize: "0.82rem" }}>
                  <tbody>
                    {[
                      ["Brand", selectedProduct.brand],
                      ["Material", selectedProduct.material],
                    ].map(([k, v]) => (
                      <tr
                        key={k}
                        style={{
                          borderBottom: "1px solid rgba(15,17,23,0.07)",
                        }}
                      >
                        <td
                          style={{
                            padding: "0.5rem 0",
                            color: "var(--muted)",
                            width: "40%",
                          }}
                        >
                          {k}
                        </td>
                        <td
                          style={{ padding: "0.5rem 0", color: "var(--ink)" }}
                        >
                          {v}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Similar products */}
          <div className="mt-24">
            <div className="flex items-center gap-8 mb-10">
              <p className="section-label whitespace-nowrap">
                You May Also Like
              </p>
              <hr className="divider-gold flex-1" />
            </div>
            <ProductGrid
              products={similarProducts}
              loading={loading}
              error={error}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetails;
