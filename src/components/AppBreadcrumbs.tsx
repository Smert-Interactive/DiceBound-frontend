import { useLocation } from "react-router-dom";

import { routeLabels } from "../constants/routes";

function AppBreadcrumbs() {
  const location = useLocation();

  const paths = location.pathname.split("/").filter(Boolean);

  return (
    <div className="breadcrumbs">
      {paths.map((path, index) => (
        <span key={path}>
          {index > 0 && " / "}

          {routeLabels[path] ?? path}
        </span>
      ))}
    </div>
  );
}

export default AppBreadcrumbs;
