import type { ReaderPreferences } from "$lib/preferences";

declare global {
  namespace App {
    interface Locals {
      readerPreferences: ReaderPreferences;
    }
  }
}

export {};
