import { Link, useLocation } from "react-router-dom";

import { ROUTES } from "../../constants/routes";
import { Modal, getButtonClassName } from "../ui";

interface Props {
  // Показывать окно нужно, когда любой запрос вернул 401.
  open: boolean;
}

// Окно нельзя закрыть Esc или кликом по затемнению: без сессии работать с данными нельзя,
// остаётся единственный выход — войти снова.
function ignoreClose() {}

export default function SessionExpiredModal({ open }: Props) {
  const location = useLocation();

  return (
    <Modal
      open={open}
      onClose={ignoreClose}
      title="Сессия завершилась"
      actions={
        // from запоминает страницу, на которой оборвалась сессия: после входа человека вернёт на неё.
        <Link
          to={ROUTES.login}
          state={{ from: location }}
          className={getButtonClassName({ variant: "primary" })}
        >
          <span className="ui-button__rest">Войти</span>
        </Link>
      }
    >
      Войдите снова, чтобы продолжить. После входа откроется эта же страница.
    </Modal>
  );
}
