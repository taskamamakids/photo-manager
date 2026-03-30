import localforage from 'localforage';
import { Child } from '../types';

const STORE_KEY = 'taska_mama_children_v1';

export async function saveChildren(children: Child[]) {
  try {
    const storable = children.map(c => ({
      id: c.id,
      name: c.name,
      imageBlob: c.imageBlob,
      descriptor: c.descriptor ? Array.from(c.descriptor) : null
    }));
    await localforage.setItem(STORE_KEY, storable);
  } catch (err) {
    console.error("Failed to save children to local storage:", err);
  }
}

export async function loadChildren(): Promise<Child[]> {
  try {
    const storable: any[] | null = await localforage.getItem(STORE_KEY);
    if (!storable) return [];
    
    return storable.map(c => ({
      id: c.id,
      name: c.name,
      imageBlob: c.imageBlob,
      masterPhotoUrl: URL.createObjectURL(c.imageBlob),
      descriptor: c.descriptor ? new Float32Array(c.descriptor) : null
    }));
  } catch (err) {
    console.error("Failed to load children from local storage:", err);
    return [];
  }
}

export async function clearChildren() {
  try {
    await localforage.removeItem(STORE_KEY);
  } catch (err) {
    console.error("Failed to clear children from local storage:", err);
  }
}
