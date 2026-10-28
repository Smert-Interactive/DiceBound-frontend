import { useState } from "react";
import { Link } from "react-router-dom";

import JsonSchemaEditor from "../components/JsonSchemaEditor";
import { ROUTES } from "../constants/routes";
import { CUSTOM_SCHEMA } from "../mocks/sheetSchemas";
import { UploadIcon } from "../shared/icons";
import { Banner, Button, Input, getButtonClassName } from "../shared/ui";

import "./ImportSystemPage.css";

// Используем уже существующую примерную схему, не создавая вторую версию её полей.
const INITIAL_SCHEMA_TEXT = JSON.stringify(CUSTOM_SCHEMA.schema, null, 2);

// Черновик импорта хранится на странице: названия и JSON не зависят от состояния редактора.
export default function ImportSystemPage() {
  const [systemName, setSystemName] = useState("Custom System");
  const [schemaName, setSchemaName] = useState(CUSTOM_SCHEMA.name);
  const [schemaText, setSchemaText] = useState(INITIAL_SCHEMA_TEXT);

  return (
    <div className="import-system">
      <div className="import-system__header">
        <div className="import-system__heading">
          <h1>Импорт игровой системы</h1>
          <p>
            Опишите лист в формате Sheet Schema — система появится в списке при
            создании персонажа
          </p>
        </div>
        <Link
          to={ROUTES.systems}
          className={getButtonClassName({
            className: "import-system__systems",
          })}
        >
          <span className="ui-button__rest">Мои игровые системы</span>
        </Link>
      </div>
      <div className="import-system__layout">
        <section className="import-system__form" aria-label="Параметры импорта">
          <div className="import-system__names">
            <Input
              label="Название системы"
              value={systemName}
              onChange={(event) => setSystemName(event.target.value)}
            />
            <Input
              label="Название листа"
              value={schemaName}
              onChange={(event) => setSchemaName(event.target.value)}
            />
          </div>
          <JsonSchemaEditor
            value={schemaText}
            onChange={setSchemaText}
            actions={
              <Button variant="ghost" size="sm" icon={<UploadIcon />} disabled>
                Выбрать .json файл
              </Button>
            }
          />
          {/* Файл, проверка и импорт подключаются следующими пунктами; успешного ответа пока нет. */}
          <div className="import-system__actions">
            <Button disabled>Проверить схему</Button>
            <Button variant="primary" disabled>
              Импортировать систему
            </Button>
          </div>
        </section>
        <aside
          className="import-system__result"
          aria-label="Результат проверки схемы"
        >
          <Banner variant="error" title="Схему нельзя проверить">
            Исправьте синтаксис JSON — предпросмотр появится после проверки
            схемы.
          </Banner>
        </aside>
      </div>
    </div>
  );
}
