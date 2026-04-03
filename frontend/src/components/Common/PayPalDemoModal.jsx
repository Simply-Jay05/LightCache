import {
  HiOutlineClipboardDocument,
  HiOutlineCheckCircle,
} from "react-icons/hi2";
import { useState } from "react";

const accounts = [
  { email: "buyer0001@example.com", password: "purchase" },
  { email: "buyer0002@example.com", password: "purchase" },
];

const CopyBtn = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <button
      onClick={copy}
      title="Copy"
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        color: copied ? "var(--gold)" : "var(--muted)",
        padding: "2px",
        transition: "color 0.2s",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {copied ? (
        <HiOutlineCheckCircle style={{ width: "0.9rem", height: "0.9rem" }} />
      ) : (
        <HiOutlineClipboardDocument
          style={{ width: "0.9rem", height: "0.9rem" }}
        />
      )}
    </button>
  );
};

const PayPalDemoModal = ({ onConfirm, onCancel }) => {
  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15,17,23,0.7)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          backgroundColor: "var(--parchment)",
          borderRadius: "4px",
          maxWidth: "480px",
          width: "100%",
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(15,17,23,0.35)",
          animation: "modalIn 0.25s cubic-bezier(0.34,1.2,0.64,1)",
        }}
      >
        {/* Header */}
        <div style={{ backgroundColor: "var(--ink)", padding: "1.5rem 2rem" }}>
          <p
            style={{
              fontSize: "0.6rem",
              fontWeight: 600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--gold)",
              marginBottom: "0.4rem",
              fontFamily: "var(--ff-sans)",
            }}
          >
            Before you pay
          </p>
          <h2
            style={{
              fontFamily: "var(--ff-serif)",
              fontSize: "1.4rem",
              fontWeight: 400,
              color: "var(--parchment)",
              lineHeight: 1.2,
            }}
          >
            Use the Demo PayPal Account
          </h2>
          <p
            style={{
              fontSize: "0.78rem",
              color: "rgba(245,240,232,0.6)",
              marginTop: "0.5rem",
              lineHeight: 1.65,
              fontFamily: "var(--ff-sans)",
            }}
          >
            This store uses PayPal Sandbox. Log in with one of the demo buyer
            accounts below — no real money will be charged.
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: "1.5rem 2rem" }}>
          {/* Important notice */}
          <div
            style={{
              padding: "0.75rem 1rem",
              backgroundColor: "rgba(192,57,43,0.07)",
              border: "1px solid rgba(192,57,43,0.2)",
              borderRadius: "3px",
              marginBottom: "1.25rem",
            }}
          >
            <p
              style={{
                fontSize: "0.75rem",
                color: "#8b2315",
                lineHeight: 1.6,
                fontFamily: "var(--ff-sans)",
                fontWeight: 500,
              }}
            >
              Do not enter a real debit or credit card. The payment will only
              work using the demo PayPal login below.
            </p>
          </div>

          {/* Accounts */}
          {accounts.map((acc, i) => (
            <div
              key={i}
              style={{
                padding: "0.875rem 1rem",
                backgroundColor:
                  i === 0 ? "rgba(201,168,76,0.07)" : "transparent",
                border: "1px solid rgba(201,168,76,0.2)",
                borderRadius: "3px",
                marginBottom: "0.625rem",
              }}
            >
              <p
                style={{
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: i === 0 ? "var(--gold)" : "var(--muted)",
                  marginBottom: "0.5rem",
                  fontFamily: "var(--ff-sans)",
                }}
              >
                Account {i + 1}
              </p>

              {/* Email row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.3rem",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "0.68rem",
                      color: "var(--muted)",
                      fontFamily: "var(--ff-sans)",
                    }}
                  >
                    Email &nbsp;
                  </span>
                  <span
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 500,
                      color: "var(--ink)",
                      fontFamily: "var(--ff-sans)",
                    }}
                  >
                    {acc.email}
                  </span>
                </div>
                <CopyBtn text={acc.email} />
              </div>

              {/* Password row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "0.68rem",
                      color: "var(--muted)",
                      fontFamily: "var(--ff-sans)",
                    }}
                  >
                    Password &nbsp;
                  </span>
                  <span
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 500,
                      color: "var(--ink)",
                      fontFamily: "var(--ff-sans)",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {acc.password}
                  </span>
                </div>
                <CopyBtn text={acc.password} />
              </div>
            </div>
          ))}

          <p
            style={{
              fontSize: "0.72rem",
              color: "var(--muted)",
              marginTop: "0.75rem",
              marginBottom: "1.5rem",
              lineHeight: 1.6,
              fontFamily: "var(--ff-sans)",
            }}
          >
            On the PayPal screen, click{" "}
            <strong style={{ color: "var(--ink)" }}>"Log In"</strong> (not the
            debit/credit card option) and enter the credentials above.
          </p>

          {/* Buttons */}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={onCancel}
              style={{
                flex: "0 0 auto",
                padding: "0.75rem 1.25rem",
                backgroundColor: "transparent",
                color: "var(--muted)",
                fontSize: "0.72rem",
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                border: "1px solid rgba(15,17,23,0.15)",
                borderRadius: "2px",
                cursor: "pointer",
                fontFamily: "var(--ff-sans)",
                transition: "border-color 0.2s, color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--muted)";
                e.currentTarget.style.color = "var(--ink)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(15,17,23,0.15)";
                e.currentTarget.style.color = "var(--muted)";
              }}
            >
              Go Back
            </button>

            <button
              onClick={onConfirm}
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
                flex: 1,
                padding: "0.75rem",
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
              Got it — Proceed to Payment
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(14px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default PayPalDemoModal;
