import { Link } from "react-router-dom";

import { LockIcon } from "../icons";
import { ROUTES } from "../../constants/routes";
import { getButtonClassName } from "../ui";
import StateMessage from "./StateMessage";

// Один экран для 404 и 403: интерфейс не раскрывает, существует ли чужой персонаж (ui-ux).
export default function NotFoundOrForbidden() {
  return (
    <StateMessage
      headingLevel={1}
      icon={<LockIcon width={22} height={22} />}
      title="Персонаж не найден или доступ закрыт"
      action={
        <Link to={ROUTES.characters} className={getButtonClassName({})}>
          <span className="ui-button__rest">К списку персонажей</span>
        </Link>
      }
    >
      Владелец мог удалить персонажа или отозвать ваш доступ VIEW.
    </StateMessage>
  );
}
