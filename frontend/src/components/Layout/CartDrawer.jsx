import { IoMdClose } from "react-icons/io";
import CartContents from "../Cart/CartContents";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

const CartDrawer = ({ drawerOpen, toggleCartDrawer }) => {
  const navigate = useNavigate();
  const { user, guestId } = useSelector((state) => state.auth);
  const { cart } = useSelector((state) => state.cart);
  const userId = user ? user._id : null;

  const handleCheckout = () => {
    toggleCartDrawer();
    navigate(!user ? "/login?redirect=checkout" : "/checkout");
  };

  const itemCount = cart?.products?.reduce((t, p) => t + p.quantity, 0) || 0;
  const subtotal =
    cart?.products?.reduce((t, p) => t + p.price * p.quantity, 0) || 0;

  return (
    <>
      {/* Backdrop */}
      {drawerOpen && (
        <div
          onClick={toggleCartDrawer}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,17,23,0.4)",
            zIndex: 40,
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* Drawer panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: "min(28rem, 90vw)",
          height: "100%",
          backgroundColor: "var(--parchment)",
          borderLeft: "1px solid rgba(201,168,76,0.15)",
          transform: drawerOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          display: "flex",
          flexDirection: "column",
          zIndex: 50,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid rgba(15,17,23,0.08)",
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "var(--ff-serif)",
                fontSize: "1.15rem",
                fontWeight: 400,
                color: "var(--ink)",
              }}
            >
              Your Cart
            </h2>
            {itemCount > 0 && (
              <p
                style={{
                  fontSize: "0.72rem",
                  color: "var(--muted)",
                  marginTop: "2px",
                }}
              >
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </p>
            )}
          </div>
          <button
            onClick={toggleCartDrawer}
            style={{
              color: "var(--muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
          >
            <IoMdClose className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flexGrow: 1, overflowY: "auto", padding: "0 1.5rem" }}>
          {cart?.products?.length > 0 ? (
            <CartContents cart={cart} userId={userId} guestId={guestId} />
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                paddingTop: "4rem",
                color: "var(--muted)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "3.5rem",
                  height: "3.5rem",
                  borderRadius: "50%",
                  border: "1px solid rgba(201,168,76,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1rem",
                  color: "var(--gold)",
                  fontSize: "1.4rem",
                }}
              >
                ∅
              </div>
              <p style={{ fontSize: "0.85rem" }}>Your cart is empty.</p>
            </div>
          )}
        </div>

        {/* Footer — subtotal + checkout */}
        {cart?.products?.length > 0 && (
          <div
            style={{
              padding: "1.25rem 1.5rem",
              borderTop: "1px solid rgba(15,17,23,0.08)",
              background: "var(--parchment)",
            }}
          >
            {/* Subtotal row */}
            <div className="flex justify-between items-center mb-4">
              <span
                style={{
                  fontSize: "0.72rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                  fontWeight: 500,
                }}
              >
                Subtotal
              </span>
              <span
                style={{
                  fontSize: "1rem",
                  fontWeight: 500,
                  color: "var(--ink)",
                }}
              >
                $
                {subtotal.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            <button onClick={handleCheckout} className="btn-primary w-full">
              Proceed to Checkout
            </button>
            <p
              style={{
                fontSize: "0.72rem",
                color: "var(--muted)",
                textAlign: "center",
                marginTop: "0.75rem",
                lineHeight: 1.5,
              }}
            >
              Shipping & taxes calculated at checkout
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
