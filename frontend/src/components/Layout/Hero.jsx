import { Link } from "react-router-dom";
import heroImg from "../../assets/hero.webp";

const Hero = () => {
  return (
    <section className="relative overflow-hidden">
      <img
        src={heroImg}
        alt="Hero"
        className="w-full object-cover"
        style={{ height: "clamp(480px, 80vh, 700px)" }}
      />
      {/* Dark gradient overlay — bottom-heavy for text legibility */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(15,17,23,0.15) 0%, rgba(15,17,23,0.55) 60%, rgba(15,17,23,0.82) 100%)",
        }}
      />
      {/* Content — left-aligned, editorial */}
      <div className="absolute inset-0 flex items-end">
        <div className="container mx-auto px-6 pb-14">
          <p className="section-label mb-4" style={{ color: "var(--gold)" }}>
            New Season
          </p>
          <h1
            className="font-serif font-normal mb-5"
            style={{
              color: "var(--parchment)",
              fontFamily: "var(--ff-serif)",
              fontSize: "clamp(2.8rem, 7vw, 5.5rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.01em",
              maxWidth: "14ch",
            }}
          >
            Dressed for every version of you.
          </h1>
          <p
            style={{
              color: "rgba(245,240,232,0.7)",
              fontSize: "0.95rem",
              maxWidth: "42ch",
              lineHeight: 1.7,
              marginBottom: "2rem",
            }}
          >
            Minimal cuts, quality fabrics, timeless silhouettes built for the
            way you actually live.
          </p>
          <Link
            to="/collections/all"
            className="btn-outline inline-block"
            style={{ textDecoration: "none" }}
          >
            Explore Collection
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Hero;
