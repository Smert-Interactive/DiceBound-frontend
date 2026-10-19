import { AlertIcon } from "../icons";
import { Button } from "../ui";
import StateMessage from "./StateMessage";

interface Props {
  onRetry: () => void;
}

// Показывается на месте контента, если GET-запрос завершился сетевой ошибкой или 5xx.
export default function LoadErrorState({ onRetry }: Props) {
  return (
    <StateMessage
      card
      role="alert"
      icon={<AlertIcon width={22} height={22} />}
      title="Не удалось загрузить данные"
      action={<Button onClick={onRetry}>Повторить</Button>}
    >
      Проверьте соединение и попробуйте ещё раз.
    </StateMessage>
  );
}
