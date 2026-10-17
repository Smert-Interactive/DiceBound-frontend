import { Link } from "react-router-dom";

import { ROUTES } from "../constants/routes";

export default function ImportSystemPage() {
  return (
    <>
      <h1>Import system page</h1>
      <Link to={ROUTES.systems}>Мои игровые системы</Link>
    </>
  );
}