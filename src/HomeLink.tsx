import { Link } from "react-router-dom";

export function HomeLink() {
  return (
    <Link className="back-button" to="/">
      ← Home
    </Link>
  );
}
