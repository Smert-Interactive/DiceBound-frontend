import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";

import JsonSchemaEditor from "../components/JsonSchemaEditor";
import SchemaValidationFeedback from "../components/SchemaValidationFeedback";
import { ROUTES } from "../constants/routes";
import { CUSTOM_SCHEMA } from "../mocks/sheetSchemas";
import { validateMockSchema } from "../mocks/schemaValidation";
import { analyzeJson } from "../systems/jsonSyntax";
import type { SchemaValidationResult } from "../systems/schemaValidationTypes";
import { readJsonFile } from "../systems/readJsonFile";
import { CheckIcon, UploadIcon } from "../shared/icons";
import { Banner, Button, Input, getButtonClassName } from "../shared/ui";

import "./ImportSystemPage.css";

// Используем уже существующую примерную схему, не создавая вторую версию её полей.
const INITIAL_SCHEMA_TEXT = JSON.stringify(CUSTOM_SCHEMA.schema, null, 2);

// Черновик импорта хранится на странице: названия и JSON не зависят от состояния редактора.
export default function ImportSystemPage() {
  const [systemName, setSystemName] = useState("Custom System");
  const [schemaName, setSchemaName] = useState(CUSTOM_SCHEMA.name);
  const [schemaText, setSchemaText] = useState(INITIAL_SCHEMA_TEXT);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileReadVersion = useRef(0);
  const validationVersion = useRef(0);
  const checkingRef = useRef(false);
  const [readingFile, setReadingFile] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<SchemaValidationResult | null>(null);
  const [requestFailed, setRequestFailed] = useState(false);
  const [nameTouched, setNameTouched] = useState({
    system: false,
    schema: false,
  });
  const analysis = useMemo(() => analyzeJson(schemaText), [schemaText]);

  useEffect(
    () => () => {
      // Завершившееся чтение не должно обновлять уже закрытую страницу.
      fileReadVersion.current += 1;
      validationVersion.current += 1;
    },
    [],
  );

  // Любая замена JSON отменяет применение старого ответа и снимает прежние ошибки схемы.
  function resetValidation() {
    validationVersion.current += 1;
    checkingRef.current = false;
    setChecking(false);
    setResult(null);
    setRequestFailed(false);
  }

  // Отправляем исходный текст один раз; исправлять его во время запроса разрешено.
  async function handleValidate() {
    setNameTouched({ system: true, schema: true });
    if (
      !systemName.trim() ||
      !schemaName.trim() ||
      !analysis.syntax.valid ||
      readingFile ||
      checkingRef.current
    )
      return;
    const version = ++validationVersion.current;
    checkingRef.current = true;
    setChecking(true);
    setResult(null);
    setRequestFailed(false);
    try {
      const response = await validateMockSchema({ schema_text: schemaText });
      if (version === validationVersion.current) setResult(response);
    } catch {
      if (version === validationVersion.current) setRequestFailed(true);
    } finally {
      if (version === validationVersion.current) {
        checkingRef.current = false;
        setChecking(false);
      }
    }
  }

  // Настоящий file-input скрыт, а выбор запускается доступной кнопкой из UI-kit.
  function handleChooseFile() {
    fileInputRef.current?.click();
  }

  // Текст меняется только после успешного чтения. Повторный выбор того же файла разрешён.
  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    const version = ++fileReadVersion.current;
    setReadingFile(true);
    setFileError(null);
    try {
      const text = await readJsonFile(file);
      // Более новый файл или ручная правка важнее запоздавшего результата чтения.
      if (version !== fileReadVersion.current) return;
      resetValidation();
      setSchemaText(text);
    } catch {
      if (version === fileReadVersion.current) setFileError(file.name);
    } finally {
      if (version === fileReadVersion.current) setReadingFile(false);
    }
  }

  // Ручной ввод отменяет применение ещё читающегося файла, сохраняя новый черновик.
  function handleSchemaChange(text: string) {
    fileReadVersion.current += 1;
    setReadingFile(false);
    resetValidation();
    setSchemaText(text);
  }

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
              required
              error={
                nameTouched.system && !systemName.trim()
                  ? "Введите название системы"
                  : undefined
              }
              onBlur={() =>
                setNameTouched((current) => ({ ...current, system: true }))
              }
              onChange={(event) => setSystemName(event.target.value)}
            />
            <Input
              label="Название листа"
              value={schemaName}
              required
              error={
                nameTouched.schema && !schemaName.trim()
                  ? "Введите название листа"
                  : undefined
              }
              onBlur={() =>
                setNameTouched((current) => ({ ...current, schema: true }))
              }
              onChange={(event) => setSchemaName(event.target.value)}
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            aria-label="Загрузить JSON-схему"
            onChange={handleFileChange}
            hidden
          />
          {fileError && (
            <Banner
              variant="error"
              title={`Не удалось прочитать файл «${fileError}»`}
            >
              Выберите файл с расширением .json. Текст в редакторе не изменён.
            </Banner>
          )}
          <JsonSchemaEditor
            value={schemaText}
            analysis={analysis}
            errors={result?.errors}
            onChange={handleSchemaChange}
            actions={
              <Button
                variant="ghost"
                size="sm"
                icon={<UploadIcon />}
                onClick={handleChooseFile}
              >
                Выбрать .json файл
              </Button>
            }
          />
          {/* Импорт подключается отдельно; положительная проверка сама ничего не сохраняет. */}
          <div className="import-system__actions">
            <Button
              icon={<CheckIcon />}
              onClick={handleValidate}
              disabled={!analysis.syntax.valid || readingFile}
              loading={checking}
              loadingText="Проверка…"
            >
              Проверить схему
            </Button>
            <Button variant="primary" icon={<UploadIcon />} disabled>
              Импортировать систему
            </Button>
          </div>
        </section>
        <aside
          className="import-system__result"
          aria-label="Результат проверки схемы"
          aria-busy={checking || undefined}
        >
          <SchemaValidationFeedback
            result={result}
            pending={checking}
            requestFailed={requestFailed}
          />
        </aside>
      </div>
    </div>
  );
}
