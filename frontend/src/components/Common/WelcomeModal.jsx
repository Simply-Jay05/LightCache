import { useEffect, useState } from "react";
import {
  HiOutlineShoppingBag,
  HiOutlineUser,
  HiOutlineArrowRight,
} from "react-icons/hi2";

const STORAGE_KEY = "lc_welcomed_v1";

const steps = [
  {
    icon: HiOutlineShoppingBag,
    title: "Browse & Add to Cart",
    desc: "Explore Men's and Women's collections from the nav. Click any item, pick a size and colour, then hit \"Add to Cart\".",
  },
  {
    icon: HiOutlineUser,
    title: "Sign in or Continue as Guest",
    desc: "You can browse as a guest. To complete a purchase you will be prompted to log in, use the demo account shown at checkout.",
  },
  {
    icon: HiOutlineArrowRight,
    title: "Checkout with Demo PayPal",
    desc: 'Fill in your shipping details and click "Continue to Payment". We will show you the sandbox PayPal credentials. No real money involved.',
  },
];

const WelcomeModal = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15,17,23,0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "1.5rem 1rem",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          backgroundColor: "var(--parchment)",
          borderRadius: "4px",
          maxWidth: "540px",
          width: "100%",
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(15,17,23,0.3)",
          animation: "modalIn 0.3s cubic-bezier(0.34,1.2,0.64,1)",
          margin: "auto",
        }}
      >
        {/* Top banner — ink bg */}
        <div
          style={{
            backgroundColor: "var(--ink)",
            padding: "2rem 2rem 1.75rem",
          }}
        >
          <p
            style={{
              fontSize: "0.6rem",
              fontWeight: 600,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--gold)",
              marginBottom: "0.5rem",
              fontFamily: "var(--ff-sans)",
            }}
          >
            Welcome to LightCache
          </p>
          <h2
            style={{
              fontFamily: "var(--ff-serif)",
              fontSize: "clamp(1.4rem, 3vw, 1.8rem)",
              fontWeight: 400,
              color: "var(--parchment)",
              lineHeight: 1.2,
              marginBottom: "0.75rem",
            }}
          >
            A demo fashion store powered by ML caching.
          </h2>
          <p
            style={{
              fontSize: "0.82rem",
              color: "rgba(245,240,232,0.6)",
              lineHeight: 1.7,
              fontFamily: "var(--ff-sans)",
            }}
          >
            This is a real full-stack project. Browse, add to cart and complete
            a purchase using our sandbox PayPal account, no real card needed.
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: "1.75rem 2rem" }}>
          {/* Steps */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
          >
            {steps.map(({ icon: Icon, title, desc }, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "1rem",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    width: "2.25rem",
                    height: "2.25rem",
                    borderRadius: "50%",
                    border: "1px solid var(--gold)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--gold)",
                    marginTop: "1px",
                  }}
                >
                  <Icon style={{ width: "1rem", height: "1rem" }} />
                </div>
                <div>
                  <p
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "var(--ink)",
                      marginBottom: "0.2rem",
                      fontFamily: "var(--ff-sans)",
                    }}
                  >
                    {title}
                  </p>
                  <p
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--muted)",
                      lineHeight: 1.65,
                      fontFamily: "var(--ff-sans)",
                    }}
                  >
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Demo credentials hint */}
          <div
            style={{
              marginTop: "1.5rem",
              padding: "0.875rem 1rem",
              backgroundColor: "rgba(201,168,76,0.08)",
              border: "1px solid rgba(201,168,76,0.25)",
              borderRadius: "3px",
            }}
          >
            <p
              style={{
                fontSize: "0.65rem",
                fontWeight: 600,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--gold)",
                marginBottom: "0.5rem",
                fontFamily: "var(--ff-sans)",
              }}
            >
              Demo PayPal Credentials
            </p>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--ink)",
                fontFamily: "var(--ff-sans)",
                lineHeight: 1.8,
              }}
            >
              <strong>Email:</strong> buyer0001@example.com &nbsp;|&nbsp;{" "}
              <strong>Password:</strong> purchase
            </p>
            <p
              style={{
                fontSize: "0.72rem",
                color: "var(--muted)",
                marginTop: "0.35rem",
                fontFamily: "var(--ff-sans)",
              }}
            >
              You will see these again at checkout. Remember it just a Sandbox,
              nothing is charged.
            </p>
          </div>

          {/* CTA button */}
          <button
            onClick={dismiss}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--gold)";
              e.currentTarget.style.borderColor = "var(--gold)";
              e.currentTarget.style.color = "var(--ink)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--ink)";
              e.currentTarget.style.borderColor = "var(--ink)";
              e.currentTarget.style.color = "var(--parchment)";
            }}
            style={{
              marginTop: "1.5rem",
              width: "100%",
              padding: "0.8rem",
              backgroundColor: "var(--ink)",
              color: "var(--parchment)",
              fontSize: "0.72rem",
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              border: "1px solid var(--ink)",
              borderRadius: "2px",
              cursor: "pointer",
              fontFamily: "var(--ff-sans)",
              transition: "background 0.2s, color 0.2s, border-color 0.2s",
            }}
          >
            Start Exploring
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(18px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default WelcomeModal;
