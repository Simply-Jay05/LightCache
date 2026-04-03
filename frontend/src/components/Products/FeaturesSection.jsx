import {
  HiArrowPathRoundedSquare,
  HiOutlineCreditCard,
  HiShoppingBag,
} from "react-icons/hi2";

const features = [
  {
    icon: HiShoppingBag,
    title: "Free Shipping",
    desc: "Fast delivery to your door, on us",
  },
  {
    icon: HiArrowPathRoundedSquare,
    title: "30-Day Returns",
    desc: "Not happy? Send it back, no questions asked",
  },
  {
    icon: HiOutlineCreditCard,
    title: "Secure Checkout",
    desc: "Your payment is always safe with us",
  },
];

const FeaturesSection = () => {
  return (
    <section
      style={{
        backgroundColor: "var(--parchment-dark)",
        borderTop: "1px solid rgba(201,168,76,0.12)",
      }}
    >
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex flex-col items-center text-center py-8 px-6"
              style={{
                border: "1px solid rgba(201,168,76,0.12)",
                borderRadius: "2px",
                backgroundColor: "var(--ink)",
              }}
            >
              {/* Icon ring */}
              <div
                className="flex items-center justify-center mb-5"
                style={{
                  width: "3rem",
                  height: "3rem",
                  borderRadius: "50%",
                  border: "1px solid var(--gold)",
                  color: "var(--gold)",
                }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <h4
                style={{
                  color: "var(--parchment)",
                  fontSize: "0.7rem",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                  marginBottom: "0.5rem",
                  fontFamily: "var(--ff-sans)",
                }}
              >
                {title}
              </h4>
              <p
                style={{
                  color: "var(--muted)",
                  fontSize: "0.82rem",
                  lineHeight: 1.7,
                }}
              >
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
