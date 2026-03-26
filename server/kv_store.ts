import { createClient } from "@supabase/supabase-js";

function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return createClient(url, key);
}

export const set = async (key: string, value: unknown): Promise<void> => {
  const supabase = client();
  const { error } = await supabase.from("kv_store_d5ac9b81").upsert({ key, value });
  if (error) throw new Error(error.message);
};

export const get = async (key: string): Promise<unknown> => {
  const supabase = client();
  const { data, error } = await supabase.from("kv_store_d5ac9b81").select("value").eq("key", key).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.value;
};

export const del = async (key: string): Promise<void> => {
  const supabase = client();
  const { error } = await supabase.from("kv_store_d5ac9b81").delete().eq("key", key);
  if (error) throw new Error(error.message);
};

export const mset = async (keys: string[], values: unknown[]): Promise<void> => {
  const supabase = client();
  const { error } = await supabase.from("kv_store_d5ac9b81").upsert(keys.map((k, i) => ({ key: k, value: values[i] })));
  if (error) throw new Error(error.message);
};

export const mget = async (keys: string[]): Promise<unknown[]> => {
  const supabase = client();
  const { data, error } = await supabase.from("kv_store_d5ac9b81").select("value").in("key", keys);
  if (error) throw new Error(error.message);
  return data?.map((d) => d.value) ?? [];
};

export const mdel = async (keys: string[]): Promise<void> => {
  const supabase = client();
  const { error } = await supabase.from("kv_store_d5ac9b81").delete().in("key", keys);
  if (error) throw new Error(error.message);
};

export const getByPrefix = async (prefix: string): Promise<unknown[]> => {
  const supabase = client();
  const { data, error } = await supabase.from("kv_store_d5ac9b81").select("key, value").like("key", `${prefix}%`);
  if (error) throw new Error(error.message);
  return data?.map((d) => d.value) ?? [];
};
