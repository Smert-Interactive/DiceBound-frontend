import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

import { useAuth } from "../auth/authContext";
import SystemCard from "../components/SystemCard";
import { ROUTES } from "../constants/routes";
import { createCharacter } from "../api/characters";
import { ApiError } from "../api/client";
import { useApiQuery } from "../api/useApiQuery";
import { getCreationCatalog, getSheetSchema } from "../api/systems";
import { LoadingSkeleton, LoadErrorState } from "../shared/states";
import { CONTRACT_LIMITS } from "../api/contractLimits";
import { getImportedSystem } from "../systems/importRouteState";
import { UploadIcon } from "../shared/icons";
import {
  Banner,
  Button,
  ButtonLink,
  Input,
  RadioCard,
  getButtonClassName,
} from "../shared/ui";

import "./NewCharacterPage.css";

const NAME_HINT = "Введите имя, чтобы создать персонажа";

interface StepProps {
  number: number;
  title: string;
  children: ReactNode;
  // Короткое пояснение рядом с заголовком; на телефоне переносится под него.
  hint?: string;
  // На desktop стоят справа в строке заголовка, на телефоне под содержимым.
  actions?: ReactNode;
}

// Карточка шага: кружок с номером, заголовок, содержимое и необязательные действия.
function StepCard({ number, title, hint, children, actions }: StepProps) {
  return (
    <section className="ui-card new-character__step" aria-label={title}>
      <div className="new-character__step-head">
        <span className="new-character__step-number" aria-hidden="true">
          {number}
        </span>
        <h2>{title}</h2>
        {hint && <span className="new-character__step-hint">{hint}</span>}
      </div>
      <div className="new-character__step-body">{children}</div>
      {actions && <div className="new-character__step-actions">{actions}</div>}
    </section>
  );
}

// Создаёт персонажа из доступных DTO; пустой список систем или схем не приводит к ошибке страницы.
export default function NewCharacterPage() {
  const { user, handleUnauthorized } = useAuth();
  const catalog = useApiQuery(getCreationCatalog, user?.id ?? "");
  const systems = catalog.data?.systems ?? [];
  const location = useLocation();
  const imported = getImportedSystem(location.state);
  const [showImportNotice, setShowImportNotice] = useState(true);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [systemId, setSystemId] = useState(imported?.systemId ?? "");
  const system = systems.find((item) => item.id === systemId) ?? systems[0];
  const [schemaId, setSchemaId] = useState(imported?.schemaId ?? "");
  const schemas = (system && catalog.data?.schemasBySystem[system.id]) ?? [];
  const schema = schemas.find((item) => item.id === schemaId) ?? schemas[0];
  const importedSystem = systems.find(
    (item) =>
      item.id === imported?.systemId &&
      catalog.data?.schemasBySystem[item.id]?.some(
        (sheet) => sheet.id === imported.schemaId,
      ),
  );
  const selectedSchemaId = schema?.id;
  const loadSchema = useCallback(
    (signal: AbortSignal) =>
      selectedSchemaId
        ? getSheetSchema(selectedSchemaId, signal)
        : Promise.resolve(null),
    [selectedSchemaId],
  );
  const fullSchema = useApiQuery(
    loadSchema,
    `${user?.id}:${selectedSchemaId ?? ""}`,
  );
  const [name, setName] = useState("");
  const navigate = useNavigate();
  const hintId = useId();
  const [pending, setPending] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const createPending = useRef(false);
  const createRequest = useRef<AbortController | null>(null);
  const createErrorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (createError) createErrorRef.current?.focus();
  }, [createError]);
  const isNameEmpty = name.trim().length === 0;
  const nameError =
    name.trim().length > CONTRACT_LIMITS.name
      ? "Не длиннее 255 символов"
      : undefined;
  const unavailable =
    !system ||
    !schema ||
    catalog.loading ||
    Boolean(catalog.error) ||
    fullSchema.loading ||
    Boolean(fullSchema.error);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      createRequest.current?.abort();
    };
  }, []);

  // Переходит к созданному Character только пока пользователь остаётся на странице.
  async function handleCreate() {
    // Кнопка недоступна через aria-disabled, а не disabled, поэтому клик по ней всё равно
    // приходит: отсекаем его здесь, как и повторное нажатие во время запроса.
    if (
      isNameEmpty ||
      nameError ||
      unavailable ||
      createPending.current ||
      !user
    )
      return;
    createPending.current = true;
    const controller = new AbortController();
    createRequest.current = controller;
    setPending(true);
    setCreateError(null);
    try {
      const character = await createCharacter(
        {
          name,
          game_system_id: system.id,
          sheet_schema_id: schema.id,
        },
        controller.signal,
      );
      if (!mounted.current) return;
      navigate(ROUTES.characters, {
        state: {
          createdCharacterId: character.id,
          createdCharacterName: character.name,
        },
      });
    } catch (error) {
      if (!mounted.current || controller.signal.aborted) return;
      if (handleUnauthorized(error)) return;
      setCreateError(
        error instanceof ApiError && error.status === 404
          ? "Выбранная система или лист больше недоступны. Обновите список и выберите заново."
          : error instanceof ApiError && error.status === 403
            ? "Недостаточно прав для создания персонажа."
            : error instanceof ApiError &&
                (error.status === 400 || error.status === 422)
              ? "Проверьте имя персонажа и выбранный лист."
              : "Не удалось выполнить действие. Попробуйте ещё раз.",
      );
    } finally {
      createPending.current = false;
      if (mounted.current) setPending(false);
    }
  }

  return (
    <div className="new-character">
      {showImportNotice && importedSystem && (
        <Banner
          variant="success"
          notification
          title={`Система «${importedSystem.name}» импортирована`}
          onClose={() => {
            setShowImportNotice(false);
            headingRef.current?.focus();
          }}
        />
      )}
      <h1 ref={headingRef} tabIndex={-1}>
        Новый персонаж
      </h1>
      {catalog.loading ? (
        <LoadingSkeleton variant="list" label="Загрузка игровых систем" />
      ) : catalog.error ? (
        <LoadErrorState onRetry={catalog.retry} />
      ) : (
        <div className="new-character__layout">
          <div
            className="new-character__steps"
            inert={pending}
            aria-busy={pending || undefined}
          >
            <StepCard
              number={1}
              title="Игровая система"
              actions={
                <>
                  <Link
                    to={ROUTES.systems}
                    className={getButtonClassName({
                      variant: "ghost",
                      size: "sm",
                    })}
                  >
                    <span className="ui-button__rest">Управлять системами</span>
                  </Link>
                  <Link
                    to={ROUTES.importSystem}
                    className={getButtonClassName({
                      variant: "ghost",
                      size: "sm",
                    })}
                  >
                    <span className="ui-button__rest">
                      <UploadIcon />
                      Импортировать из JSON
                    </span>
                  </Link>
                </>
              }
            >
              {systems.length === 0 && (
                <p>Доступных систем пока нет. Импортируйте систему из JSON.</p>
              )}
              <div
                className="new-character__systems"
                role="radiogroup"
                aria-label="Игровая система"
              >
                {systems.map((item) => (
                  <SystemCard
                    key={item.id}
                    system={item}
                    schemaCount={
                      catalog.data?.schemasBySystem[item.id]?.length ?? 0
                    }
                    name="game-system"
                    checked={item.id === system?.id}
                    onSelect={setSystemId}
                  />
                ))}
              </div>
            </StepCard>

            <StepCard
              number={2}
              title="Лист персонажа"
              hint="Sheet Schema выбранной системы"
            >
              {schemas.length === 0 && (
                <p>У выбранной системы нет доступных листов.</p>
              )}
              {schema && fullSchema.loading && (
                <LoadingSkeleton variant="list" label="Загрузка схемы листа" />
              )}
              {schema && Boolean(fullSchema.error) && (
                <LoadErrorState onRetry={fullSchema.retry} />
              )}
              <div
                className="new-character__schemas"
                role="radiogroup"
                aria-label="Лист персонажа"
              >
                {schemas.map((item) => (
                  <RadioCard
                    key={item.id}
                    name="sheet-schema"
                    value={item.id}
                    label={item.name}
                    description={
                      fullSchema.data?.id === item.id
                        ? fullSchema.data.schema.sections
                            .map((section) => section.label)
                            .join(" · ")
                        : undefined
                    }
                    checked={item.id === schema?.id}
                    onChange={() => setSchemaId(item.id)}
                  />
                ))}
              </div>
            </StepCard>

            <StepCard number={3} title="Имя">
              <Input
                label="Имя персонажа"
                name="character-name"
                placeholder="Например, Aldric"
                autoComplete="off"
                disabled={pending}
                value={name}
                error={nameError}
                maxLength={CONTRACT_LIMITS.name}
                onChange={(event) => setName(event.target.value)}
                // На телефоне эту подсказку CSS скрывает: там она стоит над кнопкой в нижней панели.
                hint={isNameEmpty ? NAME_HINT : undefined}
              />
            </StepCard>
          </div>

          <aside className="ui-card new-character__summary" aria-label="Сводка">
            <h2 className="new-character__summary-title">Сводка</h2>
            <dl className="new-character__summary-list">
              <div>
                <dt>Система</dt>
                <dd>{system?.name ?? "—"}</dd>
              </div>
              <div>
                <dt>Лист</dt>
                <dd>{schema?.name ?? "—"}</dd>
              </div>
              <div>
                <dt>Имя</dt>
                <dd>{name.trim() || "—"}</dd>
              </div>
            </dl>
            <p className="new-character__summary-note">
              Будет создан пустой лист с начальным состоянием полей и
              версией&nbsp;1.
            </p>
            {createError && (
              <div
                className="new-character__failure"
                ref={createErrorRef}
                tabIndex={-1}
              >
                <Banner variant="error" title={createError} />
                <Button onClick={catalog.retry} disabled={pending}>
                  Обновить список
                </Button>
              </div>
            )}
            <div className="new-character__actions">
              {/* Пока создаётся персонаж, остальные кнопки недоступны (ui-ux). */}
              {pending ? (
                <ButtonLink variant="ghost" disabled>
                  Отмена
                </ButtonLink>
              ) : (
                <Link
                  to={ROUTES.characters}
                  className={getButtonClassName({ variant: "ghost" })}
                >
                  <span className="ui-button__rest">Отмена</span>
                </Link>
              )}
              <Button
                variant="primary"
                loading={pending}
                loadingText="Создание…"
                aria-disabled={
                  isNameEmpty || Boolean(nameError) || unavailable || undefined
                }
                aria-describedby={isNameEmpty ? hintId : undefined}
                onClick={handleCreate}
              >
                Создать персонажа
              </Button>
              {/* Подсказка на телефоне: под полем её нет, а над кнопкой в нижней панели есть. */}
              {isNameEmpty && (
                <p id={hintId} className="new-character__bar-hint">
                  {NAME_HINT}
                </p>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
