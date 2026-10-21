import { useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import SystemCard from "../components/SystemCard";
import { ROUTES } from "../constants/routes";
import { MOCK_SYSTEMS, getMockSchemas } from "../mocks/systems";
import { UploadIcon } from "../shared/icons";
import { Button, Input, RadioCard, getButtonClassName } from "../shared/ui";

import "./NewCharacterPage.css";

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
  // По умолчанию выбрана первая система, как на холсте.
  const [systemId, setSystemId] = useState(MOCK_SYSTEMS[0].id);
  // Лист хранится по id. Если он не из выбранной системы, берётся её первый лист:
  // так при смене системы выбор не нужно сбрасывать вручную.
  const [schemaId, setSchemaId] = useState("");
  const schemas = getMockSchemas(systemId);
  const schema = schemas.find((item) => item.id === schemaId) ?? schemas[0];
  const [name, setName] = useState("");
  const system =
    MOCK_SYSTEMS.find((item) => item.id === systemId) ?? MOCK_SYSTEMS[0];

  return (
    <div className="new-character">
      <h1>Новый персонаж</h1>
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
              {MOCK_SYSTEMS.map((system) => (
                <SystemCard
                  key={system.id}
                  system={system}
                  schemaCount={getMockSchemas(system.id).length}
                  name="game-system"
                  checked={system.id === systemId}
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
              value={name}
              onChange={(event) => setName(event.target.value)}
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
            <Link
              to={ROUTES.characters}
              className={getButtonClassName({ variant: "ghost" })}
            >
              <span className="ui-button__rest">Отмена</span>
            </Link>
            <Button variant="primary">Создать персонажа</Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
