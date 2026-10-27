import { Link, useLocation } from "react-router-dom";

import "./AppBreadcrumbs.css";

import { getBreadcrumbs } from "./breadcrumbs";

interface Props {
  characterName?: string;
  activeTab?: string;
}

function AppBreadcrumbs({ characterName, activeTab }: Props) {
  const location = useLocation();

  const crumbs = getBreadcrumbs(location.pathname, characterName, activeTab);

  return (
    <nav className="breadcrumbs" aria-label="Хлебные крошки">
      <ol className="breadcrumbs__list">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <li key={crumb.path} className="breadcrumbs__item">
              {crumb.to && !isLast ? (
                <Link
                  to={crumb.to}
                  state={crumb.state}
                  className="breadcrumbs__link"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined}>
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default AppBreadcrumbs;
