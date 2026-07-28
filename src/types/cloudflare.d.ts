// أنواع ارتباطات Cloudflare المستعملة في هذا المستودع.
//
// تُستورد بأسمائها لا بإضافة `@cloudflare/workers-types` إلى `lib` كلها:
// الحزمة تعيد تعريف `Response` و`fetch` وغيرهما، وإدخالها جملةً يصطدم بأنواع
// DOM التي تعتمدها بقية الملفات.
import type {
  D1Database as CloudflareD1Database,
  KVNamespace as CloudflareKVNamespace,
} from "@cloudflare/workers-types";

declare global {
  type D1Database = CloudflareD1Database;
  type KVNamespace = CloudflareKVNamespace;
}

export {};
