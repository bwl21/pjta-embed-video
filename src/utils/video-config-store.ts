// src/utils/video-config-store.ts
import {
  getModule,
  getOrCreateModule,
  getCustomDataCategory,
  createCustomDataCategory,
  getCustomDataValues,
  createCustomDataValue,
  updateCustomDataValue,
} from "./kv-store";

export type VideoConfig = Record<
  string,
  { type: "youtube" | "vimeo"; id: string; title?: string }
>;

const CATEGORY_SHORTY = "videos";
const CONFIG_KEY = "config";
const CATEGORY_NAME = "Videos";
const CATEGORY_DESC = "Alias -> provider/id for embedded videos";

/**
 * Ensures module & category exists and returns ids.
 * - In production: module should exist already
 * - In dev: create module if missing
 */
async function ensureModuleAndCategory(extensionKey: string) {
  const module =
    import.meta.env.MODE === "development"
      ? await getOrCreateModule(extensionKey, "PJT Embed Video", "Embed videos via alias")
      : await getModule(extensionKey);

  if (!module?.id) throw new Error("Modul für den KV-Store konnte nicht geladen/erstellt werden");

  let category = await getCustomDataCategory(CATEGORY_SHORTY);
  if (!category) {
    await createCustomDataCategory(
      {
        customModuleId: module.id,
        name: CATEGORY_NAME,
        shorty: CATEGORY_SHORTY,
        description: CATEGORY_DESC,
      },
      module.id
    );
    category = await getCustomDataCategory(CATEGORY_SHORTY);
  }

  if (!category?.id) throw new Error("KV-Kategorie 'videos' konnte nicht geladen/erstellt werden");

  return { moduleId: module.id, categoryId: category.id };
}

export async function loadVideoConfig(extensionKey: string, fallback: VideoConfig): Promise<VideoConfig> {
  const { moduleId, categoryId } = await ensureModuleAndCategory(extensionKey);

  const values = await getCustomDataValues(categoryId, moduleId);
  const entry = values.find((v: any) => v.key === CONFIG_KEY);

  if (!entry) return fallback;

  // Boilerplate stores JSON like: { key: "config", value: <YOUR_OBJECT> }
  // Many implementations return entry.value already parsed.
  // If it's still a string, we parse it.
  const v = entry.value;

  if (!v) return fallback;

  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      // if parsed is {key,value}, return value
      if (parsed?.value) return parsed.value as VideoConfig;
      return parsed as VideoConfig;
    } catch {
      return fallback;
    }
  }

  // if it's {key,value}, use .value
  if (typeof v === "object" && "value" in (v as any)) {
    return (v as any).value as VideoConfig;
  }

  // else already the config object
  return v as VideoConfig;
}

export async function saveVideoConfig(extensionKey: string, config: VideoConfig): Promise<void> {
  const { moduleId, categoryId } = await ensureModuleAndCategory(extensionKey);

  const values = await getCustomDataValues(categoryId, moduleId);
  const existing = values.find((v: any) => v.key === CONFIG_KEY);

  // Store as JSON string with { key, value } (matches the doc pattern)
  const payload = {
    value: JSON.stringify({ key: CONFIG_KEY, value: config }),
  };

  if (existing?.id) {
    await updateCustomDataValue(categoryId, existing.id, payload, moduleId);
  } else {
    await createCustomDataValue(
      {
        dataCategoryId: categoryId,
        value: payload.value,
      },
      moduleId
    );
  }
}