// Проверяем расширение, а не MIME: тип JSON-файла зависит от ОС и браузера.
// Чтение не разбирает и не форматирует содержимое — синтаксис показывает редактор.
export function readJsonFile(file: File): Promise<string> {
  if (!/\.json$/iu.test(file.name)) {
    return Promise.reject(new Error("INVALID_FILE_EXTENSION"));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("FILE_READ_ERROR"));
    };
    reader.onerror = () => reject(new Error("FILE_READ_ERROR"));
    reader.onabort = () => reject(new Error("FILE_READ_ERROR"));
    reader.readAsText(file, "UTF-8");
  });
}
