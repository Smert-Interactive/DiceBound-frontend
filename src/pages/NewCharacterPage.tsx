import { useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import SystemCard from "../components/SystemCard";
import { ROUTES } from "../constants/routes";
import { MOCK_SYSTEMS, getMockSchemas } from "../mocks/systems";
import { UploadIcon } from "../shared/icons";
import { getButtonClassName } from "../shared/ui";

import "./NewCharacterPage.css";

interface StepProps {
  number: number;
  title: string;
  children: ReactNode;
  // На desktop стоят справа в строке заголовка, на телефоне под содержимым.
  actions?: ReactNode;
}

// Карточка шага: кружок с номером, заголовок, содержимое и необязательные действия.
function StepCard({ number, title, children, actions }: StepProps) {
  return (
    <section className="ui-card new-character__step" aria-label={title}>
      <div className="new-character__step-head">
        <span className="new-character__step-number" aria-hidden="true">
          {number}
        </span>
        <h2>{title}</h2>
      </div>
      <div className="new-character__step-body">{children}</div>
      {actions && <div className="new-character__step-actions">{actions}</div>}
    </section>
  );
}

export default function NewCharacterPage() {
  // По умолчанию выбрана первая система, как на холсте.
  const [systemId, setSystemId] = useState(MOCK_SYSTEMS[0].id);

  return (
    <div className="new-character">
      <h1>Новый персонаж</h1>
      <div className="new-character__steps">
        <StepCard
          number={1}
          title="Игровая система"
          actions={
            <>
              <Link
                to={ROUTES.systems}
                className={getButtonClassName({ variant: "ghost", size: "sm" })}
              >
                <span className="ui-button__rest">Управлять системами</span>
              </Link>
              <Link
                to={ROUTES.importSystem}
                className={getButtonClassName({ variant: "ghost", size: "sm" })}
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
      </div>
    </div>
  );
}
