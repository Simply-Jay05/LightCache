import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import register from "../assets/register.webp";
import { registerUser } from "../redux/slices/authSlice";
import { useDispatch, useSelector } from "react-redux";
import { mergeCart } from "../redux/slices/cartSlice";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, guestId, loading } = useSelector((state) => state.auth);
  const { cart } = useSelector((state) => state.cart);

  const redirect = new URLSearchParams(location.search).get("redirect") || "/";
  const isCheckoutRedirect = redirect.includes("checkout");

  useEffect(() => {
    if (user) {
      if (cart?.products.length > 0 && guestId) {
        dispatch(mergeCart({ guestId, user })).then(() => {
          navigate(isCheckoutRedirect ? "/checkout" : "/");
        });
      } else {
        navigate(isCheckoutRedirect ? "/checkout" : "/");
      }
    }
  }, [user, guestId, cart, navigate, isCheckoutRedirect, dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(registerUser({ name, email, password }));
  };

  const fieldLabel = {
    display: "block",
    fontSize: "0.65rem",
    fontWeight: 500,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "var(--ink)",
    marginBottom: "0.5rem",
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "130vh",
        backgroundColor: "var(--parchment)",
      }}
    >
      {/* Left — form */}
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "3rem 3.5rem",
        }}
      >
        {/* Wordmark */}
        <Link
          to="/"
          style={{
            fontFamily: "var(--ff-serif)",
            fontSize: "1.5rem",
            fontWeight: 400,
            color: "var(--ink)",
            textDecoration: "none",
            marginBottom: "3rem",
            display: "block",
          }}
        >
          Light<span style={{ color: "var(--gold)" }}>Cache</span>
        </Link>

        <p className="section-label mb-3">Get started</p>
        <h2
          style={{
            fontFamily: "var(--ff-serif)",
            fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
            fontWeight: 400,
            color: "var(--ink)",
            marginBottom: "0.5rem",
            lineHeight: 1.2,
          }}
        >
          Create your account
        </h2>
        <p
          style={{
            color: "var(--muted)",
            fontSize: "0.85rem",
            marginBottom: "2.5rem",
          }}
        >
          Already have an account?{" "}
          <Link
            to={`/login?redirect=${encodeURIComponent(redirect)}`}
            style={{
              color: "var(--gold)",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Sign in
          </Link>
        </p>

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={fieldLabel}>Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="input-base"
              required
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={fieldLabel}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="input-base"
              required
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: "2rem" }}>
            <label style={fieldLabel}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Choose a password"
              className="input-base"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>
      </div>

      {/* Right — image */}
      <div
        className="hidden md:block"
        style={{
          flex: 1,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <img
          src={register}
          alt="Register visual"
          style={{
            width: "100%",
            height: "130vh",
            objectFit: "cover",
            objectPosition: "50% 20%",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to right, rgba(15,17,23,0.15) 0%, transparent 60%)",
          }}
        />
      </div>
    </div>
  );
};

export default Register;
