import { useState } from "react";
import { HiMagnifyingGlass, HiMiniXMark } from "react-icons/hi2";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  fetchProductByFilters,
  setFilters,
} from "../../redux/slices/productsSlice";

const SearchBar = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSearchToggle = () => setIsOpen(!isOpen);

  const handleSearch = (e) => {
    e.preventDefault();
    dispatch(setFilters({ search: searchTerm }));
    dispatch(fetchProductByFilters({ search: searchTerm }));
    navigate(`/collections/all?search=${searchTerm}`);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div
      className={`flex items-center justify-center transition-all duration-300 ${
        isOpen ? "absolute top-0 left-0 w-full z-50 h-[72px]" : "w-auto"
      }`}
      style={
        isOpen
          ? {
              backgroundColor: "var(--ink)",
              borderBottom: "1px solid rgba(201,168,76,0.2)",
            }
          : {}
      }
    >
      {isOpen ? (
        <form
          onSubmit={handleSearch}
          className="relative flex items-center justify-center w-full px-6"
        >
          <div className="relative w-full max-w-lg">
            <input
              type="text"
              placeholder="Search products…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              className="search-input"
              style={{
                backgroundColor: "rgba(245,240,232,0.07)",
                border: "1px solid rgba(201,168,76,0.3)",
                borderRadius: "2px",
                color: "var(--parchment)",
                caretColor: "var(--gold)",
                padding: "0.5rem 2.5rem 0.5rem 1rem",
                fontSize: "0.875rem",
                fontFamily: "var(--ff-sans)",
                width: "100%",
                outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--gold)")}
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(201,168,76,0.3)")
              }
            />
            <button
              type="submit"
              style={{
                position: "absolute",
                right: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--gold)",
              }}
            >
              <HiMagnifyingGlass className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={handleSearchToggle}
            style={{
              position: "absolute",
              right: "1.5rem",
              color: "var(--muted)",
            }}
          >
            <HiMiniXMark className="h-5 w-5" />
          </button>
        </form>
      ) : (
        <button onClick={handleSearchToggle} style={{ color: "inherit" }}>
          <HiMagnifyingGlass className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
