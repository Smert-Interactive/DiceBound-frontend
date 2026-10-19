import { CheckIcon, LoaderIcon } from "../icons";
import { Button } from "../ui";
import { getSaveBarModel } from "./saveBarModel";
import type { SaveBarStatus } from "./saveBarModel";
import { useMediaQuery } from "./useMediaQuery";

import "./SaveBar.css";

interface Props {
  status: SaveBarStatus;
  changedCount: number;
  version: number;
  isCopy?: boolean;
  onSave: () => void;
  onReset: () => void;
  onRetry: () => void;
}

// Закреплённая панель сохранения листа. Что и когда показывать, решает getSaveBarModel.
export default function SaveBar({
  status,
  changedCount,
  version,
  isCopy,
  onSave,
  onReset,
  onRetry,
}: Props) {
  const compact = useMediaQuery("(max-width: 639px)");
  const model = getSaveBarModel({
    status,
    changedCount,
    version,
    isCopy,
    compact,
  });
  const isError = status === "error";

  return (
    <div className={isError ? "save-bar save-bar--error" : "save-bar"}>
      <div
        className="save-bar__status"
        role={isError ? "alert" : "status"}
        // Счётчик меняется при каждом вводе, поэтому его читалка не озвучивает.
        aria-live={
          status === "dirty" || status === "invalid" ? "off" : undefined
        }
      >
        {model.dot === "loader" ? (
          <span className="save-bar__loader">
            <LoaderIcon />
          </span>
        ) : (
          <span
            className={`save-bar__dot save-bar__dot--${model.dot}`}
            aria-hidden="true"
          />
        )}

        <span className="save-bar__text">
          <span
            className={
              status === "clean" || status === "saved"
                ? "save-bar__title save-bar__title--quiet"
                : "save-bar__title"
            }
          >
            {model.title}
          </span>
          {model.hint && <span className="save-bar__hint">{model.hint}</span>}
        </span>
      </div>

      {model.problem && (
        <span className="save-bar__problem">{model.problem}</span>
      )}

      <div className="save-bar__actions">
        {model.showRetry ? (
          <Button variant="primary" onClick={onRetry}>
            Повторить
          </Button>
        ) : (
          <>
            <Button
              variant="ghost"
              disabled={model.resetDisabled}
              onClick={onReset}
            >
              {model.resetLabel}
            </Button>
            <Button
              variant="primary"
              className="save-bar__save"
              icon={<CheckIcon />}
              loading={model.saveLoading}
              loadingText="Сохранение…"
              disabled={model.saveDisabled}
              onClick={onSave}
            >
              {model.saveLabel}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
