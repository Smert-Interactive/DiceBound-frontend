const rules = new Intl.PluralRules("ru");

interface PluralForms {
  // 1, 21, 101: «версию»
  one: string;
  // 2–4, 22–24: «версии»
  few: string;
  // 0, 5–20, 25–30: «версий»
  many: string;
}

// Выбирает форму слова по числу по правилам русского языка.
export function pluralize(count: number, forms: PluralForms) {
  const category = rules.select(count);

  if (category === "one") return forms.one;
  if (category === "few") return forms.few;
  return forms.many;
}
