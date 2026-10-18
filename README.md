# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

## UI-kit

Импортировать компоненты через `src/shared/ui/index.ts`: он подключает общий CSS.
Токены и глобальный фокус находятся в `src/index.css`.

```tsx
import { Button, Input, Modal } from "./shared/ui";

<Input label="Имя персонажа" value={name} onChange={event => setName(event.target.value)}
  error={errors.name} hint="Например, Aldric" changed={name !== savedName} />

<Button variant="primary" type="submit" loading={saving} loadingText="Сохранение…">
  Сохранить
</Button>

<Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Удалить персонажа?"
  actions={<>
    <Button onClick={() => setConfirmOpen(false)}>Отмена</Button>
    <Button variant="danger" onClick={remove}>Удалить персонажа</Button>
  </>}>
  Лист, история версий и выданные доступы будут удалены.
</Modal>
```

- `Button`: варианты `primary`, `default`, `ghost`, `danger`; размер `normal` / `sm`.
  У `iconOnly` обязателен `aria-label`. В загрузке кнопка недоступна, показывает
  `loadingText` и сохраняет ширину обычного состояния. У `ghost` загрузки нет.
  Форма сама блокирует остальные действия на время своего запроса.
- `ButtonLink`: настоящий `<a href>`; при `disabled` заменяется на неинтерактивный
  `<span aria-disabled>`, без `href` и обработчиков навигации.
- `Input`, `Select`, `Checkbox`: `label`, `hint`, `error`, `changed`, `disabled`,
  `readOnly`; нативные props передаются контролу. Read-only выводит значение плашкой.
  `Select` принимает `options: { value, label }[]`.
- `RadioCard`: нативная радиокнопка; объединять варианты одинаковым `name`,
  передавать `label`, `description`, `value`, `checked` / `onChange`.
- `Chip`: `neutral`, `crimson`, `violet`, `ok`. `SystemBadge`: `name`,
  `system` (`dnd`, `coc`, `imported`), `size` (`list`, `sheet`), `viewOnly`.
- `Banner`: `info`, `warning`, `success`, `error`. Ошибка получает `role="alert"`,
  уведомление после действия — `notification` и `role="status"`.
  `onClose` добавляет кнопку «Закрыть»; родитель убирает баннер из состояния.
  Автоматического скрытия нет; при навигации и новом уведомлении состоянием управляет страница.
  Иконка задаётся через `icon`: `eye`, `check`, `alert`, `copy`, `clock`.
  По умолчанию: глаз у info, галочка без окружности у success, предупреждение у warning/error.
- `Tabs`: управляемый компонент (`value`, `onChange`), уникальные `id` элементов,
  `label` для tablist, `content` для панелей. Стрелки, Home/End сразу выбирают
  вкладку; недоступные пропускаются. Для маршрутов использовать ссылки отдельно.
- `Modal`: управляемый `open`; `onClose` запрашивает закрытие, родитель меняет
  `open`. Нативный `dialog` блокирует фон; возврат фокуса происходит после
  анимации закрытия. Для начального фокуса доступен `initialFocusRef`.
  Держать компонент смонтированным при `open=false` для анимации выхода.
  В `actions` сначала передавать отмену, затем основное действие: на телефоне
  визуальный порядок меняется, основное действие оказывается сверху.
- `Skeleton`: статичный декоративный блок, `width` / `height`; объявление статуса
  загрузки задаёт использующая его страница. `EmptyState`: `title`, пояснение
  в `children`, необязательные `icon` и `action`.
