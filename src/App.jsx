import { useState, useEffect } from "react";
import StopWorkDERM from "./StopWorkDERM";
import Admin from "./Admin";

export default function App() {
  const [page, setPage] = useState(
    window.location.pathname.startsWith("/admin") ? "admin" : "main"
  );

  useEffect(() => {
    const handler = () =>
      setPage(window.location.pathname.startsWith("/admin") ? "admin" : "main");
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  return page === "admin" ? <Admin /> : <StopWorkDERM />;
}
