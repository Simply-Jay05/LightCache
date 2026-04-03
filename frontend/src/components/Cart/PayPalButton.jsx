import {
  PayPalButtons,
  PayPalScriptProvider,
  FUNDING,
} from "@paypal/react-paypal-js";

const PayPalButton = ({ amount, onSuccess, onError }) => {
  return (
    <PayPalScriptProvider
      options={{
        clientId: import.meta.env.VITE_PAYPAL_PAYMENT_ID,
        // Disable card and credit — sandbox demo accounts only
        disableFunding: "card,credit,paylater,venmo",
      }}
    >
      {/* Reminder notice above the button */}
      <div
        style={{
          padding: "0.65rem 0.875rem",
          backgroundColor: "rgba(201,168,76,0.08)",
          border: "1px solid rgba(201,168,76,0.2)",
          borderRadius: "3px",
          marginBottom: "0.875rem",
          fontFamily: "var(--ff-sans)",
        }}
      >
        <p
          style={{ fontSize: "0.72rem", color: "var(--ink)", lineHeight: 1.6 }}
        >
          <strong style={{ color: "var(--gold)" }}>Demo credentials:</strong>{" "}
          buyer0001@example.com &nbsp;/&nbsp; buyer0002@example.com
          &nbsp;&nbsp;·&nbsp;&nbsp;
          <strong>Password:</strong> purchase
        </p>
        <p
          style={{
            fontSize: "0.68rem",
            color: "var(--muted)",
            marginTop: "0.2rem",
          }}
        >
          Click the PayPal button and log in with one of the accounts above. Do
          not enter a real card.
        </p>
      </div>

      <PayPalButtons
        style={{ layout: "vertical", shape: "rect", label: "paypal" }}
        fundingSource={FUNDING.PAYPAL}
        createOrder={(data, actions) => {
          return actions.order.create({
            purchase_units: [
              { amount: { value: parseFloat(amount).toFixed(2) } },
            ],
          });
        }}
        onApprove={(data, actions) => {
          return actions.order.capture().then(onSuccess);
        }}
        onError={onError}
      />
    </PayPalScriptProvider>
  );
};

export default PayPalButton;
