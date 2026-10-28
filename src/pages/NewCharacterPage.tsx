import { useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, generatePath, useNavigate, useLocation } from "react-router-dom";

import { useAuth } from "../auth/authContext";
import SystemCard from "../components/SystemCard";
import { ROUTES } from "../constants/routes";
import { createMockCharacter } from "../mocks/characters";
import { getMockSystems, getMockSchemas } from "../mocks/systems";
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

export default function NewCharacterPage() {
  const { user } = useAuth();
  // Удалённые и чужие системы не участвуют в создании новых персонажей.
  const systems = getMockSystems(user?.email ?? "");
  const location = useLocation();
  const imported = getImportedSystem(location.state);
  // Предвыбор применяем только к своей доступной системе с действительно существующим листом.
  const importedSystem = systems.find(
    (item) =>
      item.id === imported?.systemId &&
      getMockSchemas(item.id).some((schema) => schema.id === imported.schemaId),
  );
  const [showImportNotice, setShowImportNotice] = useState(
    Boolean(importedSystem),
  );
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [systemId, setSystemId] = useState(importedSystem?.id ?? systems[0].id);
  const system = systems.find((item) => item.id === systemId) ?? systems[0];
  // Лист хранится по id. Если он не из выбранной системы, берётся её первый лист:
  // так при смене системы выбор не нужно сбрасывать вручную.
  const [schemaId, setSchemaId] = useState(
    importedSystem ? imported!.schemaId : "",
  );
  const schemas = getMockSchemas(system.id);
  const schema = schemas.find((item) => item.id === schemaId) ?? schemas[0];
  const [name, setName] = useState("");
  const navigate = useNavigate();
  const hintId = useId();
  const [pending, setPending] = useState(false);
  const isNameEmpty = name.trim().length === 0;

  async function handleCreate() {
    // Кнопка недоступна через aria-disabled, а не disabled, поэтому клик по ней всё равно
    // приходит: отсекаем его здесь, как и повторное нажатие во время запроса.
    if (isNameEmpty || pending || !user) return;
    setPending(true);
    try {
      const character = await createMockCharacter(
        {
          name,
          game_system_id: system.id,
          sheet_schema_id: schema.id,
        },
        user.email,
      );
      navigate(generatePath(ROUTES.character, { id: character.id }));
    } finally {
      setPending(false);
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
      {/* Шаги слева, «Сводка» справа; на планшете и телефоне «Сводка» уходит вниз. */}
      <div className="new-character__layout">
        <div className="new-character__steps">
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
            <div
              className="new-character__systems"
              role="radiogroup"
              aria-label="Игровая система"
            >
              {systems.map((item) => (
                <SystemCard
                  key={item.id}
                  system={item}
                  schemaCount={getMockSchemas(item.id).length}
                  name="game-system"
                  checked={item.id === system.id}
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
                  description={item.sections.join(" · ")}
                  checked={item.id === schema.id}
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
              <dd>{system.name}</dd>
            </div>
            <div>
              <dt>Лист</dt>
              <dd>{schema.name}</dd>
            </div>
            <div>
              <dt>Имя</dt>
              <dd>{name.trim() || "—"}</dd>
            </div>
          </dl>
          <p className="new-character__summary-note">
            Поля листа заполнятся значениями по умолчанию из схемы. Состояние
            сразу сохранится как версия&nbsp;1.
          </p>
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
              aria-disabled={isNameEmpty || undefined}
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
    </div>
  );
}
