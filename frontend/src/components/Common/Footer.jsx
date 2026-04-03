import { Link } from "react-router-dom";
import { useState } from "react";
import axios from "axios";

const Footer = () => {
  const [email, setEmail] = useState("");
  const [subStatus, setSubStatus] = useState(null); // null | "ok" | "err" | "loading"
  const [subMsg, setSubMsg] = useState("");

  const handleSubscribe = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();

    // Basic client-side email validation
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(trimmed)) {
      setSubStatus("err");
      setSubMsg("Please enter a valid email address.");
      return;
    }

    setSubStatus("loading");
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/subscribe`,
        { email: trimmed },
      );
      setSubStatus("ok");
      setSubMsg(
        res.data.message || "You're subscribed! Check your inbox for 10% off.",
      );
      setEmail("");
    } catch (err) {
      setSubStatus("err");
      setSubMsg(
        err.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
    }
  };
  return (
    <footer
      style={{
        backgroundColor: "var(--ink)",
        borderTop: "1px solid rgba(201,168,76,0.15)",
      }}
    >
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Newsletter */}
          <div>
            <p className="section-label mb-4">Stay in the loop</p>
            <h3
              className="font-serif text-2xl font-normal mb-3"
              style={{
                color: "var(--parchment)",
                fontFamily: "var(--ff-serif)",
              }}
            >
              New drops, first.
            </h3>
            <p
              style={{
                color: "var(--muted)",
                fontSize: "0.85rem",
                lineHeight: 1.7,
              }}
              className="mb-6"
            >
              Subscribe and receive 10% off your first order.
            </p>
            <form className="flex flex-col gap-2" onSubmit={handleSubscribe}>
              <div className="flex">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setSubStatus(null);
                  }}
                  required
                  disabled={subStatus === "loading" || subStatus === "ok"}
                  style={{
                    backgroundColor: "rgba(245,240,232,0.05)",
                    border: "1px solid rgba(201,168,76,0.25)",
                    borderRight: "none",
                    borderRadius: "2px 0 0 2px",
                    color: "var(--parchment)",
                    padding: "0.625rem 0.875rem",
                    fontSize: "0.8rem",
                    fontFamily: "var(--ff-sans)",
                    flex: 1,
                    outline: "none",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--gold)")}
                  onBlur={(e) =>
                    (e.target.style.borderColor = "rgba(201,168,76,0.25)")
                  }
                />
                <button
                  type="submit"
                  disabled={subStatus === "loading" || subStatus === "ok"}
                  style={{
                    backgroundColor:
                      subStatus === "ok"
                        ? "rgba(201,168,76,0.5)"
                        : "var(--gold)",
                    color: "var(--ink)",
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    padding: "0.625rem 1.25rem",
                    borderRadius: "0 2px 2px 0",
                    border: "1px solid var(--gold)",
                    cursor:
                      subStatus === "loading" || subStatus === "ok"
                        ? "default"
                        : "pointer",
                    fontFamily: "var(--ff-sans)",
                    whiteSpace: "nowrap",
                    opacity: subStatus === "loading" ? 0.7 : 1,
                  }}
                >
                  {subStatus === "loading"
                    ? "Saving…"
                    : subStatus === "ok"
                      ? "Subscribed"
                      : "Subscribe"}
                </button>
              </div>
              {/* Feedback message */}
              {subMsg && (
                <p
                  style={{
                    fontSize: "0.72rem",
                    color: subStatus === "ok" ? "var(--gold)" : "#e07070",
                    lineHeight: 1.5,
                    fontFamily: "var(--ff-sans)",
                    marginTop: "0.2rem",
                  }}
                >
                  {subMsg}
                </p>
              )}
            </form>
          </div>

          {/* Shop links */}
          <div>
            <p className="section-label mb-4">Shop</p>
            <ul className="space-y-3">
              {[
                "Men's Top Wear",
                "Women's Top Wear",
                "Men's Bottom Wear",
                "Women's Bottom Wear",
              ].map((item) => (
                <li key={item}>
                  <Link
                    to="#"
                    style={{
                      color: "var(--muted)",
                      fontSize: "0.85rem",
                      textDecoration: "none",
                    }}
                    className="hover:text-gold transition-colors"
                    onMouseEnter={(e) => (e.target.style.color = "var(--gold)")}
                    onMouseLeave={(e) =>
                      (e.target.style.color = "var(--muted)")
                    }
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support links */}
          <div>
            <p className="section-label mb-4">Support</p>
            <ul className="space-y-3">
              {["Contact Us", "About Us", "FAQ", "Features"].map((item) => (
                <li key={item}>
                  <Link
                    to="#"
                    style={{
                      color: "var(--muted)",
                      fontSize: "0.85rem",
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => (e.target.style.color = "var(--gold)")}
                    onMouseLeave={(e) =>
                      (e.target.style.color = "var(--muted)")
                    }
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-16 pt-6 flex flex-col md:flex-row items-center justify-between gap-4"
          style={{ borderTop: "1px solid rgba(201,168,76,0.1)" }}
        >
          <Link
            to="/"
            style={{
              fontFamily: "var(--ff-serif)",
              fontSize: "1.15rem",
              color: "var(--parchment)",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            LightCache<span style={{ color: "var(--gold)" }}>+</span>
          </Link>
          <p
            style={{
              color: "var(--muted)",
              fontSize: "0.75rem",
              letterSpacing: "0.04em",
            }}
          >
            &copy; {new Date().getFullYear()} LightCache. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
