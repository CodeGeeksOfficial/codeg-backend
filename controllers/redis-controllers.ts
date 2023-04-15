import client from "../config/redis"

export const getKey = async (key: string) => {
  return await client.get(key);
}

export const setKey = async (key: string, value: any) => {
  return await client.set(key, value);
}

export const delKey = async (key: string) => {
  return await client.del(key);
}
