import { afterEach, expect, test, vi } from "vitest";
import { readJsonFile } from "../systems/readJsonFile";

afterEach(() => vi.restoreAllMocks());

test.each(["schema.json", "SCHEMA.JSON"])(
  "reads %s without requiring a particular MIME type",
  async (name) => {
    const text = '{\r\n  "label": "Досье"\r\n}\r\n';
    const file = new File([text], name, { type: "application/octet-stream" });
    await expect(readJsonFile(file)).resolves.toBe(text);
  },
);

test.each(["", '{ "unfinished":', "\uFEFF{}"])(
  "reads empty or unfinished content without schema validation: %s",
  async (text) => {
    const file = new File([text], "schema.json");
    // UTF-8 BOM относится к кодировке файла и удаляется браузером при чтении.
    await expect(readJsonFile(file)).resolves.toBe(
      text.replace(/^\uFEFF/u, ""),
    );
  },
);

test.each(["schema.txt", "schema.json.backup", "schema"])(
  "rejects %s before reading even with a JSON MIME type",
  async (name) => {
    const read = vi.spyOn(FileReader.prototype, "readAsText");
    await expect(
      readJsonFile(new File(["{}"], name, { type: "application/json" })),
    ).rejects.toThrow("INVALID_FILE_EXTENSION");
    expect(read).not.toHaveBeenCalled();
  },
);

test.each(["error", "abort"])(
  "reports a FileReader %s as a reading failure",
  async (eventType) => {
    vi.spyOn(FileReader.prototype, "readAsText").mockImplementation(function (
      this: FileReader,
    ) {
      this.dispatchEvent(new ProgressEvent(eventType));
    });
    await expect(readJsonFile(new File(["{}"], "schema.json"))).rejects.toThrow(
      "FILE_READ_ERROR",
    );
  },
);
