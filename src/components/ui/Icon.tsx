"use client";
import type { ReactNode } from "react";
import {
  // §١ عالية الثقة — معناها مسجَّل نصًّا في naf-icons.md
  Search,
  Pencil,
  Trash2,
  Save,
  Copy,
  Download,
  Printer,
  X,
  EllipsisVertical,
  ExternalLink,
  RefreshCw,
  Paperclip,
  Calendar,
  Clock,
  Settings,
  Bell,
  ChevronDown,
  CircleCheck,
  CircleX,
  UserCog,
  ArrowRight,
  ArrowLeft,
  LogOut,
  // §٢ متوسطة الثقة — المعنى واضح والمقابل اجتهاد بين خيارين
  Mail,
  Lock,
  Eye,
  EyeOff,
  Star,
  GripVertical,
  ChartColumn,
  Folder,
  Link as LinkIcon,
  Film,
  Image as ImageIcon,
  PenTool,
  BadgeCheck,
  MapPin,
  // §٣ منخفضة الثقة — لا مقابل في naf-icons.md، مطبَّقة مؤقتًا وتحتاج تسجيلًا
  Type,
  Pilcrow,
  Phone,
  Hash,
  CircleDot,
  SquareCheck,
  Ruler,
  SlidersHorizontal,
  Grid3x3,
  ListOrdered,
  Heading,
  Rows3,
  MapPinHouse,
  Target,
  TrendingUp,
  Layers,
  Palette,
  Rocket,
  Undo2,
  Redo2,
  ChevronUp,
  Check,
  TriangleAlert,
  Sun,
  Moon,
  GitBranch,
  Square,
  type LucideIcon,
} from "lucide-react";

/**
 * أيقونات الواجهة — من Lucide حصرًا (القاعدة ٣).
 *
 * حلّ هذا الملف مجموعةَ ٦١ أيقونة SVG محلية كانت تُعرض عبر
 * dangerouslySetInnerHTML. الأسماء المحلية باقية كمفاتيح حتى لا تتغيّر
 * مواضع النداء الأربعة عشر، والقيم صارت مكوّنات Lucide.
 *
 * درجة الثقة في كل مطابقة مُوثَّقة في audit/icons-mapping.md. مجموعة §٣
 * مطبَّقة مؤقتًا: معانيها (أنواع حقول النماذج) غائبة عن naf-icons.md،
 * وتحتاج تسجيلًا في السجلّ قبل اعتمادها في منصة أخرى.
 */
const ICONS: Record<string, LucideIcon> = {
  // ===== إجراءات =====
  search: Search,
  edit: Pencil,
  trash: Trash2,
  save: Save,
  copy: Copy,
  download: Download,
  printer: Printer,
  x: X,
  more: EllipsisVertical,
  "external-link": ExternalLink,
  refresh: RefreshCw,
  undo: Undo2,
  redo: Redo2,
  check: Check,

  // ===== تنقّل =====
  "arrow-right": ArrowRight, // رجوع
  "arrow-left": ArrowLeft, // التالي
  "chevron-down": ChevronDown,
  "chevron-up": ChevronUp,
  logout: LogOut,

  // ===== حالات =====
  "check-circle": CircleCheck,
  "x-circle": CircleX,
  clock: Clock,
  lock: Lock,
  alert: TriangleAlert, // «تحذير» مسجَّلة في naf-icons.md

  // ===== كيانات وأدوات =====
  gear: Settings,
  bell: Bell,
  users: UserCog,
  mail: Mail,
  eye: Eye,
  "eye-off": EyeOff,
  star: Star,
  grip: GripVertical,
  chart: ChartColumn,
  folder: Folder,
  link: LinkIcon,
  film: Film,
  image: ImageIcon,
  pen: PenTool,
  "badge-check": BadgeCheck,
  "map-pin": MapPin,
  paperclip: Paperclip,
  calendar: Calendar,
  target: Target,
  "trend-up": TrendingUp,
  layers: Layers,
  palette: Palette,
  rocket: Rocket,
  branch: GitBranch,
  sun: Sun,
  moon: Moon,

  // ===== أنواع حقول النماذج (§٣ — تحتاج تسجيلًا) =====
  type: Type,
  paragraph: Pilcrow,
  phone: Phone,
  hash: Hash,
  radio: CircleDot,
  checkbox: SquareCheck,
  scale: Ruler, // ليست Scale: المسجَّلة تعني «جلسة قضائية» — تعارض معنى
  slider: SlidersHorizontal,
  grid: Grid3x3,
  list: ListOrdered,
  heading: Heading,
  rows: Rows3,
  home: MapPinHouse, // ليست House: المسجَّلة تعني «الرئيسية» — معنى مختلف
};

/**
 * القلب وفق «قواعد القلب» في naf-icons.md. المجموعتان تختلفان في اتجاه
 * القلب لأن الخريطة تسجّل أسماءها من مرجعين مختلفين:
 *
 * - `MIRROR_IN_RTL`: أسماء Lucide بصورتها الأصلية (اتجاهها LTR)، فتُقلب في
 *   RTL. مثال: LogOut سهمها يخرج يمينًا، والخروج في العربية يتجه يسارًا.
 *
 * - `MIRROR_IN_LTR`: الخريطة تسجّل «رجوع» بـ ArrowRight و«التالي» بـ
 *   ArrowLeft — وهما بهذا الاتجاه صحيحتان في RTL أصلًا (الرجوع يمينًا
 *   والتقدّم يسارًا)، أي أن الاسم المسجَّل هو الصورة المقلوبة سلفًا. فتحتاج
 *   القلب في LTR لا في RTL.
 *
 * المنصة كلها RTL اليوم، لكن ضبط الاتجاهين يمنع خطأً صامتًا لو عُرضت
 * صفحة بـ dir="ltr" لاحقًا.
 *
 * لا تُقلب: الشيفرون الرأسي والساعة وعلامة الصح والبحث والمستخدم والخرائط
 * والصور والشعار — مستثناة صراحةً في الخريطة.
 *
 * `external-link` غير مذكورة في أي من قائمتَي القلب — تُركت بلا قلب
 * بانتظار قرار يُسجَّل في السجلّ.
 */
const MIRROR_IN_RTL = new Set(["logout", "undo", "redo"]);
const MIRROR_IN_LTR = new Set(["arrow-right", "arrow-left"]);

export function Icon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  const Cmp = ICONS[name] ?? Square;
  const mirror = MIRROR_IN_RTL.has(name)
    ? " rtl:-scale-x-100"
    : MIRROR_IN_LTR.has(name)
    ? " ltr:-scale-x-100"
    : "";
  return <Cmp className={`${className}${mirror}`} aria-hidden />;
}

// خريطة نوع الحقل → اسم الأيقونة
const FIELD_ICON: Record<string, string> = {
  SHORT_TEXT: "type",
  PARAGRAPH: "paragraph",
  PHONE: "phone",
  EMAIL: "mail",
  NUMBER: "hash",
  DATE: "calendar",
  TIME: "clock",
  MULTIPLE_CHOICE: "radio",
  CHECKBOXES: "checkbox",
  DROPDOWN: "chevron-down",
  LINEAR_SCALE: "scale",
  GRID: "grid",
  RATING: "star",
  LOCATION: "map-pin",
  ADDRESS: "home",
  FILE: "paperclip",
  SLIDER: "slider",
  RANKING: "list",
  IMAGE_CHOICE: "image",
  SIGNATURE: "pen",
  CONSENT: "badge-check",
  HIDDEN: "eye-off",
  SECTION: "heading",
  IMAGE: "image",
  VIDEO: "film",
  PAGE_BREAK: "rows",
};

export function fieldIcon(type: string): string {
  return FIELD_ICON[type] || "square";
}

// تلميح عائم منحني الأطراف يظهر عند التحويم
export function IconTip({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`group/tip relative inline-flex ${className}`}>
      {children}
      {/* `left-1/2` + `-translate-x-1/2` تعبير توسيط أفقي، لا خيار اتجاه:
          الزوج يعمل متماثلًا في RTL و LTR. استبداله بـ `start-1/2` يكسر
          التوسيط لأن الإزاحة لا تنقلب معه. */}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-xl border border-border bg-popover px-2.5 py-1 text-xs font-medium text-popover-foreground opacity-0 shadow-lg transition-opacity duration-150 group-hover/tip:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}
