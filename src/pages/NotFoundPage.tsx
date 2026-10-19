import NotFoundOrForbidden from "../shared/states/NotFoundOrForbidden";

import "./NotFoundPage.css";

// Неизвестный адрес. Живёт вне каркаса приложения, поэтому сама центрирует экран.
export default function NotFoundPage() {
  return (
    <main className="state-page">
      <NotFoundOrForbidden />
    </main>
  );
}
