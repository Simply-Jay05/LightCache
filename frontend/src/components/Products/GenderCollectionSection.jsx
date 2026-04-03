import { Link } from "react-router-dom";
import mensCollection from "../../assets/mens-collection.webp";
import womensCollection from "../../assets/womens-collection.webp";

const GenderCollectionSection = () => {
  const collections = [
    {
      src: womensCollection,
      alt: "Women's Collection",
      label: "Women",
      to: "/collections/all?gender=Women",
    },
    {
      src: mensCollection,
      alt: "Men's Collection",
      label: "Men",
      to: "/collections/all?gender=Men",
    },
  ];

  return (
    <section className="py-20 px-4 lg:px-0">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-10">
          <p className="section-label">Collections</p>
          <hr className="divider-gold flex-1 mx-8" />
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          {collections.map(({ src, alt, label, to }) => (
            <div
              key={label}
              className="relative flex-1 overflow-hidden card-lift group"
              style={{ borderRadius: "2px" }}
            >
              <img
                src={src}
                alt={alt}
                className="w-full object-cover transition-transform duration-700 group-hover:scale-105"
                style={{ height: "620px" }}
              />
              {/* Gradient overlay */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(15,17,23,0.75) 0%, transparent 50%)",
                }}
              />
              {/* Label */}
              <div className="absolute bottom-0 left-0 p-8">
                <p className="section-label mb-2">{label}</p>
                <h2
                  className="font-serif font-normal mb-4"
                  style={{
                    color: "var(--parchment)",
                    fontFamily: "var(--ff-serif)",
                    fontSize: "2rem",
                  }}
                >
                  {label}'s Collection
                </h2>
                <Link
                  to={to}
                  style={{
                    color: "var(--gold)",
                    fontSize: "0.7rem",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    fontWeight: 500,
                    textDecoration: "none",
                    borderBottom: "1px solid var(--gold)",
                    paddingBottom: "2px",
                    fontFamily: "var(--ff-sans)",
                  }}
                >
                  Shop Now
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GenderCollectionSection;
