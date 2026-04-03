import { useSearchParams } from "react-router-dom";

const SortOptions = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const handleSortChange = (e) => {
    searchParams.set("sortBy", e.target.value);
    setSearchParams(searchParams);
  };

  return (
    <div className="flex items-center justify-end mb-6 gap-3">
      <span
        style={{
          fontSize: "0.65rem",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--muted)",
          fontFamily: "var(--ff-sans)",
          fontWeight: 500,
        }}
      >
        Sort by
      </span>
      <select
        onChange={handleSortChange}
        value={searchParams.get("sortBy") || ""}
        style={{
          border: "1px solid rgba(15,17,23,0.15)",
          borderRadius: "2px",
          padding: "0.45rem 2rem 0.45rem 0.75rem",
          fontSize: "0.8rem",
          fontFamily: "var(--ff-sans)",
          color: "var(--ink)",
          background: "var(--parchment)",
          outline: "none",
          cursor: "pointer",
          appearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238a8070' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.65rem center",
        }}
        onFocus={(e) => (e.target.style.borderColor = "var(--gold)")}
        onBlur={(e) => (e.target.style.borderColor = "rgba(15,17,23,0.15)")}
      >
        <option value="">Default</option>
        <option value="priceAsc">Price: Low to High</option>
        <option value="priceDesc">Price: High to Low</option>
        <option value="popularity">Popularity</option>
      </select>
    </div>
  );
};

export default SortOptions;
