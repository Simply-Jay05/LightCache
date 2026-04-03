import { RiDeleteBin3Line } from "react-icons/ri";
import { useDispatch } from "react-redux";
import {
  removeFromCart,
  updateCartItemQuantity,
} from "../../redux/slices/cartSlice";

const CartContents = ({ cart, userId, guestId }) => {
  const dispatch = useDispatch();

  const handleAddToCart = (productId, delta, quantity, size, color) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1) {
      dispatch(
        updateCartItemQuantity({
          productId,
          quantity: newQuantity,
          guestId,
          userId,
          size,
          color,
        }),
      );
    }
  };

  const handleRemoveFromCart = (productId, size, color) => {
    dispatch(removeFromCart({ productId, guestId, userId, size, color }));
  };

  const qtyBtn = {
    width: "1.75rem",
    height: "1.75rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid rgba(15,17,23,0.15)",
    borderRadius: "2px",
    background: "transparent",
    color: "var(--ink)",
    fontSize: "0.9rem",
    cursor: "pointer",
    transition: "border-color 0.15s",
    flexShrink: 0,
  };

  return (
    <div>
      {cart.products.map((product, index) => (
        <div
          key={index}
          className="flex items-start justify-between py-5"
          style={{
            borderBottom: "1px solid rgba(15,17,23,0.08)",
          }}
        >
          {/* Left — image + info */}
          <div className="flex items-start gap-4">
            <img
              src={product.image}
              alt={product.name}
              style={{
                width: "72px",
                height: "88px",
                objectFit: "cover",
                borderRadius: "2px",
                flexShrink: 0,
              }}
            />
            <div>
              <h3
                style={{
                  fontSize: "0.88rem",
                  fontWeight: 400,
                  color: "var(--ink)",
                  marginBottom: "0.25rem",
                  fontFamily: "var(--ff-sans)",
                }}
              >
                {product.name}
              </h3>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--muted)",
                  marginBottom: "0.75rem",
                  letterSpacing: "0.02em",
                }}
              >
                {product.size} · {product.color}
              </p>

              {/* Qty controls */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    handleAddToCart(
                      product.productId,
                      -1,
                      product.quantity,
                      product.size,
                      product.color,
                    )
                  }
                  style={qtyBtn}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "var(--gold)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "rgba(15,17,23,0.15)")
                  }
                >
                  −
                </button>
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 500,
                    minWidth: "1rem",
                    textAlign: "center",
                    color: "var(--ink)",
                  }}
                >
                  {product.quantity}
                </span>
                <button
                  onClick={() =>
                    handleAddToCart(
                      product.productId,
                      1,
                      product.quantity,
                      product.size,
                      product.color,
                    )
                  }
                  style={qtyBtn}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "var(--gold)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "rgba(15,17,23,0.15)")
                  }
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Right — price + delete */}
          <div className="flex flex-col items-end gap-3">
            <span
              style={{
                fontSize: "0.9rem",
                fontWeight: 500,
                color: "var(--ink)",
              }}
            >
              ${product.price.toLocaleString()}
            </span>
            <button
              onClick={() =>
                handleRemoveFromCart(
                  product.productId,
                  product.size,
                  product.color,
                )
              }
              style={{
                color: "var(--muted)",
                transition: "color 0.15s",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#c0392b")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--muted)")
              }
            >
              <RiDeleteBin3Line className="h-5 w-5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CartContents;
